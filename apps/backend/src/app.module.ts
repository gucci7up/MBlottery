import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { OperatorsModule } from './modules/operators/operators.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';
import { LotteryProvidersModule } from './modules/lottery-providers/lottery-providers.module';
import { DrawsModule } from './modules/draws/draws.module';
import { ResultsModule } from './modules/results/results.module';
import { PayoutTablesModule } from './modules/payout-tables/payout-tables.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { LimitsModule } from './modules/limits/limits.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CashSessionsModule } from './modules/cash-sessions/cash-sessions.module';
import { FinancialTransactionsModule } from './modules/financial-transactions/financial-transactions.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { EventsModule } from './gateways/events.module';
import { HealthModule } from './modules/health/health.module';
import { TicketExpiryJob } from './jobs/ticket-expiry.job';
import { CommissionsModule } from './modules/commissions/commissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    OperatorsModule,
    BranchesModule,
    UsersModule,
    LotteryProvidersModule,
    DrawsModule,
    ResultsModule,
    PayoutTablesModule,
    TicketsModule,
    LimitsModule,
    PaymentsModule,
    CashSessionsModule,
    FinancialTransactionsModule,
    DashboardModule,
    ReportsModule,
    AuditModule,
    EventsModule,
    HealthModule,
    CommissionsModule,
  ],
  providers: [TicketExpiryJob],
})
export class AppModule {}
