import { useState } from 'react';
import {
  LogOut, LayoutDashboard, TrendingUp, Trophy, AlertCircle,
  Ticket, DollarSign, Users, RefreshCw, FileText, Settings,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { KPICard } from '@/components/dashboard/KPICard';
import { SalesByBranch } from '@/components/dashboard/SalesByBranch';
import { TopNumbers } from '@/components/dashboard/TopNumbers';
import { LiveFeed } from '@/components/dashboard/LiveFeed';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading } = useDashboardSummary();

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    logout();
    navigate('/login', { replace: true });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['dashboard'] });
    setTimeout(() => setRefreshing(false), 800);
  };

  const fmt = (n: string | undefined) =>
    n ? `RD$${Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : 'RD$0.00';

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <LayoutDashboard size={20} className="text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {user?.operator?.name ?? 'Dashboard'}
            </p>
            <p className="text-slate-400 text-xs">{user?.name} — {user?.role}</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 ml-6">
          <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" active />
          <NavLink to="/reports" icon={FileText} label="Reportes" />
          <NavLink to="/admin/settings" icon={Settings} label="Config" />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-700"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Fecha */}
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">Resumen del día</h1>
          <p className="text-slate-400 text-sm">
            {new Date().toLocaleDateString('es-DO', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* KPI Cards — 2 columnas mobile, 4 desktop */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              title="Ventas Brutas"
              value={fmt(summary?.grossSales)}
              sub={`${summary?.ticketCount ?? 0} tickets`}
              icon={TrendingUp}
              color="blue"
            />
            <KPICard
              title="Ingresos Netos"
              value={fmt(summary?.netRevenue)}
              sub="ventas − premios"
              icon={DollarSign}
              color="green"
            />
            <KPICard
              title="Premios Pagados"
              value={fmt(summary?.prizesPaid)}
              icon={Trophy}
              color="yellow"
            />
            <KPICard
              title="Premios Pendientes"
              value={fmt(summary?.pendingPrizesAmount)}
              sub={`${summary?.pendingPrizesCount ?? 0} sin cobrar`}
              icon={AlertCircle}
              color={Number(summary?.pendingPrizesCount ?? 0) > 0 ? 'red' : 'slate'}
              badge={summary?.pendingPrizesCount}
            />
          </div>
        )}

        {/* Segunda fila — cajas y tickets */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            title="Cajas Activas"
            value={String(summary?.activeCashSessions ?? 0)}
            icon={Users}
            color="slate"
          />
          <KPICard
            title="Tickets Vendidos"
            value={String(summary?.salesCount ?? 0)}
            icon={Ticket}
            color="slate"
          />
        </div>

        {/* Grid principal — 2 columnas desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SalesByBranch />
          <TopNumbers />
        </div>

        {/* Feed en vivo — ancho completo */}
        <LiveFeed />
      </main>
    </div>
  );
}

function NavLink({
  to, icon: Icon, label, active,
}: { to: string; icon: React.ElementType; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}
