/**
 * Adapter Pattern para fuentes de resultados de loterías.
 *
 * Cada lotería tiene un adapter que sabe cómo obtener su resultado.
 * Todos los adapters implementan esta interfaz.
 *
 * Para agregar una nueva fuente:
 * 1. Crear clase que implemente LotteryResultAdapter
 * 2. Registrarla en LotteryAdapterRegistry con el código de la lotería
 */

export interface LotteryResultData {
  firstPrize: string;
  secondPrize?: string;
  thirdPrize?: string;
  extraNumbers?: string[];
  drawDate: Date;
  source: string;
}

export interface LotteryResultAdapter {
  /** Código del proveedor que este adapter maneja */
  readonly providerCode: string;
  /** Obtiene el resultado más reciente del sorteo */
  fetchLatestResult(): Promise<LotteryResultData | null>;
}
