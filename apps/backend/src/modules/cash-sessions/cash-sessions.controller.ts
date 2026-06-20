import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { CashSessionsService } from './cash-sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash-sessions')
export class CashSessionsController {
  constructor(private service: CashSessionsService) {}

  @Get('mine')
  findMine(@CurrentUser('id') cashierId: string) {
    return this.service.findMineOpen(cashierId);
  }

  @Roles(UserRole.SUPERVISOR)
  @Get('branch/:branchId')
  findActive(@Param('branchId') branchId: string) {
    return this.service.findActive(branchId);
  }

  @Roles(UserRole.SUPERVISOR)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.findOne(id, operatorId);
  }

  @Roles(UserRole.SUPERVISOR)
  @Get(':id/summary')
  getSummary(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.getSummary(id, operatorId);
  }

  @Roles(UserRole.SUPERVISOR)
  @Post('open')
  open(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') openedBy: string,
    @Body() body: { branchId: string; cashierId: string; openingBalance: number },
  ) {
    return this.service.open({ operatorId, openedBy, ...body });
  }

  @Post(':id/close')
  close(
    @Param('id') sessionId: string,
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') closedBy: string,
    @Body() body: { declaredBalance: number },
  ) {
    return this.service.close({
      sessionId,
      operatorId,
      cashierId: closedBy,
      declaredBalance: body.declaredBalance,
      closedBy,
    });
  }

  @Roles(UserRole.SUPERVISOR)
  @Patch(':id/approve-close')
  approveClose(
    @Param('id') sessionId: string,
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') approvedBy: string,
    @Body('notes') notes?: string,
  ) {
    return this.service.approveClose({ sessionId, operatorId, approvedBy, notes });
  }
}
