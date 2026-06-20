import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class TicketGenerator {
  static generateSerialCode(): string {
    return uuidv4();
  }

  /**
   * Genera el número de ticket legible para una banca.
   * Formato: {CODIGO_BANCA}-{SECUENCIAL 5 dígitos}
   * El secuencial viene de la DB (sequence por banca).
   */
  static buildTicketNumber(branchCode: string, sequence: number): string {
    return `${branchCode}-${String(sequence).padStart(5, '0')}`;
  }

  /**
   * HMAC-SHA256 sobre campos inmutables del ticket.
   * El resultado se almacena como integrityHash.
   */
  static computeIntegrityHash(params: {
    ticketId: string;
    branchId: string;
    cashierId: string;
    drawId: string | null;
    totalAmount: string;
    potentialPrize: string;
    createdAt: string;
  }): string {
    const key = process.env.TICKET_SIGNING_KEY;
    if (!key) throw new Error('TICKET_SIGNING_KEY no configurada');

    const payload = [
      params.ticketId,
      params.branchId,
      params.cashierId,
      params.drawId ?? 'SUPER_PALE',
      params.totalAmount,
      params.potentialPrize,
      params.createdAt,
    ].join('|');

    return crypto.createHmac('sha256', key).update(payload).digest('hex');
  }

  static verifyIntegrityHash(params: Parameters<typeof TicketGenerator.computeIntegrityHash>[0], storedHash: string): boolean {
    const computed = TicketGenerator.computeIntegrityHash(params);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
  }
}
