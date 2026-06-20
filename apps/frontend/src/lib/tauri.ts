/**
 * Detecta si la app corre dentro de Tauri (nativa) o en un browser.
 * Usar en lugar de typeof window.__TAURI__ directamente.
 */
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

/**
 * Obtiene la URL base del backend.
 * - En browser (web): usa VITE_API_URL relativa o absoluta
 * - En Tauri (nativa): usa la URL guardada en localStorage por el usuario
 */
export const getApiBaseUrl = (): string => {
  if (isTauri()) {
    return localStorage.getItem('serverUrl') ?? '';
  }
  return import.meta.env.VITE_API_URL ?? '/api';
};

export const getWsBaseUrl = (): string => {
  if (isTauri()) {
    const serverUrl = localStorage.getItem('serverUrl') ?? '';
    return serverUrl.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'));
  }
  return import.meta.env.VITE_WS_URL ?? '';
};

/**
 * Guarda la URL del servidor (solo en modo Tauri)
 */
export const saveServerUrl = (url: string): void => {
  const clean = url.trim().replace(/\/$/, '');
  localStorage.setItem('serverUrl', clean);
};

export const isServerConfigured = (): boolean => {
  if (!isTauri()) return true;
  const url = localStorage.getItem('serverUrl');
  return !!url && url.startsWith('http');
};
