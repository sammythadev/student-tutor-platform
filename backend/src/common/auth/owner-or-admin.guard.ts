import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.types';

interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
}

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const currentUser = request.authUser;

    if (!currentUser) {
      throw new UnauthorizedException('Authentication is required');
    }

    const targetUserId =
      request.params.id ??
      request.params.userId ??
      (request.body as { userId?: string } | undefined)?.userId;

    if (!targetUserId) {
      throw new BadRequestException('Target user identifier is required');
    }

    if (currentUser.role === 'admin' || currentUser.id === targetUserId) {
      return true;
    }

    throw new ForbiddenException('You can only access your own record');
  }
}