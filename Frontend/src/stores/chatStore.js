import { create } from 'zustand';
import API from '../services/api';
import { getSocket } from '../services/socket';

const useChatStore = create((set, get) => ({
  chats: [],
  selectedChat: null,
  messages: [],
  loading: false,
  error: null,
  typingUsers: {},

  // Fetch all chats
  fetchChats: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get('/chats');
      set({ chats: res.data.chats, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch chats', loading: false });
    }
  },

  // Search chats
  searchChats: async (query) => {
    if (!query.trim()) {
      get().fetchChats();
      return;
    }

    set({ loading: true, error: null });
    try {
      const res = await API.get('/chats/search', {
        params: { q: query },
      });
      set({ chats: res.data.chats, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Search failed', loading: false });
    }
  },

  // Select a chat
  selectChat: async (chatId) => {
    set({ loading: true, error: null, messages: [] });
    try {
      const res = await API.get(`/chats/${chatId}`);
      set({
        selectedChat: res.data.chat,
        messages: res.data.messages || [],
        loading: false,
      });

      // Join socket room for real-time updates
      const socket = getSocket();
      socket.emit('join:room', { chatId });

    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load chat', loading: false });
    }
  },

  // Send message
  sendMessage: async (content) => {
    const { selectedChat } = get();
    if (!selectedChat || !content.trim()) return;

    try {
      const res = await API.post(`/chats/${selectedChat._id}/messages`, {
        content: content.trim(),
      });

      // Add message to local state
      set((state) => ({
        messages: [...state.messages, res.data.message],
      }));

      return res.data.message;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to send message' });
    }
  },

  // Add message from socket
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  // Update typing users
  setTypingUsers: (typing) => {
    set({ typingUsers: typing });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useChatStore;