import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { OperatorsService } from './operators.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, OperatorStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('operators')
export class OperatorsController {
  constructor(private service: OperatorsService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateOperatorDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOperatorDto) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OperatorStatus,
  ) {
    return this.service.updateStatus(id, status);
  }
}
