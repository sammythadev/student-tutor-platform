import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_BEARER_PREFIX } from './auth.constants';
import { AuthTokenService } from './auth-token.service';
import type { AuthenticatedUser } from './auth.types';

interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authTokenService: AuthTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader?.startsWith(`${AUTH_BEARER_PREFIX} `)) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorizationHeader.slice(AUTH_BEARER_PREFIX.length + 1).trim();

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const claims = this.authTokenService.verifyAccessToken(token);

    request.authUser = {
      id: claims.sub,
      email: claims.email,
      role: claims.role,
    };

    return true;
  }
}