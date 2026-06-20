type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variants: Record<BadgeVariant, string> = {
  success: 'bg-green-500/10 text-green-400 ring-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
  danger: 'bg-red-500/10 text-red-400 ring-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  neutral: 'bg-slate-700 text-slate-300 ring-slate-600/20',
};

export function Badge({ label, variant = 'neutral' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${variants[variant]}`}>
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, BadgeVariant]> = {
    ACTIVE: ['Activo', 'success'],
    OPEN: ['Abierto', 'success'],
    RESULTED: ['Resultó', 'info'],
    CLOSED: ['Cerrado', 'neutral'],
    SUSPENDED: ['Suspendido', 'warning'],
    CANCELLED: ['Cancelado', 'danger'],
    WINNER: ['Ganador', 'success'],
    PAID: ['Pagado', 'info'],
    NOT_WINNER: ['No ganó', 'neutral'],
    PENDING: ['Pendiente', 'warning'],
    APPROVED: ['Aprobado', 'success'],
    DRAFT: ['Borrador', 'neutral'],
    CONFIRMED: ['Confirmado', 'success'],
  };
  const [label, variant] = map[status] ?? [status, 'neutral'];
  return <Badge label={label} variant={variant} />;
}
