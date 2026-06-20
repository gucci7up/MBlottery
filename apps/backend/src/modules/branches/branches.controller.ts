import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, BranchStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private service: BranchesService) {}

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get()
  findAll(@CurrentUser('operatorId') operatorId: string) {
    return this.service.findAll(operatorId);
  }

  @Roles(UserRole.BRANCH_MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.findOne(id, operatorId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Post()
  create(
    @CurrentUser('operatorId') operatorId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.service.create(operatorId, dto);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('operatorId') operatorId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.service.update(id, operatorId, dto);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('operatorId') operatorId: string,
    @Body('status') status: BranchStatus,
  ) {
    return this.service.updateStatus(id, operatorId, status);
  }

  @Roles(UserRole.SUPERVISOR)
  @Get(':id/summary')
  getSummary(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.getSummary(id, operatorId);
  }
}
