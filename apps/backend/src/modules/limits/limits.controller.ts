import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { LimitsService } from './limits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('limits')
export class LimitsController {
  constructor(private service: LimitsService) {}

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get()
  findAll(@CurrentUser('operatorId') operatorId: string) {
    return this.service.findAll(operatorId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Post()
  create(@CurrentUser('operatorId') operatorId: string, @Body() dto: Record<string, unknown>) {
    return this.service.create(operatorId, dto);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('operatorId') operatorId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.service.update(id, operatorId, dto);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
