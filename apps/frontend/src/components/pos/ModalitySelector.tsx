import { usePOSStore } from '@/stores/posStore';
import { Modality } from '@/types/lottery';

const MODALITIES: { value: Modality; label: string; short: string }[] = [
  { value: 'QUINIELA', label: 'Quiniela', short: 'Q' },
  { value: 'PALE', label: 'Palé', short: 'P' },
  { value: 'TRIPLETA', label: 'Tripleta', short: 'T' },
  { value: 'SUPER_PALE', label: 'Super Palé', short: 'SP' },
];

export function ModalitySelector() {
  const { modality, setModality } = usePOSStore();

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {MODALITIES.map((m) => (
        <button
          key={m.value}
          onClick={() => setModality(m.value)}
          className={`py-3 rounded-xl text-sm font-semibold transition-colors touch-target-sm ${
            modality === m.value
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          <span className="block text-base font-bold">{m.short}</span>
          <span className="block text-xs opacity-80">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
