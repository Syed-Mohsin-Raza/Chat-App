import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import redis from './redis.js';
import { REDIS_TTL } from '../constants/index.js';   

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5000',
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Auth Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            // Verify JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.sub;

            // Redis session check (skip in test)
            if (process.env.NODE_ENV !== 'test') {
                const session = await redis.hgetall(`session:${userId}`);
                if (!session || !session.accessToken) {
                    return next(new Error('Authentication error: Session Expired'));
                }
                if (session.accessToken !== token) {
                    return next(new Error('Authentication error: Token Mismatch'));
                }
            }
            
            socket.userId = userId;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.userId;
        console.log(`Connected: ${socket.id} | User: ${userId}`);
        
        // Store socketId and userId mapping in Redis
        await redis.sadd(`sockets:${userId}`, socket.id);
        await redis.set(`socketUser:${socket.id}`, userId);

        // Mark online
        await redis.setex(`presence:${userId}`, REDIS_TTL.PRESENCE, 'online');

        // Notify others (Cleaned up to match uniform colon schema)
        socket.broadcast.emit('user:online', { userId });

        // Disconnect
        socket.on('disconnect', async () => {
            console.log(`Disconnected: ${socket.id} | User: ${userId}`);

            await redis.srem(`sockets:${userId}`, socket.id);
            await redis.del(`socketUser:${socket.id}`);

            // Check if user has any remaining connections
            const remaining = await redis.smembers(`sockets:${userId}`);
            if (remaining.length === 0) {
                await redis.del(`presence:${userId}`);
                socket.broadcast.emit('user:offline', { userId });
                console.log(`User offline: ${userId}`);
            }
        });
    });

    return io;
};

// Use in controllers/other socket files
export const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Get all socketIds for a user (for message delivery)
export const getUserSockets = (userId) => {
    return redis.smembers(`sockets:${userId}`);
};

// Send Event to specific user (all their devices)
export const emitToUser = async (userId, event, data) => {
    const socketIds = await getUserSockets(userId);
    socketIds.forEach(socketId => {
        io.to(socketId).emit(event, data);
    });
};