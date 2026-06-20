import { LogOut, Building2, TrendingUp, Trophy, DollarSign, FileText, Clock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useCommissionStatements, CommissionStatement } from '@/hooks/useCommissions';
import { KPICard } from '@/components/dashboard/KPICard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BranchOwnerPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: statements } = useCommissionStatements();

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    logout();
    navigate('/login', { replace: true });
  };

  const fmt = (v?: string) =>
    v ? `RD$${Number(v).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : 'RD$0.00';

  const statusColor = (s: CommissionStatement['status']) => ({
    PENDING: 'text-yellow-400 bg-yellow-900/20',
    APPROVED: 'text-blue-400 bg-blue-900/20',
    PAID: 'text-green-400 bg-green-900/20',
    CANCELLED: 'text-slate-500 bg-slate-800',
  }[s]);

  const statusLabel = (s: CommissionStatement['status']) => ({
    PENDING: 'Pendiente',
    APPROVED: 'Aprobada',
    PAID: 'Pagada',
    CANCELLED: 'Cancelada',
  }[s]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex items-center gap-3">
        <Building2 size={20} className="text-blue-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm truncate">
            {user?.branch?.name ?? user?.operator?.name ?? 'Mi Banca'}
          </p>
          <p className="text-slate-400 text-xs">{user?.name} — Propietario</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
        >
          <LogOut size={16} />
        </button>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-5">
        {/* Fecha */}
        <div>
          <h1 className="text-white text-xl font-bold">Panel del Propietario</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* KPIs del día */}
        <section>
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Hoy</p>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-800 rounded-2xl h-20 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
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
                sub={`${summary?.pendingPrizesCount ?? 0} tickets`}
                icon={Clock}
                color={Number(summary?.pendingPrizesCount ?? 0) > 0 ? 'red' : 'slate'}
              />
            </div>
          )}
        </section>

        {/* Liquidaciones de comisión */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Mis Liquidaciones</p>
            <Link to="/reports" className="text-blue-400 text-xs hover:underline">
              Ver reportes →
            </Link>
          </div>

          {!statements?.length ? (
            <div className="bg-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
              Sin liquidaciones registradas
            </div>
          ) : (
            <div className="space-y-2">
              {statements.slice(0, 6).map((stmt) => (
                <div key={stmt.id} className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <FileText size={16} className="text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">
                      {format(new Date(stmt.periodStart), 'MMMM yyyy', { locale: es })}
                    </p>
                    <p className="text-slate-400 text-xs">
                      Neto: {fmt(stmt.netRevenue)} · Comisión: {fmt(stmt.commissionAmount)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${statusColor(stmt.status)}`}>
                    {statusLabel(stmt.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Acceso rápido */}
        <section>
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Acceso Rápido</p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/reports"
              className="bg-slate-800 hover:bg-slate-700 rounded-2xl p-4 flex items-center gap-3 transition-colors"
            >
              <FileText size={20} className="text-blue-400" />
              <span className="text-white text-sm font-medium">Reportes</span>
            </Link>
            <div className="bg-slate-800 rounded-2xl p-4 flex items-center gap-3 opacity-50 cursor-not-allowed">
              <Building2 size={20} className="text-slate-500" />
              <span className="text-slate-400 text-sm">Mis Bancas</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
