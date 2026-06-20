/**
 * MockAdapter — Genera resultados simulados para desarrollo y pruebas.
 * No se usa en producción.
 */

import { LotteryResultAdapter, LotteryResultData } from './lottery-result.adapter';

export class MockAdapter implements LotteryResultAdapter {
  readonly providerCode: string;

  constructor(code: string) {
    this.providerCode = code;
  }

  async fetchLatestResult(): Promise<LotteryResultData> {
    const rnd = () => String(Math.floor(Math.random() * 100)).padStart(2, '0');
    return {
      firstPrize: rnd(),
      secondPrize: rnd(),
      thirdPrize: rnd(),
      drawDate: new Date(),
      source: 'MOCK',
    };
  }
}
