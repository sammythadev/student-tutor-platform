import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AUTH_ROLES_METADATA_KEY } from './auth.constants';
import type { AccountRole, AuthenticatedUser } from './auth.types';

interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AccountRole[]>(AUTH_ROLES_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const currentUser = request.authUser;

    if (!currentUser) {
      throw new ForbiddenException('Authentication is required');
    }

    if (!requiredRoles.includes(currentUser.role)) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}