import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { isLoggingEnabled } from '@config';
import { IncompleteProfileException, NoEligibleTutorsException } from '@core/exceptions';
import { AppLoggerService } from '@common/logger';
import type { AuthenticatedUser } from '@common/auth';

const CONTEXT = 'ExceptionFilter';

/** Response body returned for every error — stack is deliberately excluded. */
interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
  userId: string;
}

interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
}

/**
 * Global exception filter that normalises all thrown values into a
 * consistent JSON response and logs them server-side.
 *
 * Stack traces are **never** included in HTTP responses — they are only
 * written to the server log to avoid leaking implementation details.
 */
@Catch()
export class CommonExceptionFilter implements ExceptionFilter {
  private readonly loggingEnabled: boolean;

  constructor(private readonly logger: AppLoggerService) {
    this.loggingEnabled = isLoggingEnabled();
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    const path = request.originalUrl ?? request.url;
    const userId = request.authUser?.id ?? 'anonymous';
    const timestamp = new Date().toISOString();

    const { statusCode, message } = this.resolveStatus(exception);
    const errorPhrase = HttpStatus[statusCode] ?? 'Error';

    const body: ErrorResponseBody = {
      statusCode,
      error: errorPhrase
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' '),
      message,
      timestamp,
      path,
      userId,
    };

    // Log the full details (including stack) server-side only.
    if (this.loggingEnabled) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        JSON.stringify({ method: request.method, url: path, statusCode, userId, message }),
        stack,
        CONTEXT,
      );
    }

    response.status(statusCode).json(body);
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private resolveStatus(exception: unknown): { statusCode: number; message: string } {
    // NestJS HTTP exceptions — use their built-in status + message.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : typeof (res as { message?: unknown }).message === 'string'
            ? (res as { message: string }).message
            : Array.isArray((res as { message?: unknown[] }).message)
              ? ((res as { message: string[] }).message[0] ?? exception.message)
              : exception.message;

      return { statusCode: status, message };
    }

    // Domain exception: incomplete student/tutor profile.
    if (exception instanceof IncompleteProfileException) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: exception.message,
      };
    }

    // Domain exception: no eligible tutors after hard filter.
    if (exception instanceof NoEligibleTutorsException) {
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: exception.message,
      };
    }

    // Unknown / unexpected error — return a generic message so internals stay hidden.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}
