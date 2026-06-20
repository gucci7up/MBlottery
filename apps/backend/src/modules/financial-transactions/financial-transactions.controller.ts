import { Controller, Get, Post, Query, Param, Body, UseGuards } from '@nestjs/common';
import { FinancialTransactionsService } from './financial-transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TransactionDirection, UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('financial-transactions')
export class FinancialTransactionsController {
  constructor(private service: FinancialTransactionsService) {}

  @Roles(UserRole.SUPERVISOR)
  @Get()
  findAll(
    @CurrentUser('operatorId') operatorId: string,
    @Query('branchId') branchId?: string,
    @Query('cashSessionId') cashSessionId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.service.findAll({
      operatorId,
      branchId,
      cashSessionId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      take: take ? parseInt(take) : 100,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  @Roles(UserRole.SUPERVISOR)
  @Get('balance/:branchId')
  getBalance(
    @Param('branchId') branchId: string,
    @CurrentUser('operatorId') operatorId: string,
  ) {
    return this.service.getBalance(operatorId, branchId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get('reconcile/:branchId')
  reconcile(
    @Param('branchId') branchId: string,
    @CurrentUser('operatorId') operatorId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.reconcile(operatorId, branchId, new Date(from), new Date(to));
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Post('adjust')
  adjust(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') userId: string,
    @Body() body: {
      branchId: string;
      amount: number;
      direction: TransactionDirection;
      description: string;
    },
  ) {
    return this.service.createAdjustment({ ...body, operatorId, createdById: userId });
  }
}
