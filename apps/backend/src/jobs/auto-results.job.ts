import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AdapterRegistry } from '../modules/results/adapters/adapter-registry';
import { ResultsService } from '../modules/results/results.service';
import { DrawStatus } from '@prisma/client';

@Injectable()
export class AutoResultsJob {
  private readonly logger = new Logger(AutoResultsJob.name);

  constructor(
    private prisma: PrismaService,
    private adapterRegistry: AdapterRegistry,
    private resultsService: ResultsService,
  ) {}

  /**
   * Verifica cada 5 minutos si hay sorteos CLOSED con adapter disponible.
   * Solo activo si AUTO_RESULTS_ENABLED=true en variables de entorno.
   */
  @Cron('*/5 * * * *')
  async handleAutoResults() {
    if (process.env.AUTO_RESULTS_ENABLED !== 'true') return;

    const closedDraws = await this.prisma.draw.findMany({
      where: {
        status: DrawStatus.CLOSED,
        result: null,
        closeAt: { lte: new Date() },
      },
      include: {
        provider: { select: { code: true } },
        operator: { select: { id: true } },
      },
    });

    if (!closedDraws.length) return;

    for (const draw of closedDraws) {
      const adapter = this.adapterRegistry.get(draw.provider.code);
      if (!adapter) continue;

      try {
        const result = await adapter.fetchLatestResult();
        if (!result) continue;

        // Obtener un usuario sistema para la auditoría
        const systemUser = await this.prisma.user.findFirst({
          where: { operatorId: draw.operator.id, role: 'OPERATOR_ADMIN' },
          select: { id: true },
        });
        if (!systemUser) continue;

        // Publicar como DRAFT (aún requiere confirmación manual)
        await this.resultsService.publish(draw.operator.id, systemUser.id, {
          drawId: draw.id,
          firstPrize: result.firstPrize,
          secondPrize: result.secondPrize,
          thirdPrize: result.thirdPrize,
          extraNumbers: result.extraNumbers,
          source: `AUTO:${draw.provider.code}`,
        });

        this.logger.log(
          `Resultado automático publicado (DRAFT) — Draw: ${draw.name} — ${result.firstPrize}`,
        );
      } catch (err) {
        this.logger.error(`Error auto-resultado ${draw.name}: ${(err as Error).message}`);
      }
    }
  }
}
