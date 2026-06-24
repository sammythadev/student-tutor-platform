import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type AppEnvironment = 'development' | 'production' | 'test';
export type LoggerLevel = 'error' | 'warn' | 'log' | 'debug' | 'verbose';
export type LogDriver = 'winston' | 'pino' | 'nest';

const VALID_LOG_LEVELS: LoggerLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

const LEVEL_ORDER: Record<LoggerLevel, number> = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 3,
  verbose: 4,
};

const ENVIRONMENT_FILES: Record<AppEnvironment, string[]> = {
  development: ['.env', '.env.development', '.env.local'],
  production: ['.env', '.env.production', '.env.production.local'],
  test: ['.env', '.env.test'],
};

function parseEnvironmentFile(content: string): Record<string, string> {
  return content.split(/\r?\n/).reduce<Record<string, string>>((environment, line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return environment;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      return environment;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const unwrappedValue = rawValue.replace(/^(["'])(.*)\1$/, '$2');

    if (key) {
      environment[key] = unwrappedValue;
    }

    return environment;
  }, {});
}

export function loadEnvironmentFiles(): void {
  const environment = getAppEnvironment();
  const loadedValues: Record<string, string> = {};

  for (const fileName of ENVIRONMENT_FILES[environment]) {
    const filePath = resolve(process.cwd(), fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    Object.assign(loadedValues, parseEnvironmentFile(readFileSync(filePath, 'utf8')));
  }

  for (const [key, value] of Object.entries(loadedValues)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function getAppEnvironment(value = process.env.NODE_ENV): AppEnvironment {
  if (value === 'production' || value === 'test') {
    return value;
  }

  return 'development';
}

export function getLoggerLevels(value = process.env.NODE_ENV): LoggerLevel[] {
  // Explicit LOG_LEVEL env var takes precedence over NODE_ENV defaults.
  const explicitLevel = process.env.LOG_LEVEL?.trim() as LoggerLevel | undefined;

  if (explicitLevel && VALID_LOG_LEVELS.includes(explicitLevel)) {
    // Return all levels up to and including the requested one.
    return VALID_LOG_LEVELS.filter((l) => LEVEL_ORDER[l] <= LEVEL_ORDER[explicitLevel]);
  }

  const environment = getAppEnvironment(value);

  if (environment === 'production') {
    return ['error', 'warn'];
  }

  return ['error', 'warn', 'log', 'debug', 'verbose'];
}

/**
 * Returns true unless LOG_ENABLED is explicitly set to 'false'.
 * Provides a master on/off switch for all application logging.
 */
export function isLoggingEnabled(): boolean {
  return process.env.LOG_ENABLED?.trim().toLowerCase() !== 'false';
}

/**
 * Returns the file path for log output, or null if LOG_FILE_PATH is not set.
 * When null, only console transport is used.
 */
export function getLogFilePath(): string | null {
  const filePath = process.env.LOG_FILE_PATH?.trim();
  return filePath || null;
}

/**
 * Returns the configured log driver. Defaults to 'winston' if not provided
 * or if an invalid driver is specified.
 */
export function getLogDriver(): LogDriver {
  const driver = process.env.LOG_DRIVER?.trim().toLowerCase();
  if (driver === 'pino' || driver === 'nest' || driver === 'winston') {
    return driver as LogDriver;
  }
  return 'winston';
}

export function getPort(): number {
  const parsedPort = Number(process.env.PORT ?? 3000);

  return Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
}

export function getAppName(): string {
  return process.env.APP_NAME ?? 'student-tutor-matchmaking-backend';
}

export function getAppVersion(): string {
  return process.env.APP_VERSION ?? '0.0.0';
}

export function getSwaggerPath(): string {
  return process.env.SWAGGER_PATH ?? 'api-docs';
}

export function getCorsOrigin(): string[] {
  const origin = process.env.CORS_ORIGIN?.trim();
  return origin ? origin.split(',').map((o) => o.trim()) : ['http://localhost:3000'];
}

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return databaseUrl;
}

function normalizeJwtKey(value: string): string {
  return value.replace(/\\n/g, '\n').trim();
}

export function getJwtAccessTokenPrivateKey(): string {
  const accessTokenPrivateKey = process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY;

  if (!accessTokenPrivateKey) {
    throw new Error('JWT_ACCESS_TOKEN_PRIVATE_KEY is required');
  }

  return normalizeJwtKey(accessTokenPrivateKey);
}

export function getJwtAccessTokenPublicKey(): string {
  const accessTokenPublicKey = process.env.JWT_ACCESS_TOKEN_PUBLIC_KEY;

  if (!accessTokenPublicKey) {
    throw new Error('JWT_ACCESS_TOKEN_PUBLIC_KEY is required');
  }

  return normalizeJwtKey(accessTokenPublicKey);
}

export function getJwtRefreshTokenPrivateKey(): string {
  const refreshTokenPrivateKey = process.env.JWT_REFRESH_TOKEN_PRIVATE_KEY;

  if (!refreshTokenPrivateKey) {
    throw new Error('JWT_REFRESH_TOKEN_PRIVATE_KEY is required');
  }

  return normalizeJwtKey(refreshTokenPrivateKey);
}

export function getJwtRefreshTokenPublicKey(): string {
  const refreshTokenPublicKey = process.env.JWT_REFRESH_TOKEN_PUBLIC_KEY;

  if (!refreshTokenPublicKey) {
    throw new Error('JWT_REFRESH_TOKEN_PUBLIC_KEY is required');
  }

  return normalizeJwtKey(refreshTokenPublicKey);
}

export function getJwtAccessTokenTtlSeconds(): number {
  const parsedTtl = Number(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS ?? 3600);

  return Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : 3600;
}

export function getJwtRefreshTokenTtlSeconds(): number {
  const parsedTtl = Number(process.env.JWT_REFRESH_TOKEN_TTL_SECONDS ?? 2592000);

  return Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : 2592000;
}

export function getAdminSignupCode(): string {
  const adminSignupCode = process.env.ADMIN_SIGNUP_CODE;

  if (!adminSignupCode) {
    throw new Error('ADMIN_SIGNUP_CODE is required');
  }

  return adminSignupCode;
}
