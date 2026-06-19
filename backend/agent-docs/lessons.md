# Lessons

- Prefer surgical schema changes: model only tables required by the current use case, and keep extensibility in JSON/value fields until query requirements justify new tables.
- Drizzle config should follow the current `defineConfig` pattern with `dialect`, `schema`, `out`, and `dbCredentials`; inspect generated SQL before migrating.
- Add bare path aliases when importing folder barrels such as `@database`; wildcard aliases like `@database/*` do not cover the bare import.
- Avoid N+1 reads in Nest modules by loading role-specific user profiles with one repository query and explicit joins.
- For seed scripts run through `ts-node`, explicitly reference local ambient declarations when third-party packages lack bundled types.
- Use Drizzle helpers such as `inArray` instead of hand-built `ANY(...)` SQL for parameter arrays; the generated SQL is safer and avoids PostgreSQL scalar-array mistakes.
- `passport-jwt` needs `@types/passport-jwt` under strict TypeScript; install the declarations before wiring the strategy.
- For guards that inspect `request.body`, keep `Request` intact and cast the body locally instead of making `body` optional on a `Request` extension.
- Every module that uses `AuthGuard` or `OwnerOrAdminGuard` must import `CommonModule` — these guards depend on `AuthTokenService` which lives there. Missing this causes `UnknownDependenciesException` at startup.
- Use `APP_INTERCEPTOR` and `APP_FILTER` tokens (from `@nestjs/core`) to register global interceptors and filters inside a module. This preserves full DI injection (e.g. `AppLoggerService`). Calling `app.useGlobalInterceptors()` in `main.ts` bypasses DI and prevents injecting module-scoped services.
- Never include `error.stack` in HTTP response bodies — log it server-side only. Stack traces leak internal file paths, library versions, and implementation details that aid attackers.
- When registering `AppLoggerService` as the Nest logger via `app.useLogger()`, retrieve it with `app.get(AppLoggerService)` after `NestFactory.create()`. Use `bufferLogs: true` so no logs are lost during DI container initialisation.
- The `@core/*` path alias resolves to `src/core/*`; use it in preference to `@/core/*` for core domain imports to stay consistent with tsconfig aliases.

