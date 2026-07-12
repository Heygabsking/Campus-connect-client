import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5001/api' });

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('ccUser') || 'null');
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // If it's a relative path (e.g. /uploads/...), point to backend server
  return `http://localhost:5001${path}`;
};

export default api;
