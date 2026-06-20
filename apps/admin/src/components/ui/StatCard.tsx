import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'slate';
}

const colors = {
  blue:   { ring: 'ring-blue-500/20',   icon: 'bg-blue-500/10 text-blue-400',   value: 'text-blue-400' },
  green:  { ring: 'ring-green-500/20',  icon: 'bg-green-500/10 text-green-400', value: 'text-green-400' },
  red:    { ring: 'ring-red-500/20',    icon: 'bg-red-500/10 text-red-400',     value: 'text-red-400' },
  yellow: { ring: 'ring-yellow-500/20', icon: 'bg-yellow-500/10 text-yellow-400', value: 'text-yellow-400' },
  purple: { ring: 'ring-purple-500/20', icon: 'bg-purple-500/10 text-purple-400', value: 'text-purple-400' },
  slate:  { ring: 'ring-slate-500/20',  icon: 'bg-slate-700 text-slate-400',    value: 'text-white' },
};

export function StatCard({ title, value, sub, icon: Icon, trend, color = 'blue' }: StatCardProps) {
  const c = colors[color];
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-2xl p-5 ring-1 ${c.ring}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.icon}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
      {trend && (
        <p className={`text-xs mt-2 font-medium ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </div>
  );
}
