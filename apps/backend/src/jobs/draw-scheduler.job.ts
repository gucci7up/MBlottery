import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DrawsService } from '../modules/draws/draws.service';

@Injectable()
export class DrawSchedulerJob {
  private readonly logger = new Logger(DrawSchedulerJob.name);

  constructor(private drawsService: DrawsService) {}

  /** Verifica cada minuto si hay sorteos abiertos con closeAt pasado */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoClose() {
    const count = await this.drawsService.autoCloseExpired();
    if (count > 0) {
      this.logger.log(`Auto-cerrados ${count} sorteo(s)`);
    }
  }
}
