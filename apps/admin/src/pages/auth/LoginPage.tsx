import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Delete, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATOR_ADMIN', 'BRANCH_OWNER', 'BRANCH_MANAGER', 'SUPERVISOR'];

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'username' | 'pin'>('username');

  const loginMutation = useMutation({
    mutationFn: (data: { username: string; pin: string }) =>
      api.post('/auth/login', data).then((r) => r.data),
    onSuccess: (data) => {
      if (!ADMIN_ROLES.includes(data.user.role)) {
        setError('Acceso denegado. Este panel es solo para administradores.');
        setPin('');
        return;
      }
      setAuth(data.user, data.accessToken);
      navigate('/dashboard', { replace: true });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Credenciales inválidas');
      setPin('');
    },
  });

  const handleDigit = useCallback((d: string) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length >= 4) {
      loginMutation.mutate({ username, pin: next });
    }
  }, [pin, username, loginMutation]);

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 border-r border-slate-700 items-center justify-center p-12">
        <div>
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Panel Administrativo</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Administra bancas, sorteos, resultados, reportes y configuración del sistema de lotería.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {['Dashboard en tiempo real', 'Gestión de bancas', 'Control de resultados', 'Reportes financieros'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-slate-300 text-sm">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xs space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield size={24} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Acceso Admin</h2>
          </div>

          {step === 'username' ? (
            <form onSubmit={(e) => { e.preventDefault(); if (username.trim()) setStep('pin'); }} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                  placeholder="Ingresa tu usuario"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!username.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl py-3 font-semibold transition-colors"
              >
                Continuar →
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button onClick={() => { setStep('username'); setPin(''); setError(''); }} className="text-slate-400 text-sm hover:text-white">
                ← {username}
              </button>
              <p className="text-slate-300 text-sm text-center">Ingresa tu PIN</p>
              <div className="flex justify-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full border-2 transition-colors ${i < pin.length ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`} />
                ))}
              </div>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9'].map((d) => (
                  <button key={d} onClick={() => handleDigit(d)} disabled={loginMutation.isPending}
                    className="h-14 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-xl font-semibold rounded-xl transition-colors disabled:opacity-40">
                    {d}
                  </button>
                ))}
                <div />
                <button onClick={() => handleDigit('0')} disabled={loginMutation.isPending}
                  className="h-14 bg-slate-700 hover:bg-slate-600 text-white text-xl font-semibold rounded-xl transition-colors disabled:opacity-40">
                  0
                </button>
                <button onClick={() => setPin((p) => p.slice(0, -1))} disabled={loginMutation.isPending}
                  className="h-14 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center">
                  <Delete size={20} />
                </button>
              </div>
              {loginMutation.isPending && <p className="text-slate-400 text-xs text-center">Verificando...</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
