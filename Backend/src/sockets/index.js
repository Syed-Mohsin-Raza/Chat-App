import { registerChatSocket }    from './chat.socket.js';
import { registerMessageSocket } from './message.socket.js';

export const registerSocketHandlers = (io, socket) => {
  // Pure feature router 
  registerChatSocket(io, socket);
  registerMessageSocket(io, socket);
};