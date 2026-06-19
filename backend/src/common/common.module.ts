import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthGuard } from './auth/auth.guard';
import { AuthTokenService } from './auth/auth-token.service';
import { JwtAccessStrategy } from './auth/jwt-access.strategy';
import { JwtRefreshStrategy } from './auth/jwt-refresh.strategy';
import { OwnerOrAdminGuard } from './auth/owner-or-admin.guard';
import { RefreshAuthGuard } from './auth/refresh-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { AppLoggerService } from './logger/app-logger.service';
import { HttpLoggingInterceptor } from './interceptors/http-logging.interceptor';
import { CommonExceptionFilter } from './filters/http-exception.filter';

@Module({
  imports: [PassportModule],
  providers: [
    // ── Auth ─────────────────────────────────────────────────────────────
    AuthGuard,
    AuthTokenService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    OwnerOrAdminGuard,
    RefreshAuthGuard,
    RolesGuard,

    // ── Logging ───────────────────────────────────────────────────────────
    AppLoggerService,

    // ── Global HTTP Interceptor (applied to every route) ──────────────────
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },

    // ── Global Exception Filter (applied to every thrown error) ───────────
    {
      provide: APP_FILTER,
      useClass: CommonExceptionFilter,
    },
  ],
  exports: [
    AuthGuard,
    AuthTokenService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    OwnerOrAdminGuard,
    RefreshAuthGuard,
    RolesGuard,
    AppLoggerService,
  ],
})
export class CommonModule {}