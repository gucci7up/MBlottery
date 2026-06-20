import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  useEffect(() => {
    const primaryColor = user?.operator?.primaryColor ?? '#2563eb';
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    const root = document.documentElement;
    root.style.setProperty('--color-primary', primaryColor);
    root.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`);

    // Actualizar favicon/título con el nombre del operador
    if (user?.operator?.name) {
      document.title = user.operator.name;
    }
  }, [user?.operator?.primaryColor, user?.operator?.name]);

  return <>{children}</>;
}
