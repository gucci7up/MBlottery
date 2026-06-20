import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { OperatorStatus } from '@prisma/client';

@Injectable()
export class OperatorsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.operator.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        contactEmail: true,
        contactPhone: true,
        createdAt: true,
        _count: { select: { branches: true, users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
      include: {
        branches: { select: { id: true, name: true, code: true, status: true } },
        _count: { select: { users: true } },
      },
    });
    if (!operator) throw new NotFoundException('Operador no encontrado');
    return operator;
  }

  async create(dto: CreateOperatorDto) {
    const existing = await this.prisma.operator.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('El slug ya existe');

    return this.prisma.operator.create({ data: dto });
  }

  async update(id: string, dto: UpdateOperatorDto) {
    await this.findOne(id);
    return this.prisma.operator.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, status: OperatorStatus) {
    await this.findOne(id);
    return this.prisma.operator.update({ where: { id }, data: { status } });
  }
}
