/**
 * Canonical account roles. The string-literal union and the `UserRole` enum in
 * `@modules/users/dtos/create-user.dto` describe the same set; this type is the
 * source of truth, and the enum's values are checked against it so the two
 * cannot drift apart (which would silently defeat role comparisons).
 */
export type AccountRole = 'admin' | 'student' | 'tutor' | 'unassigned';
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
