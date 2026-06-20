import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DrawsService } from './draws.service';
import { CreateDrawDto } from './dto/create-draw.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DrawStatus, UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('draws')
export class DrawsController {
  constructor(private service: DrawsService) {}

  @Get()
  findAll(
    @CurrentUser('operatorId') operatorId: string,
    @Query('status') status?: DrawStatus,
  ) {
    return this.service.findAll(operatorId, status);
  }

  @Get('open')
  findOpen(@CurrentUser('operatorId') operatorId: string) {
    return this.service.findOpen(operatorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.findOne(id, operatorId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Post()
  create(@CurrentUser('operatorId') operatorId: string, @Body() dto: CreateDrawDto) {
    return this.service.create(operatorId, dto);
  }

  @Roles(UserRole.SUPERVISOR)
  @Patch(':id/open')
  open(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.open(id, operatorId);
  }

  @Roles(UserRole.SUPERVISOR)
  @Patch(':id/close')
  close(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.close(id, operatorId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.cancel(id, operatorId);
  }
}
