import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'slate';
  badge?: string | number;
}

const colorMap = {
  blue: { bg: 'bg-blue-600/20', icon: 'text-blue-400', value: 'text-blue-300' },
  green: { bg: 'bg-green-600/20', icon: 'text-green-400', value: 'text-green-300' },
  red: { bg: 'bg-red-600/20', icon: 'text-red-400', value: 'text-red-300' },
  yellow: { bg: 'bg-yellow-600/20', icon: 'text-yellow-400', value: 'text-yellow-300' },
  slate: { bg: 'bg-slate-700', icon: 'text-slate-400', value: 'text-slate-200' },
};

export function KPICard({ title, value, sub, icon: Icon, color, badge }: KPICardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-slate-800 rounded-2xl p-4 flex items-start gap-4">
      <div className={`${c.bg} rounded-xl p-3 shrink-0`}>
        <Icon size={22} className={c.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider truncate">{title}</p>
        <p className={`${c.value} text-2xl font-bold leading-tight mt-0.5`}>{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
      {badge !== undefined && (
        <span className="ml-auto bg-slate-700 text-slate-300 text-xs font-semibold px-2 py-1 rounded-lg shrink-0">
          {badge}
        </span>
      )}
    </div>
  );
}
