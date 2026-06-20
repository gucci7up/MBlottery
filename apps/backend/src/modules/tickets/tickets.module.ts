import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { LimitsModule } from '../limits/limits.module';
import { PayoutTablesModule } from '../payout-tables/payout-tables.module';
import { CashSessionsModule } from '../cash-sessions/cash-sessions.module';

@Module({
  imports: [LimitsModule, PayoutTablesModule, CashSessionsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
