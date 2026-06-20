import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PayoutTableStatus, Modality } from '@prisma/client';
import { CreatePayoutTableDto } from './dto/create-payout-table.dto';
import Decimal from 'decimal.js';

@Injectable()
export class PayoutTablesService {
  constructor(private prisma: PrismaService) {}

  findAll(operatorId: string) {
    return this.prisma.payoutTable.findMany({
      where: { operatorId },
      include: { entries: true, creator: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, operatorId: string) {
    const pt = await this.prisma.payoutTable.findFirst({
      where: { id, operatorId },
      include: { entries: { include: { provider: { select: { name: true, code: true } } } } },
    });
    if (!pt) throw new NotFoundException('Tabla de pagos no encontrada');
    return pt;
  }

  async create(operatorId: string, userId: string, dto: CreatePayoutTableDto) {
    return this.prisma.payoutTable.create({
      data: {
        operatorId,
        branchId: dto.branchId,
        name: dto.name,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdBy: userId,
        status: PayoutTableStatus.DRAFT,
        entries: {
          create: dto.entries.map((e) => ({
            modality: e.modality,
            providerId: e.providerId,
            multiplier: e.multiplier,
            minBetAmount: e.minBetAmount,
            maxBetAmount: e.maxBetAmount,
          })),
        },
      },
      include: { entries: true },
    });
  }

  async submit(id: string, operatorId: string) {
    const pt = await this.findOne(id, operatorId);
    if (pt.status !== PayoutTableStatus.DRAFT) {
      throw new BadRequestException('Solo tablas DRAFT pueden enviarse a aprobación');
    }
    return this.prisma.payoutTable.update({
      where: { id },
      data: { status: PayoutTableStatus.PENDING_APPROVAL },
    });
  }

  async approve(id: string, operatorId: string, approverId: string) {
    const pt = await this.findOne(id, operatorId);
    if (pt.status !== PayoutTableStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Solo tablas PENDING_APPROVAL pueden aprobarse');
    }
    if (pt.createdBy === approverId) {
      throw new ForbiddenException('El aprobador debe ser diferente al creador');
    }

    // Archivar la tabla activa anterior si la hay
    await this.prisma.payoutTable.updateMany({
      where: {
        operatorId,
        branchId: pt.branchId,
        status: PayoutTableStatus.ACTIVE,
      },
      data: {
        status: PayoutTableStatus.ARCHIVED,
        effectiveTo: new Date(pt.effectiveFrom),
      },
    });

    return this.prisma.payoutTable.update({
      where: { id },
      data: {
        status: PayoutTableStatus.ACTIVE,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });
  }

  async reject(id: string, operatorId: string, rejectorId: string, note: string) {
    const pt = await this.findOne(id, operatorId);
    if (pt.status !== PayoutTableStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Solo tablas PENDING_APPROVAL pueden rechazarse');
    }
    return this.prisma.payoutTable.update({
      where: { id },
      data: {
        status: PayoutTableStatus.DRAFT,
        rejectedBy: rejectorId,
        rejectedAt: new Date(),
        rejectionNote: note,
      },
    });
  }

  /**
   * Obtiene el multiplicador activo para una modalidad + provider en un operador/banca.
   * Prioridad: branch-specific > operator-wide, provider-specific > all-providers.
   */
  async getMultiplier(params: {
    operatorId: string;
    branchId: string;
    modality: Modality;
    providerId: string;
  }): Promise<{ multiplier: Decimal; minBetAmount: Decimal; maxBetAmount: Decimal; entryId: string }> {
    const now = new Date();

    const tables = await this.prisma.payoutTable.findMany({
      where: {
        operatorId: params.operatorId,
        status: PayoutTableStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        OR: [{ branchId: null }, { branchId: params.branchId }],
      },
      include: {
        entries: {
          where: {
            modality: params.modality,
            OR: [{ providerId: null }, { providerId: params.providerId }],
          },
        },
      },
    });

    // Prioridad: branchId específico > null (operator-wide); providerId específico > null
    let best: { multiplier: Decimal; minBetAmount: Decimal; maxBetAmount: Decimal; entryId: string } | null = null;
    let bestPriority = -1;

    for (const table of tables) {
      for (const entry of table.entries) {
        const priority =
          (table.branchId === params.branchId ? 2 : 0) +
          (entry.providerId === params.providerId ? 1 : 0);
        if (priority > bestPriority) {
          bestPriority = priority;
          best = {
            multiplier: new Decimal(entry.multiplier.toString()),
            minBetAmount: new Decimal(entry.minBetAmount.toString()),
            maxBetAmount: new Decimal(entry.maxBetAmount.toString()),
            entryId: entry.id,
          };
        }
      }
    }

    if (!best) {
      throw new BadRequestException(
        `No hay tabla de pagos activa para ${params.modality} en este operador`,
      );
    }

    return best;
  }
}
