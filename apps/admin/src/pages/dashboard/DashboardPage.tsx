import { TrendingUp, DollarSign, Trophy, AlertCircle, Users, Ticket, RefreshCw, Activity } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { useDashboardSummary, useSalesByBranch, useTopNumbers, useRecentActivity } from '@/hooks/useAdminData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardPage() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: byBranch } = useSalesByBranch();
  const { data: topNumbers } = useTopNumbers();
  const { data: activity } = useRecentActivity();

  const fmt = (v?: string) =>
    v ? `RD$${Number(v).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : 'RD$0.00';

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['dashboard'] });
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-800 rounded-2xl h-28 animate-pulse border border-slate-700" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Ventas Brutas" value={fmt(summary?.grossSales)} sub={`${summary?.ticketCount ?? 0} tickets`} icon={TrendingUp} color="blue" />
          <StatCard title="Ingresos Netos" value={fmt(summary?.netRevenue)} sub="ventas − premios" icon={DollarSign} color="green" />
          <StatCard title="Premios Pagados" value={fmt(summary?.prizesPaid)} icon={Trophy} color="yellow" />
          <StatCard
            title="Premios Pendientes"
            value={fmt(summary?.pendingPrizesAmount)}
            sub={`${summary?.pendingPrizesCount ?? 0} sin cobrar`}
            icon={AlertCircle}
            color={Number(summary?.pendingPrizesCount ?? 0) > 0 ? 'red' : 'slate'}
          />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cajas Activas" value={summary?.activeCashSessions ?? 0} icon={Users} color="purple" />
        <StatCard title="Tickets Vendidos" value={summary?.salesCount ?? 0} icon={Ticket} color="slate" />
      </div>

      {/* Grid de tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas por banca */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Ventas por Banca — Hoy</h3>
          {!byBranch?.length ? (
            <p className="text-slate-500 text-sm">Sin ventas hoy</p>
          ) : (
            <div className="space-y-3">
              {byBranch.map((row: { branchId: string; branch?: { name: string }; totalAmount: string; ticketCount: number }) => {
                const max = Math.max(...byBranch.map((b: typeof row) => Number(b.totalAmount)));
                const pct = max > 0 ? (Number(row.totalAmount) / max) * 100 : 0;
                return (
                  <div key={row.branchId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">{row.branch?.name ?? row.branchId}</span>
                      <span className="text-blue-400 font-semibold">RD${Number(row.totalAmount).toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-slate-600 text-xs mt-0.5">{row.ticketCount} tickets</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top números */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Top Números — Hoy</h3>
          {!topNumbers?.length ? (
            <p className="text-slate-500 text-sm">Sin apuestas hoy</p>
          ) : (
            <div className="space-y-2">
              {topNumbers.slice(0, 8).map((item: { number: string; count: number; amount: string }, idx: number) => (
                <div key={item.number} className="flex items-center gap-3">
                  <span className="text-slate-600 text-xs w-4">{idx + 1}</span>
                  <span className="text-white font-mono font-bold text-lg w-8">{item.number}</span>
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(item.count / (topNumbers[0]?.count ?? 1)) * 100}%` }} />
                  </div>
                  <span className="text-purple-300 text-xs">{item.count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-blue-400" />
          <h3 className="text-white font-semibold">Actividad Reciente</h3>
          <span className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {(activity ?? []).slice(0, 15).map((item: { type: string; label: string; amount: string | null; timestamp: string }, i: number) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs ${item.type === 'SALE' ? 'bg-blue-500/5' : item.type === 'PRIZE' ? 'bg-green-500/5' : 'bg-yellow-500/5'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === 'SALE' ? 'bg-blue-400' : item.type === 'PRIZE' ? 'bg-green-400' : 'bg-yellow-400'}`} />
              <span className="text-slate-300 flex-1 truncate">{item.label}</span>
              {item.amount && <span className="text-slate-400 shrink-0">RD${Number(item.amount).toLocaleString()}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
