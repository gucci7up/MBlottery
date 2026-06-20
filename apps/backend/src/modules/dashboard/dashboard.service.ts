import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType, TicketStatus } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private todayRange() {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  async getSummary(operatorId: string, branchId?: string) {
    const { from, to } = this.todayRange();
    const branchFilter = branchId ? { branchId } : {};

    const [salesAgg, prizesAgg, ticketCount, pendingPrizes, activeSessions] =
      await Promise.all([
        // Ventas del día (desde ledger)
        this.prisma.financialTransaction.aggregate({
          where: { operatorId, ...branchFilter, type: TransactionType.SALE, createdAt: { gte: from, lte: to } },
          _sum: { amount: true },
          _count: { id: true },
        }),
        // Premios pagados hoy
        this.prisma.financialTransaction.aggregate({
          where: { operatorId, ...branchFilter, type: TransactionType.PRIZE_PAYMENT, createdAt: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        // Tickets vendidos hoy
        this.prisma.ticket.count({
          where: { operatorId, ...branchFilter, createdAt: { gte: from, lte: to }, status: { not: TicketStatus.CANCELLED } },
        }),
        // Premios pendientes de cobro
        this.prisma.ticket.aggregate({
          where: { operatorId, ...branchFilter, status: TicketStatus.WINNER },
          _sum: { actualPrize: true },
          _count: { id: true },
        }),
        // Cajas abiertas
        this.prisma.cashSession.count({
          where: { branch: { operatorId }, status: 'OPEN', ...(branchId ? { branchId } : {}) },
        }),
      ]);

    const grossSales = new Decimal(salesAgg._sum.amount?.toString() ?? '0');
    const prizesPaid = new Decimal(prizesAgg._sum.amount?.toString() ?? '0');
    const netRevenue = grossSales.sub(prizesPaid);

    return {
      grossSales: grossSales.toFixed(2),
      prizesPaid: prizesPaid.toFixed(2),
      netRevenue: netRevenue.toFixed(2),
      ticketCount,
      salesCount: salesAgg._count.id,
      pendingPrizesAmount: new Decimal(pendingPrizes._sum.actualPrize?.toString() ?? '0').toFixed(2),
      pendingPrizesCount: pendingPrizes._count.id,
      activeCashSessions: activeSessions,
      date: from.toISOString().split('T')[0],
    };
  }

  async getSalesByBranch(operatorId: string) {
    const { from, to } = this.todayRange();

    const data = await this.prisma.financialTransaction.groupBy({
      by: ['branchId'],
      where: {
        operatorId,
        type: TransactionType.SALE,
        createdAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Enriquecer con nombre de banca
    const branches = await this.prisma.branch.findMany({
      where: { operatorId },
      select: { id: true, name: true, code: true },
    });

    const branchMap = new Map(branches.map((b) => [b.id, b]));

    return data.map((row) => ({
      branchId: row.branchId,
      branch: branchMap.get(row.branchId),
      totalAmount: new Decimal(row._sum.amount?.toString() ?? '0').toFixed(2),
      ticketCount: row._count.id,
    })).sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
  }

  async getTopNumbers(operatorId: string, limit = 10) {
    // Obtener los bets de hoy agrupados por número
    const { from, to } = this.todayRange();

    const bets = await this.prisma.bet.findMany({
      where: {
        ticket: {
          operatorId,
          createdAt: { gte: from, lte: to },
          status: { not: TicketStatus.CANCELLED },
        },
        modality: 'QUINIELA',
      },
      select: { numbers: true, amount: true },
    });

    // Agregar por número
    const numberMap = new Map<string, { count: number; amount: Decimal }>();
    for (const bet of bets) {
      const num = bet.numbers[0];
      if (!num) continue;
      const curr = numberMap.get(num) ?? { count: 0, amount: new Decimal(0) };
      numberMap.set(num, {
        count: curr.count + 1,
        amount: curr.amount.add(new Decimal(bet.amount.toString())),
      });
    }

    return Array.from(numberMap.entries())
      .map(([number, data]) => ({
        number,
        count: data.count,
        amount: data.amount.toFixed(2),
      }))
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, limit);
  }

  async getPendingPrizes(operatorId: string, branchId?: string) {
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
      take: 50,
    });
  }

  async getRecentActivity(operatorId: string, limit = 20) {
    const [tickets, payments, results] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { operatorId, status: { not: TicketStatus.CANCELLED } },
        select: {
          id: true,
          ticketNumber: true,
          totalAmount: true,
          createdAt: true,
          branch: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.payment.findMany({
        where: { operatorId },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          ticket: { select: { ticketNumber: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: 10,
      }),
      this.prisma.drawResult.findMany({
        where: { draw: { operatorId }, status: 'CONFIRMED' },
        select: {
          publishedAt: true,
          firstPrize: true,
          draw: { select: { name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 5,
      }),
    ]);

    const activity = [
      ...tickets.map((t) => ({
        type: 'SALE' as const,
        label: `${t.branch?.code ?? ''} — Ticket ${t.ticketNumber}`,
        amount: t.totalAmount.toString(),
        timestamp: t.createdAt,
      })),
      ...payments.map((p) => ({
        type: 'PRIZE' as const,
        label: `Premio pagado — ${p.ticket.ticketNumber}`,
        amount: p.amount.toString(),
        timestamp: p.paidAt,
      })),
      ...results.map((r) => ({
        type: 'RESULT' as const,
        label: `Resultado ${r.draw.name}: ${r.firstPrize}`,
        amount: null,
        timestamp: r.publishedAt,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return activity;
  }
}
