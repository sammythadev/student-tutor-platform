# Findings

Durable discoveries, decisions, and repo facts worth preserving.

## Eval TUI architecture (2026-08)

- **ink v4+ is ESM-only** (`"type": "module"`, exports-only, no `main`). It cannot be
  `require()`d from the CJS ts-node scripts, and its types don't resolve under the
  repo's `moduleResolution: "node"` (node10).
- **ts-node 10.9.2's ESM loader (`ts-node/esm`) is broken on Node 24**: an ESM-compiled
  `.tsx` entry that imports *any* node_modules package (even CJS react) throws
  `ERR_REQUIRE_CYCLE_MODULE`. ts-node has no newer release, so this is unfixable by
  upgrading.
- The TUI therefore runs through a **custom SWC ESM loader**: `scripts/tui-loader.mjs`
  (resolve + load hooks) registered by `scripts/register-tui.mjs` via
  `module.register()` (the modern replacement for `--loader`). `@swc/core` was already
  a devDependency. The `tui` script is:
  `node --import ./scripts/register-tui.mjs src/core/evaluation/tui/index.tsx`
- **`tsconfig.tui.json`** (`module: esnext`, `moduleResolution: bundler`) typechecks
  the TUI against ink's `exports` types; the main `tsconfig.json` excludes
  `src/core/evaluation/tui`. `pnpm run typecheck` runs both projects.
- ESLint uses an explicit `project: ['./tsconfig.json', './tsconfig.tui.json']` list —
  `projectService: true` does not auto-discover `tsconfig.tui.json`.
- The eval modules now export config builders / per-row helpers
  (`buildEvaluationConfigs`, `buildTopKSweepConfigs`, `computeOptimalityGapRow`,
  `runBaselineCell`, `HEADER`, `toRow`) so the TUI streams per-scenario progress
  instead of waiting for whole sweeps. These are additive exports; CLI behavior
  unchanged.
- `cli-output.ts` is CJS/ESM dual-safe: `DEFAULT_OUTPUT_DIR` derives from `__dirname`
  when present, else `process.cwd()` (both point at `docs/benchmarks` for pnpm runs).
  The three eval CLI entries guard `require.main === module` with
  `typeof require !== 'undefined'` so importing them as ESM doesn't crash.
- `require.main === module` **never fires under ESM**. The TUI entry detects direct
  invocation with `import.meta.url === pathToFileURL(process.argv[1]).href`.

## Suite registry

- `src/core/evaluation/tui/suites.ts` maps suite id → `{ label, description,
  highlights, run(emit) }` where `run` returns `SuiteResult[]` (one entry per CSV
  file to write). `run all` composes the sub-suites; each result saves its own CSV.
- Best-in-class cell highlighting is declared per suite (e.g. `averageScore` max,
  `unassignedPercent` min).

## ink v4 gotchas

- `Text` has **no `width` / `marginTop` / `padding` props** — use `Box` for layout
  (Box supports width/margin/padding), `Text` only for text styling. ink v5 added
  `width` on Text; v4 has it only on Box.
- `useInput` requires a raw-mode TTY stdin; in pipes it errors. The entry prints a
  friendly message when `process.stdin.isTTY` is false.
- `render()` to a non-TTY stdout still emits a static frame (usable for capture
  probes); live cursor control simply doesn't apply.
