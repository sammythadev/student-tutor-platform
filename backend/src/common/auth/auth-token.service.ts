import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { sign, verify } from 'jsonwebtoken';
import {
  getJwtAccessTokenPrivateKey,
  getJwtAccessTokenPublicKey,
  getJwtAccessTokenTtlSeconds,
  getJwtRefreshTokenPrivateKey,
  getJwtRefreshTokenPublicKey,
  getJwtRefreshTokenTtlSeconds,
} from '../../configs/environment';
import type { AuthTokenClaims, AuthTokenPair, AuthenticatedUser, TokenUse } from './auth.types';

@Injectable()
export class AuthTokenService {
  private readonly accessTokenPrivateKey: string = getJwtAccessTokenPrivateKey();
  private readonly accessTokenPublicKey: string = getJwtAccessTokenPublicKey();
  private readonly accessTokenTtlSeconds: number = getJwtAccessTokenTtlSeconds();
  private readonly refreshTokenPrivateKey: string = getJwtRefreshTokenPrivateKey();
  private readonly refreshTokenPublicKey: string = getJwtRefreshTokenPublicKey();
  private readonly refreshTokenTtlSeconds: number = getJwtRefreshTokenTtlSeconds();

  createTokenPair(user: AuthenticatedUser): AuthTokenPair {
    return {
      accessToken: this.createAccessToken(user),
      refreshToken: this.createRefreshToken(user),
      accessTokenExpiresIn: this.accessTokenTtlSeconds,
      refreshTokenExpiresIn: this.refreshTokenTtlSeconds,
    };
  }

  verifyAccessToken(token: string): AuthTokenClaims {
    return this.verifyToken(token, this.accessTokenPublicKey, 'access');
  }

  verifyRefreshToken(token: string): AuthTokenClaims {
    return this.verifyToken(token, this.refreshTokenPublicKey, 'refresh');
  }

  private createAccessToken(user: AuthenticatedUser): string {
    return this.createToken(user, this.accessTokenPrivateKey, 'access', this.accessTokenTtlSeconds);
  }

  private createRefreshToken(user: AuthenticatedUser): string {
    return this.createToken(
      user,
      this.refreshTokenPrivateKey,
      'refresh',
      this.refreshTokenTtlSeconds,
    );
  }

  private createToken(
    user: AuthenticatedUser,
    privateKey: string,
    tokenUse: TokenUse,
    expiresIn: number,
  ): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenUse: tokenUse === 'access' ? 'access' : 'refresh',
      jti: randomUUID(),
    };

    return sign(payload, privateKey, {
      algorithm: 'ES256',
      expiresIn,
    });
  }

  private verifyToken(
    token: string,
    publicKey: string,
    expectedTokenUse: TokenUse,
  ): AuthTokenClaims {
    try {
      const payload = verify(token, publicKey, {
        algorithms: ['ES256'],
      });

      if (!this.isAuthTokenClaims(payload) || payload.tokenUse !== expectedTokenUse) {
        throw new UnauthorizedException(`Invalid ${expectedTokenUse} token`);
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(`Invalid ${expectedTokenUse} token`);
    }
  }

  private isAuthTokenClaims(value: unknown): value is AuthTokenClaims {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const claims = value as Partial<AuthTokenClaims>;

    return (
      typeof claims.sub === 'string' &&
      typeof claims.email === 'string' &&
      (claims.role === 'admin' || claims.role === 'student' || claims.role === 'tutor') &&
      (claims.tokenUse === 'access' || claims.tokenUse === 'refresh') &&
      typeof claims.jti === 'string' &&
      typeof claims.iat === 'number' &&
      typeof claims.exp === 'number'
    );
  }
}
