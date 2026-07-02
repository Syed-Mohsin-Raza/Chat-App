import { create } from 'zustand';
import API from '../services/api';
import { registerUnauthorizedHandler } from '../services/authHandler';
import { initSocket, closeSocket } from '../services/socket';

let globalUnauthorizedHandler = null;

const useAuthStore = create((set, get) => {
  
  if (typeof window !== 'undefined') {
    if (globalUnauthorizedHandler) {
      window.removeEventListener('auth:unauthorized', globalUnauthorizedHandler);
    }

    globalUnauthorizedHandler = () => {
      console.log('Auth interceptor: token invalid, clearing state');
      closeSocket();
      set({ user: null, token: null, isLoading: false, error: null });
    };

    window.addEventListener('auth:unauthorized', globalUnauthorizedHandler);
  }

  return {
    user: null,
    token: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    // Login Action
    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        console.log('Attempting login...');
        const res = await API.post('/auth/login', { email, password });
        console.log('Login response:', res.data);
        
        const { accessToken, user } = res.data;

        localStorage.setItem('accessToken', accessToken);
        console.log('Token saved to localStorage:', accessToken.substring(0, 20) + '...');
        
        set({ user, token: accessToken, isLoading: false });
        console.log('State updated, initializing socket...');

        initSocket(accessToken);
        
      } catch (err) {
        console.error('Login error:', err);
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
        console.log('Attempting registration...');
        const res = await API.post('/auth/register', {
          username,
          email,
          password,
        });
        console.log('Register response:', res.data);
        
        const { accessToken, user } = res.data;

        localStorage.setItem('accessToken', accessToken);
        console.log('Token saved to localStorage:', accessToken.substring(0, 20) + '...');
        
        set({ user, token: accessToken, isLoading: false });
        console.log('State updated, initializing socket...');

        initSocket(accessToken);
        
      } catch (err) {
        console.error('Register error:', err);
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
        console.log('Attempting logout...');
        await API.post('/auth/logout');
      } catch (err) {
        console.error('Logout failed:', err);
      } finally {
        localStorage.removeItem('accessToken');
        closeSocket();
        set({ user: null, token: null, isLoading: false, error: null });
        console.log('Logout complete');
      }
    },

    // Check auth on app mount
    checkAuth: async () => {
      const token = localStorage.getItem('accessToken');
      console.log('checkAuth called, token:', token ? token.substring(0, 20) + '...' : 'null');

      if (!token) {
        console.log('No token found');
        set({ user: null, token: null, isLoading: false, error: null });
        return;
      }

      set({ isLoading: true, error: null });
      try {
        console.log('Verifying token with backend...');
        const res = await API.get('/users/me');
        console.log('Token valid, user:', res.data.user);
        
        set({ user: res.data.user, token, isLoading: false });
        initSocket(token);
        
      } catch (err) {
        console.error('Session validation failed:', err.message);
        localStorage.removeItem('accessToken');
        closeSocket();
        set({ user: null, token: null, isLoading: false, error: null });
      }
    },
  };
});

// Register handler after store creation
registerUnauthorizedHandler(() => {
  console.log('Auth Interceptor: token invalid, clearing state');
  closeSocket();
  useAuthStore.setState({ user: null, token: null, isLoading: false, error: null });
});

export default useAuthStore;