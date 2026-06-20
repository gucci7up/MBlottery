export type Modality = 'QUINIELA' | 'PALE' | 'TRIPLETA' | 'SUPER_PALE';

export interface Draw {
  id: string;
  name: string;
  closeAt: string;
  status: string;
  provider: { id: string; name: string; code: string; logoUrl?: string };
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  serialCode: string;
  status: string;
  totalAmount: string;
  potentialPrize: string;
  actualPrize?: string;
  createdAt: string;
  bets: Bet[];
  draw?: Draw;
  branch?: { name: string };
}

export interface Bet {
  id: string;
  modality: Modality;
  numbers: string[];
  amount: string;
  multiplier: string;
  potentialPrize: string;
  isWinner?: boolean;
  prizeAmount?: string;
}
