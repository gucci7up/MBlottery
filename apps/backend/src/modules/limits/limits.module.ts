import { Module } from '@nestjs/common';
import { LimitsController } from './limits.controller';
import { LimitsService } from './limits.service';

@Module({
  controllers: [LimitsController],
  providers: [LimitsService],
  exports: [LimitsService],
})
export class LimitsModule {}
