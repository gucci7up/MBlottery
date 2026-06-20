import { Module } from '@nestjs/common';
import { PayoutTablesController } from './payout-tables.controller';
import { PayoutTablesService } from './payout-tables.service';

@Module({
  controllers: [PayoutTablesController],
  providers: [PayoutTablesService],
  exports: [PayoutTablesService],
})
export class PayoutTablesModule {}
