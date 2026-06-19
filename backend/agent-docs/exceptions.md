# Exception Handling

## Hierarchy

```
Error
├── HttpException (NestJS)          → passthrough — use its built-in status
├── IncompleteProfileException      → 422 Unprocessable Entity
├── NoEligibleTutorsException       → 422 Unprocessable Entity
└── (unknown)                       → 500 Internal Server Error (generic message)
```

## Global Filter — `CommonExceptionFilter`

Location: `src/common/filters/http-exception.filter.ts`
Registered as: `APP_FILTER` in `CommonModule` (applies to all routes automatically).

### Behaviour

- Catches **all** thrown values (`@Catch()` with no argument).
- Maps each exception type to an HTTP status using `resolveStatus()`.
- Returns a consistent JSON response:

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Human-readable description",
  "timestamp": "2026-06-19T18:00:00.000Z",
  "path": "/schedules/availability",
  "userId": "uuid-or-anonymous"
}
```

### No-Stack-Trace Rule

> Stack traces must **never** appear in HTTP response bodies.

The filter logs `error.stack` server-side via `AppLoggerService.error()` and excludes it from the JSON response.
Reason: stack traces leak implementation details, internal file paths, and library versions that can aid attackers.

### Adding a New Domain Exception

1. Create the exception class in `src/core/exceptions/` (extend `Error`, restore prototype chain).
2. Export it from `src/core/exceptions/index.ts`.
3. Add a `if (exception instanceof YourException)` branch inside `resolveStatus()` in the filter.
4. Document the HTTP mapping here.

## HTTP Logging Interceptor — `HttpLoggingInterceptor`

Location: `src/common/interceptors/http-logging.interceptor.ts`
Registered as: `APP_INTERCEPTOR` in `CommonModule`.

Logs every successful request as a single structured JSON line:

```json
{ "method": "GET", "url": "/users/me", "statusCode": 200, "userId": "uuid", "durationMs": 12 }
```

- `userId` comes from `request.authUser?.id` (set by `AuthGuard`) — falls back to `"anonymous"`.
- Error-path logging is handled by the exception filter, not the interceptor, to avoid duplicate entries.
- Suppressed entirely when `LOG_ENABLED=false`.

## Logger Service — `AppLoggerService`

Location: `src/common/logger/app-logger.service.ts`
Implements: `LoggerService` (NestJS contract)

Env vars that control behaviour:

| Variable        | Effect                                                   |
|-----------------|----------------------------------------------------------|
| `LOG_ENABLED`   | Set to `false` to silence all output. Default `true`.    |
| `LOG_LEVEL`     | `error` / `warn` / `log` / `debug` / `verbose`          |
| `LOG_FILE_PATH` | Absolute or relative path. Omit to disable file logging. |

The logger is exported from `CommonModule` so any feature module can inject it.
