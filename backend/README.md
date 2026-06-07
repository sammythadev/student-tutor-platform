# Students Tutor Matchmaking Backend

NestJS backend for a student tutor matchmaking platform.

## Stack

- NestJS 11
- TypeScript in strict mode
- Drizzle ORM with PostgreSQL
- Express adapter
- pnpm as the only supported package manager

## Structure

- `src/common` is seeded as the shared backend layer.
- `src/configs` holds runtime environment helpers.
- `src/swagger.ts` bootstraps API docs.

## Environment

Copy `.env.example` to a local env file such as `.env.development` before starting the app. The bootstrap reads environment files automatically and switches logging between development and production behavior with `NODE_ENV`.

The default setup uses SWC through the Nest CLI build configuration, so `start:dev` and `build` both use the same compiler path.

## Setup

```bash
pnpm install
pnpm run start:dev
```

## Scripts

```bash
pnpm run build
pnpm run build:dev
pnpm run start
pnpm run start:dev
pnpm run start:prod
pnpm run lint
pnpm run lint:fix
pnpm run lint:staged
pnpm run format
pnpm run format:check
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run db:generate
pnpm run db:migrate
pnpm run db:studio
```

## Notes

- The root route is a lightweight backend status check for now.
- Domain modules, database wiring, and API contracts will be added under `src/modules`, `src/database`, and related shared folders as the platform grows.
- Prettier is intentionally scoped to source, tests, docs, and this README so it does not rewrite tool config files.
