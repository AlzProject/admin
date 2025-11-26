import axios from 'axios';

const API_URL = 'http://localhost:3000/v1'; // Default to local, can be env var

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Clear token and redirect to login
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

