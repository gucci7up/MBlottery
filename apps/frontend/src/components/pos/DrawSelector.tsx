import { Clock } from 'lucide-react';
import { useOpenDraws } from '@/hooks/usePOS';
import { usePOSStore } from '@/stores/posStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function DrawSelector() {
  const { data: draws, isLoading } = useOpenDraws();
  const { selectedDrawId, setDraw } = usePOSStore();

  if (isLoading) return <div className="h-12 bg-slate-800 rounded-xl animate-pulse" />;
  if (!draws?.length) {
    return (
      <div className="bg-slate-800 rounded-xl px-4 py-3 text-slate-500 text-sm text-center">
        No hay sorteos abiertos
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-40 overflow-y-auto">
      {draws.map((draw) => {
        const selected = selectedDrawId === draw.id;
        const closes = formatDistanceToNow(new Date(draw.closeAt), {
          addSuffix: true,
          locale: es,
        });

        return (
          <button
            key={draw.id}
            onClick={() => setDraw(draw.id, draw.provider.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors touch-target-sm ${
              selected
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div>
              <p className="text-sm font-semibold">{draw.name}</p>
              <p className={`text-xs ${selected ? 'text-blue-200' : 'text-slate-500'}`}>
                {draw.provider.name}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Clock size={12} />
              {closes}
            </div>
          </button>
        );
      })}
    </div>
  );
}
