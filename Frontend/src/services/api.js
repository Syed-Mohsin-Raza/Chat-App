import axios from 'axios';
import { getUnauthorizedHandler } from './authHandler';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to ALL requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Adding token to request:', token.substring(0, 20) + '...');
  } else {
    console.warn('No token found in localStorage');
  }
  return config;
});

// Volatile flag prevents parallel 401 cascades
let redirectInProgress = false;

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        
        if (!redirectInProgress) {
          redirectInProgress = true;
          
          localStorage.removeItem('accessToken');
          
          // Get handler from external module
          const handler = getUnauthorizedHandler();
          if (handler) {
            handler();
          }

          window.location.href = '/login';

          setTimeout(() => {
            redirectInProgress = false;
          }, 5000);
        }

        return new Promise(() => {});
      }
    }
    return Promise.reject(error);
  }
);

export default API;