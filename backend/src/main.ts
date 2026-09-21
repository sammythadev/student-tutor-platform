import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { sql } from 'drizzle-orm';
import { AppModule } from '@app/module/app.module';
import {
  getCorsOrigin,
  getLoggerLevels,
  getPort,
  getSwaggerPath,
  isDatabaseAutoSetupEnabled,
  loadEnvironmentFiles,
} from '@config';
import { DATABASE, runDatabaseSetup, type AppDatabase } from '@database';
import { AppLoggerService } from '@common/logger';
import { setupSwagger } from '@/swagger';

async function bootstrap(): Promise<void> {
  loadEnvironmentFiles();

  // Bootstrap a temporary logger using the configured levels so that startup
  // messages respect LOG_LEVEL before the DI container is ready.
  getLoggerLevels(); // validates LOG_LEVEL env var eagerly

  await setupDatabase();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Hand off logging to the DI-managed AppLoggerService which backs all
  // structured output (console + optional file transport).
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  app.enableCors({
    origin: getCorsOrigin(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  setupSwagger(app);

  const port: number = getPort();

  await app.listen(port);
  logger.log(`Application started on port ${port}`, 'Bootstrap');
  logger.log(`Swagger docs available at http://localhost:${port}/${getSwaggerPath()}`, 'Bootstrap');

  // The server is already accepting requests: this probe only reports problems.
  void probeDatabase(app.get<AppDatabase>(DATABASE), logger);
}

/**
 * Optional boot-time database setup, enabled with `DB_AUTO_SETUP=true`
 * (seeding additionally needs `DB_AUTO_SEED=true`). Runs before the server
 * starts accepting requests so migrations are always ahead of the code.
 *
 * Failures are logged and swallowed: an unreachable database should not take the
 * API down with it, matching the non-fatal `probeDatabase` check below.
 */
async function setupDatabase(): Promise<void> {
  if (!isDatabaseAutoSetupEnabled()) return;

  const logger = new Logger('DatabaseSetup');

  try {
    logger.log('Applying pending migrations before startup…');
    const { migrated, seeded } = await runDatabaseSetup();

    logger.log(
      `Boot-time setup complete (migrations applied: ${String(migrated)}, demo data seeded: ${String(seeded)}).`,
    );
  } catch (error) {
    logger.error(
      `Boot-time database setup failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}

/** pg SQLSTATE codes that mean the host account/credentials were rejected. */
const INVALID_CREDENTIAL_CODES = new Set(['28P01', '28000']);

/**
 * Non-fatal startup probe. The API stays available regardless; only rejected
 * credentials are reported, with the underlying driver error that drizzle
 * otherwise hides behind a generic "Failed query". Transient connectivity
 * failures are ignored.
 */
async function probeDatabase(db: AppDatabase, logger: AppLoggerService): Promise<void> {
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    // drizzle-orm wraps the real pg error on `cause`.
    const cause = (error as { cause?: unknown }).cause ?? error;
    const code = (cause as { code?: string }).code;
    const message = cause instanceof Error ? cause.message : String(cause);
    const invalidCredentials =
      (code !== undefined && INVALID_CREDENTIAL_CODES.has(code)) ||
      /password authentication failed|invalid password|invalid_authorization_specification/i.test(
        message,
      );

    // An unreachable database is transient and not actionable here — only wrong
    // credentials are worth flagging at boot.
    if (!invalidCredentials) return;

    logger.error(
      `Database credentials are invalid${code ? ` [${code}]` : ''}: ${message}`,
      cause instanceof Error ? cause.stack : undefined,
      'Bootstrap',
    );
  }
}

void bootstrap();
