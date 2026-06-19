import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isLoggingEnabled } from '@config';
import { AppLoggerService } from '@common/logger';
import type { AuthenticatedUser } from '@common/auth';

/** Shape of `request` after AuthGuard has populated `authUser`. */
interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
}

const CONTEXT = 'HTTP';

/**
 * Logs every inbound HTTP request as a single structured entry that includes
 * the authenticated user ID (or "anonymous" for public routes).
 *
 * Logging is suppressed entirely when `LOG_ENABLED=false`.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly enabled: boolean;

  constructor(private readonly logger: AppLoggerService) {
    // Capture the flag once at startup so the interceptor carries zero overhead
    // on every request when logging is disabled.
    this.enabled = isLoggingEnabled();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.enabled) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    const method = request.method;
    const url = request.originalUrl ?? request.url;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(method, url, response.statusCode, startedAt, request);
        },
        error: () => {
          // The exception filter will handle error-path logging; avoid double entries.
        },
      }),
    );
  }

  private logRequest(
    method: string,
    url: string,
    statusCode: number,
    startedAt: number,
    request: AuthenticatedRequest,
  ): void {
    const userId = request.authUser?.id ?? 'anonymous';
    const durationMs = Date.now() - startedAt;

    this.logger.log(
      JSON.stringify({ method, url, statusCode, userId, durationMs }),
      CONTEXT,
    );
  }
}
