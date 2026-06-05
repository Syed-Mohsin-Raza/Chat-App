import { create } from 'zustand';
import API from '../services/api';
import { initSocket, closeSocket } from '../services/socket';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('accessToken') || null,
  isLoading: false,
  error: null,

  // Login
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await API.post('/auth/login', { email, password });
      const { accessToken, user } = res.data;

      localStorage.setItem('accessToken', accessToken);
      set({ user, token: accessToken, isLoading: false });

      // Initialize socket after login
      initSocket(accessToken);
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      throw err;
    }
  },

  // Register
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

  // Logout
  logout: async () => {
    try {
      await API.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }

    localStorage.removeItem('accessToken');
    closeSocket();
    set({ user: null, token: null });
  },

  // Check auth status
  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await API.get('/users/me');
      set({ user: res.data.user, token });
      initSocket(token);
    } catch (err) {
      localStorage.removeItem('accessToken');
      set({ user: null, token: null });
    }
  },
}));

export default useAuthStore;