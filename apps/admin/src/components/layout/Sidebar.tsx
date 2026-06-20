import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Shuffle, FileText,
  DollarSign, AlertTriangle, BarChart2, Shield, Wallet,
  BookOpen, LogOut, ChevronLeft, ChevronRight, Settings,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/branches', icon: Building2, label: 'Bancas', roles: ['SUPER_ADMIN', 'OPERATOR_ADMIN'] },
  { to: '/users', icon: Users, label: 'Usuarios', roles: ['SUPER_ADMIN', 'OPERATOR_ADMIN', 'BRANCH_MANAGER'] },
  { to: '/draws', icon: Shuffle, label: 'Sorteos' },
  { to: '/results', icon: FileText, label: 'Resultados' },
  { to: '/payout-tables', icon: DollarSign, label: 'Multiplicadores', roles: ['SUPER_ADMIN', 'OPERATOR_ADMIN'] },
  { to: '/limits', icon: AlertTriangle, label: 'Límites', roles: ['SUPER_ADMIN', 'OPERATOR_ADMIN'] },
  { to: '/cash-sessions', icon: Wallet, label: 'Cajas' },
  { to: '/reports', icon: BarChart2, label: 'Reportes' },
  { to: '/commissions', icon: BookOpen, label: 'Comisiones', roles: ['SUPER_ADMIN', 'OPERATOR_ADMIN', 'BRANCH_OWNER'] },
  { to: '/audit', icon: Shield, label: 'Auditoría', roles: ['SUPER_ADMIN', 'OPERATOR_ADMIN'] },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    logout();
    navigate('/login', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside
      className={`
        relative flex flex-col bg-slate-800 border-r border-slate-700
        transition-all duration-200 shrink-0
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700 h-16">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">SB</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">
              {user?.operator?.name ?? 'Admin'}
            </p>
            <p className="text-slate-400 text-xs truncate">{user?.role}</p>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-2 space-y-1">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          title={collapsed ? 'Configuración' : undefined}
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>

      {/* Toggle collapse */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
