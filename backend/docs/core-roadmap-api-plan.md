# Core Matchmaking Roadmap and API Plan

Status of the original plan, kept so the reasoning behind the shipped design is
still visible. Where the plan and the shipped API disagree, **the shipped routes
are authoritative** and are noted inline; [`api.md`](api.md) is the reference.

## Current core (shipped)

- `src/core/entities` — framework-free student, tutor, availability, weights,
  score, and assignment models.
- `src/core/algorithms` — eligibility filtering, academic/preference/schedule/
  fairness scoring, lazy-greedy assignment, top-k ranking, feedback updates, and
  weight adaptation.
- `src/core/engine` — service-facing orchestration for batch matching,
  incremental matching, completion, and cancellation.
- `src/core/evaluation` — CSV-producing harnesses for quality, unassigned rate,
  fairness, and scalability, plus an optimality-gap baseline.

## Deliberate omissions

- **Gender preference** is not a scoring criterion: it is a discrimination-risk
  feature and not required for a defensible v1.
- **Region/proximity** is out of scoring because the domain model has no
  location data; add it only when there are verified address/zone fields.
- **Static one-time greedy sorting** is not used, because fairness goes stale as
  tutor load changes within the same batch.
- **API, persistence and auth stay out of `src/core`** — Nest services call the
  core engine instead of embedding algorithm logic.

## Roadmap status

| # | Planned unit | Status | Shipped as |
|---|---|---|---|
| 1 | `students` module — profile, subject, level, exam, availability, budget, weights | ✅ shipped | folded into `modules/users` (`PATCH /users/me/student-preferences`, onboarding) |
| 2 | `tutors` module — profile, subjects, levels/exams, availability, pricing, capacity, rating | ✅ shipped | folded into `modules/users` (`PATCH /users/me/tutor-preferences`) |
| 3 | `matching` module — batch run, incremental request, top-k, audit | ✅ shipped | `modules/matchmaking` + `modules/matchmaking-test` |
| 4 | `assignments` module — persistence, completion, cancellation, waitlist promotion, load updates in one transaction | ✅ shipped | `modules/matchmaking` (`/matchmaking/assignments/*`) + `modules/sessions` |
| 5 | `feedback` module — rating intake and tutor quality EMA update | ✅ shipped | `POST /matchmaking/assignments/:id/feedback` |
| 6 | `evaluation` admin task — run the harness and export CSV | ✅ shipped (CLI, not HTTP) | `src/core/evaluation` + `pnpm run eval*` + `pnpm run tui` |

**Divergence from the plan:** students and tutors were not split into separate
modules. Both are `users` with role-specific profile tables, so preference
updates live under `/users/me/*-preferences` rather than `/students` and
`/tutors`. Availability moved to `/schedules/availability`.

## Original API plan vs shipped routes

| Planned route | Shipped route |
|---|---|
| `POST /students`, `PATCH /students/:id`, `GET /students/:id` | `POST /users`, `GET /users/:id`, `PATCH /users/me` |
| `PUT /students/:id/availability`, `PUT /tutors/:id/availability` | `POST /schedules/availability`, `GET /schedules/users/:userId/availability` |
| `POST /tutors`, `PATCH /tutors/:id` | `PATCH /users/me/tutor-preferences` (+ onboarding) |
| `POST /matching/batch` | `POST /matchmaking/batch` |
| `POST /matching/students/:id/request` | `POST /matchmaking/select` |
| `GET /matching/students/:id/recommendations?limit=5` | `GET /matchmaking/candidates?page&limit` |
| `GET /assignments/:id`, `POST /assignments/:id/complete`, `POST /assignments/:id/cancel` | `GET /matchmaking/assignments/me`, `PATCH /matchmaking/assignments/:id/status` |
| `POST /feedback` | `POST /matchmaking/assignments/:id/feedback` |
| `GET /tutors/:id/quality` | not exposed as HTTP; quality is read internally by the scorer |

## Still open

- A dedicated waitlist inspection endpoint (`GET /assignments/waitlist` was
  planned; waitlist rows are visible through `/matchmaking/assignments/me`).
- Region-aware scoring once verified location data exists.
- Unit coverage for the Nest module layer (auth, users, sessions, …); see
  `agent-docs/findings.md` and the test suites in `src/core/__tests__/`.

## Persistence notes

- Score breakdown JSON is stored with each assignment for auditability.
- `assignedCount`, assignment status, and waitlist promotion update inside a
  database transaction.
- Core entities are mapped at repository boundaries; Drizzle row shapes never
  leak into `src/core`.
