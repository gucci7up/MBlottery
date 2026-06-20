import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { PayoutTablesService } from './payout-tables.service';
import { CreatePayoutTableDto } from './dto/create-payout-table.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payout-tables')
export class PayoutTablesController {
  constructor(private service: PayoutTablesService) {}

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get()
  findAll(@CurrentUser('operatorId') operatorId: string) {
    return this.service.findAll(operatorId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.findOne(id, operatorId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Post()
  create(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePayoutTableDto,
  ) {
    return this.service.create(operatorId, userId, dto);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Patch(':id/submit')
  submit(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.submit(id, operatorId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Patch(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.approve(id, operatorId, userId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') userId: string,
    @Body('note') note: string,
  ) {
    return this.service.reject(id, operatorId, userId, note);
  }
}
