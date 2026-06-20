import { useState } from 'react';
import { Play, Square, Plus, Clock } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { useDraws, useOpenDraw, useCloseDraw, useLotteryProviders } from '@/hooks/useAdminData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

export default function DrawsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: draws, isLoading } = useDraws(statusFilter || undefined);
  const { data: providers } = useLotteryProviders();
  const openDraw = useOpenDraw();
  const closeDraw = useCloseDraw();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ providerId: '', name: '', scheduledAt: '', openAt: '', closeAt: '' });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/draws', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['draws'] }); setShowForm(false); },
  });

  const STATUS_OPTIONS = ['', 'SCHEDULED', 'OPEN', 'CLOSED', 'RESULTED', 'CANCELLED'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Sorteos</h1>
          <p className="text-slate-400 text-sm">{draws?.length ?? 0} registrados</p>
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'Todos los estados'}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> Nuevo Sorteo
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Nuevo Sorteo</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Lotería</label>
              <select value={form.providerId} onChange={(e) => setForm(f => ({ ...f, providerId: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Seleccionar...</option>
                {(providers ?? []).map((p: { id: string; name: string; code: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Nombre</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Nacional Mediodía"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            {[{ key: 'scheduledAt', label: 'Hora del sorteo' }, { key: 'openAt', label: 'Apertura de ventas' }, { key: 'closeAt', label: 'Cierre de ventas' }].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-slate-400 text-xs mb-1">{label}</label>
                <input type="datetime-local" value={(form as Record<string, string>)[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(form)} disabled={!form.providerId || !form.name || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              {createMutation.isPending ? 'Creando...' : 'Crear Sorteo'}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <DataTable
        data={draws ?? []}
        keyField="id"
        loading={isLoading}
        emptyText="Sin sorteos"
        columns={[
          { key: 'provider', header: 'Lotería', render: r => <span className="text-slate-300 text-sm">{r.provider?.name}</span> },
          { key: 'name', header: 'Nombre', render: r => <span className="text-white font-medium">{r.name}</span> },
          { key: 'scheduledAt', header: 'Hora', render: r => (
            <div className="flex items-center gap-1 text-slate-400 text-sm">
              <Clock size={13} />
              {format(new Date(r.scheduledAt), 'dd/MM HH:mm')}
            </div>
          )},
          { key: 'closeAt', header: 'Cierra', render: r => <span className="text-slate-400 text-sm">{format(new Date(r.closeAt), 'HH:mm')}</span> },
          { key: 'status', header: 'Estado', render: r => <StatusBadge status={r.status} /> },
          {
            key: 'actions', header: '', align: 'right',
            render: r => (
              <div className="flex justify-end gap-2">
                {r.status === 'SCHEDULED' && (
                  <button onClick={() => openDraw.mutate(r.id)} className="flex items-center gap-1 text-green-400 hover:text-green-300 text-xs transition-colors">
                    <Play size={13} /> Abrir
                  </button>
                )}
                {r.status === 'OPEN' && (
                  <button onClick={() => closeDraw.mutate(r.id)} className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 text-xs transition-colors">
                    <Square size={13} /> Cerrar
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
