import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CashSessionStatus, AuditAction, TransactionType, TransactionDirection } from '@prisma/client';
import Decimal from 'decimal.js';

const DISCREPANCY_TOLERANCE = new Decimal('50'); // RD$50 tolerancia

@Injectable()
export class CashSessionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findActive(branchId: string) {
    return this.prisma.cashSession.findMany({
      where: { branchId, status: CashSessionStatus.OPEN },
      include: { cashier: { select: { name: true, username: true } } },
    });
  }

  async findOne(id: string, operatorId: string) {
    const session = await this.prisma.cashSession.findFirst({
      where: { id, branch: { operatorId } },
      include: {
        cashier: { select: { name: true, username: true } },
        financialTransactions: {
          orderBy: { createdAt: 'asc' },
          select: { type: true, direction: true, amount: true, createdAt: true, description: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Sesión de caja no encontrada');
    return session;
  }

  async findMineOpen(cashierId: string) {
    return this.prisma.cashSession.findFirst({
      where: { cashierId, status: CashSessionStatus.OPEN },
    });
  }

  async open(params: {
    operatorId: string;
    branchId: string;
    cashierId: string;
    openedBy: string;
    openingBalance: number;
  }) {
    const existing = await this.prisma.cashSession.findFirst({
      where: { cashierId: params.cashierId, status: CashSessionStatus.OPEN },
    });
    if (existing) {
      throw new BadRequestException('Este cajero ya tiene una caja abierta');
    }

    const openingBalance = new Decimal(params.openingBalance);

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.create({
        data: {
          operatorId: params.operatorId,
          branchId: params.branchId,
          cashierId: params.cashierId,
          openedBy: params.openedBy,
          openingBalance,
          status: CashSessionStatus.OPEN,
        },
      });

      // Primer registro del ledger
      await tx.financialTransaction.create({
        data: {
          operatorId: params.operatorId,
          branchId: params.branchId,
          cashSessionId: session.id,
          type: TransactionType.CASH_OPEN,
          direction: TransactionDirection.CREDIT,
          amount: openingBalance,
          runningBalance: openingBalance,
          referenceType: 'CASH_SESSION',
          referenceId: session.id,
          description: 'Apertura de caja',
          createdById: params.openedBy,
        },
      });

      await this.audit.log({
        operatorId: params.operatorId,
        userId: params.openedBy,
        action: AuditAction.CASH_OPEN,
        entity: 'CashSession',
        entityId: session.id,
        metadata: { cashierId: params.cashierId, openingBalance: openingBalance.toString() },
      });

      return session;
    });
  }

  async close(params: {
    sessionId: string;
    operatorId: string;
    cashierId: string;
    declaredBalance: number;
    closedBy: string;
  }) {
    const session = await this.findOne(params.sessionId, params.operatorId);

    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException('La caja no está abierta');
    }
    if (session.cashierId !== params.cashierId) {
      throw new ForbiddenException('Solo el cajero asignado puede cerrar esta caja');
    }

    const declared = new Decimal(params.declaredBalance);
    const expected = await this.computeExpectedBalance(params.sessionId, params.operatorId);
    const difference = expected.sub(declared);
    const hasDiscrepancy = difference.abs().gt(DISCREPANCY_TOLERANCE);

    const newStatus = hasDiscrepancy
      ? CashSessionStatus.DISCREPANCY
      : CashSessionStatus.CLOSED;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.cashSession.update({
        where: { id: params.sessionId },
        data: {
          status: newStatus,
          closedBy: params.closedBy,
          closedAt: new Date(),
          declaredBalance: declared,
          difference,
        },
      });

      await tx.financialTransaction.create({
        data: {
          operatorId: params.operatorId,
          branchId: session.branchId,
          cashSessionId: params.sessionId,
          type: TransactionType.CASH_CLOSE,
          direction: TransactionDirection.CREDIT,
          amount: declared,
          runningBalance: declared,
          referenceType: 'CASH_SESSION',
          referenceId: params.sessionId,
          description: `Cierre de caja. Esperado: ${expected}. Declarado: ${declared}. Diferencia: ${difference}`,
          createdById: params.closedBy,
        },
      });

      await this.audit.log({
        operatorId: params.operatorId,
        userId: params.closedBy,
        action: AuditAction.CASH_CLOSE,
        entity: 'CashSession',
        entityId: params.sessionId,
        metadata: {
          expected: expected.toString(),
          declared: declared.toString(),
          difference: difference.toString(),
          hasDiscrepancy,
        },
      });

      return { ...updated, expected, difference, hasDiscrepancy };
    });
  }

  async approveClose(params: {
    sessionId: string;
    operatorId: string;
    approvedBy: string;
    notes?: string;
  }) {
    const session = await this.findOne(params.sessionId, params.operatorId);
    if (session.status !== CashSessionStatus.DISCREPANCY) {
      throw new BadRequestException('Solo sesiones con DISCREPANCY pueden aprobarse');
    }

    const updated = await this.prisma.cashSession.update({
      where: { id: params.sessionId },
      data: {
        status: CashSessionStatus.APPROVED,
        approvedBy: params.approvedBy,
        discrepancyNotes: params.notes,
      },
    });

    await this.audit.log({
      operatorId: params.operatorId,
      userId: params.approvedBy,
      action: AuditAction.CASH_DISCREPANCY_APPROVE,
      entity: 'CashSession',
      entityId: params.sessionId,
      metadata: { notes: params.notes, difference: session.difference?.toString() },
    });

    return updated;
  }

  async computeExpectedBalance(sessionId: string, operatorId: string): Promise<Decimal> {
    const agg = await this.prisma.financialTransaction.findMany({
      where: { cashSessionId: sessionId },
      select: { type: true, direction: true, amount: true },
    });

    let balance = new Decimal(0);
    for (const tx of agg) {
      const amount = new Decimal(tx.amount.toString());
      if (tx.type === TransactionType.CASH_CLOSE) continue; // snapshot, no suma
      if (tx.direction === TransactionDirection.CREDIT) {
        balance = balance.add(amount);
      } else {
        balance = balance.sub(amount);
      }
    }
    return balance;
  }

  async getSummary(sessionId: string, operatorId: string) {
    const session = await this.findOne(sessionId, operatorId);
    const expected = await this.computeExpectedBalance(sessionId, operatorId);

    const agg = await this.prisma.financialTransaction.groupBy({
      by: ['type'],
      where: { cashSessionId: sessionId, type: { not: TransactionType.CASH_CLOSE } },
      _sum: { amount: true },
      _count: { id: true },
    });

    return { session, expected, transactions: agg };
  }
}
