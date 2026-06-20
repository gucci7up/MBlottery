import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Roles(UserRole.SUPERVISOR)
  @Get('summary')
  getSummary(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('branchId') branchId: string,
    @CurrentUser('role') role: UserRole,
    @Query('branchId') queryBranchId?: string,
  ) {
    const scopedBranch =
      role === UserRole.OPERATOR_ADMIN || role === UserRole.SUPER_ADMIN
        ? queryBranchId
        : branchId;
    return this.service.getSummary(operatorId, scopedBranch ?? undefined);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get('sales-by-branch')
  getSalesByBranch(@CurrentUser('operatorId') operatorId: string) {
    return this.service.getSalesByBranch(operatorId);
  }

  @Roles(UserRole.SUPERVISOR)
  @Get('top-numbers')
  getTopNumbers(
    @CurrentUser('operatorId') operatorId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getTopNumbers(operatorId, limit ? parseInt(limit) : 10);
  }

  @Roles(UserRole.SUPERVISOR)
  @Get('pending-prizes')
  getPendingPrizes(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('branchId') branchId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const scoped = [UserRole.OPERATOR_ADMIN, UserRole.SUPER_ADMIN].includes(role)
      ? undefined
      : branchId;
    return this.service.getPendingPrizes(operatorId, scoped);
  }

  @Roles(UserRole.SUPERVISOR)
  @Get('activity')
  getRecentActivity(
    @CurrentUser('operatorId') operatorId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRecentActivity(operatorId, limit ? parseInt(limit) : 20);
  }
}
