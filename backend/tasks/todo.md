# Task Log

Use this file to keep substantial tasks planned, tracked, and closed out.

## Entry Template

```md
## Task: <title>

- Date:
- Request:
- Plan:
  - [ ] Step 1
  - [ ] Step 2
  - [ ] Step 3
- Progress:
  - Note major checkpoints and re-plans
- Verification:
  - Tests:
  - Logs / errors:
- Result:
  - Summary of changes and outcome
```



## Current Task

- [completed] Add auth module with login, signup, admin auth, onboarding, and strict RBAC/IDOR checks.
- [completed] Add Swagger docs and API contract updates for auth and protected user reads.
- [completed] Validate the backend slice with focused tests and a typecheck.

## Result

- Added asymmetric JWT access/refresh token flow with verify and refresh endpoints, strict token-state checks, and updated env/doc coverage.

---

## Task: HTTP Logging + Global Exception Filter + Env-Driven Log Config

- Date: 2026-06-19
- Request: Structured HTTP request logging with user IDs, env-driven log levels/file path/on-off switch, CommonExceptionFilter with no stack-trace leaks in responses, and AGENTS.md learning-loop update.

- Plan:
  - [x] Update environment.ts — LOG_LEVEL override, isLoggingEnabled(), getLogFilePath()
  - [x] Update configs/index.ts — export new helpers
  - [x] Update .env.example — seed LOG_ENABLED, LOG_FILE_PATH
  - [x] Create src/common/logger/app-logger.service.ts (winston-backed LoggerService)
  - [x] Create src/common/logger/index.ts
  - [x] Create src/common/interceptors/http-logging.interceptor.ts
  - [x] Create src/common/interceptors/index.ts
  - [x] Create src/common/filters/http-exception.filter.ts
  - [x] Create src/common/filters/index.ts
  - [x] Update common.module.ts — APP_INTERCEPTOR, APP_FILTER, AppLoggerService
  - [x] Update main.ts — use app.get(AppLoggerService) with bufferLogs:true
  - [x] Update common/index.ts — re-export new barrels
  - [x] Create agent-docs/exceptions.md
  - [x] Update agent-docs/lessons.md
  - [x] Update docs/environment.md

- Result:
  - AppLoggerService wraps winston; respects LOG_ENABLED, LOG_LEVEL (overrides NODE_ENV default), LOG_FILE_PATH (file transport optional, directory auto-created).
  - HttpLoggingInterceptor logs method/url/statusCode/userId/durationMs per request; anonymous fallback for unauthenticated routes.
  - CommonExceptionFilter maps HttpException, domain exceptions, and unknowns to clean JSON; stack traces logged server-side only, never in response bodies.
  - Both filter and interceptor registered via APP_FILTER / APP_INTERCEPTOR in CommonModule (DI-aware, no useGlobalFilters workaround needed).
  - Fixed SchedulingModule missing CommonModule import (UnknownDependenciesException).
  - Created agent-docs/exceptions.md (was referenced in AGENTS.md but missing).
  - 5 new lessons added to agent-docs/lessons.md.

