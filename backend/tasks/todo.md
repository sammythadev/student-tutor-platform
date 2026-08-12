# Task Log

Use this file to keep substantial tasks planned, tracked, and closed out.

## Entry Template

```md
## Task: <title>

- Date:
- Request:
- Plan:
  - [ ] Step 1
  - [ ] Step 2
  - [ ] Step 3
- Progress:
  - Note major checkpoints and re-plans
- Verification:
  - Tests:
  - Logs / errors:
- Result:
  - Summary of changes and outcome
```



## Current Task

- [completed] Add learning/teaching pace (fast/moderate/steady) preference for students and tutors — new `LearningPace` core enum + DB pgEnum, `student_profiles.learning_pace` / `tutor_profiles.teaching_pace` columns (generated migration), appended as a direct-match one-hot block in `preference.scorer` (rides the existing Style term, no new weight; Algorithm.md §2.1/§10), threaded through onboard/update/create DTOs + repository + matchmaking mapping, plus the onboarding UI.
- [completed] Scrutinize revised matchmaking/feedback plan and keep assignments as sessions for this phase.
- [completed] Strengthen core schedule, fairness, and tie-breaker algorithms.
- [completed] Add authenticated matchmaking endpoints for batch, candidates, manual selection, assignments, status updates, and feedback.
- [completed] Document rating semantics and endpoint contracts.
- [completed] Validate type safety and targeted core tests.

## Result

- Matchmaking is now database-backed and current-user aware; active assignments serve as sessions, and feedback updates tutor quality via EMA.

---

## Task: Honest eval fixtures + Gale-Shapley baseline

- Date: 2026-08-12
- Request: Audit whether the eval numbers were trustworthy; fix the fixture bias; decide whether adding more comparison algorithms to the eval was wise; re-run all suites.
- Plan:
  - [x] Audit fixtures: found students and tutors were generated from the same `index % N` patterns, aligning every student with a "twin" tutor (same subject, identical availability, matching budget/rate) → inflated absolute scores (~0.81) and compressed strategy differences
  - [x] Rewrite `fixtures.ts` with a seeded mulberry32 PRNG (seed = role+count only, so load-factor sweeps still compare identical populations); decouple student/tutor streams; add `learningPace`/`teachingPace` (the headline feature was absent from eval data); add specialization pools, regions, varied delivery/format/style
  - [x] Add `da-stable` strategy to `baseline-comparison.ts`: student-proposing deferred acceptance (Gale-Shapley with tutor capacities, symmetric static-score utilities, guard for capacity-0 tutors) — a distinct objective (stability) rather than a tuning variant
  - [x] Update docs/tests: README (root + backend), CLAUDE.md script comment, TUI suite label, strategy-list spec test (3 → 4)
- Verification:
  - typecheck (both tsconfig projects) ✓ · jest 96/96 ✓ · eslint clean on changed files ✓ · code review ✓
  - `pnpm run eval:baselines` / `eval:gap` / `eval` re-run with honest fixtures ✓
- Result:
  - Honest numbers: absolute scores dropped to ~0.52–0.71; greedy's margin over fcfs-best at stress-10to1 widened to ~0.71 vs 0.58; `da-stable` ≈ greedy (both optimize the same utilities); optimality ratio now informative (0.9998 at size 50 → 0.9434 at size 100, greedy serves 59/64 vs flow optimum). Core algorithm untouched.

---

## Task: Eval TUI help UI

- Date: 2026-08-12
- Request: Add a help UI to the eval TUI, in addition to the menu's CLI-flags panel.
- Plan:
  - [x] `tui/help-data.ts`: pure keybinding + CLI-flag reference data (ink-free so jest can test it)
  - [x] `tui/help.tsx`: `HelpContent` panel — two-column key sections (Global / Menu / Run / Browser / Notes) + full-width CLI flags
  - [x] Wire `?` into Menu / Run / Browser; `Ctrl+O` in Notes (keeps `?` typable in the editor)
  - [x] Fix pre-existing crash: a bare `{' '}` string child of `<Box>` in MenuScreen throws ink's reconciler — bare `pnpm run tui` would have crashed on the menu
  - [x] Render probe (`scripts/render-probe-help.tsx`) pushes `?` via fake stdin and captures the panel; probes now cover the menu itself (earlier probes used `initial=<suite>` and skipped it)
  - [x] Unit tests for the help data (3) · README (root + backend) + CLAUDE.md updated
- Verification:
  - typecheck (both tsconfigs) ✓ · jest 101/101 ✓ · eslint clean ✓ · code review ✓
- Result:
  - `?` (or `Ctrl+O` in notes) opens a full help reference from any screen; the CLI flags reference is folded into it; the menu no longer crashes on bare launch.

---

## Task: Fix help panel not closing (stale rows stuck on screen)

- Date: 2026-08-12
- Request: "? to close help isn't closing" — the help panel stayed on screen after pressing `?`.
- Root cause:
  - The state toggle always worked; the repaint broke. When the menu + help output exceeded the
    terminal height (~47 rows on short Windows terminals), ink's `onRender` switched to its
    `clearTerminal` branch (`outputHeight >= stdout.rows`), which bypasses log-update. log-update's
    internal row counter went stale, so closing help erased only ~6 rows and left the whole panel
    visually stuck on screen.
- Fix:
  - Help is now a modal, full-screen panel that REPLACES the host screen while open (host stays
    mounted, state preserved) and is capped to `rows - 2` with deterministic row slicing
    (NotePadScreen-style viewport, `j`/`k`/arrows/PageUp/PageDown scroll) instead of
    `overflowY: hidden` (which corrupted the render). Output never exceeds the terminal, so ink
    stays on the consistent render path and closing erases fully.
  - HelpContent now owns its close keys (`?`, Esc, q, m, Ctrl+O — pure `isHelpCloseChord` in
    help-data.ts) and host screens gate their `useInput` with `isActive: !showHelp`, so help is
    truly modal and `Esc`/`q` close it instead of quitting/backing out.
- Verification:
  - Render probe on a 24-row terminal: help opens with all sections intact, `j`-scroll reveals the
    CLI flags, close erases the full panel height (63 erase ops vs ~6 before) with zero stale rows;
    typecheck ✓ · jest 102/102 ✓ · eslint clean ✓
- Result:
  - `?` closes help reliably on any terminal size; bonus: `Esc`/`q` no longer quit the app while
    help is open.

---

## Task: HTTP Logging + Global Exception Filter + Env-Driven Log Config

- Date: 2026-06-19
- Request: Structured HTTP request logging with user IDs, env-driven log levels/file path/on-off switch, CommonExceptionFilter with no stack-trace leaks in responses, and AGENTS.md learning-loop update.

- Plan:
  - [x] Update environment.ts — LOG_LEVEL override, isLoggingEnabled(), getLogFilePath()
  - [x] Update configs/index.ts — export new helpers
  - [x] Update .env.example — seed LOG_ENABLED, LOG_FILE_PATH
  - [x] Create src/common/logger/app-logger.service.ts (winston-backed LoggerService)
  - [x] Create src/common/logger/index.ts
  - [x] Create src/common/interceptors/http-logging.interceptor.ts
  - [x] Create src/common/interceptors/index.ts
  - [x] Create src/common/filters/http-exception.filter.ts
  - [x] Create src/common/filters/index.ts
  - [x] Update common.module.ts — APP_INTERCEPTOR, APP_FILTER, AppLoggerService
  - [x] Update main.ts — use app.get(AppLoggerService) with bufferLogs:true
  - [x] Update common/index.ts — re-export new barrels
  - [x] Create agent-docs/exceptions.md
  - [x] Update agent-docs/lessons.md
  - [x] Update docs/environment.md

- Result:
  - AppLoggerService wraps winston; respects LOG_ENABLED, LOG_LEVEL (overrides NODE_ENV default), LOG_FILE_PATH (file transport optional, directory auto-created).
  - HttpLoggingInterceptor logs method/url/statusCode/userId/durationMs per request; anonymous fallback for unauthenticated routes.
  - CommonExceptionFilter maps HttpException, domain exceptions, and unknowns to clean JSON; stack traces logged server-side only, never in response bodies.
  - Both filter and interceptor registered via APP_FILTER / APP_INTERCEPTOR in CommonModule (DI-aware, no useGlobalFilters workaround needed).
  - Fixed SchedulingModule missing CommonModule import (UnknownDependenciesException).
  - Created agent-docs/exceptions.md (was referenced in AGENTS.md but missing).
  - 5 new lessons added to agent-docs/lessons.md.

---

## Task: Interactive eval TUI (Ink)

- Date: 2026-08-12
- Request: Build a TUI to run the eval suites (`eval`, `topk`, `moderate`, `gap`, `baselines`, `all`) with live progress, plus a saved-results browser.
- Plan:
  - [x] Add devDeps: ink@^4.4.1, react@^18.3.1, @types/react@^18 (ink v4+ is ESM-only → dedicated ESM runtime)
  - [x] Eval modules: export config builders / per-row helpers (additive only, CLI unchanged)
  - [x] cli-output.ts: ESM-safe DEFAULT_OUTPUT_DIR; add columnWidths + parseCsv
  - [x] tsconfig.tui.json (module esnext / bundler) + exclude TUI from main tsconfig; typecheck runs both
  - [x] Custom SWC ESM loader (scripts/tui-loader.mjs + register-tui.mjs) — ts-node/esm is broken on Node 24
  - [x] TUI module: suites.ts (registry), app.tsx (screen machine), views.tsx (Menu / Run / Browser), index.tsx (entry)
  - [x] pnpm run tui script (+ direct-suite arg: `pnpm run tui -- gap`)
  - [x] Unit tests (config builders, gap row, baseline cell, parseCsv, suite registry) — 10 passing
- Progress:
  - ink v5 → v4 downgrade after discovering ink v4+ is ESM-only (require(esm) fails under CJS ts-node)
  - Replaced ts-node/esm with a custom SWC ESM loader after ERR_REQUIRE_CYCLE_MODULE on Node 24
- Verification:
  - typecheck (both tsconfig projects) ✓ · jest 10/10 ✓ · eslint clean on all changed files ✓
  - `pnpm run eval:gap` CLI regression ✓ (unchanged output)
  - UI smoke-tested via render probe: menu, live progress (bar + scenario labels + ✓ ticks), completed tables with best-value highlights, CSV save paths, results browser all render correctly
- Result:
  - `pnpm run tui` (or `pnpm run tui -- gap|topk|moderate|eval|baselines|all|browser`) runs any suite in-process with per-scenario live progress, renders a highlighted results table, auto-saves CSVs to docs/benchmarks/, and browses past results.

---

## Task: Refactor Signup, Onboarding and Profile Updates

- Date: 2026-06-19
- Request: Refactor the auth signup to be extremely lightweight, move profile creation to a minimal onboard endpoint, and add update endpoints for preferences.
- Plan:
  - [x] Separate `AuthSignupDto` (email, password, firstName, lastName, role) from `CreateUserDto`.
  - [x] Create minimal `OnboardUserDto` (required fields only).
  - [x] Update `AuthController` to make onboard a single-user endpoint.
  - [x] Add `/users/me`, `/users/me/student-preferences`, and `/users/me/tutor-preferences` to `UsersController`.
  - [x] Update `UsersService` and `UsersRepository` to support partial profile updates.
  - [x] Add new lessons regarding DTO segmentation to `AGENTS.md` docs.
- Result:
  - Users can now sign up with bare minimum details and receive a session immediately.
  - Onboarding requires only the `NOT NULL` database fields depending on the user's role.
  - All optional profile properties (languages, budget, delivery modes, etc) are strictly driven by `/users/me/*` preference endpoints, keeping initial barriers low and cleanly matching UX flows.
