import { create } from 'zustand';
import API from '../services/api';
import { getSocket } from '../services/socket';

// Test data (permanent)
const TEST_CHATS = [
  {
    _id: 'test-chat-1',
    isGroup: false,
    name: 'John Doe',
    participants: [{ _id: 'user-2', username: 'john_doe' }],
    lastMessage: { content: 'Hey, how are you?', createdAt: new Date() },
    createdAt: new Date(),
  },
  {
    _id: 'test-chat-2',
    isGroup: false,
    name: 'Jane Smith',
    participants: [{ _id: 'user-3', username: 'jane_smith' }],
    lastMessage: { content: 'See you later!', createdAt: new Date() },
    createdAt: new Date(),
  },
];

const TEST_MESSAGES = [
  {
    _id: 'msg-1',
    content: 'Hi there!',
    sender: { _id: 'your-user-id', username: 'you' },
    createdAt: new Date(Date.now() - 5 * 60000),
  },
  {
    _id: 'msg-2',
    content: 'Hey, how are you?',
    sender: { _id: 'user-2', username: 'john_doe' },
    createdAt: new Date(Date.now() - 3 * 60000),
  },
  {
    _id: 'msg-3',
    content: 'I am doing great!',
    sender: { _id: 'your-user-id', username: 'you' },
    createdAt: new Date(Date.now() - 1 * 60000),
  },
];

const useChatStore = create((set, get) => ({
  chats: TEST_CHATS, // Always start with test data
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
      console.log('Chats fetched:', res.data);
      
      // If backend returns chats, use them. Otherwise use test data
      const chatsToUse = res.data.chats && res.data.chats.length > 0 ? res.data.chats : TEST_CHATS;
      set({ chats: chatsToUse, loading: false });
    } catch (err) {
      console.warn('Failed to fetch chats, using test data:', err.message);
      set({ chats: TEST_CHATS, loading: false });
    }
  },

  // Search chats
  searchChats: async (query) => {
    if (!query.trim()) {
      set({ chats: TEST_CHATS });
      return;
    }

    set({ loading: true, error: null });
    try {
      const res = await API.get('/chats/search', {
        params: { q: query },
      });
      console.log('Search results:', res.data);
      set({ chats: res.data.chats || TEST_CHATS, loading: false });
    } catch (err) {
      console.warn('Search failed:', err.message);
      // Filter test data
      const filtered = TEST_CHATS.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase())
      );
      set({ chats: filtered, loading: false });
    }
  },

  // Select a chat
  selectChat: async (chatId) => {
    console.log('selectChat called with:', chatId);
    set({ loading: true, error: null, messages: [] });
    
    try {
      const res = await API.get(`/chats/${chatId}`);
      console.log('Chat loaded:', res.data);
      set({
        selectedChat: res.data.chat,
        messages: res.data.messages || TEST_MESSAGES,
        loading: false,
      });

      try {
        const socket = getSocket();
        socket.emit('join:room', { chatId });
        console.log('Joined chat room:', chatId);
      } catch (err) {
        console.warn('Socket join failed:', err.message);
      }
    } catch (err) {
      console.warn('Failed to load chat, using test data:', err.message);
      // Use test data
      const chat = TEST_CHATS.find(c => c._id === chatId);
      if (chat) {
        console.log('Using test chat:', chat);
        set({
          selectedChat: chat,
          messages: TEST_MESSAGES,
          loading: false,
        });
      } else {
        set({ error: 'Chat not found', loading: false });
      }
    }
  },

  // Send message
  sendMessage: async (content) => {
    const { selectedChat } = get();
    if (!selectedChat || !content.trim()) return;

    console.log('Sending message to:', selectedChat._id);

    try {
      const res = await API.post(`/chats/${selectedChat._id}/messages`, {
        content: content.trim(),
      });

      console.log('Message sent:', res.data);
      set((state) => ({
        messages: [...state.messages, res.data.message],
      }));

      return res.data.message;
    } catch (err) {
      console.warn('Send failed, adding locally:', err.message);
      // Add message locally even if API fails
      const localMsg = {
        _id: 'local-' + Date.now(),
        content: content.trim(),
        sender: { _id: 'your-user-id', username: 'you' },
        createdAt: new Date(),
      };
      set((state) => ({
        messages: [...state.messages, localMsg],
      }));
      return localMsg;
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