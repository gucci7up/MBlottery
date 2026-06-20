import { useTopNumbers } from '@/hooks/useDashboard';
import { Hash } from 'lucide-react';

export function TopNumbers() {
  const { data, isLoading } = useTopNumbers();

  if (isLoading) return <div className="bg-slate-800 rounded-2xl h-48 animate-pulse" />;

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Hash size={16} className="text-purple-400" />
        <h3 className="text-white font-semibold text-sm">Top Números — Hoy</h3>
      </div>

      {!data?.length ? (
        <p className="text-slate-600 text-sm text-center py-6">Sin apuestas hoy</p>
      ) : (
        <div className="space-y-1.5">
          {data.slice(0, 10).map((item, idx) => (
            <div
              key={item.number}
              className="flex items-center gap-3 rounded-xl px-3 py-2 bg-slate-700/50"
            >
              <span className="text-slate-500 text-xs w-4 text-right">{idx + 1}</span>
              <span className="text-white font-mono font-bold text-lg w-8">{item.number}</span>
              <div className="flex-1">
                <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, (item.count / (data[0]?.count ?? 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-slate-400 text-xs">{item.count}×</span>
              <span className="text-purple-300 text-xs font-semibold">
                RD${Number(item.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
