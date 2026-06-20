import { useState } from 'react';
import { LogOut, CreditCard, Plus, CheckCircle, AlertCircle, Search, Trophy, Ban, WifiOff, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePOSStore } from '@/stores/posStore';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useSellTicket, useVerifyTicket, usePayPrize } from '@/hooks/usePOS';
import { useOffline } from '@/hooks/useOffline';
import { Ticket } from '@/types/lottery';
import { DrawSelector } from '@/components/pos/DrawSelector';
import { ModalitySelector } from '@/components/pos/ModalitySelector';
import { NumberPad } from '@/components/pos/NumberPad';
import { BetSlip } from '@/components/pos/BetSlip';

export default function POSPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const {
    selectedDrawId,
    modality,
    currentNumbers,
    currentAmount,
    betSlip,
    addBet,
    clearSlip,
  } = usePOSStore();

  const [activePanel, setActivePanel] = useState<'sell' | 'pay'>('sell');
  const [lastTicket, setLastTicket] = useState<{ ticketNumber: string; total: number } | null>(null);
  const [error, setError] = useState('');

  const sellMutation = useSellTicket();
  const { isOnline, pendingCount, triggerSync } = useOffline();

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    logout();
    navigate('/login', { replace: true });
  };

  const handleAddBet = () => {
    const ok = addBet();
    if (!ok) setError('Completa el número y el monto antes de agregar');
    else setError('');
  };

  const handleSell = async () => {
    if (!selectedDrawId) { setError('Selecciona un sorteo'); return; }
    if (betSlip.length === 0) { setError('Agrega al menos una jugada'); return; }
    setError('');

    try {
      const ticket = await sellMutation.mutateAsync(betSlip);
      setLastTicket({
        ticketNumber: ticket.ticketNumber,
        total: betSlip.reduce((s, b) => s + b.amount, 0),
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Error al crear el ticket');
    }
  };

  // Construir display del número en proceso
  const displayNumbers = () => {
    const flat = currentNumbers.join('');
    const required = { QUINIELA: 2, PALE: 4, TRIPLETA: 6, SUPER_PALE: 4 }[modality];
    return flat.padEnd(required, '_');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col max-w-sm mx-auto">
      {/* Header */}
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-red-900/80 border-b border-red-700 px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-300 text-xs">
            <WifiOff size={12} />
            Sin conexión — Modo limitado
            {pendingCount > 0 && <span className="font-bold">· {pendingCount} en cola</span>}
          </div>
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="bg-yellow-900/60 border-b border-yellow-700 px-4 py-1.5 flex items-center justify-between">
          <span className="text-yellow-300 text-xs">{pendingCount} ticket(s) pendientes de sincronizar</span>
          <button onClick={triggerSync} className="text-yellow-400 hover:text-yellow-200">
            <RefreshCw size={12} />
          </button>
        </div>
      )}

      <header className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div>
          <p className="text-white text-sm font-semibold leading-tight">
            {user?.branch?.name ?? 'Banca'}
          </p>
          <p className="text-slate-400 text-xs">{user?.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActivePanel(p => p === 'sell' ? 'pay' : 'sell')}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-xl px-3 py-2 transition-colors"
          >
            <CreditCard size={14} />
            {activePanel === 'sell' ? 'Cobrar' : 'Vender'}
          </button>
          <button
            onClick={handleLogout}
            className="bg-slate-700 hover:bg-red-900 text-slate-400 rounded-xl px-3 py-2 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {activePanel === 'sell' ? (
        <main className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
          {/* Sorteo */}
          <section>
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1.5">Sorteo</p>
            <DrawSelector />
          </section>

          {/* Modalidad */}
          <section>
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1.5">Modalidad</p>
            <ModalitySelector />
          </section>

          {/* Display número + monto */}
          <section className="bg-slate-800 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-3xl text-white tracking-widest">
                {displayNumbers()}
              </span>
              {currentAmount > 0 && (
                <span className="text-green-400 font-bold text-lg">
                  RD${currentAmount}
                </span>
              )}
            </div>
            <NumberPad />
          </section>

          {/* Botón agregar jugada */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/30 rounded-xl px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <button
            onClick={handleAddBet}
            className="flex items-center justify-center gap-2 w-full bg-slate-700 hover:bg-slate-600 text-white py-3.5 rounded-2xl font-semibold transition-colors touch-target"
          >
            <Plus size={18} />
            Agregar Jugada
          </button>

          {/* Betslip */}
          {betSlip.length > 0 && (
            <section className="bg-slate-800/50 rounded-2xl p-3">
              <BetSlip />
            </section>
          )}

          {/* Confirmación de último ticket */}
          {lastTicket && !sellMutation.isPending && (
            <div className="flex items-center gap-2 bg-green-900/40 border border-green-700 text-green-300 rounded-xl px-3 py-2 text-sm">
              <CheckCircle size={16} />
              Ticket {lastTicket.ticketNumber} — RD${lastTicket.total.toLocaleString()}
            </div>
          )}

          {/* Botón vender */}
          <button
            onClick={handleSell}
            disabled={sellMutation.isPending || betSlip.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-4 rounded-2xl font-bold text-lg transition-colors touch-target"
          >
            {sellMutation.isPending ? 'Procesando...' : `VENDER — RD$${betSlip.reduce((s,b) => s + b.amount, 0).toLocaleString()}`}
          </button>

          {betSlip.length > 0 && (
            <button
              onClick={() => { clearSlip(); setLastTicket(null); }}
              className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors"
            >
              Limpiar jugadas
            </button>
          )}
        </main>
      ) : (
        <PayPanel onBack={() => setActivePanel('sell')} />
      )}
    </div>
  );
}

function PayPanel({ onBack }: { onBack: () => void }) {
  const [serial, setSerial] = useState('');
  const [ticket, setTicket] = useState<(Ticket & { integrityValid: boolean }) | null>(null);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState<{ ticketNumber: string; prizeAmount: string } | null>(null);

  const verifyMutation = useVerifyTicket();
  const payMutation = usePayPrize();

  const handleSearch = async () => {
    if (!serial.trim()) return;
    setError('');
    setTicket(null);
    setPaid(null);
    try {
      const data = await verifyMutation.mutateAsync(serial.trim());
      setTicket(data);
    } catch {
      setError('Ticket no encontrado');
    }
  };

  const handlePay = async () => {
    if (!ticket) return;
    setError('');
    try {
      const result = await payMutation.mutateAsync({ ticketId: ticket.id });
      setPaid({ ticketNumber: result.ticketNumber, prizeAmount: result.prizeAmount });
      setTicket(null);
      setSerial('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Error al procesar el pago');
    }
  };

  const statusColor = (s: string) => ({
    WINNER: 'text-green-400',
    PAID: 'text-slate-400',
    ACTIVE: 'text-blue-400',
    NOT_WINNER: 'text-slate-500',
    CANCELLED: 'text-red-400',
  }[s] ?? 'text-slate-400');

  return (
    <main className="flex-1 flex flex-col p-3 gap-3">
      <button onClick={onBack} className="text-slate-400 text-sm self-start hover:text-white transition-colors">
        ← Volver a Venta
      </button>

      <p className="text-white font-bold text-xl">Cobrar Premio</p>

      {/* Pago exitoso */}
      {paid && (
        <div className="bg-green-900/40 border border-green-600 rounded-2xl p-5 text-center space-y-2">
          <Trophy size={36} className="text-green-400 mx-auto" />
          <p className="text-green-300 font-bold text-lg">¡Premio pagado!</p>
          <p className="text-white font-mono">{paid.ticketNumber}</p>
          <p className="text-green-400 font-bold text-3xl">RD${Number(paid.prizeAmount).toLocaleString()}</p>
          <button onClick={() => setPaid(null)} className="text-slate-400 text-sm mt-2 hover:text-white">
            Cobrar otro →
          </button>
        </div>
      )}

      {!paid && (
        <>
          {/* Input de búsqueda */}
          <div className="flex gap-2">
            <input
              value={serial}
              onChange={(e) => { setSerial(e.target.value); setTicket(null); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Código del ticket o número"
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={verifyMutation.isPending || !serial.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-4 rounded-xl transition-colors"
            >
              <Search size={18} />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Resultado del ticket */}
          {ticket && (
            <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
              {/* Alerta de integridad */}
              {!ticket.integrityValid && (
                <div className="flex items-center gap-2 bg-red-900/40 border border-red-600 text-red-300 rounded-xl px-3 py-2 text-xs">
                  <Ban size={14} />
                  Alerta: Integridad del ticket inválida
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Ticket</span>
                <span className="text-white font-mono text-sm">{ticket.ticketNumber}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Sorteo</span>
                <span className="text-white text-sm">{ticket.draw?.name ?? '—'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Estado</span>
                <span className={`text-sm font-bold ${statusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Apostado</span>
                <span className="text-white text-sm">RD${Number(ticket.totalAmount).toLocaleString()}</span>
              </div>

              {/* Jugadas */}
              <div className="border-t border-slate-700 pt-2 space-y-1">
                {ticket.bets.map((b) => (
                  <div key={b.id} className="flex justify-between text-xs">
                    <span className="text-slate-400">{b.modality[0]} {b.numbers.join('-')}</span>
                    <span className={b.isWinner ? 'text-green-400 font-bold' : 'text-slate-500'}>
                      RD${Number(b.amount).toLocaleString()}
                      {b.isWinner && ` → RD$${Number(b.prizeAmount).toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Botón pagar — solo si WINNER */}
              {ticket.status === 'WINNER' && ticket.actualPrize && (
                <button
                  onClick={handlePay}
                  disabled={payMutation.isPending || !ticket.integrityValid}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-4 rounded-2xl font-bold text-xl transition-colors touch-target"
                >
                  {payMutation.isPending
                    ? 'Procesando...'
                    : `PAGAR RD$${Number(ticket.actualPrize).toLocaleString()}`}
                </button>
              )}

              {ticket.status === 'NOT_WINNER' && (
                <div className="text-center text-slate-500 text-sm py-2">
                  Este ticket no tiene premios
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
