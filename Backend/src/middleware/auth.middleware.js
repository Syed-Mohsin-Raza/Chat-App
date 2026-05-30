import jwt from 'jsonwebtoken';
import { getSession, isBlacklisted } from '../utils/token.utils.js';
import redis from '../config/redis.js';
import { REDIS_TTL } from '../constants/index.js';

export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided'});
        }

        const token = authHeader.split(' ')[1];

        //  JWT Verify (Layer 1)
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
            return res.status(401).json({ success: false, message: msg });
        }
        
        const userId = decoded.sub;

        // Skip redis checks in test environment 
        if (process.env.NODE_ENV !== 'test') {
            // Blacklist Check (Layer 2)
            const blacklisted = await isBlacklisted(token);
            if (blacklisted) {
                return res.status(401).json({ success: false, message: 'Token is blacklisted' });
            }

            // Redis Session Check (Layer 3)
            const session = await getSession(userId);
            if (!session || !session.accessToken) {
                return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
            }
            if (session.accessToken !== token) {
                return res.status(401).json({ success: false, message: 'Token mismatch. Please log in again.' });
            }
        }

        // Slide Presence TTL
        await redis.setex(`presence:${userId}`, REDIS_TTL.PRESENCE, 'online');

        req.userId = userId;
        next();
    } catch (err) {
        next(err);
    }
};