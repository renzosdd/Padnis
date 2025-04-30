import axios from 'axios';

const api = axios.create({
  // si defines REACT_APP_API_URL en .env, úsalo, si no apúntalo directamente a tu backend
  baseURL: process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL + '/api'
    : 'https://padnis.onrender.com/api',
});

// Inyecta el token en cada petición si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
