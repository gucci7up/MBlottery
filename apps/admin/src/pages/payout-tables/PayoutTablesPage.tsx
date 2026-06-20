import { usePayoutTables } from '@/hooks/useAdminData';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function PayoutTablesPage() {
  const { data: tables, isLoading } = usePayoutTables();
  const qc = useQueryClient();
  const submit = useMutation({
    mutationFn: (id: string) => api.patch(`/payout-tables/${id}/submit`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payout-tables'] }),
  });
  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/payout-tables/${id}/approve`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payout-tables'] }),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Tablas de Multiplicadores</h1>
      <p className="text-slate-400 text-sm">Catálogo de pagos por modalidad. Requiere doble autorización para activar.</p>

      <DataTable
        data={tables ?? []}
        keyField="id"
        loading={isLoading}
        emptyText="Sin tablas de multiplicadores"
        columns={[
          { key: 'name', header: 'Nombre', render: r => <span className="text-white font-medium">{r.name}</span> },
          { key: 'branch', header: 'Alcance', render: r => <span className="text-slate-400 text-sm">{r.branch?.name ?? 'Todas las bancas'}</span> },
          { key: 'effectiveFrom', header: 'Vigente desde', render: r => <span className="text-slate-300 text-sm">{format(new Date(r.effectiveFrom), 'dd/MM/yyyy')}</span> },
          { key: 'effectiveTo', header: 'Hasta', render: r => <span className="text-slate-500 text-sm">{r.effectiveTo ? format(new Date(r.effectiveTo), 'dd/MM/yyyy') : 'Indefinido'}</span> },
          { key: 'entries', header: 'Modalidades', render: r => <span className="text-slate-400 text-sm">{r.entries?.length ?? 0} configuradas</span> },
          { key: 'status', header: 'Estado', render: r => <StatusBadge status={r.status} /> },
          {
            key: 'actions', header: '', align: 'right',
            render: r => (
              <div className="flex gap-2 justify-end">
                {r.status === 'DRAFT' && (
                  <button onClick={() => submit.mutate(r.id)} disabled={submit.isPending} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                    Enviar a aprobación
                  </button>
                )}
                {r.status === 'PENDING_APPROVAL' && (
                  <button onClick={() => approve.mutate(r.id)} disabled={approve.isPending} className="text-green-400 hover:text-green-300 text-xs transition-colors">
                    Aprobar y activar
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
