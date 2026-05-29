import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import redis from '../config/redis.js';
import { REDIS_TTL, JWT } from '../constants/index.js';

// Access Token 
export const generateAccessToken = (userId) =>
  jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: JWT.ACCESS_EXPIRY,
  });

// Refresh Token 
export const generateRefreshToken = () =>
  crypto.randomBytes(40).toString('hex');

// Session (login)
export const createSession = async (userId, accessToken, meta = {}) => {
  const key = `session:${userId}`;
  await redis.hset(key, {
    accessToken,
    ip:      meta.ip     || '',
    device:  meta.device || '',
    loginAt: Date.now().toString(),
  });
  await redis.expire(key, REDIS_TTL.SESSION);
};

export const getSession = (userId) =>
  redis.hgetall(`session:${userId}`);

export const deleteSession = (userId) =>
  redis.del(`session:${userId}`);

// Blacklist (logout)
export const blacklistToken = async (accessToken) => {
  const decoded = jwt.decode(accessToken);
  if (!decoded?.exp) return;
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    await redis.setex(`blacklist:${accessToken}`, ttl, '1');
  }
};

export const isBlacklisted = (accessToken) =>
  redis.get(`blacklist:${accessToken}`).then(res => !!res);

// Refresh Token Store
export const storeRefreshToken = (userId, token) =>
  redis.setex(`refresh:${token}`, REDIS_TTL.REFRESH, userId.toString());

export const verifyRefreshToken = async (token) => {
  const userId = await redis.get(`refresh:${token}`);
  if (!userId) throw new Error('Invalid or expired refresh token');
  return userId;
};

export const deleteRefreshToken = (token) =>
  redis.del(`refresh:${token}`);