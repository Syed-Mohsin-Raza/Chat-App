import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Lazy callback registry breaks circular import chain
// API no longer imports authStore — store registers handler dynamically
let onUnauthorizedCallback = null;

export const registerUnauthorizedHandler = (callback) => {
  onUnauthorizedCallback = callback;
};

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
          
          // Call registered handler safely
          if (onUnauthorizedCallback) {
            onUnauthorizedCallback();
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