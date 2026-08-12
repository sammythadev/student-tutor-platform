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
pnpm run tui -- baselines   # baseline comparison (FCFS vs greedy engine)
pnpm run tui -- all         # eval + topk + gap + baselines, each its own CSV
pnpm run tui -- browser     # browse saved results
```

### Controls

| Key                | Action                                     |
| ------------------ | ------------------------------------------ |
| `↑`/`↓` or `j`/`k` | move the selection                         |
| `Enter`            | run the selected suite / open a CSV        |
| `r`                | rerun the suite / refresh the results list |
| `b`                | open the results browser                   |
| `m` / `Esc`        | back (menu or results list)                |
| `q`                | back / quit                                |

### Screens

- **Menu** — pick a suite or "Browse saved results".
- **Run** — live progress (spinner, progress bar, current scenario, completed
  ticks), then a results table with the best value in each highlighted column
  tinted green (highest average score, lowest unassigned %, best fairness, ...).
- **Browser** — every CSV in `docs/benchmarks/` with row count, size, and
  modified date; `Enter` opens one as a table.

### Output

Each run auto-saves its CSV to `docs/benchmarks/`, so results land in the same
files the `pnpm run eval*` scripts write:

| Suite     | File                              |
| --------- | --------------------------------- |
| eval      | `evaluation-results.csv`          |
| topk      | `topk-sweep-results.csv`          |
| moderate  | `moderate-results.csv`            |
| gap       | `optimality-gap-results.csv`      |
| baselines | `baseline-comparison-results.csv` |

## Notes

- The root route is a lightweight backend status check for now.
- Domain modules, database wiring, and API contracts will be added under `src/modules`, `src/database`, and related shared folders as the platform grows.
- Prettier is intentionally scoped to source, tests, docs, and this README so it does not rewrite tool config files.
