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
- `LOG_LEVEL`: logger verbosity.
- `DATABASE_URL`: PostgreSQL connection string for Drizzle.
- `APP_NAME`: application name for runtime metadata.
- `APP_VERSION`: semantic version string for Swagger and bootstrap metadata.
- `SWAGGER_PATH`: route used for API docs.

## Bootstrap Behavior

- Development mode enables verbose logging levels.
- Production mode limits logging to errors and warnings.
- The app falls back to development behavior when `NODE_ENV` is unset.
