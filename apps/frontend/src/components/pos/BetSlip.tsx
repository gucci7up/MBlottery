import { Trash2 } from 'lucide-react';
import { usePOSStore } from '@/stores/posStore';

const MODALITY_LABELS = {
  QUINIELA: 'Q',
  PALE: 'P',
  TRIPLETA: 'T',
  SUPER_PALE: 'SP',
};

export function BetSlip() {
  const { betSlip, removeBet } = usePOSStore();

  if (betSlip.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
        Sin jugadas
      </div>
    );
  }

  const total = betSlip.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      {betSlip.map((bet) => (
        <div
          key={bet.id}
          className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-xs font-bold w-6">
              {MODALITY_LABELS[bet.modality]}
            </span>
            <span className="text-white font-mono text-sm">{bet.numbers.join('-')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-sm font-semibold">
              RD${bet.amount.toLocaleString()}
            </span>
            <button
              onClick={() => removeBet(bet.id)}
              className="text-slate-500 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <div className="border-t border-slate-700 mt-1 pt-2 flex justify-between text-sm">
        <span className="text-slate-400">Total</span>
        <span className="text-white font-bold">RD${total.toLocaleString()}</span>
      </div>
    </div>
  );
}
