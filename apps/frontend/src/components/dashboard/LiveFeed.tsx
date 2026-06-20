import { useEffect, useRef, useState } from 'react';
import { ShoppingCart, Trophy, Star, Zap } from 'lucide-react';
import { ActivityItem, useRecentActivity } from '@/hooks/useDashboard';
import { useWebSocket, WSEvent } from '@/hooks/useWebSocket';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_CONFIG = {
  SALE: { icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-600/10' },
  PRIZE: { icon: Trophy, color: 'text-green-400', bg: 'bg-green-600/10' },
  RESULT: { icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-600/10' },
};

export function LiveFeed() {
  const { data: initial } = useRecentActivity();
  const [liveItems, setLiveItems] = useState<ActivityItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initial) setLiveItems(initial);
  }, [initial]);

  useWebSocket((event: WSEvent) => {
    const newItem = wsEventToActivity(event);
    if (newItem) {
      setLiveItems((prev) => [newItem, ...prev].slice(0, 30));
    }
  });

  const allItems = liveItems;

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={16} className="text-yellow-400" />
        <h3 className="text-white font-semibold text-sm">Actividad en Tiempo Real</h3>
        <span className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      </div>

      <div ref={containerRef} className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {allItems.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-6">Sin actividad reciente</p>
        ) : (
          allItems.map((item, i) => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config.icon;
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${config.bg}`}
              >
                <Icon size={14} className={`${config.color} shrink-0`} />
                <span className="text-slate-300 text-xs flex-1 truncate">{item.label}</span>
                {item.amount && (
                  <span className={`text-xs font-semibold ${config.color} shrink-0`}>
                    RD${Number(item.amount).toLocaleString()}
                  </span>
                )}
                <span className="text-slate-600 text-xs shrink-0">
                  {formatDistanceToNow(new Date(item.timestamp), { locale: es, addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function wsEventToActivity(event: WSEvent): ActivityItem | null {
  switch (event.type) {
    case 'SALE_REGISTERED':
      return {
        type: 'SALE',
        label: `Venta registrada — ${event.data.branchId}`,
        amount: String(event.data.amount ?? ''),
        timestamp: new Date().toISOString(),
      };
    case 'PRIZE_READY':
      return {
        type: 'RESULT',
        label: `Premios listos — ${event.data.count} ganadores`,
        amount: String(event.data.totalAmount ?? ''),
        timestamp: new Date().toISOString(),
      };
    case 'RESULT_PUBLISHED':
    case 'DRAW_OPEN':
    case 'DRAW_CLOSED':
      return {
        type: 'RESULT',
        label: `${event.type.replace('_', ' ')}`,
        amount: null,
        timestamp: new Date().toISOString(),
      };
    default:
      return null;
  }
}
