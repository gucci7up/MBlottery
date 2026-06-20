import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, DrawStatus } from '@prisma/client';

@Injectable()
export class TicketExpiryJob {
  private readonly logger = new Logger(TicketExpiryJob.name);

  constructor(private prisma: PrismaService) {}

  /** Corre diariamente a las 00:05 AM hora servidor */
  @Cron('5 0 * * *')
  async handleExpiry() {
    this.logger.log('Iniciando expiración de tickets...');

    const defaultExpiryDays = 30;

    // Obtener todos los operadores con su configuración de vigencia
    const operators = await this.prisma.operator.findMany({
      where: { status: 'ACTIVE' },
      include: {
        settings: { where: { key: 'ticket_expiry_days' } },
      },
    });

    let totalExpired = 0;

    for (const operator of operators) {
      const expiryDays =
        operator.settings[0] ? parseInt(operator.settings[0].value) : defaultExpiryDays;

      // Fecha de corte: sorteos que resultaron hace más de expiryDays días
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - expiryDays);

      // Expirar tickets WINNER que no fueron cobrados
      const expiredWinners = await this.prisma.ticket.updateMany({
        where: {
          operatorId: operator.id,
          status: TicketStatus.WINNER,
          draw: {
            status: DrawStatus.RESULTED,
            scheduledAt: { lte: cutoffDate },
          },
        },
        data: { status: TicketStatus.EXPIRED },
      });

      // Expirar tickets ACTIVE de sorteos ya resultados (NOT_WINNER no recalculados)
      const expiredActive = await this.prisma.ticket.updateMany({
        where: {
          operatorId: operator.id,
          status: TicketStatus.ACTIVE,
          draw: {
            status: { in: [DrawStatus.RESULTED, DrawStatus.CANCELLED] },
            scheduledAt: { lte: cutoffDate },
          },
        },
        data: { status: TicketStatus.EXPIRED },
      });

      const count = expiredWinners.count + expiredActive.count;
      if (count > 0) {
        this.logger.warn(
          `Operator ${operator.id}: ${expiredWinners.count} ganadores + ${expiredActive.count} activos → EXPIRED`,
        );
        totalExpired += count;
      }
    }

    this.logger.log(`Expiración completada: ${totalExpired} tickets marcados como EXPIRED`);
  }
}
