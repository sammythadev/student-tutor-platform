# Environment Documentation

## Overview

The backend loads environment files during bootstrap and uses `NODE_ENV` to
switch behavior between development, production, and test.

## Environment Rules

- Always seed changes in `.env.example` first.
- Do not edit `.env` unless you are explicitly debugging an environment issue.
- Add a new environment only after the user agrees to the change.
- Keep environment values out of source code; use env helpers and `.env.example`.

## Supported Environment Files

- `.env`
- `.env.development`
- `.env.local`
- `.env.production`
- `.env.production.local`
- `.env.test`

## Variables

- `NODE_ENV`: controls development, production, or test behavior.
- `PORT`: port used by the Nest application.
- `LOG_LEVEL`: logger verbosity; accepted values are `error`, `warn`, `log`, `debug`, `verbose`. Overrides the NODE_ENV default when set explicitly.
- `LOG_ENABLED`: set to `false` to silence all log output globally. Defaults to `true`.
- `LOG_FILE_PATH`: file path for persistent log output (e.g. `logs/app.log`). The directory is created automatically. Omit or leave blank to disable file logging.
- `DATABASE_URL`: PostgreSQL connection string for Drizzle.
- `APP_NAME`: application name for runtime metadata.
- `APP_VERSION`: semantic version string for Swagger and bootstrap metadata.
- `SWAGGER_PATH`: route used for API docs.
- `JWT_ACCESS_TOKEN_PRIVATE_KEY`: RSA private key for signing access tokens, stored with escaped newlines in env files.
- `JWT_ACCESS_TOKEN_PUBLIC_KEY`: RSA public key for verifying access tokens, stored with escaped newlines in env files.
- `JWT_REFRESH_TOKEN_PRIVATE_KEY`: RSA private key for signing refresh tokens, stored with escaped newlines in env files.
- `JWT_REFRESH_TOKEN_PUBLIC_KEY`: RSA public key for verifying refresh tokens, stored with escaped newlines in env files.
- `JWT_ACCESS_TOKEN_TTL_SECONDS`: access-token lifetime in seconds.
- `JWT_REFRESH_TOKEN_TTL_SECONDS`: refresh-token lifetime in seconds.
- `ADMIN_SIGNUP_CODE`: bootstrap code required for the admin signup endpoint.

## Bootstrap Behavior

- Development mode enables verbose logging levels (`debug` + below).
- Production mode limits logging to `error` and `warn`.
- Explicit `LOG_LEVEL` overrides the NODE_ENV default.
- `LOG_ENABLED=false` silences all output regardless of level or environment.
- `LOG_FILE_PATH` enables a file transport; directory is auto-created. Console transport is always active.
- The app falls back to development behavior when `NODE_ENV` is unset.
