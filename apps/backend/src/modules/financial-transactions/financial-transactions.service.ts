import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TransactionType, TransactionDirection, AuditAction } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class FinancialTransactionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(params: {
    operatorId: string;
    branchId?: string;
    cashSessionId?: string;
    type?: TransactionType;
    from?: Date;
    to?: Date;
    take?: number;
    skip?: number;
  }) {
    const { operatorId, branchId, cashSessionId, type, from, to, take = 100, skip = 0 } = params;

    return this.prisma.financialTransaction.findMany({
      where: {
        operatorId,
        ...(branchId ? { branchId } : {}),
        ...(cashSessionId ? { cashSessionId } : {}),
        ...(type ? { type } : {}),
        ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
      },
      include: {
        branch: { select: { name: true, code: true } },
        createdBy: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async getBalance(operatorId: string, branchId: string): Promise<{
    balance: string;
    lastUpdated: Date | null;
  }> {
    const last = await this.prisma.financialTransaction.findFirst({
      where: { operatorId, branchId, type: { not: TransactionType.CASH_CLOSE } },
      orderBy: { createdAt: 'desc' },
      select: { runningBalance: true, createdAt: true },
    });

    return {
      balance: last ? new Decimal(last.runningBalance.toString()).toFixed(2) : '0.00',
      lastUpdated: last?.createdAt ?? null,
    };
  }

  async reconcile(operatorId: string, branchId: string, from: Date, to: Date) {
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        operatorId,
        branchId,
        createdAt: { gte: from, lte: to },
        type: { not: TransactionType.CASH_CLOSE },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalCredits = new Decimal(0);
    let totalDebits = new Decimal(0);

    const byType: Record<string, { credit: Decimal; debit: Decimal; count: number }> = {};

    for (const tx of transactions) {
      const amount = new Decimal(tx.amount.toString());
      if (tx.direction === TransactionDirection.CREDIT) {
        totalCredits = totalCredits.add(amount);
      } else {
        totalDebits = totalDebits.add(amount);
      }

      const key = tx.type;
      if (!byType[key]) byType[key] = { credit: new Decimal(0), debit: new Decimal(0), count: 0 };
      if (tx.direction === TransactionDirection.CREDIT) byType[key].credit = byType[key].credit.add(amount);
      else byType[key].debit = byType[key].debit.add(amount);
      byType[key].count++;
    }

    const net = totalCredits.sub(totalDebits);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalCredits: totalCredits.toFixed(2),
      totalDebits: totalDebits.toFixed(2),
      net: net.toFixed(2),
      transactionCount: transactions.length,
      byType: Object.entries(byType).map(([type, data]) => ({
        type,
        credit: data.credit.toFixed(2),
        debit: data.debit.toFixed(2),
        count: data.count,
      })),
    };
  }

  async createAdjustment(params: {
    operatorId: string;
    branchId: string;
    amount: number;
    direction: TransactionDirection;
    description: string;
    createdById: string;
  }) {
    if (!params.description || params.description.trim().length < 10) {
      throw new BadRequestException('El ajuste requiere una descripción de al menos 10 caracteres');
    }

    const amount = new Decimal(params.amount);
    if (amount.lte(0)) throw new BadRequestException('El monto debe ser mayor a 0');

    // Leer balance actual
    const { balance } = await this.getBalance(params.operatorId, params.branchId);
    const currentBalance = new Decimal(balance);
    const newBalance =
      params.direction === TransactionDirection.CREDIT
        ? currentBalance.add(amount)
        : currentBalance.sub(amount);

    const ft = await this.prisma.financialTransaction.create({
      data: {
        operatorId: params.operatorId,
        branchId: params.branchId,
        type: TransactionType.ADJUSTMENT,
        direction: params.direction,
        amount,
        runningBalance: newBalance,
        description: params.description,
        createdById: params.createdById,
      },
    });

    await this.audit.log({
      operatorId: params.operatorId,
      userId: params.createdById,
      action: AuditAction.SETTING_CHANGE,
      entity: 'FinancialTransaction',
      entityId: ft.id,
      metadata: {
        type: 'ADJUSTMENT',
        direction: params.direction,
        amount: amount.toString(),
        description: params.description,
      },
    });

    return ft;
  }
}
