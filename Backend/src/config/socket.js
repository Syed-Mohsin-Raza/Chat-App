import { Server }                  from 'socket.io';
import jwt                         from 'jsonwebtoken';
import redis                       from './redis.js';
import { REDIS_TTL }               from '../constants/index.js';
import { registerSocketHandlers }  from '../sockets/index.js';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  // ─── Auth Middleware ─────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId  = decoded.sub;

      if (process.env.NODE_ENV !== 'test') {
        const session = await redis.hgetall(`session:${userId}`);
        if (!session || !session.accessToken) {
          return next(new Error('Session expired'));
        }
        if (session.accessToken !== token) {
          return next(new Error('Token mismatch'));
        }
      }

      socket.userId = userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Manager ──────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`Connected: ${socket.id} | User: ${userId}`);

    try {
      // Track multi-device socket mapping
      await Promise.all([
        redis.sadd(`socket:${userId}`, socket.id),
        redis.set(`socketUser:${socket.id}`, userId),
        redis.setex(`presence:${userId}`, REDIS_TTL.PRESENCE, 'online'),
      ]);

      // Notify others
      socket.broadcast.emit('user:status', { userId, isOnline: true });

      // Register feature handlers — no presence logic here
      registerSocketHandlers(io, socket);

      // ─── Disconnect Lifecycle ──────────────────────
      socket.on('disconnect', async () => {
        try {
          console.log(`Disconnected: ${socket.id} | User: ${userId}`);

          // Remove THIS socket from user's set
          await Promise.all([
            redis.srem(`socket:${userId}`, socket.id),
            redis.del(`socketUser:${socket.id}`),
          ]);

          // Check if user has OTHER connections still active
          const remaining = await redis.smembers(`socket:${userId}`);

          if (remaining.length === 0) {
            // ALL devices disconnected — cleanup presence globally
            await Promise.all([
              redis.del(`presence:${userId}`),
              redis.del(`activeRoom:${userId}`),
            ]);

            // Safe typing cleanup — pass array directly
            const typingKeys = await redis.keys(`typing:*:${userId}`);
            if (typingKeys.length > 0) {
              await redis.del(typingKeys); // array, not spread
            }

            socket.broadcast.emit('user:status', { userId, isOnline: false });
            console.log(`User offline (all devices): ${userId}`);
          } else {
            // User still has other devices connected
            console.log(`User still online (${remaining.length} device(s)): ${userId}`);
          }
        } catch (err) {
          console.error('Disconnect cleanup error:', err.message);
        }
      });
    } catch (err) {
      console.error('Connection handler error:', err.message);
    }
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const getUserSockets = (userId) =>
  redis.smembers(`socket:${userId}`);

export const emitToUser = async (userId, event, data) => {
  const socketIds = await getUserSockets(userId);
  socketIds.forEach((socketId) => {
    io.to(socketId).emit(event, data);
  });
};