import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchStatus } from '@prisma/client';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(operatorId: string) {
    return this.prisma.branch.findMany({
      where: { operatorId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        status: true,
        createdAt: true,
        _count: { select: { users: true, cashSessions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, operatorId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, operatorId },
      include: {
        users: {
          where: { active: true },
          select: { id: true, name: true, role: true },
        },
        settings: true,
      },
    });
    if (!branch) throw new NotFoundException('Banca no encontrada');
    return branch;
  }

  async create(operatorId: string, dto: CreateBranchDto) {
    const existing = await this.prisma.branch.findUnique({
      where: { operatorId_code: { operatorId, code: dto.code } },
    });
    if (existing) throw new ConflictException('El código de banca ya existe');

    return this.prisma.branch.create({ data: { ...dto, operatorId } });
  }

  async update(id: string, operatorId: string, dto: UpdateBranchDto) {
    await this.findOne(id, operatorId);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, operatorId: string, status: BranchStatus) {
    await this.findOne(id, operatorId);
    return this.prisma.branch.update({ where: { id }, data: { status } });
  }

  async getSummary(id: string, operatorId: string) {
    await this.findOne(id, operatorId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalSales, totalPrizes, activeCashSessions] = await Promise.all([
      this.prisma.financialTransaction.aggregate({
        where: { branchId: id, type: 'SALE', createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: { branchId: id, type: 'PRIZE_PAYMENT', createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      this.prisma.cashSession.count({
        where: { branchId: id, status: 'OPEN' },
      }),
    ]);

    return {
      todaySales: totalSales._sum.amount ?? 0,
      todayPrizes: totalPrizes._sum.amount ?? 0,
      activeCashSessions,
    };
  }
}
