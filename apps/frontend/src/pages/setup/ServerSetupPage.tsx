import { useState } from 'react';
import { Server, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { saveServerUrl } from '@/lib/tauri';
import { updateApiBaseUrl } from '@/lib/api';

interface Props {
  onConfigured: () => void;
}

export default function ServerSetupPage({ onConfigured }: Props) {
  const [url, setUrl] = useState('https://api.');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleTest = async () => {
    const clean = url.trim().replace(/\/$/, '');
    setTesting(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      const res = await fetch(`${clean}/health`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        setStatus('ok');
      } else {
        setStatus('error');
        setErrorMsg(`Servidor respondió con error ${res.status}`);
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg('No se pudo conectar. Verifica la URL y que el servidor esté encendido.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const clean = url.trim().replace(/\/$/, '');
    saveServerUrl(clean);
    updateApiBaseUrl(clean);
    onConfigured();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Ícono */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Server size={32} className="text-blue-400" />
          </div>
          <h1 className="text-white text-xl font-bold">Configurar Servidor</h1>
          <p className="text-slate-400 text-sm mt-1">
            Ingresa la dirección del servidor al que se conectará esta app.
          </p>
        </div>

        {/* Input URL */}
        <div className="space-y-2">
          <label className="block text-slate-300 text-sm">URL del servidor</label>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setStatus('idle'); }}
            placeholder="https://api.tu-dominio.com"
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-blue-500 font-mono"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <p className="text-slate-500 text-xs">Ejemplo: https://api.mi-banca.com</p>
        </div>

        {/* Estado de la prueba */}
        {status === 'ok' && (
          <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 text-green-300 rounded-xl px-4 py-3 text-sm">
            <CheckCircle size={16} />
            Conexión exitosa — servidor respondiendo correctamente
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        {/* Botones */}
        <div className="space-y-3">
          <button
            onClick={handleTest}
            disabled={testing || !url.startsWith('http')}
            className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white py-3.5 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {testing ? <Loader size={18} className="animate-spin" /> : <Server size={18} />}
            {testing ? 'Probando conexión...' : 'Probar conexión'}
          </button>

          <button
            onClick={handleSave}
            disabled={status !== 'ok'}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-4 rounded-2xl font-bold text-lg transition-colors"
          >
            Guardar y continuar →
          </button>
        </div>

        <p className="text-slate-600 text-xs text-center">
          Esta configuración se guarda en el dispositivo y puede cambiarse desde el menú de ajustes.
        </p>
      </div>
    </div>
  );
}