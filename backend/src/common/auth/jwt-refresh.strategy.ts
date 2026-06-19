import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { getJwtRefreshTokenPublicKey } from '@config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_REFRESH_STRATEGY_NAME } from './auth.constants';
import type { AuthTokenClaims, AuthenticatedUser } from './auth.types';

function fromRefreshTokenBody(request: { body?: { refreshToken?: string } } | undefined): string | null {
  return request?.body?.refreshToken ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, JWT_REFRESH_STRATEGY_NAME) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([fromRefreshTokenBody]),
      secretOrKey: getJwtRefreshTokenPublicKey(),
      algorithms: ['RS256'],
    });
  }

  validate(payload: AuthTokenClaims): AuthenticatedUser {
    if (payload.tokenUse !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}