import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { LotteryProvidersService, CreateProviderDto } from './lottery-providers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lottery-providers')
export class LotteryProvidersController {
  constructor(private service: LotteryProvidersService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.service.findAll(all !== 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateProviderDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProviderDto> & { active?: boolean }) {
    return this.service.update(id, dto);
  }
}
