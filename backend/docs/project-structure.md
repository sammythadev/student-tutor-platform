# Project Structure

## Overview

The backend is the NestJS API for the student–tutor matchmaking platform. Two
ideas shape the layout:

- **The matchmaking domain is framework-free.** Everything the algorithm needs
  lives under `src/core/` with no Nest decorators and no persistence coupling,
  so it can be unit-tested and benchmarked in isolation.
- **HTTP concerns live in feature modules.** Each module under `src/modules/`
  follows one direction: controller → service → repository.

## Layout

```text
backend/
├── src/
│   ├── main.ts                       bootstrap (logger, validation, CORS, Swagger)
│   ├── swagger.ts                    Swagger document setup
│   ├── app/                          root module + status controller
│   │   ├── controller/               app.controller.ts (+ spec)
│   │   ├── module/                   app.module.ts — imports every feature module
│   │   └── service/                  app.service.ts
│   ├── core/                         framework-free matchmaking domain
│   │   ├── entities/                 Student, Tutor, AvailabilitySlot, CriterionWeights,
│   │   │                             AlgorithmWeights, MatchScore, Assignment
│   │   ├── algorithms/
│   │   │   ├── filters/              eligibility.filter.ts — hard subject + capacity filter
│   │   │   ├── scorers/              academic, preference, schedule, fairness, composite
│   │   │   ├── assignment/           greedy-assignment.engine.ts, assignment-lifecycle.ts
│   │   │   ├── ranking/              top-k-ranker.ts
│   │   │   ├── feedback/             feedback-updater.ts (EMA quality update)
│   │   │   ├── adaptation/           weight-adaptation.ts
│   │   │   └── utils/                max-heap.ts, vector-math.ts
│   │   ├── engine/                   matching-engine.ts — facade over filter → score → assign
│   │   ├── enums/ constants/         shared core vocabulary
│   │   ├── exceptions/               domain exceptions (no HTTP coupling)
│   │   ├── evaluation/               CLI harnesses + optimal baseline + comparisons
│   │   │   └── tui/                  ink terminal UI over the suites
│   │   └── __tests__/                core unit, engine and TUI suites
│   ├── modules/                      Nest feature modules
│   │   ├── auth/                     signup/login/refresh/verify/onboard, guards, strategies
│   │   ├── users/                    accounts and role-specific profiles/preferences
│   │   ├── matchmaking/              candidates, select, batch, assignment lifecycle
│   │   ├── matchmaking-test/         in-memory + database wiring checks
│   │   ├── scheduling/               availability slots
│   │   ├── sessions/                 session lifecycle
│   │   ├── messages/                 conversations
│   │   ├── notifications/            notification delivery
│   │   ├── feed/                     activity feed
│   │   └── dashboard/                role-scoped metrics
│   ├── database/                     schema.ts, database.module.ts, seeds/
│   ├── common/                       auth helpers, filters, interceptors, logger
│   ├── configs/                      env loading and app metadata helpers
│   └── types/                        shared typings
├── drizzle/                          generated SQL migrations + meta snapshots
├── scripts/                          jwt key generation, TUI ESM loader
├── test/                             e2e Jest config + smoke spec
├── docs/                             documentation for contributors (see ownership below)
└── agent-docs/                       agent workflow notes: exceptions, findings, lessons
```

## Module shape

Feature modules keep a flat, predictable shape:

```text
modules/<feature>/
├── dtos/                    request/response DTOs with validation
├── <feature>.controller.ts  HTTP + Swagger only — delegates to the service
├── <feature>.service.ts     business rules and orchestration
├── <feature>.repository.ts  Drizzle queries only
├── <feature>.module.ts      wiring (imports CommonModule when guards are used)
├── <feature>.types.ts       module-local types (where needed, e.g. users)
└── index.ts                 public surface of the module
```

Do not introduce deep `controllers/`, `services/` folders — the file-name
suffixes already carry the layer, and every module follows the same rule.

## Placement rules

- Backend-only code stays in `backend/`; matchmaking formulas and assignment
  logic stay in `src/core/` and are consumed — never reimplemented — by modules.
- `src/database/schema.ts` is the single source of truth for the schema.
  Generate SQL with Drizzle Kit before applying migrations.
- Prefer repository methods with joins for aggregate reads, so services and
  controllers never trigger N+1 profile lookups.
- Use the configured path aliases (`@core/*`, `@modules/*`, `@database/*`,
  `@common/*`, `@configs/*`, `@types/*`, `@app/*`, `@config`) instead of deep
  relative imports. They are mirrored in the Jest `moduleNameMapper`.
- Add Swagger decorators to every controller endpoint as it is created or
  changed, and update `docs/api.md` in the same task.
- New modules: register them in `src/app/module/app.module.ts` and import
  `CommonModule` if they use `AuthGuard` or `OwnerOrAdminGuard`.

## Docs ownership

- `docs/` — for contributors and maintainers: `api.md`, `database.md`,
  `environment.md`, `project-structure.md`, `core-roadmap-api-plan.md`,
  `OPTIMIZATION_REPORT.md`, and `benchmarks/`.
- `agent-docs/` — agent workflow notes: `exceptions.md` (exception hierarchy and
  response rules), `findings.md` (durable discoveries), `lessons.md` (mistakes
  and tooling traps).

Keep the split strict: project documentation goes in `docs/`, process notes stay
in `agent-docs/`.

## Deployment artifacts

`pnpm run build` emits `dist/` (gitignored); `pnpm run start:prod` runs
`dist/main`. `pnpm run build:minified` is the SWC-minified variant. Neither is
committed.
