import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { PrizeProcessorJob } from '../../jobs/prize-processor.job';
import { AutoResultsJob } from '../../jobs/auto-results.job';
import { AdapterRegistry } from './adapters/adapter-registry';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'prize-processor' }),
    AuditModule,
  ],
  controllers: [ResultsController],
  providers: [ResultsService, PrizeProcessorJob, AdapterRegistry, AutoResultsJob],
  exports: [ResultsService, AdapterRegistry],
})
export class ResultsModule {}
