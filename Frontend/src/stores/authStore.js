import { create } from 'zustand';
import API, { registerUnauthorizedHandler } from '../services/api';
import { initSocket, closeSocket } from '../services/socket';

const useAuthStore = create((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  isLoading: false,
  error: null,

  // Clear stale errors when switching routes
  clearError: () => set({ error: null }),

  // Login Action
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await API.post('/auth/login', { email, password });
      const { accessToken, user } = res.data;

      localStorage.setItem('accessToken', accessToken);
      
      // State set BEFORE socket init
      set({ user, token: accessToken, isLoading: false });

      initSocket(accessToken);
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      throw err;
    }
  },

  // Register Action
  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await API.post('/auth/register', {
        username,
        email,
        password,
      });
      const { accessToken, user } = res.data;

      localStorage.setItem('accessToken', accessToken);
      set({ user, token: accessToken, isLoading: false });

      initSocket(accessToken);
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Registration failed',
        isLoading: false,
      });
      throw err;
    }
  },

  // Logout Action
  logout: async () => {
    set({ isLoading: true });
    try {
      await API.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      localStorage.removeItem('accessToken');
      closeSocket();
      set({ user: null, token: null, isLoading: false, error: null });
    }
  },

  // Check auth on app mount
  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      set({ user: null, token: null, isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const res = await API.get('/users/me');
      
      set({ user: res.data.user, token, isLoading: false });

      initSocket(token);
    } catch (err) {
      console.error('Session validation failed:', err.message);
      localStorage.removeItem('accessToken');
      closeSocket();
      set({ user: null, token: null, isLoading: false, error: null });
    }
  },
}));

// Register handler dynamically after store creation
// Breaks circular chain while keeping handler clean and functional
registerUnauthorizedHandler(() => {
  console.log('Auth Interceptor: token invalid, clearing state');
  closeSocket();
  useAuthStore.setState({ user: null, token: null, isLoading: false, error: null });
});

export default useAuthStore;