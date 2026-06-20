import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ResultsService } from './results.service';
import { AdapterRegistry } from './adapters/adapter-registry';
import { PublishResultDto } from './dto/publish-result.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('results')
export class ResultsController {
  constructor(
    private service: ResultsService,
    private adapterRegistry: AdapterRegistry,
  ) {}

  @Roles(UserRole.SUPERVISOR)
  @Get()
  findAll(@CurrentUser('operatorId') operatorId: string) {
    return this.service.findAll(operatorId);
  }

  @Roles(UserRole.SUPERVISOR)
  @Get(':drawId')
  findOne(@Param('drawId') drawId: string, @CurrentUser('operatorId') operatorId: string) {
    return this.service.findOne(drawId, operatorId);
  }

  @Roles(UserRole.SUPERVISOR)
  @Post()
  publish(
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PublishResultDto,
  ) {
    return this.service.publish(operatorId, userId, dto);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Post(':drawId/confirm')
  confirm(
    @Param('drawId') drawId: string,
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.confirm(drawId, operatorId, userId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Post(':drawId/reprocess')
  reprocess(
    @Param('drawId') drawId: string,
    @CurrentUser('operatorId') operatorId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reprocess(drawId, operatorId, userId);
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get('adapters')
  listAdapters() {
    return {
      registered: this.adapterRegistry.listRegistered(),
      note: 'Adapters con soporte de obtención automática de resultados',
    };
  }
}
