import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { Redis } from 'ioredis';
import { Modality } from '@prisma/client';
import Decimal from 'decimal.js';
import { EventsGateway } from '../../gateways/events.gateway';

const LIMIT_KEY_TTL = 60 * 60 * 24; // 24h — se renueva con cada sorteo

@Injectable()
export class LimitsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  private buildRedisKey(operatorId: string, drawId: string, modality: Modality, number: string) {
    return `limit:${operatorId}:${drawId}:${modality}:${number}`;
  }

  /**
   * Verifica si una apuesta puede registrarse y reserva atómicamente el monto.
   * Devuelve el límite relevante si existe, o null si no hay restricción.
   * Lanza BadRequestException si el número está bloqueado o supera el límite.
   */
  async checkAndReserve(params: {
    operatorId: string;
    branchId: string;
    drawId: string;
    providerId: string;
    modality: Modality;
    number: string;
    amount: Decimal;
  }): Promise<void> {
    // Buscar límite más específico aplicable (mayor priority)
    const limits = await this.prisma.betLimit.findMany({
      where: {
        operatorId: params.operatorId,
        active: true,
        AND: [
          { OR: [{ branchId: null }, { branchId: params.branchId }] },
          { OR: [{ drawId: null }, { drawId: params.drawId }] },
          { OR: [{ providerId: null }, { providerId: params.providerId }] },
          { OR: [{ modality: null }, { modality: params.modality }] },
          { OR: [{ number: null }, { number: params.number }] },
        ],
      },
      orderBy: { priority: 'desc' },
      take: 1,
    });

    const limit = limits[0];
    if (!limit) return; // Sin límite = libre

    if (limit.blocked) {
      throw new BadRequestException(`Número ${params.number} está bloqueado`);
    }

    const maxAmount = new Decimal(limit.maxAmount.toString());
    const betAmount = new Decimal(params.amount.toString());

    const key = this.buildRedisKey(params.operatorId, params.drawId, params.modality, params.number);

    // Script Lua atómico: verifica y reserva en una sola operación
    const luaScript = `
      local current = tonumber(redis.call('GET', KEYS[1])) or 0
      local max = tonumber(ARGV[1])
      local amount = tonumber(ARGV[2])
      if current + amount > max then
        return -1
      end
      local new = redis.call('INCRBY', KEYS[1], math.floor(amount * 100))
      redis.call('EXPIRE', KEYS[1], ARGV[3])
      return new
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      key,
      (maxAmount.mul(100)).toFixed(0),  // centavos para evitar floats
      (betAmount.mul(100)).toFixed(0),
      String(LIMIT_KEY_TTL),
    ) as number;

    if (result === -1) {
      throw new BadRequestException(
        `Límite alcanzado para número ${params.number}. Máximo: RD$${maxAmount.toFixed(2)}`,
      );
    }

    // Verificar si está cerca del umbral de alerta
    if (limit.warningThreshold) {
      const currentAmount = new Decimal(result).div(100);
      const pct = currentAmount.div(maxAmount).toNumber();
      if (pct >= Number(limit.warningThreshold)) {
        this.events.emitToOperator(params.operatorId, {
          event: 'LIMIT_ALERT',
          data: {
            number: params.number,
            drawId: params.drawId,
            percentage: Math.round(pct * 100),
          },
        });
      }
    }
  }

  /** Libera el monto reservado (llamar si la transacción de ticket falla) */
  async release(params: {
    operatorId: string;
    drawId: string;
    modality: Modality;
    number: string;
    amount: Decimal;
  }): Promise<void> {
    const key = this.buildRedisKey(params.operatorId, params.drawId, params.modality, params.number);
    const centavos = params.amount.mul(100).toFixed(0);
    await this.redis.decrby(key, parseInt(centavos));
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  findAll(operatorId: string) {
    return this.prisma.betLimit.findMany({
      where: { operatorId },
      include: {
        branch: { select: { name: true, code: true } },
        draw: { select: { name: true } },
        provider: { select: { name: true, code: true } },
      },
      orderBy: { priority: 'desc' },
    });
  }

  create(operatorId: string, dto: Record<string, unknown>) {
    return this.prisma.betLimit.create({ data: { ...dto, operatorId } as any });
  }

  async update(id: string, operatorId: string, dto: Record<string, unknown>) {
    return this.prisma.betLimit.update({
      where: { id },
      data: dto as any,
    });
  }

  async remove(id: string) {
    return this.prisma.betLimit.update({ where: { id }, data: { active: false } });
  }
}
