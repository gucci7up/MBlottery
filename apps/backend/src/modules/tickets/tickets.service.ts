import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LimitsService } from '../limits/limits.service';
import { PayoutTablesService } from '../payout-tables/payout-tables.service';
import { CashSessionsService } from '../cash-sessions/cash-sessions.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../../gateways/events.gateway';
import {
  AuditAction,
  DrawStatus,
  TicketStatus,
  TransactionType,
  TransactionDirection,
  Modality,
} from '@prisma/client';
import { TicketGenerator } from '../../common/utils/ticket-generator';
import { PrizeCalculator } from '../../common/utils/prize-calculator';
import Decimal from 'decimal.js';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private limits: LimitsService,
    private payoutTables: PayoutTablesService,
    private cashSessions: CashSessionsService,
    private audit: AuditService,
    private events: EventsGateway,
  ) {}

  async create(params: {
    operatorId: string;
    branchId: string;
    cashierId: string;
    idempotencyKey?: string;
    dto: CreateTicketDto;
  }) {
    const { operatorId, branchId, cashierId, idempotencyKey, dto } = params;

    // Idempotency check — devolver ticket existente si la key ya fue usada
    if (idempotencyKey) {
      const existing = await this.prisma.ticket.findUnique({
        where: { idempotencyKey },
        include: { bets: true, superPaleBet: true },
      });
      if (existing) return existing;
    }

    // Verificar caja abierta
    const cashSession = await this.cashSessions.findMineOpen(cashierId);
    if (!cashSession) {
      throw new BadRequestException('Debes tener una caja abierta para vender');
    }

    // Verificar sorteo abierto
    const draw = await this.prisma.draw.findFirst({
      where: { id: dto.drawId, operatorId, status: DrawStatus.OPEN },
      include: { provider: true },
    });
    if (!draw) throw new BadRequestException('El sorteo no está disponible');

    const now = new Date();
    if (draw.closeAt <= now) throw new BadRequestException('El sorteo ya cerró');

    // Obtener rama del operador
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { code: true },
    });
    if (!branch) throw new NotFoundException('Banca no encontrada');

    // Reservar límites atómicamente para cada jugada
    const betsWithMultipliers: Array<{
      modality: Modality;
      numbers: string[];
      amount: Decimal;
      multiplier: Decimal;
      potentialPrize: Decimal;
      entryId: string;
    }> = [];

    const reservedLimits: Array<{ modality: Modality; number: string; amount: Decimal }> = [];

    try {
      for (const bet of dto.bets) {
        const amount = new Decimal(bet.amount);

        // Obtener multiplicador del PayoutTable activo
        const { multiplier, minBetAmount, maxBetAmount, entryId } =
          await this.payoutTables.getMultiplier({
            operatorId,
            branchId,
            modality: bet.modality,
            providerId: draw.providerId,
          });

        if (amount.lt(minBetAmount)) {
          throw new BadRequestException(
            `Monto mínimo para ${bet.modality}: RD$${minBetAmount}`,
          );
        }
        if (amount.gt(maxBetAmount)) {
          throw new BadRequestException(
            `Monto máximo por jugada para ${bet.modality}: RD$${maxBetAmount}`,
          );
        }

        // Verificar y reservar límite para cada número
        for (const number of bet.numbers) {
          await this.limits.checkAndReserve({
            operatorId,
            branchId,
            drawId: dto.drawId,
            providerId: draw.providerId,
            modality: bet.modality,
            number,
            amount,
          });
          reservedLimits.push({ modality: bet.modality, number, amount });
        }

        const potentialPrize = PrizeCalculator.computePotential(amount, multiplier);

        betsWithMultipliers.push({
          modality: bet.modality,
          numbers: bet.numbers,
          amount,
          multiplier,
          potentialPrize,
          entryId,
        });
      }
    } catch (err) {
      // Liberar límites reservados si algo falló
      for (const r of reservedLimits) {
        await this.limits.release({
          operatorId,
          drawId: dto.drawId,
          modality: r.modality,
          number: r.number,
          amount: r.amount,
        });
      }
      throw err;
    }

    // Calcular totales
    const totalAmount = betsWithMultipliers.reduce((s, b) => s.add(b.amount), new Decimal(0));
    const potentialPrize = betsWithMultipliers.reduce(
      (s, b) => s.add(b.potentialPrize),
      new Decimal(0),
    );

    // Generar número de ticket con secuencia atómica
    const sequence = await this.getNextSequence(branchId);
    const ticketNumber = TicketGenerator.buildTicketNumber(branch.code, sequence);
    const serialCode = TicketGenerator.generateSerialCode();
    const ticketId = uuidv4();
    const createdAt = new Date();

    const integrityHash = TicketGenerator.computeIntegrityHash({
      ticketId,
      branchId,
      cashierId,
      drawId: dto.drawId,
      totalAmount: totalAmount.toFixed(2),
      potentialPrize: potentialPrize.toFixed(2),
      createdAt: createdAt.toISOString(),
    });

    // Crear ticket + bets + transacción financiera en una sola transacción DB
    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          id: ticketId,
          operatorId,
          branchId,
          cashierId,
          drawId: dto.drawId,
          cashSessionId: cashSession.id,
          ticketNumber,
          serialCode,
          idempotencyKey,
          totalAmount,
          potentialPrize,
          integrityHash,
          createdAt,
          bets: {
            create: betsWithMultipliers.map((b) => ({
              drawId: dto.drawId,
              modality: b.modality,
              numbers: b.numbers,
              amount: b.amount,
              multiplier: b.multiplier,
              potentialPrize: b.potentialPrize,
              payoutTableEntryId: b.entryId,
            })),
          },
        },
        include: { bets: true },
      });

      // Ledger: SALE
      const currentBalance = await this.getRunningBalance(tx, branchId);
      await tx.financialTransaction.create({
        data: {
          operatorId,
          branchId,
          cashSessionId: cashSession.id,
          type: TransactionType.SALE,
          direction: TransactionDirection.CREDIT,
          amount: totalAmount,
          runningBalance: currentBalance.add(totalAmount),
          referenceType: 'TICKET',
          referenceId: ticketId,
          description: `Ticket ${ticketNumber}`,
          createdById: cashierId,
        },
      });

      return created;
    });

    // Audit y evento WS
    await this.audit.log({
      operatorId,
      userId: cashierId,
      action: AuditAction.TICKET_CREATE,
      entity: 'Ticket',
      entityId: ticket.id,
      metadata: { ticketNumber, totalAmount: totalAmount.toString(), bets: dto.bets.length },
    });

    this.events.emitToOperator(operatorId, {
      event: 'SALE_REGISTERED',
      data: { branchId, amount: totalAmount.toFixed(2) },
    });

    return ticket;
  }

  async findBySerial(serialCode: string, operatorId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { serialCode, operatorId },
      include: {
        bets: true,
        superPaleBet: true,
        draw: { include: { provider: true, result: true } },
        branch: { select: { name: true, code: true } },
        cashier: { select: { name: true } },
        payment: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    // Verificar integridad
    const hashValid = TicketGenerator.verifyIntegrityHash(
      {
        ticketId: ticket.id,
        branchId: ticket.branchId,
        cashierId: ticket.cashierId,
        drawId: ticket.drawId,
        totalAmount: new Decimal(ticket.totalAmount.toString()).toFixed(2),
        potentialPrize: new Decimal(ticket.potentialPrize.toString()).toFixed(2),
        createdAt: ticket.createdAt.toISOString(),
      },
      ticket.integrityHash,
    );

    await this.prisma.ticketIntegrityLog.create({
      data: {
        ticketId: ticket.id,
        action: 'VERIFY',
        hashValid,
        result: hashValid ? 'OK' : 'HASH_MISMATCH',
        performedBy: ticket.cashierId,
      },
    });

    return { ...ticket, integrityValid: hashValid };
  }

  async cancel(id: string, operatorId: string, cancelledBy: string, reason: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, operatorId },
      include: { draw: true },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    if (ticket.status !== TicketStatus.ACTIVE) {
      throw new BadRequestException('Solo tickets ACTIVE pueden anularse');
    }
    if (ticket.draw?.status !== DrawStatus.OPEN) {
      throw new BadRequestException('Solo se pueden anular tickets de sorteos abiertos');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: TicketStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy,
          cancelReason: reason,
        },
      });

      // Ledger: TICKET_CANCEL (reversa del SALE)
      const currentBalance = await this.getRunningBalance(tx, ticket.branchId);
      const amount = new Decimal(ticket.totalAmount.toString());
      await tx.financialTransaction.create({
        data: {
          operatorId,
          branchId: ticket.branchId,
          cashSessionId: ticket.cashSessionId,
          type: TransactionType.TICKET_CANCEL,
          direction: TransactionDirection.DEBIT,
          amount,
          runningBalance: currentBalance.sub(amount),
          referenceType: 'TICKET',
          referenceId: id,
          description: `Anulación ticket ${ticket.ticketNumber}: ${reason}`,
          createdById: cancelledBy,
        },
      });

      return updated;
    });
  }

  async reprint(id: string, operatorId: string, reprintedBy: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, operatorId },
      include: { bets: true, branch: { select: { name: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    if (ticket.reprintCount >= 3) {
      throw new BadRequestException('Máximo 3 reimpresiones por ticket');
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        reprintCount: { increment: 1 },
        lastReprintAt: new Date(),
        lastReprintBy: reprintedBy,
      },
      include: { bets: true },
    });

    await this.audit.log({
      operatorId,
      userId: reprintedBy,
      action: AuditAction.TICKET_REPRINT,
      entity: 'Ticket',
      entityId: id,
      metadata: { reprintCount: updated.reprintCount },
    });

    return updated;
  }

  /** Genera secuencia atómica de ticket por banca usando SELECT FOR UPDATE */
  private async getNextSequence(branchId: string): Promise<number> {
    const result = await this.prisma.$executeRaw`
      INSERT INTO "TicketSequence" ("branchId", "lastSequence")
      VALUES (${branchId}, 1)
      ON CONFLICT ("branchId")
      DO UPDATE SET "lastSequence" = "TicketSequence"."lastSequence" + 1
      RETURNING "lastSequence"
    `;
    // Leer el valor actualizado
    const seq = await this.prisma.$queryRaw<[{ lastSequence: number }]>`
      SELECT "lastSequence" FROM "TicketSequence" WHERE "branchId" = ${branchId}
    `;
    return seq[0].lastSequence;
  }

  private async getRunningBalance(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    branchId: string,
  ): Promise<Decimal> {
    const last = await (tx as any).financialTransaction.findFirst({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      select: { runningBalance: true },
    });
    return last ? new Decimal(last.runningBalance.toString()) : new Decimal(0);
  }
}
