import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Post()
  process(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('branchId') branchId: string,
    @CurrentUser('id') paidBy: string,
    @Body() body: { ticketId: string; authorizerId?: string; notes?: string },
  ) {
    return this.service.process({ ...body, operatorId, branchId, paidBy });
  }

  @Roles(UserRole.SUPERVISOR)
  @Get('pending')
  findPending(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('branchId') branchId: string,
  ) {
    return this.service.findPending(operatorId, branchId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get()
  findAll(
    @CurrentUser('operatorId') operatorId: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(
      operatorId,
      branchId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
