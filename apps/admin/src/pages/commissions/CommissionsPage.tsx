import { useCommissionStatements } from '@/hooks/useAdminData';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RefreshCw } from 'lucide-react';

export default function CommissionsPage() {
  const { data: statements, isLoading } = useCommissionStatements();
  const qc = useQueryClient();
  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/commissions/statements/${id}/approve`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  });
  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/commissions/statements/${id}/mark-paid`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  });
  const generateMonthly = useMutation({
    mutationFn: () => api.post('/commissions/statements/generate-monthly').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  });

  const fmt = (v: string) => `RD$${Number(v).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Comisiones</h1>
          <p className="text-slate-400 text-sm">Liquidaciones mensuales por banca.</p>
        </div>
        <button onClick={() => generateMonthly.mutate()} disabled={generateMonthly.isPending}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-xl text-sm transition-colors">
          <RefreshCw size={15} className={generateMonthly.isPending ? 'animate-spin' : ''} />
          Generar mes anterior
        </button>
      </div>

      <DataTable
        data={statements ?? []}
        keyField="id"
        loading={isLoading}
        emptyText="Sin liquidaciones. Usa 'Generar mes anterior' para crearlas."
        columns={[
          { key: 'branch', header: 'Banca', render: r => <span className="text-white font-medium">{r.branch?.name}</span> },
          { key: 'period', header: 'Período', render: r => <span className="text-slate-300 text-sm">{format(new Date(r.periodStart), 'MMMM yyyy', { locale: es })}</span> },
          { key: 'grossSales', header: 'Ventas', align: 'right', render: r => <span className="text-slate-300 text-sm">{fmt(r.grossSales)}</span> },
          { key: 'netRevenue', header: 'Neto', align: 'right', render: r => <span className="text-green-400">{fmt(r.netRevenue)}</span> },
          { key: 'commissionRate', header: 'Tasa', align: 'right', render: r => <span className="text-slate-400">{(Number(r.commissionRate) * 100).toFixed(1)}%</span> },
          { key: 'commissionAmount', header: 'Comisión', align: 'right', render: r => <span className="text-blue-400 font-bold">{fmt(r.commissionAmount)}</span> },
          { key: 'status', header: 'Estado', render: r => <StatusBadge status={r.status} /> },
          {
            key: 'actions', header: '', align: 'right',
            render: r => (
              <div className="flex gap-2 justify-end">
                {r.status === 'PENDING' && <button onClick={() => approve.mutate(r.id)} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">Aprobar</button>}
                {r.status === 'APPROVED' && <button onClick={() => markPaid.mutate(r.id)} className="text-green-400 hover:text-green-300 text-xs transition-colors">Marcar Pagado</button>}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
