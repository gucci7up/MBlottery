import { Module } from '@nestjs/common';
import { DrawsController } from './draws.controller';
import { DrawsService } from './draws.service';
import { DrawSchedulerJob } from '../../jobs/draw-scheduler.job';

@Module({
  controllers: [DrawsController],
  providers: [DrawsService, DrawSchedulerJob],
  exports: [DrawsService],
})
export class DrawsModule {}
