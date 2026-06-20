import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../gateways/events.gateway';
import { AuditService } from '../modules/audit/audit.service';
import { PrizeCalculator } from '../common/utils/prize-calculator';
import { TicketStatus, BetEvalStatus, AuditAction, Modality } from '@prisma/client';
import { PROCESS_DRAW_JOB } from '../modules/results/results.service';
import Decimal from 'decimal.js';

const CHUNK_SIZE = 500;

interface PrizeJobData {
  drawId: string;
  operatorId: string;
  isReprocess?: boolean;
}

@Processor('prize-processor')
export class PrizeProcessorJob {
  private readonly logger = new Logger(PrizeProcessorJob.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private audit: AuditService,
  ) {}

  @Process(PROCESS_DRAW_JOB)
  async handle(job: Job<PrizeJobData>) {
    const { drawId, operatorId, isReprocess } = job.data;
    this.logger.log(`Procesando premios para draw ${drawId} (reprocess: ${isReprocess})`);

    // Obtener resultado confirmado
    const result = await this.prisma.drawResult.findUnique({ where: { drawId } });
    if (!result || result.status !== 'CONFIRMED') {
      this.logger.warn(`Draw ${drawId}: resultado no confirmado. Abortando.`);
      return;
    }

    const drawResult = {
      firstPrize: result.firstPrize,
      secondPrize: result.secondPrize ?? undefined,
      thirdPrize: result.thirdPrize ?? undefined,
    };

    // Procesar tickets regulares en chunks
    let offset = 0;
    let totalWinners = 0;
    let totalPrizeAmount = new Decimal(0);

    // En reprocess, resetear tickets NOT_WINNER a ACTIVE para recalcular
    // (no toca los PAID — esos son inmutables)
    if (isReprocess) {
      await this.prisma.ticket.updateMany({
        where: { drawId, status: TicketStatus.NOT_WINNER },
        data: { status: TicketStatus.ACTIVE, actualPrize: null },
      });
      await this.prisma.bet.updateMany({
        where: { draw: { id: drawId }, isWinner: false },
        data: { isWinner: null, prizeAmount: null },
      });
    }

    while (true) {
      const tickets = await this.prisma.ticket.findMany({
        where: {
          drawId,
          status: TicketStatus.ACTIVE,
          draw: { operatorId },
        },
        include: { bets: true },
        take: CHUNK_SIZE,
        skip: offset,
      });

      if (tickets.length === 0) break;

      await job.progress(Math.min(90, Math.round((offset / (offset + tickets.length)) * 90)));

      for (const ticket of tickets) {
        let ticketPrize = new Decimal(0);
        let hasWinner = false;

        const betUpdates: Array<{
          id: string;
          isWinner: boolean;
          prizeAmount: Decimal;
        }> = [];

        for (const bet of ticket.bets) {
          if (bet.modality === Modality.SUPER_PALE) continue; // Manejado aparte

          const isWinner = PrizeCalculator.evaluateBet(
            {
              numbers: bet.numbers,
              amount: new Decimal(bet.amount.toString()),
              multiplier: new Decimal(bet.multiplier.toString()),
              modality: bet.modality,
            },
            drawResult,
          );

          const prizeAmount = isWinner
            ? new Decimal(bet.amount.toString()).mul(new Decimal(bet.multiplier.toString()))
            : new Decimal(0);

          if (isWinner) hasWinner = true;
          ticketPrize = ticketPrize.add(prizeAmount);

          betUpdates.push({ id: bet.id, isWinner, prizeAmount });
        }

        // Actualizar bets y ticket en una transacción
        await this.prisma.$transaction(async (tx) => {
          for (const bu of betUpdates) {
            await tx.bet.update({
              where: { id: bu.id },
              data: { isWinner: bu.isWinner, prizeAmount: bu.prizeAmount },
            });
          }

          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: hasWinner ? TicketStatus.WINNER : TicketStatus.NOT_WINNER,
              actualPrize: hasWinner ? ticketPrize : new Decimal(0),
            },
          });
        });

        if (hasWinner) {
          totalWinners++;
          totalPrizeAmount = totalPrizeAmount.add(ticketPrize);
        }
      }

      offset += tickets.length;
      if (tickets.length < CHUNK_SIZE) break;
    }

    // Procesar SuperPaleBets para este draw
    await this.processSuperpale(drawId, drawResult);

    await job.progress(100);

    this.logger.log(
      `Draw ${drawId}: ${totalWinners} ganadores, RD$${totalPrizeAmount.toFixed(2)} en premios`,
    );

    // Notificar via WebSocket
    this.events.emitToOperator(operatorId, {
      event: 'PRIZE_READY',
      data: {
        drawId,
        count: totalWinners,
        totalAmount: totalPrizeAmount.toFixed(2),
      },
    });

    await this.audit.log({
      operatorId,
      userId: 'system',
      action: AuditAction.PRIZE_CALCULATE,
      entity: 'Draw',
      entityId: drawId,
      metadata: {
        totalWinners,
        totalPrizeAmount: totalPrizeAmount.toFixed(2),
        isReprocess,
      },
    });
  }

  /**
   * Evalúa SuperPaleBets donde este draw es drawA o drawB.
   * Solo marca como ganador si AMBOS lados ya están evaluados como WON.
   */
  private async processSuperpale(drawId: string, result: { firstPrize: string; secondPrize?: string; thirdPrize?: string }) {
    // Evaluar lado A
    const spBetsA = await this.prisma.superPaleBet.findMany({
      where: { drawIdA: drawId, statusA: BetEvalStatus.PENDING },
    });

    for (const sp of spBetsA) {
      const wonA = result.firstPrize === sp.numberA;
      await this.prisma.superPaleBet.update({
        where: { id: sp.id },
        data: { statusA: wonA ? BetEvalStatus.WON : BetEvalStatus.LOST },
      });

      const updatedSP = await this.prisma.superPaleBet.findUnique({ where: { id: sp.id } });
      if (updatedSP && updatedSP.statusB !== BetEvalStatus.PENDING) {
        await this.finalizeSuperpale(updatedSP.id);
      }
    }

    // Evaluar lado B
    const spBetsB = await this.prisma.superPaleBet.findMany({
      where: { drawIdB: drawId, statusB: BetEvalStatus.PENDING },
    });

    for (const sp of spBetsB) {
      const wonB = result.firstPrize === sp.numberB;
      await this.prisma.superPaleBet.update({
        where: { id: sp.id },
        data: { statusB: wonB ? BetEvalStatus.WON : BetEvalStatus.LOST },
      });

      const updatedSP = await this.prisma.superPaleBet.findUnique({ where: { id: sp.id } });
      if (updatedSP && updatedSP.statusA !== BetEvalStatus.PENDING) {
        await this.finalizeSuperpale(updatedSP.id);
      }
    }
  }

  private async finalizeSuperpale(spBetId: string) {
    const sp = await this.prisma.superPaleBet.findUnique({
      where: { id: spBetId },
      include: { ticket: true },
    });
    if (!sp) return;

    const isWinner = sp.statusA === BetEvalStatus.WON && sp.statusB === BetEvalStatus.WON;
    const prizeAmount = isWinner
      ? new Decimal(sp.amount.toString()).mul(new Decimal(sp.multiplier.toString()))
      : new Decimal(0);

    await this.prisma.$transaction(async (tx) => {
      await tx.superPaleBet.update({
        where: { id: spBetId },
        data: { isWinner, prizeAmount, evaluatedAt: new Date() },
      });

      await tx.ticket.update({
        where: { id: sp.ticketId },
        data: {
          status: isWinner ? TicketStatus.WINNER : TicketStatus.NOT_WINNER,
          actualPrize: isWinner ? prizeAmount : new Decimal(0),
        },
      });
    });
  }
}
