import { useState } from 'react';
import { CheckCircle, Plus, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { useResults, usePublishResult, useConfirmResult, useDraws } from '@/hooks/useAdminData';
import { format } from 'date-fns';

export default function ResultsPage() {
  const { data: results, isLoading } = useResults();
  const { data: closedDraws } = useDraws('CLOSED');
  const publishResult = usePublishResult();
  const confirmResult = useConfirmResult();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ drawId: '', firstPrize: '', secondPrize: '', thirdPrize: '' });
  const [error, setError] = useState('');

  const handlePublish = async () => {
    setError('');
    if (!form.drawId || !form.firstPrize.match(/^\d{2}$/)) {
      setError('Selecciona un sorteo y un primer premio de 2 dígitos');
      return;
    }
    try {
      await publishResult.mutateAsync({ ...form, firstPrize: form.firstPrize.padStart(2, '0') });
      setShowForm(false);
      setForm({ drawId: '', firstPrize: '', secondPrize: '', thirdPrize: '' });
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al publicar');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Resultados</h1>
          <p className="text-slate-400 text-sm">Publicación y confirmación de premios</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} /> Publicar Resultado
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Nuevo Resultado</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-slate-400 text-xs mb-1">Sorteo</label>
              <select value={form.drawId} onChange={(e) => setForm(f => ({ ...f, drawId: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Seleccionar sorteo cerrado...</option>
                {(closedDraws ?? []).map((d: { id: string; name: string }) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {[
              { key: 'firstPrize', label: '1er Premio *', placeholder: '00' },
              { key: 'secondPrize', label: '2do Premio', placeholder: '00' },
              { key: 'thirdPrize', label: '3er Premio', placeholder: '00' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-slate-400 text-xs mb-1">{label}</label>
                <input
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                  placeholder={placeholder} maxLength={2}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm font-mono text-center text-2xl focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-4 py-2 text-yellow-300 text-xs mb-4">
            ⚠️ Este resultado quedará en estado DRAFT. Requiere confirmación de un segundo usuario para procesar los premios.
          </div>
          <div className="flex gap-2">
            <button onClick={handlePublish} disabled={publishResult.isPending}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              {publishResult.isPending ? 'Publicando...' : 'Publicar (DRAFT)'}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <DataTable
        data={results ?? []}
        keyField="id"
        loading={isLoading}
        emptyText="Sin resultados publicados"
        columns={[
          { key: 'draw', header: 'Sorteo', render: r => <span className="text-white font-medium">{r.draw?.name}</span> },
          { key: 'prizes', header: 'Premios', render: r => (
            <div className="flex gap-2">
              <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-sm font-mono font-bold">{r.firstPrize}</span>
              {r.secondPrize && <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-sm font-mono">{r.secondPrize}</span>}
              {r.thirdPrize && <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-sm font-mono">{r.thirdPrize}</span>}
            </div>
          )},
          { key: 'publisher', header: 'Publicado por', render: r => <span className="text-slate-400 text-sm">{r.publisher?.name}</span> },
          { key: 'publishedAt', header: 'Fecha', render: r => <span className="text-slate-500 text-xs">{format(new Date(r.publishedAt), 'dd/MM HH:mm')}</span> },
          { key: 'status', header: 'Estado', render: r => <StatusBadge status={r.status} /> },
          {
            key: 'actions', header: '', align: 'right',
            render: r => r.status === 'DRAFT' ? (
              <button onClick={() => confirmResult.mutate(r.drawId)}
                disabled={confirmResult.isPending}
                className="flex items-center gap-1 text-green-400 hover:text-green-300 text-xs transition-colors disabled:opacity-40">
                <CheckCircle size={13} /> Confirmar y procesar premios
              </button>
            ) : r.status === 'CONFIRMED' ? (
              <button onClick={() => { /* reprocess */ }}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-300 text-xs transition-colors">
                <RefreshCw size={13} /> Reprocesar
              </button>
            ) : null,
          },
        ]}
      />
    </div>
  );
}
