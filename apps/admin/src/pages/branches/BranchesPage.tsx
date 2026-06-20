import { useState } from 'react';
import { Plus, Building2, CheckCircle, XCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { useBranches, useUpdateBranchStatus } from '@/hooks/useAdminData';
import { api } from '@/lib/api';

export default function BranchesPage() {
  const { data: branches, isLoading } = useBranches();
  const updateStatus = useUpdateBranchStatus();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '' });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/branches', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); setShowForm(false); setForm({ name: '', code: '', address: '', phone: '' }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bancas</h1>
          <p className="text-slate-400 text-sm">{branches?.length ?? 0} registradas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> Nueva Banca
        </button>
      </div>

      {/* Formulario nueva banca */}
      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Nueva Banca</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { key: 'name', label: 'Nombre', placeholder: 'Ej: Sucursal Norte' },
              { key: 'code', label: 'Código', placeholder: 'Ej: B004' },
              { key: 'address', label: 'Dirección', placeholder: 'Opcional' },
              { key: 'phone', label: 'Teléfono', placeholder: 'Opcional' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-slate-400 text-xs mb-1">{label}</label>
                <input
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.code || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              {createMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <DataTable
        data={branches ?? []}
        keyField="id"
        loading={isLoading}
        emptyText="Sin bancas registradas"
        columns={[
          { key: 'code', header: 'Código', render: (r) => <span className="font-mono text-blue-400 font-bold">{r.code}</span> },
          { key: 'name', header: 'Nombre', render: (r) => <span className="text-white font-medium">{r.name}</span> },
          { key: 'address', header: 'Dirección', render: (r) => <span className="text-slate-400 text-xs">{r.address ?? '—'}</span> },
          { key: 'status', header: 'Estado', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'actions', header: 'Acciones', align: 'right',
            render: (r) => (
              <div className="flex justify-end gap-2">
                {r.status === 'ACTIVE' ? (
                  <button onClick={() => updateStatus.mutate({ id: r.id, status: 'SUSPENDED' })}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs transition-colors">
                    <XCircle size={14} /> Suspender
                  </button>
                ) : (
                  <button onClick={() => updateStatus.mutate({ id: r.id, status: 'ACTIVE' })}
                    className="flex items-center gap-1 text-green-400 hover:text-green-300 text-xs transition-colors">
                    <CheckCircle size={14} /> Activar
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
