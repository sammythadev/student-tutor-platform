import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type AppEnvironment = 'development' | 'production' | 'test';
export type LoggerLevel = 'error' | 'warn' | 'log' | 'debug' | 'verbose';

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
  const environment = getAppEnvironment(value);

  if (environment === 'production') {
    return ['error', 'warn'];
  }

  return ['error', 'warn', 'log', 'debug', 'verbose'];
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
