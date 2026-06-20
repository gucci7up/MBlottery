import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommissionStatus, CommissionPeriodType, TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, format } from 'date-fns';

@Injectable()
export class CommissionsService {
  constructor(private prisma: PrismaService) {}

  // ─── Config ──────────────────────────────────────────────────────────────

  async setConfig(operatorId: string, dto: {
    branchId?: string;
    rate: number;
    periodType: CommissionPeriodType;
  }) {
    return this.prisma.commissionConfig.upsert({
      where: { operatorId_branchId: { operatorId, branchId: dto.branchId ?? null as any } },
      update: { rate: dto.rate, periodType: dto.periodType, active: true },
      create: { operatorId, branchId: dto.branchId, rate: dto.rate, periodType: dto.periodType },
    });
  }

  findConfigs(operatorId: string) {
    return this.prisma.commissionConfig.findMany({
      where: { operatorId, active: true },
      include: { branch: { select: { name: true, code: true } } },
    });
  }

  // ─── Statements ──────────────────────────────────────────────────────────

  async generateStatement(operatorId: string, branchId: string, periodStart: Date) {
    // Determinar config aplicable (branch-specific > operator-wide)
    const config =
      await this.prisma.commissionConfig.findFirst({
        where: { operatorId, branchId, active: true },
      }) ??
      await this.prisma.commissionConfig.findFirst({
        where: { operatorId, branchId: null, active: true },
      });

    if (!config) throw new BadRequestException('No hay configuración de comisión para esta banca');

    const periodEnd = this.getPeriodEnd(periodStart, config.periodType);

    // Verificar que no exista ya un statement para este período
    const existing = await this.prisma.commissionStatement.findFirst({
      where: { operatorId, branchId, periodStart, configId: config.id },
    });
    if (existing) return existing;

    // Calcular ingresos desde el ledger
    const [salesAgg, cancellationsAgg, prizesAgg] = await Promise.all([
      this.prisma.financialTransaction.aggregate({
        where: { operatorId, branchId, type: TransactionType.SALE, createdAt: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: { operatorId, branchId, type: TransactionType.TICKET_CANCEL, createdAt: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: { operatorId, branchId, type: TransactionType.PRIZE_PAYMENT, createdAt: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true },
      }),
    ]);

    const grossSales = new Decimal(salesAgg._sum.amount?.toString() ?? '0');
    const cancellations = new Decimal(cancellationsAgg._sum.amount?.toString() ?? '0');
    const prizesPaid = new Decimal(prizesAgg._sum.amount?.toString() ?? '0');
    const netRevenue = grossSales.sub(cancellations).sub(prizesPaid);
    const rate = new Decimal(config.rate.toString());
    const commissionAmount = netRevenue.mul(rate);

    return this.prisma.commissionStatement.create({
      data: {
        operatorId,
        branchId,
        configId: config.id,
        periodStart,
        periodEnd,
        grossSales,
        cancellations,
        prizesPaid,
        netRevenue,
        commissionRate: rate,
        commissionAmount,
        status: CommissionStatus.PENDING,
      },
    });
  }

  async findStatements(operatorId: string, filters: {
    branchId?: string;
    status?: CommissionStatus;
    from?: Date;
    to?: Date;
  }) {
    return this.prisma.commissionStatement.findMany({
      where: {
        operatorId,
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.from || filters.to
          ? { periodStart: { gte: filters.from, lte: filters.to } }
          : {}),
      },
      include: {
        branch: { select: { name: true, code: true } },
        approver: { select: { name: true } },
      },
      orderBy: { periodStart: 'desc' },
    });
  }

  async approve(id: string, operatorId: string, approvedBy: string) {
    const stmt = await this.prisma.commissionStatement.findFirst({ where: { id, operatorId } });
    if (!stmt) throw new NotFoundException('Liquidación no encontrada');
    if (stmt.status !== CommissionStatus.PENDING) {
      throw new BadRequestException('Solo liquidaciones PENDING pueden aprobarse');
    }
    return this.prisma.commissionStatement.update({
      where: { id },
      data: { status: CommissionStatus.APPROVED, approvedBy, approvedAt: new Date() },
    });
  }

  async markPaid(id: string, operatorId: string) {
    const stmt = await this.prisma.commissionStatement.findFirst({ where: { id, operatorId } });
    if (!stmt) throw new NotFoundException('Liquidación no encontrada');
    if (stmt.status !== CommissionStatus.APPROVED) {
      throw new BadRequestException('Solo liquidaciones APPROVED pueden marcarse como pagadas');
    }
    return this.prisma.commissionStatement.update({
      where: { id },
      data: { status: CommissionStatus.PAID, paidAt: new Date() },
    });
  }

  /** Genera statements automáticamente para el mes anterior */
  async generateMonthlyStatements(operatorId: string) {
    const lastMonth = subDays(startOfMonth(new Date()), 1);
    const periodStart = startOfMonth(lastMonth);

    const branches = await this.prisma.branch.findMany({
      where: { operatorId, status: 'ACTIVE' },
    });

    const results = [];
    for (const branch of branches) {
      try {
        const stmt = await this.generateStatement(operatorId, branch.id, periodStart);
        results.push({ branchId: branch.id, branchName: branch.name, statement: stmt });
      } catch {
        results.push({ branchId: branch.id, branchName: branch.name, error: 'Sin config de comisión' });
      }
    }
    return results;
  }

  private getPeriodEnd(start: Date, type: CommissionPeriodType): Date {
    switch (type) {
      case CommissionPeriodType.MONTHLY: return endOfMonth(start);
      case CommissionPeriodType.WEEKLY: return endOfWeek(start, { weekStartsOn: 1 });
      case CommissionPeriodType.DAILY: {
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return end;
      }
    }
  }
}
