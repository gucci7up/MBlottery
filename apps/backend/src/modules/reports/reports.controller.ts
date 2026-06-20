import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Roles(UserRole.SUPERVISOR)
  @Get('sales')
  getSales(
    @CurrentUser('operatorId') operatorId: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = to ? new Date(to) : now;
    return this.service.getSalesReport({ operatorId, branchId, from: start, to: end });
  }

  @Roles(UserRole.SUPERVISOR)
  @Get('prizes')
  getPrizes(
    @CurrentUser('operatorId') operatorId: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = to ? new Date(to) : now;
    return this.service.getPrizesReport({ operatorId, branchId, from: start, to: end });
  }

  @Roles(UserRole.SUPERVISOR)
  @Get('closing')
  getClosing(
    @CurrentUser('operatorId') operatorId: string,
    @Query('branchId') branchId: string,
    @Query('date') date?: string,
  ) {
    const d = date ? new Date(date) : new Date();
    return this.service.getClosingReport({ operatorId, branchId, date: d });
  }

  @Roles(UserRole.OPERATOR_ADMIN)
  @Get('sales/export')
  async exportSales(
    @CurrentUser('operatorId') operatorId: string,
    @Query('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportSalesCSV({
      operatorId,
      branchId,
      from: new Date(from),
      to: new Date(to),
    });

    const filename = `ventas_${from ?? 'all'}_${to ?? 'all'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv); // BOM para UTF-8 en Excel
  }
}
