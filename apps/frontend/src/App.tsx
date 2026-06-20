import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ThemeProvider } from './components/shared/ThemeProvider';
import { isServerConfigured } from './lib/tauri';
import ServerSetupPage from './pages/setup/ServerSetupPage';
import LoginPage from './pages/auth/LoginPage';
import POSPage from './pages/pos/POSPage';
import DashboardPage from './pages/admin/DashboardPage';
import ReportsPage from './pages/admin/ReportsPage';
import BranchOwnerPage from './pages/owner/BranchOwnerPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function RootRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;

  const roleMap: Record<string, string> = {
    CASHIER: '/pos',
    SUPERVISOR: '/pos',
    BRANCH_MANAGER: '/pos',
    BRANCH_OWNER: '/owner',
    OPERATOR_ADMIN: '/dashboard',
    SUPER_ADMIN: '/dashboard',
  };
  return <Navigate to={roleMap[user.role] ?? '/dashboard'} replace />;
}

export default function App() {
  const [configured, setConfigured] = useState(isServerConfigured);

  // En app nativa: mostrar setup si aún no se configuró el servidor
  if (!configured) {
    return <ServerSetupPage onConfigured={() => setConfigured(true)} />;
  }

  return (
    <ThemeProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><RootRedirect /></ProtectedRoute>} />
      <Route
        path="/pos"
        element={
          <ProtectedRoute roles={['CASHIER', 'SUPERVISOR', 'BRANCH_MANAGER']}>
            <POSPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['OPERATOR_ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute roles={['OPERATOR_ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN', 'BRANCH_OWNER']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner"
        element={
          <ProtectedRoute roles={['BRANCH_OWNER', 'OPERATOR_ADMIN', 'SUPER_ADMIN']}>
            <BranchOwnerPage />
          </ProtectedRoute>
        }
      />
    </Routes>
    </ThemeProvider>
  );
}
