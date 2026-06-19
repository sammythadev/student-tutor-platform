import { ConsoleLogger, Injectable, LoggerService } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createLogger, format, Logger as WinstonLogger, transport as WinstonTransport, transports } from 'winston';
import { getAppEnvironment, getLogDriver, getLogFilePath, getLoggerLevels, isLoggingEnabled, LogDriver } from '@config';

/** Maps NestJS log level labels to winston severity names. */
const NEST_TO_WINSTON: Record<string, string> = {
  error: 'error',
  warn: 'warn',
  log: 'info',
  debug: 'debug',
  verbose: 'verbose',
};

/**
 * Strategy-based logger service.
 *
 * Behaviour is driven entirely by environment variables:
 * - `LOG_DRIVER=winston|pino|nest` — selects the underlying logger engine.
 * - `LOG_ENABLED=false`  — silences all output.
 * - `LOG_LEVEL=warn`     — sets the maximum verbosity level.
 * - `LOG_FILE_PATH=...`  — enables a file transport (winston only).
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  private driver: LogDriver;
  private readonly enabled: boolean;
  private readonly winstonLogger?: WinstonLogger;
  private readonly nestLogger?: ConsoleLogger;
  private readonly pinoLogger?: any;

  constructor() {
    this.enabled = isLoggingEnabled();
    this.driver = getLogDriver();

    if (this.driver === 'nest') {
      this.nestLogger = new ConsoleLogger('App');
      this.nestLogger.setLogLevels(getLoggerLevels());
    } else if (this.driver === 'pino') {
      try {
        // dynamic require so we don't break if pino isn't installed
        const pino = require('pino');
        const isDevelopment = getAppEnvironment() === 'development';
        this.pinoLogger = pino({
          level: this.getWinstonLevel(),
          transport: isDevelopment ? { target: 'pino-pretty' } : undefined,
        });
      } catch (err) {
        // Fallback if pino isn't installed natively
        this.driver = 'nest';
        this.nestLogger = new ConsoleLogger('App');
        this.nestLogger.setLogLevels(getLoggerLevels());
      }
    } else {
      // winston (default)
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

      this.winstonLogger = createLogger({
        level: this.getWinstonLevel(),
        silent: !this.enabled,
        transports: activeTransports,
      });
    }
  }

  private getWinstonLevel(): string {
    const nestLevels = getLoggerLevels();
    return nestLevels.includes('verbose')
      ? 'verbose'
      : nestLevels.includes('debug')
        ? 'debug'
        : nestLevels.includes('log')
          ? 'info'
          : nestLevels.includes('warn')
            ? 'warn'
            : 'error';
  }

  log(message: unknown, context?: string): void {
    if (!this.enabled) return;
    if (this.driver === 'nest') this.nestLogger?.log(message, context);
    else if (this.driver === 'pino') this.pinoLogger?.info({ context }, message);
    else this.writeWinston('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    if (!this.enabled) return;
    if (this.driver === 'nest') this.nestLogger?.error(message, trace, context);
    else if (this.driver === 'pino') this.pinoLogger?.error({ context, trace }, message);
    else this.writeWinston('error', message, context, trace ? { trace } : undefined);
  }

  warn(message: unknown, context?: string): void {
    if (!this.enabled) return;
    if (this.driver === 'nest') this.nestLogger?.warn(message, context);
    else if (this.driver === 'pino') this.pinoLogger?.warn({ context }, message);
    else this.writeWinston('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    if (!this.enabled) return;
    if (this.driver === 'nest') this.nestLogger?.debug(message, context);
    else if (this.driver === 'pino') this.pinoLogger?.debug({ context }, message);
    else this.writeWinston('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    if (!this.enabled) return;
    if (this.driver === 'nest') this.nestLogger?.verbose(message, context);
    else if (this.driver === 'pino') this.pinoLogger?.trace({ context }, message);
    else this.writeWinston('verbose', message, context);
  }

  private writeWinston(
    level: string,
    message: unknown,
    context?: string,
    extra?: Record<string, unknown>,
  ): void {
    const winstonLevel = NEST_TO_WINSTON[level] ?? level;

    this.winstonLogger?.log(winstonLevel, String(message), {
      ...(context ? { context } : {}),
      ...(extra ?? {}),
    });
  }
}
