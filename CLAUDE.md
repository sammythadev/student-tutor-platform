# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Student–tutor matchmaking platform (final-year research project). pnpm workspace monorepo with two packages:

- `backend/` — NestJS 11 (Express), TypeScript strict mode, Drizzle ORM + PostgreSQL, Swagger at `/api-docs`. pnpm only (`preinstall` enforces it).
- `frontend/` — Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand, shadcn/ui-style components.

`backend/AGENTS.md` and `backend/agent-docs/` (project-structure, database, exceptions, lessons) are the detailed operating guides for backend work — read them before substantial backend changes. `Algorithm.md` at the repo root is the authoritative matchmaking algorithm spec; do not invent alternative normalization, scoring, or ordering logic.

## Commands

Run from `backend/` unless noted:

```bash
pnpm run start:dev          # dev server (SWC-backed Nest build, watch mode)
pnpm run build              # nest build + tsc-alias
pnpm run lint / lint:fix    # eslint
pnpm run typecheck          # tsc --noEmit
pnpm run test               # jest (unit tests, *.spec.ts under src/)
pnpm run test:core          # only core matchmaking unit tests (jest core-units)
pnpm run test:e2e           # e2e tests (test/, *.e2e-spec.ts)
pnpm run eval               # matchmaking evaluation harness (src/core/evaluation)
pnpm run eval:gap           # greedy vs min-cost max-flow optimum
pnpm run eval:baselines     # greedy vs FCFS / deferred-acceptance baselines
pnpm run tui                # interactive TUI over the eval suites (? opens the help reference)
pnpm jest path/to/file.spec.ts        # run a single test file
pnpm jest -t "test name"              # run tests matching a name
```

Database (Drizzle, schema-first):

```bash
pnpm run db:generate        # generate SQL migrations from src/database/schema.ts
pnpm run db:migrate         # apply migrations (inspect generated SQL first)
pnpm run db:studio
pnpm run db:seed            # seed Nigerian secondary-school fixture data
```

Frontend (from `frontend/`): `pnpm run dev`, `pnpm run build`, `pnpm run lint`. Dev/start load env via `dotenv -e .env.local`.

Root: `pnpm test:backend` proxies to backend tests. Commits follow conventional-commit style (commitlint + husky).

## Architecture

### Backend: framework-free core + Nest modules

The key structural rule: **matchmaking logic lives in `src/core/` and is framework-free** — no Nest decorators, no persistence coupling. Nest modules consume the core; they must never reimplement scoring or assignment logic.

- `src/core/entities` — plain domain types (Student, Tutor, AvailabilitySlot, CriterionWeights, MatchScore, Assignment) and repository *interfaces* scoped to what the engine needs.
- `src/core/algorithms` — separately testable units: `filters` (hard eligibility pre-filter — subject match is a filter, not a weighted term), `scorers` (per-criterion normalization/scoring), `ranking`, `assignment` (Iterative Best-Match-First), `feedback`, `adaptation`.
- `src/core/engine/matching-engine.ts` — convenience facade bundling filter → score → assign, incremental single-request handling, and the assignment lifecycle behind one object. The Nest layer does **not** go through it: `MatchmakingService` composes `GreedyAssignmentEngine`, `AssignmentLifecycle` and the scorers directly, because the HTTP flows need per-unit options (`stats`, `topK`) and because lifecycle accounting — decrementing `assignedCount`, retiring waitlist rows — has to happen in SQL inside a transaction, not on in-memory copies. The facade stays for callers that want the whole pipeline in one call.
- `src/core/evaluation` — evaluation harness run via `pnpm run eval`.

- `src/modules/<feature>` — Nest feature modules (auth, users, matchmaking, scheduling, sessions, messages, notifications, feed, dashboard, matchmaking-test). Strict controller → service → repository layering: controllers handle HTTP + Swagger only, services own business rules, repositories own Drizzle queries. DTOs for API I/O; database records stay out of controllers.
- `src/database/schema.ts` — single source of truth for the schema; migrations are generated into `drizzle/`, never hand-written. Base identity in `users`; role data in `student_profiles` / `tutor_profiles`. Availability and preference weights are stored as typed JSON. Use joined repository reads to avoid N+1 profile lookups.
- `src/common`, `src/configs`, `src/types` — shared layer, env/bootstrap helpers, shared typings.

Path aliases (`@/`, `@core/*`, `@modules/*`, `@database/*`, `@common/*`, `@config`, `@configs/*`, `@app/*`, `@types/*`) are defined in tsconfig and mirrored in the jest `moduleNameMapper` — prefer them over deep relative imports.

### Frontend

`app/` uses route groups `(auth)` and `(app)`. Shared client state in `lib/store` (Zustand); API access via `lib/api` + `lib/axios.ts`.

## Conventions

- Strict typing; no `any`. Explicit return types on public functions.
- File names kebab-case; classes/DTOs PascalCase; constants UPPER_SNAKE_CASE.
- Typed HTTP/project exception classes for expected failures (see `agent-docs/exceptions.md`).
- Smallest safe change; follow the nearest existing pattern; keep module dependencies one-directional.
- When adding/changing an API endpoint: add Swagger decorators and update `backend/docs/api.md` in the same task.
- Env changes: seed `.env.example` first; never hard-code values an env var should drive; don't edit `.env` directly.
- Keep backend work backend-only unless frontend changes are explicitly requested.
- `tasks/todo.md` in backend is the task log; `agent-docs/findings.md` and `agent-docs/lessons.md` capture durable discoveries and lessons.
