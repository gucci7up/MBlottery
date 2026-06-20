import Decimal from 'decimal.js';
import { Modality } from '@prisma/client';

export interface BetInput {
  numbers: string[];
  amount: Decimal;
  multiplier: Decimal;
  modality: Modality;
}

export interface DrawResultInput {
  firstPrize: string;
  secondPrize?: string | null;
  thirdPrize?: string | null;
}

export class PrizeCalculator {
  static computePotential(amount: Decimal, multiplier: Decimal): Decimal {
    return amount.mul(multiplier);
  }

  static evaluateBet(bet: BetInput, result: DrawResultInput): boolean {
    const prizes = [
      result.firstPrize,
      result.secondPrize,
      result.thirdPrize,
    ].filter(Boolean) as string[];

    switch (bet.modality) {
      case Modality.QUINIELA:
        return prizes[0] === bet.numbers[0];

      case Modality.PALE: {
        const [n1, n2] = bet.numbers;
        return (
          prizes.includes(n1) &&
          prizes.includes(n2) &&
          n1 !== n2
        );
      }

      case Modality.TRIPLETA: {
        const [n1, n2, n3] = bet.numbers;
        return (
          prizes.includes(n1) &&
          prizes.includes(n2) &&
          prizes.includes(n3)
        );
      }

      default:
        return false;
    }
  }

  static computeActualPrize(bet: BetInput, result: DrawResultInput): Decimal {
    if (this.evaluateBet(bet, result)) {
      return bet.amount.mul(bet.multiplier);
    }
    return new Decimal(0);
  }
}
