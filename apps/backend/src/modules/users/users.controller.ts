import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Roles(UserRole.BRANCH_MANAGER)
  @Get()
  findAll(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('branchId') branchId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const scopedBranch = role === UserRole.OPERATOR_ADMIN ? undefined : branchId;
    return this.service.findAll(operatorId, scopedBranch);
  }

  @Roles(UserRole.BRANCH_MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.findOne(id, operatorId);
  }

  @Roles(UserRole.BRANCH_MANAGER)
  @Post()
  create(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateUserDto,
  ) {
    return this.service.create(operatorId, role, dto);
  }

  @Roles(UserRole.BRANCH_MANAGER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('operatorId') operatorId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.update(id, operatorId, dto);
  }

  @Roles(UserRole.BRANCH_MANAGER)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.setActive(id, operatorId, false);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Patch(':id/activate')
  activate(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.setActive(id, operatorId, true);
  }

  @Roles(UserRole.SUPERVISOR)
  @Patch(':id/unlock')
  unlock(@Param('id') id: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.unlock(id, operatorId);
  }
}
