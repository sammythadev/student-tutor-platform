# Test Suite Report

**Generated:** 2026-07-05
**Project:** Student Tutor Matchmaking Platform

---

## 1. Stack Overview

| Layer | Technology | Test Framework | Test Files |
|-------|-----------|---------------|------------|
| **Backend** | NestJS 11 + TypeScript (strict) + Drizzle ORM + PostgreSQL + Express | Jest 30 + `ts-jest` + `@nestjs/testing` + supertest | 3 files (17 tests) |
| **Frontend** | Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript | **None** | **0 files** |

---

## 2. Project Structure — Test Locations

```
project/
├── backend/
│   ├── src/
│   │   ├── app/
│   │   │   └── controller/
│   │   │       └── app.controller.spec.ts       ◄ Unit test (1 test)
│   │   └── core/
│   │       └── __tests__/
│   │           └── core-engine.spec.ts           ◄ Integration test (15 tests)
│   └── test/
│       ├── app.e2e-spec.ts                       ◄ E2E test (1 test)
│       └── jest-e2e.json                         ◄ E2E Jest config
├── frontend/
│   └── (no test directory, no test files)
```

### Test configuration (inline in `backend/package.json`):
- **Unit tests:** Jest with `rootDir: "src"`, pattern `*.spec.ts`, transformer `ts-jest`
- **E2E tests:** Separate Jest config at `test/jest-e2e.json`, pattern `.e2e-spec.ts`

---

## 3. Test File Breakdown

### 3.1 `app.controller.spec.ts` — Unit Test

| Property | Value |
|----------|-------|
| **Path** | `backend/src/app/controller/app.controller.spec.ts` |
| **Framework** | Jest + `@nestjs/testing` |
| **What it tests** | `AppController.getStatus()` — backend health endpoint |
| **Tests** | 1 — verifies response string `"Student tutor matchmaking backend is running."` |
| **Concerns** | Minimal smoke test. Does not test HTTP layer, just the method return value. |

### 3.2 `core-engine.spec.ts` — Integration Test

| Property | Value |
|----------|-------|
| **Path** | `backend/src/core/__tests__/core-engine.spec.ts` |
| **Framework** | Jest (plain, no NestJS testing utilities) |
| **Lines** | 301 |
| **What it tests** | Core matchmaking engine — the domain layer (framework-free) |
| **Tests** | 15 (see below) |

**Test inventory:**

| # | Test Name | What It Covers |
|---|-----------|----------------|
| 1 | `computes hand-verifiable academic and composite scores` | `AcademicScorer`, `CompositeScorer` — validates against hand-calculated values |
| 2 | `normalizes weights and rejects negative weights` | `CriterionWeights.from()` — normalization + validation |
| 3 | `scores schedule overlap and rejects missing availability` | `ScheduleScorer` — overlap ratio, `IncompleteProfileException` |
| 4 | `does not treat split tutor slots as full coverage` | `ScheduleScorer` — split slots return 0.5 not 1.0 |
| 5 | `filters no-subject and zero-capacity tutors into explicit waitlist results` | `GreedyAssignmentEngine` — eligibility filtering |
| 6 | `uses deterministic hash tie-breaking for equal scores` | `GreedyAssignmentEngine` — deterministic assignment |
| 7 | `returns unassignable students when demand exceeds capacity` | `GreedyAssignmentEngine` — capacity overflow |
| 8 | `applies cold-start quality and feedback updates` | `AcademicScorer.experienceQuality()`, `FeedbackUpdater.updateQuality()` |
| 9 | `does not depend on booking timestamp in batch mode` | `GreedyAssignmentEngine` — timestamp independence |
| 10 | `rechecks capacity during the same batch` | `GreedyAssignmentEngine` — capacity tracking mid-batch |
| 11 | `waitlists incremental requests at exact capacity` | `MatchingEngine.matchOne()` — full capacity handling |
| 12 | `promotes a waitlisted student after cancellation frees capacity` | `AssignmentLifecycle.cancel()` — cancellation + promotion |
| 13 | `keeps assigned counts within tutor capacity across generated fixtures` | `GreedyAssignmentEngine` — stress test (25 runs × 5 tutors × 20 students) |
| 14 | `ranks top-k tutors and adapts weights without breaking normalization` | `TopKRanker.rank()`, `WeightAdaptation.bump()` |
| 15 | `outperforms naive FCFS on average match quality for the same fixtures` | Benchmark — greedy vs FCFS quality comparison |

**Coverage (inferred):** The core scoring/assignment engine is well-covered. Scorers tested: `AcademicScorer`, `CompositeScorer`, `ScheduleScorer`, `FeedbackUpdater`. Engine tested: `GreedyAssignmentEngine`, `MatchingEngine`, `AssignmentLifecycle`. Supporting classes tested: `TopKRanker`, `WeightAdaptation`, `CriterionWeights`, `AlgorithmWeights`.

**Not covered:** `PreferenceScorer`, `FairnessScorer`, `EligibilityFilter`, `EvaluationHarness`, `VectorMath`, `MaxHeap`.

### 3.3 `app.e2e-spec.ts` — E2E Test

| Property | Value |
|----------|-------|
| **Path** | `backend/test/app.e2e-spec.ts` |
| **Framework** | Jest + `@nestjs/testing` + supertest |
| **What it tests** | `GET /` — full HTTP stack |
| **Tests** | 1 — expects HTTP 200 + response body |
| **Concerns** | Single smoke test. No database-backed E2E tests exist. |

---

## 4. Test Commands

| Command | Purpose |
|---------|---------|
| `pnpm run test` | Run unit/integration tests (Jest, `rootDir: src`) |
| `pnpm run test:watch` | Watch mode |
| `pnpm run test:cov` | With coverage output |
| `pnpm run test:debug` | Debug mode with `--runInBand` |
| `pnpm run test:e2e` | Run E2E tests (separate config) |

---

## 5. Coverage Analysis

| Metric | Value |
|--------|-------|
| **Total test files** | 3 |
| **Total test cases** | 17 |
| **Backend modules with zero tests** | 9 of 10 modules |
| **Frontend test coverage** | 0% (no test setup exists) |
| **Coverage reports** | Never generated (`/coverage` not in `.gitignore`) |

### Untested backend modules

| Module | Files | Risk |
|--------|-------|------|
| `auth` | controller, service, guard, strategies, DTOs | **HIGH** — authentication/authorization logic untested |
| `users` | controller, service, repository, DTOs | **HIGH** — CRUD operations, role management |
| `messages` | controller, service, repository, DTOs | **HIGH** — real-time comms untested |
| `sessions` | controller, service, repository, DTOs | **HIGH** — tutoring session lifecycle |
| `scheduling` | controller, service, repository, DTOs | **MEDIUM** — availability management |
| `notifications` | controller, service, repository, DTOs | **MEDIUM** — notification delivery |
| `feed` | controller, service, repository, DTOs | **MEDIUM** — feed aggregation |
| `dashboard` | controller, service, repository, DTOs | **LOW** — mostly aggregation queries |
| `matchmaking` | controller, service, repository, DTOs | **LOW** — wraps core engine |
| `matchmaking-test` | controller, DTOs | **LOW** — test-harness endpoint |

### Untested core classes

| Class | Risk |
|-------|------|
| `PreferenceScorer` | **MEDIUM** — personalization logic |
| `FairnessScorer` | **MEDIUM** — fairness constraints |
| `EligibilityFilter` | **LOW** — filtering logic (partially tested via GreedyAssignmentEngine) |
| `EvaluationHarness` | **MEDIUM** — evaluation framework |
| `VectorMath` | **LOW** — utility |
| `MaxHeap` | **LOW** — utility |

---

## 6. Gap Analysis

### Critical gaps

1. **Frontend:** Zero test infrastructure. No Jest, Vitest, Playwright, or Testing Library configured. No test scripts defined.
2. **Auth module:** The most security-sensitive module (`auth.controller`, `auth.service`, JWT strategies, guards) has zero tests.
3. **Database layer:** No tests for Drizzle queries, schema, or migrations.
4. **API E2E:** Only one root health-check E2E test. No integration tests that exercise a real or mocked database.

### Moderate gaps

5. **API controller tests:** All 9 domain modules lack controller tests (only the root `AppController` is tested).
6. **Service-layer unit tests:** Business logic in `users.service`, `sessions.service`, `scheduling.service`, `messages.service`, `notifications.service` is untested.
7. **Repository tests:** Data access layer is untested.
8. **Guard/strategy tests:** `AuthGuard`, `RolesGuard`, `OwnerOrAdminGuard`, JWT strategies, role decorators — all untested.
9. **Core algorithm edge cases:** `PreferenceScorer`, `FairnessScorer`, `EligibilityFilter`, `EvaluationHarness` lack dedicated tests.

### Minor gaps

10. **`app.controller.spec.ts`** only asserts string equality — no HTTP simulation or error-path testing.
11. **E2E test** does not use a test database; boots the full `AppModule` without DB mocking.
12. **Integration test** uses in-memory fixtures, not database-backed.
13. **Configuration test scripts** exist (`test`, `test:watch`, `test:cov`, `test:e2e`, `test:debug`) but `test:cov` has never been run (no `/coverage` directory exists).

---

## 7. Recommendations (Priority Order)

| Priority | Action |
|----------|--------|
| P0 | Add frontend test framework (Vitest or Jest + Testing Library) |
| P1 | Write unit tests for `AuthService` (signup, login, token refresh, role-based access) |
| P2 | Add database-backed integration tests for repository layer |
| P3 | Write controller unit tests for `users`, `sessions`, `scheduling` (highest-traffic modules) |
| P4 | Add service-layer tests for `messages`, `notifications`, `scheduling` |
| P5 | Add E2E tests for auth flow (signup → login → access protected route) |
| P6 | Add `PreferenceScorer` and `FairnessScorer` unit tests |
| P7 | Run `test:cov` to establish baseline coverage metrics |
| P8 | Add guard/strategy unit tests (`JwtAccessStrategy`, `RolesGuard`) |
| P9 | Create the missing `agent-docs/testing.md` file to define minimum test expectations |
| P10 | Add frontend E2E tests with Playwright for critical user flows |

---

*Report generated by opencode agents via repository exploration.*
