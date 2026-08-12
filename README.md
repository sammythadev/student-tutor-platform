# Student Tutor Matchmaking Platform

A monorepo (pnpm workspace) for a Nigerian secondary-school student-tutor matchmaking system. **Subject eligibility is a hard pre-filter** — tutors who do not teach the student's subject are excluded before any scoring. The core engine implements a **Priority-Queue Greedy** algorithm with lazy fairness recompute (guarantees ≥½ of the optimal assignment score).

---

## Monorepo Layout

```
project/
├── backend/                     # NestJS 11 + Drizzle ORM + PostgreSQL
│   ├── src/
│   │   ├── core/                # Framework-free matchmaking engine (no Nest decorators)
│   │   │   ├── entities/        #   Domain types (Student, Tutor, MatchScore, etc.)
│   │   │   ├── algorithms/      #   Filters, scorers, assignment, ranking, feedback, adaptation
│   │   │   │   ├── filters/     #     EligibilityFilter (hard subject + capacity pre-filter)
│   │   │   │   ├── scorers/     #     AcademicScorer, ScheduleScorer, PreferenceScorer, FairnessScorer, CompositeScorer
│   │   │   │   ├── assignment/  #     GreedyAssignmentEngine (lazy heap), AssignmentLifecycle
│   │   │   │   ├── ranking/     #     TopKRanker (heap-based O(M log K) per student)
│   │   │   │   ├── feedback/    #     FeedbackUpdater (EMA-based rating update)
│   │   │   │   └── adaptation/  #     WeightAdaptation (proportional renormalization)
│   │   │   ├── engine/          #   MatchingEngine (facade over the assignment units)
│   │   │   ├── evaluation/      #   EvaluationHarness, OptimalBaseline (min-cost max-flow), BaselineComparison
│   │   │   └── __tests__/       #   15 integration tests for core engine
│   │   ├── modules/             # NestJS feature modules (auth, users, matchmaking, scheduling, etc.)
│   │   ├── database/            # Drizzle schema + seeds + module
│   │   ├── common/              # Shared backend layer
│   │   ├── configs/             # Environment/bootstrap helpers
│   │   └── types/               # Shared typings
│   ├── test/                    # E2E test
│   ├── docs/                    # API documentation, implementation guide, database docs
│   └── agent-docs/              # Agent operating guides (project-structure, patterns, exceptions, etc.)
├── frontend/                    # Next.js 16 (App Router) + React 19 + Tailwind CSS 4
│   ├── app/
│   │   ├── (auth)/              # signup, signin, onboard
│   │   └── (app)/               # dashboard, tutors, tutor-dashboard, schedules, messages, feed, etc.
│   ├── components/              # Reusable UI components (AppShell, Modal, Button, etc.)
│   ├── lib/
│   │   ├── api/                 # API client modules (auth, users, sessions, messages, etc.)
│   │   └── store/               # Zustand auth store
│   └── public/
├── package.json                 # Root workspace config
├── Algorithm.md                 # Authoritative matchmaking algorithm spec
├── TEST_SUITE_REPORT.md         # Test coverage report
└── CLAUDE.md                    # Claude Code operating guide
```

---

## Core Matchmaking Engine

The engine lives in `backend/src/core/` and is **framework-free** — no NestJS decorators, no persistence coupling. Nest modules consume its units directly (`GreedyAssignmentEngine`, `AssignmentLifecycle`, the scorers); `MatchingEngine` is a convenience facade over the same units for callers that want the whole pipeline in one call.

### Architecture Flow

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

### Scoring Formula

```
M(s, t) = α·A(s, t) + β·P(s, t) + γ·S(s, t) + δ·F(t)

α + β + γ + δ = 1  (enforced by normalization)

A = w1·SubDepth + w2·Lvl + w3·Exp'           (academic)
P = w4·Style + w5·Budget [+ w6·Region]        (preference)
S = |Hs ∩ Ht| / |Hs|                         (schedule overlap)
F = 1 - CurrentLoad / Capacity                (fairness, [0, 1])
```

All sub-scores are clamped to `[0, 1]`. Zero-vector cosine similarity defaults to `0.5`.

### Assignment Algorithm (Lazy Greedy)

1. Build max-heap of all eligible `(student, tutor)` pairs keyed by `M(s, t)`
2. Pop highest key; if student already assigned or tutor at capacity → discard
3. Recompute fairness `F(t)` with current load; if stale → re-push with correct key
4. Otherwise assign, increment tutor load, repeat until heap empty
5. Unassigned students go to waitlist

**Quality guarantee:** ≥½ of optimal total score (standard greedy matching bound).

---

## CLI: Evaluation Scripts

Run from `backend/`. Each script generates the same synthetic Nigerian-secondary-school fixtures (`src/core/evaluation/fixtures.ts`) and benchmarks the engine. There are three entry points:

| Script | Question it answers |
|---|---|
| `evaluation-harness.ts` | How does the engine scale (quality, fairness, time, memory)? |
| `optimal-baseline.ts` | How far below the *exact* optimum does greedy land? |
| `baseline-comparison.ts` | Does greedy beat the simpler strategies real platforms use? |

### Commands

```bash
# Full evaluation suite (realistic + moderate + stress sweep)
pnpm run eval

# Moderate-load band only (1.5:1, 2:1, 3:1, 4:1 student:tutor ratios)
pnpm run eval:moderate

# Top-K sweep — quality/speed/memory tradeoff for K ∈ {10, 20, 50, ∞}
pnpm run eval:topk

# Optimality gap — greedy vs min-cost max-flow optimum (sizes 10–100)
pnpm run eval:gap

# Baseline comparison — greedy vs FCFS / deferred-acceptance strategies (RQ6)
pnpm run eval:baselines

# Run everything
pnpm run eval:all
```

### Optimal baseline (`eval:gap`)

Solves the assignment exactly with **min-cost max-flow** and reports greedy's `scoreRatio` against it. Both sides are scored on the *static* (academic + preference + schedule) basis, since the flow model cannot represent live-load fairness. Exact solving is `O(V·E·maxflow)`, so this is small-size only.

```bash
pnpm run eval:gap                        # default sizes 10, 25, 50, 100
pnpm run eval:gap --sizes 10,50,200      # custom sizes
```

| Column | Description |
|---|---|
| `greedyAssigned` / `optimalAssigned` | Students matched by each method |
| `greedyStaticTotal` / `optimalStaticTotal` | Summed static score |
| `scoreRatio` | `greedy / optimal` — the theoretical floor is 0.5 |
| `greedyMs` / `optimalMs` | Wall-clock per method |

### Baseline comparison (`eval:baselines`)

Runs four assignment strategies over identical fixtures, so any difference comes from the strategy alone.

| Strategy | Behaviour |
|---|---|
| `fcfs-filter` | First-come-first-served, first eligible tutor with capacity — no scoring |
| `fcfs-best` | First-come-first-served self-selection — each student picks their own best tutor |
| `da-stable` | Student-proposing deferred acceptance (Gale-Shapley) — both sides rank by the *static* composite score (fairness excluded from ranking, so utilities are load-independent); optimizes stability rather than total score |
| `greedy-engine` | The proposed engine — global score-ordered heap with lazy fairness recompute |

```bash
pnpm run eval:baselines                          # all scenarios, all strategies
pnpm run eval:baselines --scenario moderate      # scenarios matching a substring
pnpm run eval:baselines --strategy greedy-engine # one strategy only
```

Scenarios: `realistic-1to1`, `moderate-1.5to1`, `moderate-2to1`, `moderate-3to1`, `stress-10to1`.

### Flags

Available on every eval command:

| Flag | Effect |
|---|---|
| `--name <file>` | Name the output file (`.csv` appended if omitted); still saved to `docs/benchmarks/` |
| `--out <path>` | Write to an explicit path, ignoring the default directory |
| `--no-file` | Print only; skip writing the CSV |
| `--table` | Force the aligned table |
| `--csv` | Force raw CSV |

Script-specific: `--moderate`, `--topk-sweep` (harness), `--sizes` (gap), `--scenario`, `--strategy` (baselines).

Flags pass straight through the pnpm script and **override** any baked-in default, so `pnpm run eval:topk --name my-run` wins over the script's own `--name`.

### Output

Every run prints results **and** saves a CSV, then reports the path on the last line:

```
$ pnpm run eval:baselines --name rq6-final

┌──────────────────┬───────────────┬ ... ┐
│         scenario │      strategy │ ... │
└──────────────────┴───────────────┴ ... ┘

Saved 15 row(s) to: C:\...\backend\docs\benchmarks\rq6-final.csv
```

Results land in `backend/docs/benchmarks/` unless `--out` says otherwise. Default filenames:

| Command | File |
|---|---|
| `eval` | `evaluation-results.csv` |
| `eval:moderate` | `moderate-results.csv` |
| `eval:topk` | `topk-sweep-results.csv` |
| `eval:gap` | `optimality-gap-results.csv` |
| `eval:baselines` | `baseline-comparison-results.csv` |

Rendering adapts to context: an aligned table on an interactive terminal, raw CSV when piped or redirected — so `pnpm run eval > out.csv` stays machine-readable. The saved-path line goes to stderr and never pollutes redirected output.

### Harness Metrics

| Column | Description |
|---|---|
| `averageScore` | Mean match score across assignments |
| `unassignedPercent` | % of students not assigned (capacity-bound) |
| `jainFairnessIndex` | Jain's fairness index [0–1] across tutor loads |
| `elapsedMinMs`/`MeanMs`/`MaxMs` | Wall-clock timing (5 runs) |
| `pairsScored` | Total (student × tutor) pairs evaluated |
| `peakHeapEntries` | Max heap size during run |

---

## Tests

Run from `backend/`:

```bash
pnpm run test              # All unit tests (17 tests across 3 files)
pnpm run test:core         # Core engine tests only (15 tests)
pnpm run test:e2e          # E2E tests (1 smoke test)
pnpm run test:coverage     # With coverage report
pnpm run test:watch        # Watch mode
pnpm jest path/to/file.spec.ts     # Single file
pnpm jest -t "test name"           # By test name
```

| Test File | Tests | Scope |
|---|---|---|
| `src/core/__tests__/core-engine.spec.ts` | 15 | Scorers, assignment engine, lifecycle, ranking, adaptation, benchmark |
| `src/app/controller/app.controller.spec.ts` | 1 | Backend health endpoint smoke test |
| `test/app.e2e-spec.ts` | 1 | Full HTTP stack smoke test |

---

## Database

Schema-first Drizzle ORM with PostgreSQL. Base identity in `users`; role data in `student_profiles` / `tutor_profiles`. Availability and preference weights stored as typed JSON.

```bash
pnpm run db:generate      # Generate SQL migrations from schema
pnpm run db:migrate       # Apply migrations
pnpm run db:seed          # Seed Nigerian secondary-school fixtures (~50 users)
pnpm run db:studio        # Drizzle Studio GUI
```

---

## API Endpoints

Swagger UI at `/api-docs` (dev). See `backend/docs/api.md` for full reference.

| Module | Endpoints |
|---|---|
| **Auth** | `POST /auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/verify`, `/auth/onboard`, `/auth/admin/signup`, `/auth/admin/signin` |
| **Users** | `POST /users`, `GET /users/:id`, `PATCH /users/me`, `PATCH /users/me/student-preferences`, `PATCH /users/me/tutor-preferences` |
| **Matchmaking** | `POST /matchmaking/batch`, `GET /matchmaking/candidates`, `POST /matchmaking/select`, `GET /matchmaking/assignments/me`, `PATCH /matchmaking/assignments/:id/status`, `POST /matchmaking/assignments/:id/feedback` |
| **Schedules** | `POST /schedules/availability`, `GET /schedules/users/:userId/availability` |
| **Test** | `GET /test/matchmaking/core`, `GET /test/matchmaking/database-demo` |

---

## Frontend

Next.js 16 (App Router) with React 19, Tailwind CSS 4, Zustand store, GSAP animations.

```bash
cd frontend
pnpm run dev              # Dev server (loads .env.local)
pnpm run build            # Production build
pnpm run lint             # ESLint
```

### Route Groups

- `(auth)/` — signup, signin, onboard
- `(app)/` — dashboard (student/tutor), tutors, tutor-dashboard, schedules, messages, notifications, feed, profile, settings, admin

### Component Architecture

- `components/` — AppShell, Modal, Button, Input, Badge, Toast, ThemeToggle, CalendarGrid, Pagination, etc.
- `lib/store/` — Zustand `authStore`
- `lib/api/` — typed API client modules (auth, users, sessions, messages, notifications, feed, dashboard)
- `lib/axios.ts` — Axios instance with interceptor

---

## Development Setup

```bash
# Prerequisites: Node.js 20+, pnpm
pnpm install

# Backend
cd backend
cp .env.example .env.development   # Configure DATABASE_URL etc.
pnpm run db:generate && pnpm run db:migrate && pnpm run db:seed
pnpm run start:dev                  # http://localhost:3000 (NestJS + SWC watch)

# Frontend (separate terminal)
cd frontend
pnpm run dev                        # http://localhost:3001 (Next.js)
```

### Other Backend Scripts

```bash
pnpm run build              # nest build + tsc-alias
pnpm run build:minified     # SWC minified production build
pnpm run lint / lint:fix    # ESLint
pnpm run typecheck          # tsc --noEmit
pnpm run format             # Prettier
pnpm run jwt:generate       # Generate JWT signing keys
pnpm run jwt:apply          # Apply JWT keys to .env
```
