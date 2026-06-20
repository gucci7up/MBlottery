import { useAuditLogs } from '@/hooks/useAdminData';
import { DataTable } from '@/components/ui/DataTable';
import { format } from 'date-fns';

export default function AuditPage() {
  const { data: logs, isLoading } = useAuditLogs();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Auditoría</h1>
      <p className="text-slate-400 text-sm">Registro inmutable de todas las operaciones críticas del sistema.</p>
      <DataTable
        data={logs ?? []}
        keyField="id"
        loading={isLoading}
        emptyText="Sin registros de auditoría"
        columns={[
          { key: 'action', header: 'Acción', render: r => <span className="font-mono text-xs bg-slate-700 text-blue-300 px-2 py-0.5 rounded">{r.action}</span> },
          { key: 'user', header: 'Usuario', render: r => <span className="text-white text-sm">{r.user?.name}</span> },
          { key: 'entity', header: 'Entidad', render: r => <><p className="text-slate-300 text-sm">{r.entity}</p><p className="text-slate-600 text-xs font-mono">{r.entityId?.slice(0, 8)}...</p></> },
          { key: 'createdAt', header: 'Fecha', render: r => <span className="text-slate-500 text-xs">{format(new Date(r.createdAt), 'dd/MM/yy HH:mm:ss')}</span> },
          { key: 'ip', header: 'IP', render: r => <span className="text-slate-600 text-xs font-mono">{r.ip ?? '—'}</span> },
        ]}
      />
    </div>
  );
}
