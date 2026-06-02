import { createServer } from 'http';
import app from '../../src/app.js';
import { initSocket } from '../../src/config/socket.js';

export const createTestServer = () => {
  const httpServer = createServer(app);
  initSocket(httpServer);
  return httpServer;
}