import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { getApiBaseUrl } from './tauri';

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Actualiza la baseURL en tiempo real (necesario cuando el usuario
 * configura el servidor por primera vez en la app nativa).
 */
export const updateApiBaseUrl = (url: string) => {
  api.defaults.baseURL = url;
};

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
