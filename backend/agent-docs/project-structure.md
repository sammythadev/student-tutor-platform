# Project Structure

## Current Layout

- `src/main.ts`: Nest bootstrap
- `src/app/module`: root application module
- `src/app/controller`: starter controller for the root route
- `src/app/service`: starter service for the root route
- `test/`: e2e test config and fixtures

## Planned Layout

- `src/modules/<feature>`: feature modules as the domain grows
- `src/common`: shared utilities, guards, filters, and cross-cutting code
- `src/database`: Drizzle schema, database wiring, migrations, and seeds
- `src/types`: shared types and interfaces

## Placement Rules

- Keep backend-only code in `backend/`.
- Do not move application code into `docs/` or `agent-docs/`.
- Prefer feature-local files over adding new top-level folders unless a shared layer is clearly needed.