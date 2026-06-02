import redis from '../config/redis.js';
import { REDIS_TTL } from '../constants/index.js';

export const registerMessageSocket = (io, socket) => {
  const userId = socket.userId;

  // ─── Typing started ─────────────────────────────────
  // Client emits when user starts typing
  socket.on('typing:start', async ({ chatId }) => {
    try {
      if (!chatId) return;

      // Store typing state in Redis — auto expires in 5 sec
      // If client crashes, typing indicator auto-clears
      await redis.setex(
        `typing:${chatId}:${userId}`,
        5,
        'typing'
      );

      // Broadcast to everyone in room EXCEPT sender
      socket.to(chatId).emit('typing:start', { chatId, userId });
    } catch (err) {
      console.error('typing:start error:', err.message);
    }
  });

  // ─── Typing stopped ─────────────────────────────────
  // Client emits when user stops typing / sends message
  socket.on('typing:stop', async ({ chatId }) => {
    try {
      if (!chatId) return;

      await redis.del(`typing:${chatId}:${userId}`);

      socket.to(chatId).emit('typing:stop', { chatId, userId });
    } catch (err) {
      console.error('typing:stop error:', err.message);
    }
  });

  // ─── Message delivered ──────────────────────────────
  // Client emits when message received on their device
  socket.on('message:delivered', async ({ messageId, chatId }) => {
    try {
      if (!messageId || !chatId) return;

      // Notify sender that message was delivered
      socket.to(chatId).emit('message:delivered', {
        messageId,
        deliveredTo: userId,
      });
    } catch (err) {
      console.error('message:delivered error:', err.message);
    }
  });

  // ─── Get typing users in a room ─────────────────────
  // Client can request who is currently typing
  socket.on('typing:get', async ({ chatId }, callback) => {
    try {
      if (!chatId || typeof callback !== 'function') return;

      // Get all typing keys for this chat
      const keys = await redis.keys(`typing:${chatId}:*`);

      // Extract userIds from keys
      const typingUsers = keys.map((key) => key.split(':')[2]);

      callback({ typingUsers });
    } catch (err) {
      console.error('typing:get error:', err.message);
      if (typeof callback === 'function') callback({ typingUsers: [] });
    }
  });
};