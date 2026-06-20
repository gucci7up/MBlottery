import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DrawStatus } from '@prisma/client';
import { CreateDrawDto } from './dto/create-draw.dto';
import { EventsGateway } from '../../gateways/events.gateway';

@Injectable()
export class DrawsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  findAll(operatorId: string, status?: DrawStatus) {
    return this.prisma.draw.findMany({
      where: { operatorId, ...(status ? { status } : {}) },
      include: { provider: { select: { name: true, code: true, logoUrl: true } }, result: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  findOpen(operatorId: string) {
    const now = new Date();
    return this.prisma.draw.findMany({
      where: {
        operatorId,
        status: DrawStatus.OPEN,
        closeAt: { gt: now },
      },
      include: { provider: { select: { id: true, name: true, code: true, logoUrl: true } } },
      orderBy: { closeAt: 'asc' },
    });
  }

  async findOne(id: string, operatorId: string) {
    const draw = await this.prisma.draw.findFirst({
      where: { id, operatorId },
      include: {
        provider: true,
        result: true,
        _count: { select: { tickets: true } },
      },
    });
    if (!draw) throw new NotFoundException('Sorteo no encontrado');
    return draw;
  }

  async create(operatorId: string, dto: CreateDrawDto) {
    return this.prisma.draw.create({
      data: { ...dto, operatorId, status: DrawStatus.SCHEDULED },
    });
  }

  async open(id: string, operatorId: string) {
    const draw = await this.findOne(id, operatorId);
    if (draw.status !== DrawStatus.SCHEDULED) {
      throw new BadRequestException('Solo sorteos en estado SCHEDULED pueden abrirse');
    }
    const updated = await this.prisma.draw.update({
      where: { id },
      data: { status: DrawStatus.OPEN },
    });
    this.events.emitToOperator(operatorId, {
      event: 'DRAW_OPEN',
      data: { drawId: id, name: draw.name, closeAt: draw.closeAt.toISOString() },
    });
    return updated;
  }

  async close(id: string, operatorId: string) {
    const draw = await this.findOne(id, operatorId);
    if (draw.status !== DrawStatus.OPEN) {
      throw new BadRequestException('Solo sorteos OPEN pueden cerrarse');
    }
    const updated = await this.prisma.draw.update({
      where: { id },
      data: { status: DrawStatus.CLOSED },
    });
    this.events.emitToOperator(operatorId, { event: 'DRAW_CLOSED', data: { drawId: id } });
    return updated;
  }

  async cancel(id: string, operatorId: string) {
    const draw = await this.findOne(id, operatorId);
    if (([DrawStatus.RESULTED, DrawStatus.CANCELLED] as string[]).includes(draw.status)) {
      throw new BadRequestException('No se puede cancelar en este estado');
    }
    return this.prisma.draw.update({
      where: { id },
      data: { status: DrawStatus.CANCELLED },
    });
  }

  /** Llamado por el scheduler — cierra automáticamente sorteos OPEN con closeAt pasado */
  async autoCloseExpired() {
    const now = new Date();
    const expired = await this.prisma.draw.findMany({
      where: { status: DrawStatus.OPEN, closeAt: { lte: now } },
      select: { id: true, operatorId: true, name: true },
    });

    for (const draw of expired) {
      await this.prisma.draw.update({
        where: { id: draw.id },
        data: { status: DrawStatus.CLOSED },
      });
      this.events.emitToOperator(draw.operatorId, {
        event: 'DRAW_CLOSED',
        data: { drawId: draw.id },
      });
    }

    return expired.length;
  }
}
