export type AccountRole = 'admin' | 'student' | 'tutor';
export type TokenUse = 'access' | 'refresh';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AccountRole;
}

export interface AuthTokenClaims {
  sub: string;
  email: string;
  role: AccountRole;
  tokenUse: TokenUse;
  jti: string;
  iat: number;
  exp: number;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}