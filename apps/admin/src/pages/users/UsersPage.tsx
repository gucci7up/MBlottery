import { useState } from 'react';
import { Plus, Lock, Unlock, UserX } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { useUsers, useDeactivateUser, useUnlockUser, useCreateUser } from '@/hooks/useAdminData';
import { format } from 'date-fns';

const ROLES = ['OPERATOR_ADMIN', 'BRANCH_OWNER', 'BRANCH_MANAGER', 'SUPERVISOR', 'CASHIER'];

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const deactivate = useDeactivateUser();
  const unlock = useUnlockUser();
  const create = useCreateUser();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', pin: '', role: 'CASHIER', branchId: '' });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <p className="text-slate-400 text-sm">{users?.length ?? 0} registrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Nuevo Usuario</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {[
              { key: 'name', label: 'Nombre completo', placeholder: 'Juan Pérez' },
              { key: 'username', label: 'Usuario', placeholder: 'juanperez' },
              { key: 'pin', label: 'PIN (4-8 dígitos)', placeholder: '****', type: 'password' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-slate-400 text-xs mb-1">{label}</label>
                <input
                  type={type ?? 'text'}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-slate-400 text-xs mb-1">Rol</label>
              <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => create.mutate(form)} disabled={!form.name || !form.username || !form.pin || create.isPending}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              {create.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <DataTable
        data={users ?? []}
        keyField="id"
        loading={isLoading}
        emptyText="Sin usuarios registrados"
        columns={[
          { key: 'name', header: 'Nombre', render: r => <span className="text-white font-medium">{r.name}</span> },
          { key: 'username', header: 'Usuario', render: r => <span className="font-mono text-slate-300 text-sm">{r.username}</span> },
          { key: 'role', header: 'Rol', render: r => <Badge label={r.role} variant="info" /> },
          { key: 'branch', header: 'Banca', render: r => <span className="text-slate-400 text-sm">{r.branch?.name ?? 'Todas'}</span> },
          { key: 'lastLoginAt', header: 'Último acceso', render: r => <span className="text-slate-500 text-xs">{r.lastLoginAt ? format(new Date(r.lastLoginAt), 'dd/MM HH:mm') : '—'}</span> },
          { key: 'active', header: 'Estado', render: r => <StatusBadge status={r.active ? 'ACTIVE' : 'SUSPENDED'} /> },
          {
            key: 'actions', header: '', align: 'right',
            render: r => (
              <div className="flex justify-end gap-2">
                {r.active && (
                  <button onClick={() => deactivate.mutate(r.id)} className="text-red-400 hover:text-red-300 transition-colors" title="Desactivar">
                    <UserX size={15} />
                  </button>
                )}
                {r.lockedUntil && new Date(r.lockedUntil) > new Date() && (
                  <button onClick={() => unlock.mutate(r.id)} className="text-yellow-400 hover:text-yellow-300 transition-colors" title="Desbloquear">
                    <Unlock size={15} />
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
