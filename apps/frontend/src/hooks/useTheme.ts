import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

const DEFAULT_PRIMARY = '#2563eb'; // blue-600

export function useTheme() {
  const { user } = useAuthStore();

  useEffect(() => {
    const color = user?.operator?.primaryColor ?? DEFAULT_PRIMARY;

    // Convertir hex a RGB para poder usar con opacidad en Tailwind
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    const root = document.documentElement;
    root.style.setProperty('--primary', color);
    root.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);

    // Ajustar variante más clara y más oscura automáticamente
    root.style.setProperty('--primary-light', adjustBrightness(color, 20));
    root.style.setProperty('--primary-dark', adjustBrightness(color, -20));
  }, [user?.operator?.primaryColor]);
}

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
