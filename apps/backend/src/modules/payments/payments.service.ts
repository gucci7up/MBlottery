import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CashSessionsService } from '../cash-sessions/cash-sessions.service';
import { EventsGateway } from '../../gateways/events.gateway';
import {
  AuditAction,
  DrawStatus,
  TicketStatus,
  TransactionType,
  TransactionDirection,
} from '@prisma/client';
import Decimal from 'decimal.js';
import { TicketGenerator } from '../../common/utils/ticket-generator';

const MAX_CASHIER_PAYMENT_DEFAULT = new Decimal('5000'); // RD$5,000 por defecto

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private cashSessions: CashSessionsService,
    private events: EventsGateway,
  ) {}

  async process(params: {
    ticketId: string;
    operatorId: string;
    paidBy: string;
    branchId: string;
    authorizerId?: string;
    notes?: string;
  }) {
    const { ticketId, operatorId, paidBy, branchId, authorizerId, notes } = params;

    // Usar transacción serializable con SELECT FOR UPDATE vía raw SQL
    return this.prisma.$transaction(
      async (tx) => {
        // LOCK the ticket row to prevent double payment
        const tickets = await tx.$queryRaw<Array<{
          id: string;
          status: TicketStatus;
          actualPrize: string;
          branchId: string;
          cashSessionId: string;
          ticketNumber: string;
          integrityHash: string;
          cashierId: string;
          drawId: string;
          totalAmount: string;
          potentialPrize: string;
          createdAt: Date;
        }>>`
          SELECT t.id, t.status, t."actualPrize", t."branchId", t."cashSessionId",
                 t."ticketNumber", t."integrityHash", t."cashierId", t."drawId",
                 t."totalAmount", t."potentialPrize", t."createdAt"
          FROM "Ticket" t
          WHERE t.id = ${ticketId}
          AND t."operatorId" = ${operatorId}
          FOR UPDATE
        `;

        const ticket = tickets[0];
        if (!ticket) throw new NotFoundException('Ticket no encontrado');

        // Validar estado
        if (ticket.status !== TicketStatus.WINNER) {
          if (ticket.status === TicketStatus.PAID) {
            throw new ConflictException('Este ticket ya fue pagado');
          }
          if (ticket.status === TicketStatus.CANCELLED) {
            throw new BadRequestException('Ticket cancelado, no se puede pagar');
          }
          if (ticket.status === TicketStatus.EXPIRED) {
            throw new BadRequestException('Ticket expirado');
          }
          throw new BadRequestException(
            `Ticket no es ganador (estado: ${ticket.status})`,
          );
        }

        // Verificar sorteo resultó
        const draw = await tx.draw.findUnique({ where: { id: ticket.drawId } });
        if (draw?.status !== DrawStatus.RESULTED) {
          throw new BadRequestException('El sorteo aún no tiene resultado confirmado');
        }

        // El premio viene del servidor (nunca del cliente)
        const prizeAmount = new Decimal(ticket.actualPrize ?? '0');
        if (prizeAmount.lte(0)) {
          throw new BadRequestException('Premio calculado es cero');
        }

        // Verificar integridad del ticket
        const hashValid = TicketGenerator.verifyIntegrityHash(
          {
            ticketId: ticket.id,
            branchId: ticket.branchId,
            cashierId: ticket.cashierId,
            drawId: ticket.drawId,
            totalAmount: new Decimal(ticket.totalAmount).toFixed(2),
            potentialPrize: new Decimal(ticket.potentialPrize).toFixed(2),
            createdAt: ticket.createdAt.toISOString(),
          },
          ticket.integrityHash,
        );
        if (!hashValid) {
          throw new BadRequestException('Integridad del ticket inválida');
        }

        // Verificar caja del cajero
        const cashSession = await this.cashSessions.findMineOpen(paidBy);

        // Determinar si requiere autorización
        const maxPayment = await this.getMaxCashierPayment(branchId);
        const requiresAuth = prizeAmount.gt(maxPayment);

        if (requiresAuth && !authorizerId) {
          throw new BadRequestException(
            `Premio RD$${prizeAmount.toFixed(2)} supera el límite de caja (RD$${maxPayment.toFixed(2)}). Requiere autorización de supervisor.`,
          );
        }

        // Registrar pago y actualizar ticket
        const payment = await tx.payment.create({
          data: {
            ticketId,
            operatorId,
            branchId,
            cashSessionId: cashSession?.id,
            amount: prizeAmount,
            paidBy,
            requiresAuth,
            authorizedBy: authorizerId,
            notes,
          },
        });

        await tx.ticket.update({
          where: { id: ticketId },
          data: { status: TicketStatus.PAID, paidAt: new Date() },
        });

        // Ledger: PRIZE_PAYMENT (sale efectivo de la caja)
        const currentBalance = await this.getRunningBalance(tx, branchId);
        await tx.financialTransaction.create({
          data: {
            operatorId,
            branchId,
            cashSessionId: cashSession?.id,
            type: TransactionType.PRIZE_PAYMENT,
            direction: TransactionDirection.DEBIT,
            amount: prizeAmount,
            runningBalance: currentBalance.sub(prizeAmount),
            referenceType: 'PAYMENT',
            referenceId: payment.id,
            description: `Premio ticket ${ticket.ticketNumber}`,
            createdById: paidBy,
          },
        });

        // Log de integridad
        await tx.ticketIntegrityLog.create({
          data: {
            ticketId,
            action: 'PAY_ATTEMPT',
            hashValid,
            result: 'OK',
            performedBy: paidBy,
          },
        });

        return { payment, prizeAmount: prizeAmount.toFixed(2), ticketNumber: ticket.ticketNumber };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async findPending(operatorId: string, branchId?: string) {
    return this.prisma.ticket.findMany({
      where: {
        operatorId,
        status: TicketStatus.WINNER,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        draw: { select: { name: true, scheduledAt: true } },
        branch: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async findAll(operatorId: string, branchId?: string, from?: Date, to?: Date) {
    return this.prisma.payment.findMany({
      where: {
        operatorId,
        ...(branchId ? { branchId } : {}),
        ...(from || to ? { paidAt: { gte: from, lte: to } } : {}),
      },
      include: {
        ticket: { select: { ticketNumber: true, drawId: true } },
        cashier: { select: { name: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 200,
    });
  }

  private async getMaxCashierPayment(branchId: string): Promise<Decimal> {
    const setting = await this.prisma.branchSetting.findUnique({
      where: { branchId_key: { branchId, key: 'max_cashier_payment' } },
    });
    return setting ? new Decimal(setting.value) : MAX_CASHIER_PAYMENT_DEFAULT;
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
