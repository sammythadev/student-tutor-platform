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
pnpm run tui
pnpm run db:generate
pnpm run db:migrate
pnpm run db:studio
```

## Eval TUI

`pnpm run tui` launches an interactive terminal UI for the evaluation suites in
`src/core/evaluation`. Pick a suite, watch per-scenario live progress, review the
highlighted results table, and browse previously saved CSVs. It runs in an
interactive terminal (TTY); piped output falls back to the plain `pnpm run eval*`
scripts.

### Launch

Run from the project root:

```bash
pnpm run tui
```

Jump straight into a screen with an argument:

```bash
pnpm run tui -- eval        # full harness (realistic + moderate + stress)
pnpm run tui -- topk        # top-k sweep
pnpm run tui -- moderate    # moderate-load band
pnpm run tui -- gap         # optimality gap (greedy vs min-cost max-flow)
pnpm run tui -- baselines   # baseline comparison (FCFS / deferred-acceptance vs greedy)
pnpm run tui -- all         # eval + topk + gap + baselines, each its own CSV
pnpm run tui -- browser     # browse saved results
pnpm run tui -- notes       # open the notes / scratchpad editor

The run options below can also be passed at launch — they seed the run view,
so the suite starts with them applied (the `R` / `C` / `P` keys still adjust
them live):

```bash
pnpm run tui -- eval --no-timing
pnpm run tui -- eval --save-runs 100   # every run saved as its own CSV row
pnpm run tui -- topk --runs 3
pnpm run tui -- moderate --students 40 --tutors 12
pnpm run tui -- --moderate --save-runs 20   # --moderate selects the moderate suite
```

`pnpm run tui -- --help` prints the full launch-flag usage. Flags that only
belong to the piped scripts (`--name`, `--out`, `--no-file`, `--table/--csv`,
`--sizes`, `--scenario/--strategy`) are reported as ignored at launch — the TUI
always auto-saves to `docs/benchmarks/`.

You never have to memorize the flags: picking a harness suite (eval, topk,
moderate, all) pauses at a **two-step setup prompt** first — runs per test, then
student/tutor counts — with each field prefilled from the current settings, so
Enter accepts and blank keeps the default (runs) or auto counts. `Esc` backs out
to the menu. Launching with run-option flags skips the prompts (the values were
already given).

### Controls

| Key                | Action                                         |
| ------------------ | ---------------------------------------------- |
| `↑`/`↓` or `j`/`k` | move the selection                             |
| `Enter`            | run the selected suite / open a CSV            |
| `r`                | rerun the suite / refresh the results list     |
| `s`                | save the results under a custom filename (run) |
| `t`                | toggle timing columns in the table + saved CSV (run) |
| `R`                | set runs per test (harness suites, default 5)  |
| `C`                | set a students/tutors override for every test (harness suites; blank resets to auto) |
| setup prompts      | picking a harness suite first asks runs → counts (Enter accepts, Esc backs out) |
| `P`                | toggle per-run mode — one row per run, winning algorithm in the winner column |
| `?`                | open/close the full help reference (menu, run, browser) |
| `Ctrl+O`           | open/close the help reference (notes; `?` stays typable) |
| `j`/`k` or `↑`/`↓` | scroll the help panel on short terminals (help) |
| `Ctrl+S`           | save the scratchpad to a file (notes)          |
| `b`                | open the results browser                       |
| `n`                | open the notes / scratchpad                    |
| `m` / `Esc`        | back (menu, results list, or scratchpad)       |
| `q`                | back / quit                                    |

### Screens

- **Menu** — pick a suite or "Browse saved results". `?` opens the full help
  reference — keys for every screen plus the CLI flags — as a modal,
  full-screen panel (run and browser views too; the notes editor uses `Ctrl+O`
  so `?` stays typable). The panel replaces the screen while open (state is
  preserved) and is capped to the terminal height, scrolling with `j`/`k` or
  `↑`/`↓` on short terminals; `?`, `Esc`, `q`, `m` or `Ctrl+O` closes it.
- **Run** — harness suites first show a two-step setup prompt (runs per test,
  then students/tutors counts — prefilled, Enter accepts); afterwards live
  progress (spinner, progress bar, current scenario, completed
  ticks), then a results table with the best value in each highlighted column
  tinted green (highest average score, lowest unassigned %, best fairness, ...).
  Press `t` to zero the wall-clock timing columns in both the displayed table
  and the saved CSV — quality metrics are deterministic, so this keeps the
  benchmark files stable across runs that differ only in machine noise.
- **Browser** — every CSV in `docs/benchmarks/` with row count, size, and
  modified date; `Enter` opens one as a table.
- **Notes** — a multi-line scratchpad (arrow keys, backspace, delete, wrapping
  cursor) for jotting observations next to your runs. `Ctrl+S` prompts for a
  filename, then saves the text to `docs/notes/<name>.txt`.

### Output

Each run auto-saves its CSV to `docs/benchmarks/`, so results land in the same
files the `pnpm run eval*` scripts write. On the results screen, `s` lets you
re-save the current table under a custom filename, and the notes scratchpad
saves free text to `docs/notes/`:

| Suite     | File                              |
| --------- | --------------------------------- |
| eval      | `evaluation-results.csv`          |
| topk      | `topk-sweep-results.csv`          |
| moderate  | `moderate-results.csv`            |
| gap       | `optimality-gap-results.csv`      |
| baselines | `baseline-comparison-results.csv` |
| notes     | `docs/notes/<name>.txt`           |

With per-run mode on (`P`), eval/topk/moderate instead save every run as its
own row — `evaluation-per-run-results.csv`, `topk-per-run-results.csv`,
`moderate-per-run-results.csv` — each row carrying its run index and the
winning algorithm, capped at 1000 rows per file.

### Run options

The same options drive the `pnpm run eval` CLI, the TUI launch line, and the
run view (`R`/`C`/`P` keys):

| Flag                     | Effect                                              |
| ------------------------ | --------------------------------------------------- |
| `--save-runs <n>`        | run each test n times and write EVERY run to the CSV as its own row (one file, max 1000 rows) — R set to n + per-run mode on |
| `--capture-runs <n>`     | **full capture mode** — every run becomes its own row containing ALL four strategies’ quality results plus that run’s started-at timestamp and duration, all in one file (`evaluation-capture-results.csv`), no row cap |
| `--runs <n>`             | repeats per test for the timing stats, default 5 (R) |
| `--per-run`              | legacy toggle for per-run rows using the `--runs` count (P) |
| `--students <n> --tutors <n>` | override counts for every test (both required) (C) |

The default output is the **averaged summary** — each test is one row of mean
results across its runs. Turn capture on when you want every single run
instead:

```bash
# 100 runs per test, every run its own row (all 4 strategies + per-run time):
pnpm run eval -- --capture-runs 100 --students 120 --tutors 30
```

That writes `evaluation-capture-results.csv` with 100 rows per test (no cap):
`startedAt` and `durationMs` tell you when each run happened and how long it
took, and the `<strategy>.averageScore` / `.unassignedPercent` /
`.jainFairnessIndex` columns hold that run's full results for every strategy.

## Notes

- The root route is a lightweight backend status check for now.
- Domain modules, database wiring, and API contracts will be added under `src/modules`, `src/database`, and related shared folders as the platform grows.
- Prettier is intentionally scoped to source, tests, docs, and this README so it does not rewrite tool config files.
