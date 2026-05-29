import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import User from './auth.model.js';
import { 
    generateAccessToken, 
    generateRefreshToken, 
    createSession, 
    deleteSession, 
    blacklistToken,
    storeRefreshToken,
    verifyRefreshToken,
    deleteRefreshToken,
} from '../../utils/token.utils.js';
import redis from '../../config/redis.js';
import { BCRYPT_ROUNDS, REDIS_TTL } from '../../constants/index.js';

// Register
export const register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { username, email, password } = req.body;

        // Check for existing user
        const exists = await User.findOne({ $or: [{ email }, { username }] });
        if (exists) {
            return res.status(409).json({ success: false, message: 'Username or email already taken' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Create user
        const user = await User.create({ username, email, password: hashedPassword });
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken();

        // Store session and refresh token
        await createSession(user._id, accessToken, { ip: req.ip, device: req.headers['user-agent'] || '' });
        await storeRefreshToken(user._id, refreshToken);

        res.status(201).json({ 
            success: true, 
            accessToken, 
            refreshToken,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (err) {
        next(err);
    }
};
    
// Login
export const login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken();

        await createSession(user._id, accessToken, { ip: req.ip, device: req.headers['user-agent'] || '' });
        await storeRefreshToken(user._id, refreshToken);
        await redis.setex(`presence:${user._id}`, REDIS_TTL.PRESENCE, 'online');

        res.json({ 
            success: true, 
            accessToken, 
            refreshToken,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (err) {
        next(err);
    }
};

// Refresh
export const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token required' });
        }
        
        const userId = await verifyRefreshToken(refreshToken);

        await deleteRefreshToken(refreshToken);

        const newAccess = generateAccessToken(userId);
        const newRefresh = generateRefreshToken();

        await createSession(userId, newAccess, { ip: req.ip, device: req.headers['user-agent'] || '' });
        await storeRefreshToken(userId, newRefresh);

        res.json({ success: true, accessToken: newAccess, refreshToken: newRefresh });
    } catch (err) {
        if (err.message === 'Invalid or expired refresh token') {
            return res.status(401).json({ success: false, message: err.message });
        }
        next(err);
    }
};

// Logout
export const logout = async (req, res, next) => {
    try {
        const {refreshToken} = req.body;
        const accessToken = req.headers.authorization?.split(' ')[1];

        await blacklistToken(accessToken);
        await deleteSession(req.user.id);
        if (refreshToken) {
            await deleteRefreshToken(refreshToken);
        }
        await redis.del(`presence:${req.user.id}`); 
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};
