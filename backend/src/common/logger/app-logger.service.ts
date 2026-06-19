import { Injectable, LoggerService } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createLogger, format, Logger, transport as WinstonTransport, transports } from 'winston';
import { getAppEnvironment, getLogFilePath, getLoggerLevels, isLoggingEnabled } from '@config';

/** Maps NestJS log level labels to winston severity names. */
const NEST_TO_WINSTON: Record<string, string> = {
  error: 'error',
  warn: 'warn',
  log: 'info',
  debug: 'debug',
  verbose: 'verbose',
};

/**
 * Winston-backed logger service.
 *
 * Behaviour is driven entirely by environment variables so the binary never
 * needs to be changed to alter log output:
 *
 * - `LOG_ENABLED=false`  — silences all output.
 * - `LOG_LEVEL=warn`     — sets the maximum verbosity level.
 * - `LOG_FILE_PATH=...`  — enables a file transport at the given path.
 *   The directory is created automatically if it does not exist.
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: Logger;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = isLoggingEnabled();

    const activeTransports: WinstonTransport[] = [];
    const isDevelopment = getAppEnvironment() === 'development';

    // ── Console transport ─────────────────────────────────────────────────
    const consoleFormat = isDevelopment
      ? format.combine(
          format.colorize(),
          format.timestamp({ format: 'HH:mm:ss' }),
          format.printf(({ level, message, context, timestamp, ...rest }) => {
            const ctx = context ? ` [${String(context)}]` : '';
            const extra = Object.keys(rest).length
              ? ` ${JSON.stringify(rest)}`
              : '';
            return `${String(timestamp)} ${level}${ctx} ${String(message)}${extra}`;
          }),
        )
      : format.combine(format.timestamp(), format.json());

    activeTransports.push(new transports.Console({ format: consoleFormat }));

    // ── File transport (optional) ─────────────────────────────────────────
    const filePath = getLogFilePath();

    if (filePath) {
      // Ensure the log directory exists before winston tries to open the file.
      try {
        mkdirSync(dirname(filePath), { recursive: true });
      } catch {
        // Directory may already exist; ignore the error.
      }

      activeTransports.push(
        new transports.File({
          filename: filePath,
          format: format.combine(format.timestamp(), format.json()),
        }),
      );
    }

    // ── Derive the winston level from the NestJS levels array ─────────────
    const nestLevels = getLoggerLevels();
    const winstonLevel = nestLevels.includes('verbose')
      ? 'verbose'
      : nestLevels.includes('debug')
        ? 'debug'
        : nestLevels.includes('log')
          ? 'info'
          : nestLevels.includes('warn')
            ? 'warn'
            : 'error';

    this.logger = createLogger({
      level: winstonLevel,
      silent: !this.enabled,
      transports: activeTransports,
    });
  }

  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    // Stack traces are written only to server-side logs, never returned to clients.
    this.write('error', message, context, trace ? { trace } : undefined);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  /** Writes a structured log entry via winston. */
  private write(
    level: string,
    message: unknown,
    context?: string,
    extra?: Record<string, unknown>,
  ): void {
    const winstonLevel = NEST_TO_WINSTON[level] ?? level;

    this.logger.log(winstonLevel, String(message), {
      ...(context ? { context } : {}),
      ...(extra ?? {}),
    });
  }
}
