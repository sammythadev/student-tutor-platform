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

Pass `--no-timing` to zero the wall-clock timing columns in saved CSVs from
launch (quality metrics stay exact; timing is noisy across runs):

```bash
pnpm run tui -- eval --no-timing
```

### Controls

| Key                | Action                                         |
| ------------------ | ---------------------------------------------- |
| `↑`/`↓` or `j`/`k` | move the selection                             |
| `Enter`            | run the selected suite / open a CSV            |
| `r`                | rerun the suite / refresh the results list     |
| `s`                | save the results under a custom filename (run) |
| `t`                | toggle timing columns in the table + saved CSV (run) |
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
- **Run** — live progress (spinner, progress bar, current scenario, completed
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

## Notes

- The root route is a lightweight backend status check for now.
- Domain modules, database wiring, and API contracts will be added under `src/modules`, `src/database`, and related shared folders as the platform grows.
- Prettier is intentionally scoped to source, tests, docs, and this README so it does not rewrite tool config files.
