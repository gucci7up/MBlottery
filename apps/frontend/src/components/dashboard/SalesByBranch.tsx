import { useSalesByBranch } from '@/hooks/useDashboard';
import { Building2 } from 'lucide-react';

export function SalesByBranch() {
  const { data, isLoading } = useSalesByBranch();

  if (isLoading) return <div className="bg-slate-800 rounded-2xl h-48 animate-pulse" />;

  const max = Math.max(...(data?.map((b) => Number(b.totalAmount)) ?? [1]));

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={16} className="text-blue-400" />
        <h3 className="text-white font-semibold text-sm">Ventas por Banca — Hoy</h3>
      </div>

      {!data?.length ? (
        <p className="text-slate-600 text-sm text-center py-6">Sin ventas registradas hoy</p>
      ) : (
        <div className="space-y-2.5">
          {data.map((row) => {
            const pct = max > 0 ? (Number(row.totalAmount) / max) * 100 : 0;
            return (
              <div key={row.branchId}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">
                    {row.branch?.name ?? row.branchId}
                  </span>
                  <span className="text-blue-300 font-semibold">
                    RD${Number(row.totalAmount).toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-slate-600 text-xs mt-0.5">{row.ticketCount} tickets</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
