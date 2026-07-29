import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth:v1');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clean up session and reload to force redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);
