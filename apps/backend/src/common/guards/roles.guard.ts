import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 6,
  OPERATOR_ADMIN: 5,
  BRANCH_OWNER: 4,   // Solo lectura de sus bancas
  BRANCH_MANAGER: 3,
  SUPERVISOR: 2,
  CASHIER: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Not authenticated');

    const userLevel = ROLE_HIERARCHY[user.role as UserRole] ?? 0;
    const requiredLevel = Math.min(...requiredRoles.map((r) => ROLE_HIERARCHY[r] ?? 99));

    if (userLevel < requiredLevel) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
