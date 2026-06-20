import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: string;
  operatorId: string;
  branchId: string | null;
  operator?: { name: string; logoUrl?: string; primaryColor?: string };
  branch?: { name: string; code: string };
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string) => void;
  logout: () => void;
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATOR_ADMIN', 'BRANCH_OWNER', 'BRANCH_MANAGER', 'SUPERVISOR'];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => {
        if (!ADMIN_ROLES.includes(user.role)) {
          console.warn('Rol sin acceso al panel admin:', user.role);
          return;
        }
        set({ user, accessToken, isAuthenticated: true });
      },
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    { name: 'admin-auth' },
  ),
);
