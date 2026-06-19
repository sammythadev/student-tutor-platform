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
- `src/core`: framework-free matchmaking domain models, scoring algorithms, assignment engine, and evaluation harness
- `src/modules/users`: first user-facing module for admin/student/tutor accounts and role-specific profile creation.
- `src/modules/scheduling`: normalized schedule-slot API for students and tutors to mark availability.
- `src/modules/matchmaking-test`: small runtime fixture endpoint for verifying core matchmaking wiring without persistence.
- `drizzle/`: generated SQL migrations from the schema-first Drizzle workflow.

## Placement Rules

- Keep backend-only code in `backend/`.
- Do not move application code into `docs/` or `agent-docs/`.
- Prefer feature-local files over adding new top-level folders unless a shared layer is clearly needed.
- Keep matchmaking formulas and assignment logic in `src/core`; Nest modules should consume the core instead of reimplementing scoring.
- Keep database schema in `src/database/schema.ts`; generate SQL with Drizzle Kit before applying migrations.
- Use repository methods with joins for aggregate reads so controllers/services do not trigger N+1 profile lookups.
- Add Swagger decorators on every controller endpoint as routes are created or changed.
