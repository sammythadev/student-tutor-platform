import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { getJwtAccessTokenPublicKey } from '@config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_ACCESS_STRATEGY_NAME } from './auth.constants';
import type { AuthTokenClaims, AuthenticatedUser } from './auth.types';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, JWT_ACCESS_STRATEGY_NAME) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: getJwtAccessTokenPublicKey(),
      algorithms: ['RS256'],
    });
  }

  validate(payload: AuthTokenClaims): AuthenticatedUser {
    if (payload.tokenUse !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}