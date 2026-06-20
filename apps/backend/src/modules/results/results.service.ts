import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, DrawStatus } from '@prisma/client';
import { PublishResultDto } from './dto/publish-result.dto';

export const PRIZE_PROCESSOR_QUEUE = 'prize-processor';
export const PROCESS_DRAW_JOB = 'process-draw';

@Injectable()
export class ResultsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @InjectQueue(PRIZE_PROCESSOR_QUEUE) private prizeQueue: Queue,
  ) {}

  findAll(operatorId: string) {
    return this.prisma.drawResult.findMany({
      where: { draw: { operatorId } },
      include: {
        draw: {
          select: {
            name: true,
            scheduledAt: true,
            provider: { select: { name: true } },
          },
        },
        publisher: { select: { name: true } },
        confirmer: { select: { name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });
  }

  async findOne(drawId: string, operatorId: string) {
    const result = await this.prisma.drawResult.findFirst({
      where: { drawId, draw: { operatorId } },
      include: { draw: true, publisher: { select: { name: true } } },
    });
    if (!result) throw new NotFoundException('Resultado no encontrado');
    return result;
  }

  async publish(operatorId: string, publishedBy: string, dto: PublishResultDto) {
    const draw = await this.prisma.draw.findFirst({
      where: { id: dto.drawId, operatorId },
    });
    if (!draw) throw new NotFoundException('Sorteo no encontrado');

    if (draw.status === DrawStatus.RESULTED) {
      throw new BadRequestException('Este sorteo ya tiene resultado publicado');
    }
    if (draw.status === DrawStatus.CANCELLED) {
      throw new BadRequestException('No se puede publicar resultado en sorteo cancelado');
    }
    if (draw.status === DrawStatus.SCHEDULED) {
      throw new BadRequestException('El sorteo debe estar OPEN o CLOSED');
    }

    const existing = await this.prisma.drawResult.findUnique({ where: { drawId: dto.drawId } });
    if (existing) throw new ConflictException('Ya existe un resultado para este sorteo');

    const integrityHash = this.computeResultHash({
      drawId: dto.drawId,
      firstPrize: dto.firstPrize,
      secondPrize: dto.secondPrize,
      thirdPrize: dto.thirdPrize,
    });

    // Cerrar sorteo si aún estaba abierto
    if (draw.status === DrawStatus.OPEN) {
      await this.prisma.draw.update({
        where: { id: dto.drawId },
        data: { status: DrawStatus.CLOSED },
      });
    }

    const result = await this.prisma.drawResult.create({
      data: {
        drawId: dto.drawId,
        firstPrize: dto.firstPrize,
        secondPrize: dto.secondPrize ?? null,
        thirdPrize: dto.thirdPrize ?? null,
        extraNumbers: dto.extraNumbers ?? [],
        source: dto.source ?? 'MANUAL',
        integrityHash,
        publishedBy,
        status: 'DRAFT',
      },
    });

    await this.audit.log({
      operatorId,
      userId: publishedBy,
      action: AuditAction.RESULT_PUBLISH,
      entity: 'DrawResult',
      entityId: result.id,
      metadata: { drawId: dto.drawId, firstPrize: dto.firstPrize },
    });

    return result;
  }

  async confirm(drawId: string, operatorId: string, confirmedBy: string) {
    const result = await this.findOne(drawId, operatorId);

    if (result.status !== 'DRAFT') {
      throw new BadRequestException('Solo resultados DRAFT pueden confirmarse');
    }
    if (result.publishedBy === confirmedBy) {
      throw new ForbiddenException('El confirmador debe ser diferente al publicador');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.drawResult.update({
        where: { id: result.id },
        data: { status: 'CONFIRMED', confirmedBy, confirmedAt: new Date() },
      });
      await tx.draw.update({
        where: { id: drawId },
        data: { status: DrawStatus.RESULTED },
      });
    });

    // Encolar fuera de la transacción — jobId único garantiza idempotencia
    await this.prizeQueue.add(
      PROCESS_DRAW_JOB,
      { drawId, operatorId },
      {
        jobId: `draw-${drawId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    await this.audit.log({
      operatorId,
      userId: confirmedBy,
      action: AuditAction.RESULT_CONFIRM,
      entity: 'DrawResult',
      entityId: result.id,
      metadata: { drawId },
    });

    return { message: 'Resultado confirmado. Procesamiento de premios iniciado.' };
  }

  async reprocess(drawId: string, operatorId: string, userId: string) {
    const result = await this.findOne(drawId, operatorId);
    if (result.status !== 'CONFIRMED') {
      throw new BadRequestException('Solo resultados confirmados pueden reprocesarse');
    }

    // Nuevo jobId con timestamp para forzar re-ejecución
    await this.prizeQueue.add(
      PROCESS_DRAW_JOB,
      { drawId, operatorId, isReprocess: true },
      {
        jobId: `draw-${drawId}-reprocess-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    await this.audit.log({
      operatorId,
      userId,
      action: AuditAction.RESULT_REPROCESS,
      entity: 'DrawResult',
      entityId: result.id,
      metadata: { drawId },
    });

    return { message: 'Reprocesamiento de premios iniciado.' };
  }

  private computeResultHash(params: {
    drawId: string;
    firstPrize: string;
    secondPrize?: string;
    thirdPrize?: string;
  }): string {
    const payload = [
      params.drawId,
      params.firstPrize,
      params.secondPrize ?? '',
      params.thirdPrize ?? '',
    ].join('|');
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}
