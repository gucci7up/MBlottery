import { Delete } from 'lucide-react';
import { usePOSStore } from '@/stores/posStore';

const QUICK_AMOUNTS = [20, 50, 100, 200];

export function NumberPad() {
  const { addDigit, deleteDigit, setAmount, currentAmount } = usePOSStore();

  return (
    <div className="space-y-2">
      {/* Montos rápidos */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => setAmount(a)}
            className={`py-3 rounded-xl text-sm font-semibold transition-colors touch-target-sm ${
              currentAmount === a
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            ${a}
          </button>
        ))}
      </div>

      {/* Teclado numérico 3×4 */}
      <div className="grid grid-cols-3 gap-2">
        {['1','2','3','4','5','6','7','8','9'].map((d) => (
          <button
            key={d}
            onClick={() => addDigit(d)}
            className="touch-target flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-2xl font-bold rounded-2xl transition-colors active:scale-95"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => addDigit('0')}
          className="touch-target flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white text-2xl font-bold rounded-2xl transition-colors active:scale-95"
        >
          0
        </button>
        <button
          onClick={deleteDigit}
          className="touch-target flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-2xl transition-colors active:scale-95"
        >
          <Delete size={22} />
        </button>
      </div>
    </div>
  );
}
