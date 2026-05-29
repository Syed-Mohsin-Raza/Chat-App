import { RateLimiterRedis } from "rate-limiter-flexible";
import redis from "../config/redis.js";
import { RATE_LIMIT } from "../constants/index.js";

const limiter = new RateLimiterRedis({
  storeClient: redis,
  sendCommand: (...args) => redis.sendCommand(args),
  keyPrefix: 'rl:auth',
  points: RATE_LIMIT.AUTH_POINTS, // 10 requests
  duration: RATE_LIMIT.AUTH_DURATION, 
  blockDuration: RATE_LIMIT.AUTH_BLOCK, 
});

export const authRateLimiter = async (req, res, next) => {
  try {
    await limiter.consume(req.ip);
    next();
  } catch (err) {
    res.status(429).json({ success: false, message: 'Too many requests. Please try again in 15 minutes.' });
  }
};