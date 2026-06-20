import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;
const tauriDevHost = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },

  // Tauri necesita puerto fijo y no abrir browser automáticamente
  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,
    host: tauriDevHost || false,
    hmr: tauriDevHost
      ? { protocol: 'ws', host: tauriDevHost, port: 5174 }
      : undefined,
    // Proxy solo activo en modo web (dev local); Tauri usa API URL absoluta
    proxy: isTauri
      ? {}
      : {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api/, ''),
          },
          '/ws': { target: 'ws://localhost:3000', ws: true },
        },
  },

  // Exponer variables TAURI_ al frontend
  envPrefix: ['VITE_', 'TAURI_ENV_'],

  build: {
    // Target según plataforma Tauri
    target: process.env.TAURI_ENV_PLATFORM === 'windows'
      ? 'chrome105'
      : process.env.TAURI_ENV_PLATFORM === 'android'
      ? 'chrome105'
      : 'safari13',
    minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
