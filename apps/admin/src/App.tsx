import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { AdminLayout } from './components/layout/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import BranchesPage from './pages/branches/BranchesPage';
import UsersPage from './pages/users/UsersPage';
import DrawsPage from './pages/draws/DrawsPage';
import ResultsPage from './pages/results/ResultsPage';
import PayoutTablesPage from './pages/payout-tables/PayoutTablesPage';
import LimitsPage from './pages/limits/LimitsPage';
import CashSessionsPage from './pages/cash-sessions/CashSessionsPage';
import ReportsPage from './pages/reports/ReportsPage';
import CommissionsPage from './pages/commissions/CommissionsPage';
import AuditPage from './pages/audit/AuditPage';
import SettingsPage from './pages/settings/SettingsPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/branches" element={<ProtectedRoute roles={['SUPER_ADMIN','OPERATOR_ADMIN']}><BranchesPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute roles={['SUPER_ADMIN','OPERATOR_ADMIN','BRANCH_MANAGER']}><UsersPage /></ProtectedRoute>} />
        <Route path="/draws" element={<DrawsPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/payout-tables" element={<ProtectedRoute roles={['SUPER_ADMIN','OPERATOR_ADMIN']}><PayoutTablesPage /></ProtectedRoute>} />
        <Route path="/limits" element={<ProtectedRoute roles={['SUPER_ADMIN','OPERATOR_ADMIN']}><LimitsPage /></ProtectedRoute>} />
        <Route path="/cash-sessions" element={<CashSessionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/commissions" element={<CommissionsPage />} />
        <Route path="/audit" element={<ProtectedRoute roles={['SUPER_ADMIN','OPERATOR_ADMIN']}><AuditPage /></ProtectedRoute>} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
