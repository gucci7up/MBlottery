import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 6,
  OPERATOR_ADMIN: 5,
  BRANCH_OWNER: 4,
  BRANCH_MANAGER: 3,
  SUPERVISOR: 2,
  CASHIER: 1,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(operatorId: string, branchId?: string) {
    return this.prisma.user.findMany({
      where: { operatorId, ...(branchId ? { branchId } : {}) },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        lastLoginAt: true,
        branch: { select: { name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, operatorId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, operatorId },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        branchId: true,
        lastLoginAt: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        branch: { select: { name: true, code: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(operatorId: string, creatorRole: UserRole, dto: CreateUserDto) {
    // Un usuario no puede crear un rol mayor al suyo
    if (ROLE_HIERARCHY[dto.role] >= ROLE_HIERARCHY[creatorRole]) {
      throw new ForbiddenException('No puedes crear un usuario con rol igual o superior al tuyo');
    }

    const existing = await this.prisma.user.findUnique({
      where: { operatorId_username: { operatorId, username: dto.username } },
    });
    if (existing) throw new ConflictException('El nombre de usuario ya existe');

    const pinHash = await bcrypt.hash(dto.pin, 12);

    return this.prisma.user.create({
      data: {
        ...dto,
        operatorId,
        pin: pinHash,
      },
      select: { id: true, name: true, username: true, role: true },
    });
  }

  async update(id: string, operatorId: string, dto: UpdateUserDto) {
    await this.findOne(id, operatorId);
    const { pin, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };

    if (pin) {
      data.pin = await bcrypt.hash(pin, 12);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, username: true, role: true },
    });
  }

  async setActive(id: string, operatorId: string, active: boolean) {
    await this.findOne(id, operatorId);
    return this.prisma.user.update({
      where: { id },
      data: { active, lockedUntil: active ? null : undefined, failedLoginAttempts: 0 },
      select: { id: true, active: true },
    });
  }

  async unlock(id: string, operatorId: string) {
    await this.findOne(id, operatorId);
    return this.prisma.user.update({
      where: { id },
      data: { lockedUntil: null, failedLoginAttempts: 0 },
    });
  }
}
