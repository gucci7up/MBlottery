import { Module } from '@nestjs/common';
import { LotteryProvidersController } from './lottery-providers.controller';
import { LotteryProvidersService } from './lottery-providers.service';

@Module({
  controllers: [LotteryProvidersController],
  providers: [LotteryProvidersService],
  exports: [LotteryProvidersService],
})
export class LotteryProvidersModule {}
