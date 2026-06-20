import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private service: AuditService) {}

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get()
  findAll(
    @CurrentUser('operatorId') operatorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.service.findAll(operatorId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      userId,
      entity,
      take: take ? parseInt(take) : 50,
      skip: skip ? parseInt(skip) : 0,
    });
  }
}
