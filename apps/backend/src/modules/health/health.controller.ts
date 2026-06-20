import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      async (): Promise<HealthIndicatorResult> => {
        const pong = await this.redis.ping();
        const isHealthy = pong === 'PONG';
        return {
          redis: { status: isHealthy ? 'up' : 'down' },
        };
      },
    ]);
  }
}
