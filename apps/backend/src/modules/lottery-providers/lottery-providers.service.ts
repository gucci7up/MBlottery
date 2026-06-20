import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateProviderDto {
  name: string;
  code: string;
  country?: string;
  logoUrl?: string;
  sortOrder?: number;
}

@Injectable()
export class LotteryProvidersService {
  constructor(private prisma: PrismaService) {}

  findAll(onlyActive = true) {
    return this.prisma.lotteryProvider.findMany({
      where: onlyActive ? { active: true } : {},
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.lotteryProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Lotería no encontrada');
    return p;
  }

  create(dto: CreateProviderDto) {
    return this.prisma.lotteryProvider.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateProviderDto> & { active?: boolean }) {
    await this.findOne(id);
    return this.prisma.lotteryProvider.update({ where: { id }, data: dto });
  }
}
