import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CashSessionsModule } from '../cash-sessions/cash-sessions.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [CashSessionsModule, AuditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
