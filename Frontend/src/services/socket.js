import { io } from 'socket.io-client';

/**
 * Global socket instance reference.
 * Hoisted outside exports to ensure complete state isolation.
 * @type {import('socket.io-client').Socket|null}
 */
let socket = null;

/**
 * Initializes a secure, resilient, single-instance WebSocket channel.
 * Implements singleton guard pattern to prevent connection leaks.
 *
 * @param {string} token - User authentication JWT
 * @returns {import('socket.io-client').Socket} Socket instance
 */
export const initSocket = (token) => {
  // 1. SINGLETON GUARD: Return existing connected socket
  if (socket?.connected) {
    console.log('⚡ Socket already connected, returning existing instance');
    return socket;
  }

  // 2. DROPPED-LINK GUARD: Reconnect existing socket without losing listeners
  if (socket) {
    console.log('Socket exists but disconnected. Attempting reconnection...');
    socket.connect();
    return socket;
  }

  console.log('Initializing new socket connection...');

  // 3. ALLOCATION: Create fresh websocket with safety configs
  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket'], // Skip HTTP long-polling
  });

  // Global lifecycle events only — no component listeners here
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket error:', error.message);
  });

  return socket;
};

/**
 * Safe instance getter.
 * Checks existence only, not connection status.
 * Socket.io buffers events during brief drops.
 *
 * @throws {Error} If socket not initialized
 * @returns {import('socket.io-client').Socket} Socket instance
 */
export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initSocket(token) first.');
  }
  return socket;
};

/**
 * Clean-down teardown utility.
 * Terminates connections and clears module references.
 * Always call this on logout to prevent token carryover.
 */
export const closeSocket = () => {
  if (socket) {
    console.log('Closing socket connection');
    
    socket.disconnect();
    
    // CRITICAL: Do NOT call removeAllListeners()
    // Mounted components need listeners preserved across reconnects
    
    socket = null; // Essential: Clear reference to prevent stale token on re-login
  }
};

/**
 * Check if socket is actively connected.
 * Useful for UI connectivity indicators.
 *
 * @returns {boolean} True if connected
 */
export const isSocketConnected = () => {
  return socket?.connected ?? false;
};