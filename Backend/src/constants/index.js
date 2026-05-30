export const REDIS_TTL = {
  SESSION:   60 * 60 * 24 * 7,  // 7 days
  REFRESH:   60 * 60 * 24 * 7,  // 7 days  
  PRESENCE:  60 * 2,             // 2 min
  BLACKLIST: 60 * 15,            // 15 min (max access token life)
  SOCKET:    60 * 60 * 24 * 7,  // 7 days
};

export const JWT = {
  ACCESS_EXPIRY:  '15m',
  REFRESH_EXPIRY: '7d',
};

export const BCRYPT_ROUNDS = 12;

export const RATE_LIMIT = {
  AUTH_POINTS:   10,
  AUTH_DURATION: 60 * 15,
  AUTH_BLOCK:    60 * 15,
};