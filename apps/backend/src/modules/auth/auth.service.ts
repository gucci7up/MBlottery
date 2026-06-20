import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { LoginDto } from './dto/login.dto';
import { AuditAction } from '@prisma/client';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const JWT_BLACKLIST_PREFIX = 'jwt:blacklist:';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        username: dto.username,
        active: true,
      },
      include: { operator: { select: { status: true } } },
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    if (user.operator.status === 'SUSPENDED') {
      throw new ForbiddenException('Operador suspendido');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(`Cuenta bloqueada. Intente en ${mins} minuto(s)`);
    }

    const pinValid = await bcrypt.compare(dto.pin, user.pin);

    if (!pinValid) {
      const attempts = user.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        updateData.failedLoginAttempts = 0;
      }

      await this.prisma.user.update({ where: { id: user.id }, data: updateData });

      await this.prisma.auditLog.create({
        data: {
          operatorId: user.operatorId,
          userId: user.id,
          action: AuditAction.LOGIN_FAILED,
          entity: 'User',
          entityId: user.id,
          metadata: { attempts, ip },
          ip,
        },
      });

      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const jwtId = uuidv4();
    const payload = {
      sub: user.id,
      jwtId,
      operatorId: user.operatorId,
      branchId: user.branchId,
      role: user.role,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: { userId: user.id, jwtId, ip, userAgent, expiresAt },
    });

    await this.prisma.auditLog.create({
      data: {
        operatorId: user.operatorId,
        userId: user.id,
        action: AuditAction.LOGIN,
        entity: 'User',
        entityId: user.id,
        metadata: { ip },
        ip,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        operatorId: user.operatorId,
        branchId: user.branchId,
      },
    };
  }

  async logout(userId: string, jwtId: string, operatorId: string) {
    const session = await this.prisma.session.findUnique({ where: { jwtId } });

    if (session) {
      await this.prisma.session.update({
        where: { jwtId },
        data: { revokedAt: new Date() },
      });

      const ttlSeconds = Math.floor(
        (session.expiresAt.getTime() - Date.now()) / 1000,
      );
      if (ttlSeconds > 0) {
        await this.redis.setex(`${JWT_BLACKLIST_PREFIX}${jwtId}`, ttlSeconds, '1');
      }
    }

    await this.prisma.auditLog.create({
      data: {
        operatorId,
        userId,
        action: AuditAction.LOGOUT,
        entity: 'User',
        entityId: userId,
      },
    });
  }

  async isTokenBlacklisted(jwtId: string): Promise<boolean> {
    const result = await this.redis.get(`${JWT_BLACKLIST_PREFIX}${jwtId}`);
    return result !== null;
  }

  async getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        operatorId: true,
        branchId: true,
        lastLoginAt: true,
        operator: { select: { name: true, logoUrl: true, primaryColor: true } },
        branch: { select: { name: true, code: true } },
      },
    });
  }
}
