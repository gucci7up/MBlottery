import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommissionPeriodType, CommissionStatus, UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private service: CommissionsService) {}

  // ─── Config ────────────────────────────────────────────────────────────────

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get('config')
  findConfigs(@CurrentUser('operatorId') operatorId: string) {
    return this.service.findConfigs(operatorId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Post('config')
  setConfig(
    @CurrentUser('operatorId') operatorId: string,
    @Body() body: { branchId?: string; rate: number; periodType: CommissionPeriodType },
  ) {
    return this.service.setConfig(operatorId, body);
  }

  // ─── Statements ────────────────────────────────────────────────────────────

  @Roles(UserRole.BRANCH_OWNER)
  @Get('statements')
  findStatements(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('branchId') branchId: string,
    @CurrentUser('role') role: UserRole,
    @Query('branchId') queryBranchId?: string,
    @Query('status') status?: CommissionStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const scopedBranch =
      role === UserRole.OPERATOR_ADMIN || role === UserRole.SUPER_ADMIN
        ? queryBranchId
        : branchId;

    return this.service.findStatements(operatorId, {
      branchId: scopedBranch,
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Post('statements/generate')
  generate(
    @CurrentUser('operatorId') operatorId: string,
    @Body() body: { branchId: string; periodStart: string },
  ) {
    return this.service.generateStatement(operatorId, body.branchId, new Date(body.periodStart));
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Post('statements/generate-monthly')
  generateMonthly(@CurrentUser('operatorId') operatorId: string) {
    return this.service.generateMonthlyStatements(operatorId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Patch('statements/:id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.approve(id, operatorId, userId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Patch('statements/:id/mark-paid')
  markPaid(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.markPaid(id, operatorId);
  }
}
