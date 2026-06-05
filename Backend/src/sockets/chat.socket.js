import redis from '../config/redis.js';
import { REDIS_TTL } from '../constants/index.js';

export const registerChatSocket = (io, socket) => {
  const userId = socket.userId;

  // Join Chat Room
  socket.on('chat:join', async (chatId) => {
    try {
      if (!chatId) return;

      socket.join(chatId);
      console.log(`${userId} joined room: ${chatId}`);

      // Track active room — slides TTL on every join
      await redis.setex(
        `activeRoom:${userId}`,
        REDIS_TTL.PRESENCE,
        chatId
      );
    } catch (err) {
      console.error('chat:join error:', err.message);
    }
  });

  // Leave Chat Room 
  socket.on('chat:leave', async (chatId) => {
    try {
      if (!chatId) return;

      socket.leave(chatId);
      console.log(`${userId} left room: ${chatId}`);

      // Clear active room explicitly
      await redis.del(`activeRoom:${userId}`);
    } catch (err) {
      console.error('chat:leave error:', err.message);
    }
  });
};