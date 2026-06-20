/**
 * Registry de adapters.
 *
 * Registra qué adapter usar para cada código de proveedor.
 * Al integrar una API real, crear el adapter e importarlo aquí.
 *
 * Ejemplo para producción:
 *   registry.register(new NacionalAdapter({ apiKey: process.env.NACIONAL_API_KEY }));
 */

import { Injectable, Logger } from '@nestjs/common';
import { LotteryResultAdapter } from './lottery-result.adapter';
import { MockAdapter } from './mock.adapter';

@Injectable()
export class AdapterRegistry {
  private readonly logger = new Logger(AdapterRegistry.name);
  private adapters = new Map<string, LotteryResultAdapter>();

  constructor() {
    // Registrar adapters disponibles
    // En producción: registrar adapters reales aquí
    if (process.env.NODE_ENV !== 'production') {
      const mockCodes = ['NAC', 'LEIDSA', 'LOTEKA', 'REAL', 'GANA_MAS', 'NY_TARDE', 'NY_NOCHE', 'FL_DIA', 'FL_NOCHE', 'KING', 'ANGUILLA'];
      for (const code of mockCodes) {
        this.register(new MockAdapter(code));
      }
      this.logger.warn('Usando MockAdapters para todos los proveedores (development)');
    }
  }

  register(adapter: LotteryResultAdapter) {
    this.adapters.set(adapter.providerCode, adapter);
    this.logger.log(`Adapter registrado: ${adapter.providerCode}`);
  }

  get(providerCode: string): LotteryResultAdapter | undefined {
    return this.adapters.get(providerCode);
  }

  has(providerCode: string): boolean {
    return this.adapters.has(providerCode);
  }

  listRegistered(): string[] {
    return Array.from(this.adapters.keys());
  }
}
