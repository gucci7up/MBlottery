import { useLimits } from '@/hooks/useAdminData';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';

export default function LimitsPage() {
  const { data: limits, isLoading } = useLimits();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Límites de Apuesta</h1>
      <p className="text-slate-400 text-sm">Control de montos máximos por número, modalidad y banca.</p>
      <DataTable
        data={limits ?? []}
        keyField="id"
        loading={isLoading}
        emptyText="Sin límites configurados"
        columns={[
          { key: 'number', header: 'Número', render: r => <span className="font-mono font-bold text-blue-400 text-lg">{r.number ?? 'Todos'}</span> },
          { key: 'modality', header: 'Modalidad', render: r => r.modality ? <Badge label={r.modality} variant="info" /> : <span className="text-slate-500 text-xs">Todas</span> },
          { key: 'branch', header: 'Banca', render: r => <span className="text-slate-300 text-sm">{r.branch?.name ?? 'Global'}</span> },
          { key: 'maxAmount', header: 'Máximo', align: 'right', render: r => <span className="text-white font-semibold">RD${Number(r.maxAmount).toLocaleString()}</span> },
          { key: 'currentAmount', header: 'Uso', align: 'right', render: r => {
            const pct = Number(r.maxAmount) > 0 ? (Number(r.currentAmount) / Number(r.maxAmount)) * 100 : 0;
            return (
              <div className="flex items-center gap-2 justify-end">
                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-xs ${pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-yellow-400' : 'text-green-400'}`}>{pct.toFixed(0)}%</span>
              </div>
            );
          }},
          { key: 'blocked', header: 'Bloqueado', render: r => r.blocked ? <Badge label="BLOQUEADO" variant="danger" /> : null },
          { key: 'priority', header: 'Prioridad', align: 'right', render: r => <span className="text-slate-500 text-sm">{r.priority}</span> },
        ]}
      />
    </div>
  );
}
