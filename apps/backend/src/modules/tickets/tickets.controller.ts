import { Controller, Get, Post, Patch, Param, Body, Headers, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private service: TicketsService) {}

  @Post()
  create(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('branchId') branchId: string,
    @CurrentUser('id') cashierId: string,
    @Body() dto: CreateTicketDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.create({ operatorId, branchId, cashierId, idempotencyKey, dto });
  }

  @Get('serial/:code')
  findBySerial(@Param('code') code: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.findBySerial(code, operatorId);
  }

  @Roles(UserRole.SUPERVISOR)
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.service.cancel(id, operatorId, userId, reason);
  }

  @Post(':id/reprint')
  reprint(
    @Param('id') id: string,
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reprint(id, operatorId, userId);
  }
}
