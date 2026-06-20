import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, TrendingUp, Trophy, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';

type ReportType = 'sales' | 'prizes' | 'closing';

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [type, setType] = useState<ReportType>('sales');
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [applied, setApplied] = useState({ type: 'sales' as ReportType, from: firstOfMonth, to: today });

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['reports', 'sales', applied.from, applied.to],
    queryFn: () => api.get('/reports/sales', { params: { from: applied.from, to: applied.to } }).then(r => r.data),
    enabled: applied.type === 'sales',
  });

  const handleExport = async () => {
    const res = await api.get('/reports/sales/export', { params: { from, to }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ventas_${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v: string) => `RD$${Number(v).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

  const TYPES = [
    { v: 'sales' as const, l: 'Ventas', Icon: TrendingUp },
    { v: 'prizes' as const, l: 'Premios', Icon: Trophy },
    { v: 'closing' as const, l: 'Cuadre', Icon: BookOpen },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Reportes</h1>

      <div className="flex gap-2 flex-wrap">
        {TYPES.map(({ v, l, Icon }) => (
          <button key={v} onClick={() => setType(v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${type === v ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}>
            <Icon size={15} />{l}
          </button>
        ))}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-slate-400 text-xs mb-1">Desde</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">Hasta</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
        </div>
        <button onClick={() => setApplied({ type, from, to })} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors">
          Aplicar
        </button>
        {applied.type === 'sales' && (
          <button onClick={handleExport} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-xl text-sm ml-auto">
            <Download size={15} /> Exportar CSV
          </button>
        )}
      </div>

      {applied.type === 'sales' && (
        <DataTable
          data={salesData?.rows ?? []}
          keyField="branchCode"
          loading={isLoading}
          emptyText="Sin datos para el período"
          columns={[
            { key: 'branchName', header: 'Banca', render: r => <><p className="text-white font-medium">{r.branchName}</p><p className="text-slate-500 text-xs">{r.branchCode}</p></> },
            { key: 'grossSales', header: 'Ventas Brutas', align: 'right', render: r => <span className="text-blue-300">{fmt(r.grossSales)}</span> },
            { key: 'cancellations', header: 'Anulaciones', align: 'right', render: r => <span className="text-red-400">{fmt(r.cancellations)}</span> },
            { key: 'prizesPaid', header: 'Premios', align: 'right', render: r => <span className="text-yellow-400">{fmt(r.prizesPaid)}</span> },
            { key: 'netRevenue', header: 'Neto', align: 'right', render: r => <span className="text-green-400 font-semibold">{fmt(r.netRevenue)}</span> },
            { key: 'ticketsSold', header: 'Tickets', align: 'right', render: r => <span className="text-slate-300">{r.ticketsSold}</span> },
          ]}
        />
      )}

      {applied.type !== 'sales' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center text-slate-500">
          Reporte de {applied.type} — en implementación
        </div>
      )}
    </div>
  );
}
