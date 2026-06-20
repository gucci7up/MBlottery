import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

export interface LogParams {
  operatorId: string;
  userId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: LogParams): Promise<void> {
    await this.prisma.auditLog.create({ data: params });
  }

  async findAll(operatorId: string, filters: {
    action?: AuditAction;
    entity?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    take?: number;
    skip?: number;
  }) {
    const { action, entity, userId, from, to, take = 50, skip = 0 } = filters;

    return this.prisma.auditLog.findMany({
      where: {
        operatorId,
        ...(action ? { action } : {}),
        ...(entity ? { entity } : {}),
        ...(userId ? { userId } : {}),
        ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
      },
      include: {
        user: { select: { name: true, username: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }
}
