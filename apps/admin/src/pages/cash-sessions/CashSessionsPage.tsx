import { useCashSessions } from '@/hooks/useAdminData';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { format } from 'date-fns';

export default function CashSessionsPage() {
  const { data: sessions, isLoading } = useCashSessions();
  const fmt = (v?: string | null) => v != null ? `RD$${Number(v).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '—';

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Sesiones de Caja</h1>
      <p className="text-slate-400 text-sm">Cajas abiertas y cerradas de todas las bancas.</p>
      <DataTable
        data={sessions ?? []}
        keyField="id"
        loading={isLoading}
        emptyText="Sin sesiones de caja"
        columns={[
          { key: 'cashier', header: 'Cajero', render: r => <span className="text-white font-medium">{r.cashier?.name}</span> },
          { key: 'openedAt', header: 'Apertura', render: r => <span className="text-slate-300 text-sm">{format(new Date(r.openedAt), 'dd/MM HH:mm')}</span> },
          { key: 'closedAt', header: 'Cierre', render: r => <span className="text-slate-400 text-sm">{r.closedAt ? format(new Date(r.closedAt), 'HH:mm') : '—'}</span> },
          { key: 'openingBalance', header: 'Apertura', align: 'right', render: r => <span className="text-slate-300">{fmt(r.openingBalance)}</span> },
          { key: 'declaredBalance', header: 'Declarado', align: 'right', render: r => <span className="text-slate-300">{fmt(r.declaredBalance)}</span> },
          { key: 'difference', header: 'Diferencia', align: 'right', render: r => {
            const diff = Number(r.difference ?? 0);
            return <span className={diff < -1 ? 'text-red-400 font-semibold' : diff > 1 ? 'text-yellow-400' : 'text-green-400'}>{fmt(r.difference)}</span>;
          }},
          { key: 'status', header: 'Estado', render: r => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  );
}
