import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, ArrowLeft, TrendingUp, Trophy, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type ReportType = 'sales' | 'prizes' | 'closing';

interface SalesRow {
  branchName: string;
  branchCode: string;
  grossSales: string;
  cancellations: string;
  prizesPaid: string;
  netRevenue: string;
  ticketsSold: number;
  ticketsCancelled: number;
}

interface SalesReport {
  from: string;
  to: string;
  rows: SalesRow[];
  totals: SalesRow;
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [type, setType] = useState<ReportType>('sales');
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [applied, setApplied] = useState({ type: 'sales' as ReportType, from: firstOfMonth, to: today });

  const { data: salesData, isLoading } = useQuery<SalesReport>({
    queryKey: ['reports', 'sales', applied.from, applied.to],
    queryFn: () =>
      api.get('/reports/sales', { params: { from: applied.from, to: applied.to } }).then((r) => r.data),
    enabled: applied.type === 'sales',
  });

  const handleApply = () => setApplied({ type, from, to });

  const handleExport = async () => {
    const res = await api.get('/reports/sales/export', {
      params: { from, to },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v: string) =>
    `RD$${Number(v).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center gap-4">
        <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <FileText size={20} className="text-blue-400" />
        <h1 className="text-white font-semibold">Reportes</h1>
        <span className="text-slate-500 text-sm">{user?.operator?.name}</span>
      </header>

      <main className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
        {/* Tipo */}
        <div className="flex gap-2 flex-wrap">
          {([
            { value: 'sales', label: 'Ventas', icon: TrendingUp },
            { value: 'prizes', label: 'Premios', icon: Trophy },
            { value: 'closing', label: 'Cuadre', icon: BookOpen },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                type === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-slate-400 text-xs mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            Aplicar
          </button>
          {applied.type === 'sales' && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-xl text-sm transition-colors ml-auto"
            >
              <Download size={15} />
              Exportar CSV
            </button>
          )}
        </div>

        {/* Tabla ventas */}
        {applied.type === 'sales' && (
          <div className="bg-slate-800 rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="h-40 animate-pulse bg-slate-700 rounded-2xl" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {['Banca', 'Ventas Brutas', 'Anulaciones', 'Premios', 'Neto', 'Tickets'].map((h) => (
                        <th
                          key={h}
                          className={`text-slate-400 font-medium px-4 py-3 ${h === 'Banca' ? 'text-left' : 'text-right'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(salesData?.rows ?? []).map((row, i) => (
                      <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{row.branchName}</p>
                          <p className="text-slate-500 text-xs">{row.branchCode}</p>
                        </td>
                        <td className="text-right px-4 py-3 text-blue-300">{fmt(row.grossSales)}</td>
                        <td className="text-right px-4 py-3 text-red-400">{fmt(row.cancellations)}</td>
                        <td className="text-right px-4 py-3 text-yellow-400">{fmt(row.prizesPaid)}</td>
                        <td className="text-right px-4 py-3 text-green-400 font-semibold">{fmt(row.netRevenue)}</td>
                        <td className="text-right px-4 py-3 text-slate-300">{row.ticketsSold}</td>
                      </tr>
                    ))}
                  </tbody>
                  {salesData?.totals && (
                    <tfoot>
                      <tr className="bg-slate-700/40 border-t border-slate-600">
                        <td className="px-4 py-3 text-white font-bold">TOTAL</td>
                        <td className="text-right px-4 py-3 text-blue-300 font-bold">{fmt(salesData.totals.grossSales)}</td>
                        <td className="text-right px-4 py-3 text-red-400 font-bold">{fmt(salesData.totals.cancellations)}</td>
                        <td className="text-right px-4 py-3 text-yellow-400 font-bold">{fmt(salesData.totals.prizesPaid)}</td>
                        <td className="text-right px-4 py-3 text-green-400 font-bold">{fmt(salesData.totals.netRevenue)}</td>
                        <td className="text-right px-4 py-3 text-slate-300 font-bold">{salesData.totals.ticketsSold}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {!salesData?.rows?.length && (
                  <p className="text-slate-500 text-sm text-center py-10">Sin datos para el período</p>
                )}
              </div>
            )}
          </div>
        )}

        {applied.type !== 'sales' && (
          <div className="bg-slate-800 rounded-2xl p-12 text-center">
            <p className="text-slate-500">Reporte de {applied.type} — En implementación (Fase 5)</p>
          </div>
        )}
      </main>
    </div>
  );
}