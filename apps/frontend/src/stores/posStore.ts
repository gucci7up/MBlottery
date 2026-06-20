import { create } from 'zustand';
import { Modality } from '../types/lottery';

export interface BetSlipItem {
  id: string;
  modality: Modality;
  numbers: string[];
  amount: number;
  potentialPrize?: number;
  multiplier?: number;
}

interface POSState {
  selectedDrawId: string | null;
  selectedProviderId: string | null;
  modality: Modality;
  currentNumbers: string[];
  currentAmount: number;
  betSlip: BetSlipItem[];
  setDraw: (drawId: string, providerId: string) => void;
  setModality: (m: Modality) => void;
  addDigit: (d: string) => void;
  deleteDigit: () => void;
  clearNumbers: () => void;
  setAmount: (a: number) => void;
  addBet: () => boolean;
  removeBet: (id: string) => void;
  clearSlip: () => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  selectedDrawId: null,
  selectedProviderId: null,
  modality: 'QUINIELA',
  currentNumbers: [],
  currentAmount: 0,
  betSlip: [],

  setDraw: (drawId, providerId) =>
    set({ selectedDrawId: drawId, selectedProviderId: providerId, betSlip: [] }),

  setModality: (modality) => set({ modality, currentNumbers: [] }),

  addDigit: (d) => {
    const { currentNumbers, modality } = get();
    const maxDigits = { QUINIELA: 2, PALE: 4, TRIPLETA: 6, SUPER_PALE: 4 }[modality];
    const flat = currentNumbers.join('');
    if (flat.length < maxDigits) {
      set({ currentNumbers: [...currentNumbers, d] });
    }
  },

  deleteDigit: () => {
    const { currentNumbers } = get();
    set({ currentNumbers: currentNumbers.slice(0, -1) });
  },

  clearNumbers: () => set({ currentNumbers: [], currentAmount: 0 }),

  setAmount: (amount) => set({ currentAmount: amount }),

  addBet: () => {
    const { modality, currentNumbers, currentAmount, betSlip } = get();
    const required = { QUINIELA: 2, PALE: 4, TRIPLETA: 6, SUPER_PALE: 4 }[modality];
    const flat = currentNumbers.join('');

    if (flat.length < required || currentAmount <= 0) return false;

    let numbers: string[];
    if (modality === 'QUINIELA') numbers = [flat];
    else if (modality === 'PALE') numbers = [flat.slice(0, 2), flat.slice(2, 4)];
    else if (modality === 'TRIPLETA') numbers = [flat.slice(0, 2), flat.slice(2, 4), flat.slice(4, 6)];
    else numbers = [flat.slice(0, 2), flat.slice(2, 4)];

    const newBet: BetSlipItem = {
      id: crypto.randomUUID(),
      modality,
      numbers,
      amount: currentAmount,
    };

    set({ betSlip: [...betSlip, newBet], currentNumbers: [], currentAmount: 0 });
    return true;
  },

  removeBet: (id) => set((s) => ({ betSlip: s.betSlip.filter((b) => b.id !== id) })),
  clearSlip: () => set({ betSlip: [], currentNumbers: [], currentAmount: 0 }),
}));
