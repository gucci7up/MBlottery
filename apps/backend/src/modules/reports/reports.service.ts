import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketStatus, TransactionType } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(params: {
    operatorId: string;
    branchId?: string;
    from: Date;
    to: Date;
  }) {
    const { operatorId, branchId, from, to } = params;

    const [transactions, ticketsByStatus] = await Promise.all([
      this.prisma.financialTransaction.groupBy({
        by: ['branchId', 'type'],
        where: {
          operatorId,
          ...(branchId ? { branchId } : {}),
          createdAt: { gte: from, lte: to },
          type: { in: [TransactionType.SALE, TransactionType.TICKET_CANCEL, TransactionType.PRIZE_PAYMENT] },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.ticket.groupBy({
        by: ['branchId', 'status'],
        where: {
          operatorId,
          ...(branchId ? { branchId } : {}),
          createdAt: { gte: from, lte: to },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

    const branches = await this.prisma.branch.findMany({
      where: { operatorId },
      select: { id: true, name: true, code: true },
    });
    const branchMap = new Map(branches.map((b) => [b.id, b]));

    // Agrupar por banca
    const byBranch = new Map<string, {
      branch: typeof branches[0] | undefined;
      grossSales: Decimal;
      cancellations: Decimal;
      prizesPaid: Decimal;
      netRevenue: Decimal;
      ticketsSold: number;
      ticketsCancelled: number;
    }>();

    for (const tx of transactions) {
      if (!byBranch.has(tx.branchId)) {
        byBranch.set(tx.branchId, {
          branch: branchMap.get(tx.branchId),
          grossSales: new Decimal(0),
          cancellations: new Decimal(0),
          prizesPaid: new Decimal(0),
          netRevenue: new Decimal(0),
          ticketsSold: 0,
          ticketsCancelled: 0,
        });
      }
      const entry = byBranch.get(tx.branchId)!;
      const amount = new Decimal(tx._sum.amount?.toString() ?? '0');
      if (tx.type === TransactionType.SALE) entry.grossSales = entry.grossSales.add(amount);
      if (tx.type === TransactionType.TICKET_CANCEL) entry.cancellations = entry.cancellations.add(amount);
      if (tx.type === TransactionType.PRIZE_PAYMENT) entry.prizesPaid = entry.prizesPaid.add(amount);
    }

    for (const t of ticketsByStatus) {
      const entry = byBranch.get(t.branchId);
      if (!entry) continue;
      if (t.status !== TicketStatus.CANCELLED) entry.ticketsSold += t._count.id;
      if (t.status === TicketStatus.CANCELLED) entry.ticketsCancelled += t._count.id;
    }

    const rows = Array.from(byBranch.values()).map((e) => ({
      branchId: Array.from(byBranch.entries()).find(([, v]) => v === e)?.[0],
      branchName: e.branch?.name,
      branchCode: e.branch?.code,
      grossSales: e.grossSales.toFixed(2),
      cancellations: e.cancellations.toFixed(2),
      prizesPaid: e.prizesPaid.toFixed(2),
      netRevenue: e.grossSales.sub(e.cancellations).sub(e.prizesPaid).toFixed(2),
      ticketsSold: e.ticketsSold,
      ticketsCancelled: e.ticketsCancelled,
    }));

    const totals = rows.reduce(
      (acc, row) => ({
        grossSales: new Decimal(acc.grossSales).add(row.grossSales).toFixed(2),
        cancellations: new Decimal(acc.cancellations).add(row.cancellations).toFixed(2),
        prizesPaid: new Decimal(acc.prizesPaid).add(row.prizesPaid).toFixed(2),
        netRevenue: new Decimal(acc.netRevenue).add(row.netRevenue).toFixed(2),
        ticketsSold: acc.ticketsSold + row.ticketsSold,
        ticketsCancelled: acc.ticketsCancelled + row.ticketsCancelled,
      }),
      { grossSales: '0', cancellations: '0', prizesPaid: '0', netRevenue: '0', ticketsSold: 0, ticketsCancelled: 0 },
    );

    return { from, to, rows, totals };
  }

  async getPrizesReport(params: {
    operatorId: string;
    branchId?: string;
    from: Date;
    to: Date;
  }) {
    return this.prisma.payment.findMany({
      where: {
        operatorId,
        ...(params.branchId ? { branchId: params.branchId } : {}),
        paidAt: { gte: params.from, lte: params.to },
      },
      include: {
        ticket: {
          include: {
            draw: { select: { name: true, scheduledAt: true } },
            bets: { select: { modality: true, numbers: true, amount: true, prizeAmount: true } },
          },
        },
        cashier: { select: { name: true, username: true } },
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  async getClosingReport(params: {
    operatorId: string;
    branchId: string;
    date: Date;
  }) {
    const from = new Date(params.date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(params.date);
    to.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.cashSession.findMany({
      where: {
        branchId: params.branchId,
        branch: { operatorId: params.operatorId },
        openedAt: { gte: from, lte: to },
      },
      include: {
        cashier: { select: { name: true, username: true } },
        financialTransactions: {
          where: { type: { not: TransactionType.CASH_CLOSE } },
          select: { type: true, direction: true, amount: true },
        },
      },
      orderBy: { openedAt: 'asc' },
    });

    return sessions.map((session) => {
      let sales = new Decimal(0);
      let cancellations = new Decimal(0);
      let prizes = new Decimal(0);
      let openingBalance = new Decimal(0);

      for (const tx of session.financialTransactions) {
        const amount = new Decimal(tx.amount.toString());
        if (tx.type === TransactionType.CASH_OPEN) openingBalance = amount;
        if (tx.type === TransactionType.SALE) sales = sales.add(amount);
        if (tx.type === TransactionType.TICKET_CANCEL) cancellations = cancellations.add(amount);
        if (tx.type === TransactionType.PRIZE_PAYMENT) prizes = prizes.add(amount);
      }

      const expected = openingBalance.add(sales).sub(cancellations).sub(prizes);

      return {
        sessionId: session.id,
        cashier: session.cashier,
        status: session.status,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        openingBalance: openingBalance.toFixed(2),
        grossSales: sales.toFixed(2),
        cancellations: cancellations.toFixed(2),
        prizesPaid: prizes.toFixed(2),
        expectedBalance: expected.toFixed(2),
        declaredBalance: session.declaredBalance?.toString() ?? null,
        difference: session.difference?.toString() ?? null,
      };
    });
  }

  /** Genera CSV de ventas */
  async exportSalesCSV(params: { operatorId: string; branchId?: string; from: Date; to: Date }): Promise<string> {
    const report = await this.getSalesReport(params);

    const headers = ['Banca', 'Código', 'Ventas Brutas', 'Anulaciones', 'Premios Pagados', 'Ingresos Netos', 'Tickets', 'Anulados'];
    const rows = report.rows.map((r) =>
      [r.branchName, r.branchCode, r.grossSales, r.cancellations, r.prizesPaid, r.netRevenue, r.ticketsSold, r.ticketsCancelled].join(','),
    );
    const totals = `TOTAL,,${report.totals.grossSales},${report.totals.cancellations},${report.totals.prizesPaid},${report.totals.netRevenue},${report.totals.ticketsSold},${report.totals.ticketsCancelled}`;

    return [headers.join(','), ...rows, totals].join('\n');
  }
}
