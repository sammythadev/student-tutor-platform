# Tutorly — Student · Tutor Matchmaking

Final-year research project: a matchmaking platform for Nigerian
secondary-school students and tutors.

Two things make it more than a tutor directory. **Subject eligibility is a hard
pre-filter** — a tutor who does not teach the student's subject is removed
before any scoring happens, so no weighting can buy them back. And the
assignment pass is a **priority-queue greedy engine with lazy fairness
recompute**, which is guaranteed to reach at least half of the optimal total
assignment score while staying fast enough for large cohorts.

The engine is framework-free (`backend/src/core/`), the API wraps it
(`backend/src/modules/`), and the UI shows the ranking it produces
(`frontend/`).

```
pnpm install
cd backend  && cp .env.example .env && pnpm run db:migrate && pnpm run start:dev   # :4000
cd frontend && cp .env.example .env.local && pnpm run dev                          # :3000
```

Full setup, including JWT key generation and seeding: [Development setup](#development-setup).

## Monorepo layout

A pnpm workspace (`pnpm-workspace.yaml`) with two packages.

```
.
├── backend/                    NestJS 11 API + framework-free matchmaking core
│   ├── src/core/               Domain: filters, scorers, assignment, ranking, evaluation
│   ├── src/modules/            Feature modules (controller → service → repository)
│   ├── src/database/           Drizzle schema, wiring, seeds
│   ├── docs/                   API, database, environment, structure, benchmarks
│   ├── agent-docs/             Agent operating notes (exceptions, findings, lessons)
│   └── drizzle/                Generated SQL migrations
├── frontend/                   Next.js 16 App Router client
│   ├── app/(auth)/             Signup, signin, onboarding
│   ├── app/(app)/              Authenticated shell and role pages
│   ├── components/             ui primitives · landing · onboard · catalog · widgets
│   └── lib/api/                Typed API clients
├── Algorithm.md                Authoritative matchmaking algorithm spec
├── diagrams/                   UML sources + renders (activity, class, sequence, use case)
├── agents-framework/           Coding-agent personas this repo is developed with
├── AGENTS.md, CLAUDE.md        Bootstrap guides for AI coding agents
├── .claude/, .opencode/        Harness-specific agent definitions and permissions
└── .agents/, frontend/.agents/ Vendored design/frontend skills the agent personas route to
```

Each package has its own README: [backend](backend/README.md) ·
[frontend](frontend/README.md).

## Documentation index

| Doc | What it covers |
|---|---|
| [`Algorithm.md`](Algorithm.md) | Matching algorithm: scoring, normalization, assignment, guarantees |
| [`backend/README.md`](backend/README.md) | Backend setup, modules, eval harnesses, TUI |
| [`backend/docs/api.md`](backend/docs/api.md) | Every endpoint: auth, body, errors |
| [`backend/docs/database.md`](backend/docs/database.md) | Tables, indexes, migration workflow |
| [`backend/docs/environment.md`](backend/docs/environment.md) | Every environment variable |
| [`backend/docs/project-structure.md`](backend/docs/project-structure.md) | Backend layout and placement rules |
| [`backend/docs/core-roadmap-api-plan.md`](backend/docs/core-roadmap-api-plan.md) | Roadmap with shipped/pending status |
| [`backend/docs/OPTIMIZATION_REPORT.md`](backend/docs/OPTIMIZATION_REPORT.md) | Performance work and results |
| [`backend/docs/benchmarks/EVALUATION_FINDINGS.md`](backend/docs/benchmarks/EVALUATION_FINDINGS.md) | Evaluation findings; raw CSVs sit beside it |
| [`backend/agent-docs/lessons.md`](backend/agent-docs/lessons.md) | Engineering lessons and tooling traps (incl. the eval TUI) |
| [`frontend/README.md`](frontend/README.md) | Frontend setup, routes, conventions |
| [`frontend/DESIGN.md`](frontend/DESIGN.md) | Design system: tokens, type, spacing, motion |
| [`frontend/public/CREDITS.md`](frontend/public/CREDITS.md) | Image/asset attribution |
| [`diagrams/`](diagrams) | UML sources (`.puml`) and renders (`.png`) |
| [`agents-framework/README.md`](agents-framework/README.md) | The coding-agent personas used in this repo |

## Core matchmaking engine

`backend/src/core/` is framework-free — no Nest decorators, no persistence
coupling. Nest modules consume its units (`GreedyAssignmentEngine`,
`AssignmentLifecycle`, the scorers); `MatchingEngine` is a convenience facade
over the same pipeline.

```
                     ┌──────────────────┐
                     │   Eligibility    │  Hard pre-filter: subject match, capacity > 0
                     │    Filter        │
                     └──────┬───────────┘
                            │ eligible pairs only
                            v
                     ┌──────────────────┐
                     │    Scorers       │  AcademicScorer    (level compatibility, experience, quality)
                     │  (5 scorers)     │  ScheduleScorer    (overlap ratio |Hs ∩ Ht| / |Hs|)
                     │                  │  PreferenceScorer  (style similarity, budget, region)
                     │                  │  FairnessScorer    (1 - load/capacity)
                     │                  │  CompositeScorer   (weighted sum M = αA + βP + γS + δF)
                     └──────┬───────────┘
                            │ per-pair score
                            v
                     ┌──────────────────┐
                     │  GreedyAssignment│  Max-heap with lazy fairness recompute
                     │    Engine        │  O(N·M·log(N·M)) amortized
                     └──────┬───────────┘
                            │ assignments + unassignable
                            v
                     ┌──────────────────┐
                     │  AssignmentLife- │  cancel() → capacity freed → waitlist promotion
                     │    cycle         │  complete() → decrements assignedCount
                     └──────────────────┘
```

### Scoring formula

```
M(s, t) = α·A(s, t) + β·P(s, t) + γ·S(s, t) + δ·F(t)

α + β + γ + δ = 1  (enforced by normalization)

A = w1·SubDepth + w2·Lvl + w3·Exp'           (academic)
P = w4·Style + w5·Budget [+ w6·Region]        (preference)
S = |Hs ∩ Ht| / |Hs|                         (schedule overlap)
F = 1 - CurrentLoad / Capacity                (fairness, [0, 1])
```

All sub-scores are clamped to `[0, 1]`; a zero-vector cosine similarity defaults
to `0.5`.

### Assignment algorithm (lazy greedy)

1. Build a max-heap of every eligible `(student, tutor)` pair keyed by `M(s, t)`
2. Pop the highest key; if the student is already assigned or the tutor is at
   capacity, discard the pair
3. Recompute fairness `F(t)` against current load; if the cached key is stale,
   re-push with the corrected key
4. Otherwise assign, increment the tutor's load, and continue until the heap is
   empty
5. Unassigned students go to the waitlist

**Quality guarantee:** ≥ ½ of the optimal total score (standard greedy matching
bound). `pnpm run eval:gap` measures the actual ratio against a min-cost max-flow
optimum.

## Evaluation

The research claims are backed by runnable harnesses in
`backend/src/core/evaluation/`, all producing CSVs in `backend/docs/benchmarks/`.

| Command (from `backend/`) | Question |
|---|---|
| `pnpm run eval` | How does the engine scale — quality, fairness, time, memory? |
| `pnpm run eval:moderate` | Moderate-load band (1.5:1 … 4:1 student:tutor) |
| `pnpm run eval:topk` | Quality/speed/memory tradeoff for K ∈ {10, 20, 50, ∞} |
| `pnpm run eval:gap` | Greedy vs the exact min-cost max-flow optimum |
| `pnpm run eval:baselines` | Greedy vs FCFS and deferred-acceptance (Gale-Shapley) |
| `pnpm run eval:all` | All of the above |

`pnpm run tui` opens an interactive terminal UI over the same suites (live
progress, results browser, notes scratchpad). Flags, metrics, the baseline
strategies and the full key reference are documented in
[`backend/README.md`](backend/README.md).

## Database

PostgreSQL via Drizzle ORM, schema-first: edit `backend/src/database/schema.ts`,
generate SQL, inspect it, then migrate.

```bash
cd backend
pnpm run db:generate      # SQL migrations from the schema
pnpm run db:migrate       # apply them
pnpm run db:seed          # Nigerian secondary-school fixtures
pnpm run db:seed:courses  # Tutorly-provided and tutor-authored course outlines
pnpm run db:studio        # Drizzle Studio
```

## API

Swagger UI at `http://localhost:4000/api-docs` in development; the maintained
reference is [`backend/docs/api.md`](backend/docs/api.md).

| Module | Endpoints |
|---|---|
| **Auth** | `POST /auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/onboard`, `/auth/admin/signup`, `/auth/admin/signin`; `GET /auth/verify` |
| **Users** | `POST /users`, `GET /users/:id`, `PATCH /users/me`, `PATCH /users/me/student-preferences`, `PATCH /users/me/tutor-preferences` |
| **Matchmaking** | `POST /matchmaking/batch`, `GET /matchmaking/candidates` (student), `GET /matchmaking/candidates/students` (tutor), `POST /matchmaking/select`, `GET /matchmaking/assignments/me`, `PATCH /matchmaking/assignments/:id/status`, `POST /matchmaking/assignments/:id/feedback` |
| **Schedules** | `POST /schedules/availability`, `GET /schedules/users/:userId/availability` |
| **Dashboard** | `GET /dashboard/metrics`, `/dashboard/tutor-metrics`, `/dashboard/admin-metrics` |
| **Wiring checks** | `GET /test/matchmaking/core`, `GET /test/matchmaking/database-demo` |

## Frontend

Next.js 16 App Router with route groups `(auth)` and `(app)`; Tailwind CSS 4
with a token layer in `frontend/app/globals.css`; Zustand for auth state; typed
Axios clients in `frontend/lib/api/`. The browser calls the relative path
`/api/backend/*`, which Next rewrites to the backend origin.

```bash
cd frontend
pnpm run dev        # :3000
pnpm run build
pnpm run lint
pnpm run typecheck
```

Routes, component layout, design conventions and the landing page's token
system are covered in [`frontend/README.md`](frontend/README.md) and
[`frontend/DESIGN.md`](frontend/DESIGN.md).

## Development setup

Prerequisites: Node.js 20+, pnpm, and a PostgreSQL database.

```bash
pnpm install                              # workspace root

# Backend — http://localhost:4000
cd backend
cp .env.example .env                      # set DATABASE_URL
pnpm run jwt:generate && pnpm run jwt:apply   # RSA keys for access/refresh tokens
pnpm run db:generate && pnpm run db:migrate
pnpm run db:seed                          # optional fixtures
pnpm run db:seed:courses                  # optional course outlines (Tutorly + tutors)
pnpm run start:dev

# Frontend — http://localhost:3000 (separate terminal)
cd frontend
cp .env.example .env.local                # BACKEND_URL must point at :4000
pnpm run dev
```

The frontend dev script loads `.env.local` explicitly (`dotenv -e .env.local`),
so create it before running `pnpm run dev`.

## Tests

```bash
cd backend
pnpm run test          # 202 tests across 10 suites (184 run, 18 need a test database)
pnpm run test:core     # core matchmaking units only (101 tests)
pnpm run test:e2e      # HTTP smoke test
```

| Suite | Tests | Scope |
|---|---|---|
| `src/core/__tests__/core-units.spec.ts` | 55 | Filters, scorers, assignment, ranking, feedback, adaptation |
| `src/core/__tests__/core-engine.spec.ts` | 23 | Core engine behaviour and benchmarks |
| `src/core/__tests__/evaluation-tui.spec.ts` | 23 | Eval configs, gap/baseline helpers, CSV/table helpers, TUI registry |
| `src/app/controller/app.controller.spec.ts` | 1 | Status endpoint |
| `src/modules/courses/courses.service.spec.ts` | 53 | Course scoping, role rules, topic-limit and permutation guards |
| `src/modules/courses/courses.integration.spec.ts` | 18 | Migrated-database HTTP contracts for every course endpoint (skips without `COURSES_TEST_DATABASE_URL`) |
| `src/modules/messages/messages.service.spec.ts` | 15 | Reply validation and conversation rules |
| `src/modules/sessions/sessions.repository.spec.ts` | 9 | Session query shape and owner scoping |
| `src/modules/messages/messages.repository.spec.ts` | 3 | Message SQL and thread joins |
| `src/modules/messages/messages.controller.spec.ts` | 2 | Message controller wiring |
| `test/app.e2e-spec.ts` | 1 | Full HTTP stack smoke test |

The core suites cover the algorithm and the evaluation tooling. The Nest module
layer is covered where behaviour was added — `courses`, plus focused `messages`
and `sessions` specs. The courses HTTP suite is the only one that needs
PostgreSQL: point `COURSES_TEST_DATABASE_URL` at a **disposable** database (never
`DATABASE_URL`, which the suite migrates) or it skips and the other nine suites
still run. The frontend has no test runner configured — `pnpm run typecheck`,
`pnpm run lint` and `pnpm run deadcode` are its checks.

## Working with AI coding agents

This repository is developed with agent harnesses, and its configuration is
committed rather than hidden:

- `AGENTS.md` — the bootstrap/operating manual read by agents in this repo.
- `agents-framework/` — human-readable copies of the personas (frontend,
  designer, backend, reviewer, environment tuner, orchestrator).
- `.opencode/agents/` and `.claude/agents/` — the same personas in each
  harness's discovery format, with permissions in `opencode.json`.
- `.agents/`, `frontend/.agents/`, `.claude/skills/` — vendored design and
  frontend skills the designer/frontend personas route to.
- `backend/AGENTS.md` and `backend/agent-docs/` — backend-specific operating
  guide, plus exception conventions, discoveries and lessons.
- `.mcp.json`, `opencode.json` — MCP servers (shadcn, Chrome DevTools) and
  per-agent permissions.

Contributors who are not using an agent harness can ignore all of it; nothing in
the build or test flow depends on these files.

## Conventions

- Conventional Commits (commitlint + husky, configured in `backend/`).
- Backend: strict typing, typed exceptions, controller → service → repository,
  path aliases over deep relative imports.
- Frontend: Server Components by default, `'use client'` only at the leaf,
  primitives from `components/ui/`, tokens instead of literal colours.
- Update the matching doc in the same change as the code: `backend/docs/api.md`
  for endpoints, `frontend/DESIGN.md` for design-system changes.
