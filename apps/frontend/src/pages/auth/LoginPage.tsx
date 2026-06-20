import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Delete } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const PIN_LENGTH = 6;

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
      setAuth(data.user, data.accessToken);
      const posRoles = ['CASHIER', 'SUPERVISOR', 'BRANCH_MANAGER'];
      navigate(posRoles.includes(data.user.role) ? '/pos' : '/dashboard', { replace: true });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message ?? 'Credenciales inválidas');
      setPin('');
    },
  });

  const handlePinPress = useCallback(
    (digit: string) => {
      if (pin.length >= PIN_LENGTH) return;
      const next = pin + digit;
      setPin(next);
      setError('');

      if (next.length === PIN_LENGTH) {
        loginMutation.mutate({ username, pin: next });
      }
    },
    [pin, username, loginMutation],
  );

  const handleDelete = useCallback(() => {
    setPin((p) => p.slice(0, -1));
    setError('');
  }, []);

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) setStep('pin');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        {/* Logo / Marca */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">SB</span>
          </div>
          <h1 className="text-white text-xl font-semibold">Sistema de Banca</h1>
          <p className="text-slate-400 text-sm mt-1">Lotería RD</p>
        </div>

        {step === 'username' ? (
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-4 text-lg focus:outline-none focus:border-blue-500"
                placeholder="Ingresa tu usuario"
                autoFocus
                autoComplete="username"
              />
            </div>
            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl py-4 text-lg font-semibold transition-colors touch-target"
            >
              Continuar
            </button>
          </form>
        ) : (
          <div>
            {/* Usuario seleccionado */}
            <button
              onClick={() => { setStep('username'); setPin(''); setError(''); }}
              className="flex items-center gap-2 text-slate-400 text-sm mb-6 hover:text-slate-200 transition-colors"
            >
              ← {username}
            </button>

            <p className="text-slate-300 text-sm text-center mb-6">Ingresa tu PIN</p>

            {/* Puntos del PIN */}
            <div className="flex justify-center gap-3 mb-6">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    i < pin.length
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-slate-600'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm text-center mb-4">
                {error}
              </div>
            )}

            {/* Teclado numérico */}
            <div className="grid grid-cols-3 gap-3">
              {['1','2','3','4','5','6','7','8','9'].map((d) => (
                <PinButton key={d} label={d} onPress={() => handlePinPress(d)} disabled={loginMutation.isPending} />
              ))}
              <div />
              <PinButton label="0" onPress={() => handlePinPress('0')} disabled={loginMutation.isPending} />
              <button
                onClick={handleDelete}
                disabled={!pin || loginMutation.isPending}
                className="touch-target flex items-center justify-center bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-2xl transition-colors active:scale-95"
              >
                <Delete size={22} className="text-slate-300" />
              </button>
            </div>

            {loginMutation.isPending && (
              <p className="text-center text-slate-400 text-sm mt-4">Verificando...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PinButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className="touch-target flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-40 text-white text-2xl font-semibold rounded-2xl transition-colors active:scale-95"
    >
      {label}
    </button>
  );
}
