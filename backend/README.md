# Tutorly Backend

NestJS 11 API and matchmaking engine for the student–tutor platform. The
algorithm lives in a framework-free core (`src/core/`) and Nest modules
consume it — no scoring or assignment logic is reimplemented in a controller or
service.

## Stack

| Concern | Choice |
|---|---|
| Framework | NestJS 11 on Express (SWC-backed build) |
| Language | TypeScript, strict mode |
| Database | PostgreSQL via Drizzle ORM (schema-first, generated SQL migrations) |
| Auth | JWT access + refresh tokens (RSA keys, `jwt:generate` / `jwt:apply`) |
| API docs | Swagger UI at `/api-docs` (dev) |
| Package manager | pnpm only — `preinstall` runs `only-allow pnpm` |
| Eval UI | Interactive terminal UI (ink) over the evaluation suites |

## Layout

```
src/
  main.ts                     bootstrap (logger, validation, CORS, Swagger)
  swagger.ts                  Swagger document setup
  app/                        root module + status controller
  core/                       framework-free matchmaking domain (see below)
    entities/                 domain types + value objects (Student, Tutor, weights, scores)
    algorithms/
      filters/                eligibility.filter.ts — hard subject + capacity pre-filter
      scorers/                academic, preference, schedule, fairness, composite
      assignment/             greedy-assignment.engine.ts, assignment-lifecycle.ts
      ranking/                top-k-ranker.ts
      feedback/               feedback-updater.ts (EMA quality update)
      adaptation/             weight-adaptation.ts
      utils/                  max-heap.ts, vector-math.ts
    engine/                   matching-engine.ts — facade over filter → score → assign
    evaluation/               CLI harness, optimal baseline, baseline comparison
    evaluation/tui/           ink terminal UI
    __tests__/                core unit + integration suites
  modules/                    Nest feature modules (controller → service → repository)
    auth/ users/ matchmaking/ matchmaking-test/ scheduling/
    sessions/ messages/ notifications/ feed/ dashboard/
  database/                   schema.ts, module wiring, seeds/
  common/                     guards, filters, interceptors, logger
  configs/                    env loading and app metadata helpers
  types/                      shared typings
drizzle/                      generated SQL migrations + snapshots
test/                         e2e config and smoke spec
scripts/                      jwt key generation, TUI loader
docs/                         contributor/API documentation (see below)
agent-docs/                   agent operating notes: exceptions, findings, lessons
```

Each feature module keeps the same shape: `<feature>.controller.ts`,
`<feature>.service.ts`, `<feature>.repository.ts`, `<feature>.module.ts`,
`index.ts`, and a `dtos/` folder. Controllers own HTTP + Swagger, services own
business rules, repositories own Drizzle queries.

## Quickstart

```bash
pnpm install                       # from the repo root
cd backend
cp .env.example .env               # then set DATABASE_URL
pnpm run jwt:generate              # writes RSA key pair for access + refresh tokens
pnpm run jwt:apply                 # copies those keys into .env
pnpm run db:generate               # generate SQL from src/database/schema.ts
pnpm run db:migrate                # apply it
pnpm run db:seed                   # optional: Nigerian secondary-school fixture data
pnpm run start:dev                 # http://localhost:4000, Swagger at /api-docs
```

`PORT=4000` and `CORS_ORIGIN=http://localhost:3000` are the defaults the
frontend expects — its `/api/backend/*` rewrite points at port 4000.

### Environment

Full reference: [`docs/environment.md`](docs/environment.md).

| Variable | Notes |
|---|---|
| `NODE_ENV` | Switches logging behaviour |
| `PORT` | API port (`4000` to match the frontend proxy) |
| `CORS_ORIGIN` | Allowed browser origin |
| `DATABASE_URL` | PostgreSQL connection string |
| `LOG_LEVEL`, `LOG_ENABLED`, `LOG_FILE_PATH` | Logger verbosity, kill switch, optional file transport |
| `APP_NAME`, `APP_VERSION`, `SWAGGER_PATH` | Metadata and docs route |
| `JWT_*_TOKEN_{PRIVATE,PUBLIC}_KEY` | RSA keys, stored with escaped newlines |
| `JWT_*_TOKEN_TTL_SECONDS` | Token lifetimes |
| `ADMIN_SIGNUP_CODE` | Bootstrap code required by admin signup |

Seed `.env.example` first when introducing a variable; never edit `.env` in a
shared change.

### Scripts

| Command | What it does |
|---|---|
| `pnpm run start:dev` | Watch-mode dev server |
| `pnpm run build` | `nest build` + `tsc-alias` |
| `pnpm run build:minified` | SWC minified production build |
| `pnpm run start:prod` | Run `dist/main` |
| `pnpm run lint` / `lint:fix` | ESLint (incl. `tsconfig.tui.json` project) |
| `pnpm run typecheck` | `tsc --noEmit` for the main and TUI projects |
| `pnpm run test` | Jest unit tests (`rootDir: src`) |
| `pnpm run test:core` | Core matchmaking units only |
| `pnpm run test:coverage` | Jest with coverage |
| `pnpm run test:e2e` | E2E suite (`test/jest-e2e.json`) |
| `pnpm run eval`, `eval:moderate`, `eval:topk`, `eval:gap`, `eval:baselines`, `eval:all` | Evaluation harnesses (below) |
| `pnpm run tui` | Interactive eval terminal UI |
| `pnpm run db:generate` / `db:migrate` / `db:seed` / `db:studio` | Drizzle workflow |
| `pnpm run jwt:generate` / `jwt:apply` | RSA token-key management |
| `pnpm run format` / `format:check` | Prettier (source, tests, docs, README) |

## Database

Schema-first Drizzle. `src/database/schema.ts` is the single source of truth;
migrations under `drizzle/` are generated, never hand-written.

```bash
pnpm run db:generate     # emit SQL from the schema
# inspect drizzle/*.sql before applying
pnpm run db:migrate
pnpm run db:studio
```

Tables: `users`, `subjects`, `student_profiles`, `tutor_profiles`,
`tutor_subjects`, `schedule_slots`, `assignments`, `tutor_feedback`. Base
identity lives in `users`; role data in the profile tables. Availability and
preference weights are stored as typed JSON. Table-by-table detail and the index
list are in [`docs/database.md`](docs/database.md).

## API

Swagger UI is served at `/api-docs` in development. The hand-maintained
reference — auth modes, bodies, and error codes per route — is
[`docs/api.md`](docs/api.md). Route groups: `/auth`, `/users`, `/matchmaking`,
`/schedules`, `/dashboard`, `/test/matchmaking` (wiring checks).

When you add or change an endpoint, update the Swagger decorators **and**
`docs/api.md` in the same change.

## Matchmaking engine

The algorithm spec is [`../Algorithm.md`](../Algorithm.md); the summary in
[`../README.md`](../README.md) covers the scoring formula and the lazy-greedy
pass. Two rules keep this package honest:

- Scoring, filtering and assignment stay in `src/core/` — `MatchmakingService`
  composes `GreedyAssignmentEngine`, `AssignmentLifecycle` and the scorers
  directly rather than reimplementing them, and `MatchingEngine` remains a
  facade for callers that want the whole pipeline in one call.
- Subject eligibility is a **hard filter**, never a weighted term.

## Evaluation harnesses

All suites generate the same synthetic fixtures
(`src/core/evaluation/fixtures.ts`) so differences come from the algorithm, and
all of them save CSV output to `docs/benchmarks/`.

| Script | Question it answers |
|---|---|
| `pnpm run eval` | How does the engine scale (quality, fairness, time, memory)? |
| `pnpm run eval:moderate` | Moderate-load band only (1.5:1 … 4:1 student:tutor) |
| `pnpm run eval:topk` | Quality/speed/memory tradeoff for K ∈ {10, 20, 50, ∞} |
| `pnpm run eval:gap` | How far below the exact optimum does greedy land? (min-cost max-flow) |
| `pnpm run eval:baselines` | Does greedy beat the strategies real platforms use? (FCFS / deferred acceptance) |
| `pnpm run eval:all` | Everything above |

Flags available across the eval commands: `--name <file>`, `--out <path>`,
`--no-file`, `--table`, `--csv`, `--no-timing`, plus script-specific
`--moderate` / `--topk-sweep` / `--sizes` / `--scenario` / `--strategy`.

Findings from these runs are written up in
[`docs/benchmarks/EVALUATION_FINDINGS.md`](docs/benchmarks/EVALUATION_FINDINGS.md)
and [`docs/OPTIMIZATION_REPORT.md`](docs/OPTIMIZATION_REPORT.md).

### Eval TUI

`pnpm run tui` launches an interactive terminal UI over the same suites — live
per-scenario progress, highlighted results tables, a saved-results browser, and
a notes scratchpad. It needs an interactive TTY; piped output falls back to the
plain `pnpm run eval*` scripts.

```bash
pnpm run tui                       # menu
pnpm run tui -- eval               # full harness
pnpm run tui -- topk               # top-k sweep
pnpm run tui -- moderate           # moderate-load band
pnpm run tui -- gap                # optimality gap
pnpm run tui -- baselines          # baseline comparison
pnpm run tui -- all                # eval + topk + gap + baselines
pnpm run tui -- browser            # browse saved CSVs
pnpm run tui -- notes              # notes scratchpad
pnpm run tui -- eval --no-timing   # zero timing columns from launch
```

| Key | Action |
|---|---|
| `↑`/`↓` or `j`/`k` | move the selection |
| `Enter` | run the selected suite / open a CSV |
| `r` | rerun / refresh the results list |
| `s` | save results under a custom filename (run view) |
| `t` | toggle timing columns in the table and saved CSV (run view) |
| `?` | full help reference (menu, run, browser) |
| `Ctrl+O` | help reference in the notes editor, so `?` stays typable |
| `Ctrl+S` | save the scratchpad (notes) |
| `b` / `n` / `m` / `q` | browser / notes / back / quit |

Suites auto-save to `docs/benchmarks/`; the scratchpad writes to `docs/notes/`.
`docs/benchmarks/` holds curated result tables that the findings docs cite, so
prefer naming experimental runs rather than overwriting them.

## Testing

```bash
pnpm run test              # 102 unit tests across 4 suites
pnpm run test:core         # core matchmaking units only
pnpm run test:e2e          # 1 smoke spec over the full HTTP stack
pnpm run test:coverage
pnpm jest path/to/file.spec.ts   # single file
pnpm jest -t "test name"         # by test name
```

| Suite | Scope |
|---|---|
| `src/core/__tests__/core-units.spec.ts` | Filters, scorers, assignment, ranking, feedback, adaptation |
| `src/core/__tests__/core-engine.spec.ts` | End-to-end core engine behaviour and benchmarks |
| `src/core/__tests__/evaluation-tui.spec.ts` | Eval configs, gap/baseline helpers, CSV/table helpers, TUI registry |
| `src/app/controller/app.controller.spec.ts` | Status endpoint |
| `test/app.e2e-spec.ts` | HTTP smoke test |

The Nest `modules/` layer (auth, users, sessions, messages, …) has no unit
tests yet — the suites above cover the algorithm and eval tooling. Add tests
alongside behaviour changes.

## Conventions

- Smallest safe change; follow the nearest existing pattern.
- Strict typing, no `any`; explicit return types on public functions.
- Typed HTTP/project exceptions (see [`agent-docs/exceptions.md`](agent-docs/exceptions.md));
  never leak `error.stack` in a response body.
- One-directional dependencies: controller → service → repository.
- Path aliases (`@core/*`, `@modules/*`, `@database/*`, `@common/*`, …) are
  defined in `tsconfig.json` and mirrored in the Jest `moduleNameMapper`.
- Commit messages follow Conventional Commits (commitlint + husky).

## Documentation

| Doc | Contents |
|---|---|
| [`docs/api.md`](docs/api.md) | Endpoint reference: auth, bodies, errors |
| [`docs/database.md`](docs/database.md) | Tables, indexes, migration workflow |
| [`docs/environment.md`](docs/environment.md) | Env files and every variable |
| [`docs/project-structure.md`](docs/project-structure.md) | Layout and placement rules |
| [`docs/core-roadmap-api-plan.md`](docs/core-roadmap-api-plan.md) | Roadmap with shipped/pending status |
| [`docs/OPTIMIZATION_REPORT.md`](docs/OPTIMIZATION_REPORT.md) | Performance work and results |
| [`docs/benchmarks/EVALUATION_FINDINGS.md`](docs/benchmarks/EVALUATION_FINDINGS.md) | Evaluation findings |
| [`agent-docs/exceptions.md`](agent-docs/exceptions.md) | Exception hierarchy and response rules |
| [`agent-docs/findings.md`](agent-docs/findings.md) | Durable discoveries and decisions |
| [`agent-docs/lessons.md`](agent-docs/lessons.md) | Lessons, tooling traps, cautions |
| [`AGENTS.md`](AGENTS.md) | Operating guide for coding agents in this package |
