/**
 * Static reference data for the eval TUI help screen.
 *
 * Kept in a separate, ink-free module so the keybindings and CLI flags can be
 * unit-tested under jest (the renderer in help.tsx imports ink, which is
 * ESM-only and cannot be required from the CJS test runner).
 */

export interface HelpRow {
  /** Key(s) that trigger the action, e.g. '↑/↓ or j/k' or '--no-timing'. */
  keys: string;
  /** What the key or flag does. */
  action: string;
}

export interface HelpSection {
  title: string;
  rows: HelpRow[];
}

export const GLOBAL_KEYS: HelpSection = {
  title: 'Global',
  rows: [
    { keys: '?', action: 'open / close help' },
    { keys: 'Esc', action: 'close help · back one level' },
    { keys: 'q / m', action: 'close help first · then back / quit' },
  ],
};

/**
 * Row formats the `s` save flow can write (mirrors the P row-mode cycle).
 * Kept ink-free so the picker logic is unit-testable under jest.
 */
export type SaveRowMode = 'summary' | 'per-run' | 'capture';

export interface SaveModeOption {
  id: SaveRowMode;
  label: string;
  hint: string;
}

export const SAVE_MODES: SaveModeOption[] = [
  { id: 'summary', label: 'Summary', hint: '1 averaged row per test' },
  { id: 'per-run', label: 'Per-run', hint: 'one row per run — winner column' },
  {
    id: 'capture',
    label: 'Capture',
    hint: 'every run — all strategies + per-run time, no cap',
  },
];

/** The save mode matching the current run options (what the table already shows). */
export function currentSaveMode(perRun: boolean, capture: boolean): SaveRowMode {
  if (capture) {
    return 'capture';
  }
  if (perRun) {
    return 'per-run';
  }
  return 'summary';
}

/**
 * Keys that dismiss the help panel while it is open. The panel is modal: while
 * it renders, the hosting screen's own `useInput` is gated off (via
 * `isActive: !showHelp`), so these are the only live keys.
 */
export function isHelpCloseChord(
  input: string,
  key: { escape?: boolean; ctrl?: boolean },
): boolean {
  return (
    input === '?' ||
    input === 'q' ||
    input === 'm' ||
    key.escape === true ||
    (key.ctrl === true && input === 'o')
  );
}

export const MENU_KEYS: HelpSection = {
  title: 'Menu',
  rows: [
    { keys: '↑/↓ or j/k', action: 'move the selection' },
    { keys: 'Enter / Space', action: 'run the selected suite' },
    { keys: 'b', action: 'browse saved results' },
    { keys: 'n', action: 'notes / scratchpad' },
  ],
};

export const RUN_KEYS: HelpSection = {
  title: 'Run',
  rows: [
    {
      keys: 'setup',
      action:
        'picking a harness suite first asks runs per test, then students/tutors — Enter accepts, blank keeps current / auto counts',
    },
    { keys: 'r', action: 'rerun the suite' },
    {
      keys: 's',
      action:
        'save under a new filename — first pick which rows: summary, per-run (winner), or capture (all strategies); picking a different mode re-runs the suite for those rows',
    },
    { keys: 't', action: 'timing columns on / off' },
    { keys: 'R', action: 'set runs per test (default 5) — harness suites' },
    {
      keys: 'C',
      action:
        'set a students/tutors override for every test — blank resets to auto — harness suites',
    },
    {
      keys: 'P',
      action:
        'cycle row mode: summary → per-run (winner) → capture (every run, all strategies, no cap) — the saved CSV always contains every row',
    },
    {
      keys: 'W',
      action:
        'toggle the winner summary — which algorithm wins across these runs (strict wins, ties, means; full on capture rows)',
    },
    { keys: 'm / Esc', action: 'back to menu' },
    { keys: 'q', action: 'quit' },
  ],
};

export const BROWSER_KEYS: HelpSection = {
  title: 'Results browser',
  rows: [
    { keys: '↑/↓ or j/k', action: 'select a saved CSV' },
    { keys: 'Enter', action: 'open the CSV as a table' },
    { keys: 'r', action: 'refresh the file list' },
    { keys: 'm / Esc', action: 'back to menu' },
  ],
};

export const NOTES_KEYS: HelpSection = {
  title: 'Notes',
  rows: [
    { keys: 'type', action: 'insert text' },
    { keys: 'Ctrl+S', action: 'save the note to a file' },
    { keys: 'Ctrl+O', action: 'open / close help' },
    { keys: 'Esc', action: 'back to menu' },
  ],
};

/** All interactive-screen keybindings, in display order. */
export const HELP_SECTIONS: HelpSection[] = [
  GLOBAL_KEYS,
  MENU_KEYS,
  RUN_KEYS,
  BROWSER_KEYS,
  NOTES_KEYS,
];

/**
 * CLI flags mirrored by the eval scripts (`pnpm run eval*`). The run-option
 * flags are also accepted at TUI launch (`pnpm run tui -- <suite> --save-runs
 * 100`), where they seed the run view — same effect as the R / C / P keys.
 */
export const CLI_FLAG_ROWS: HelpRow[] = [
  {
    keys: 'launch',
    action:
      'pnpm run tui -- <suite> [--save-runs <n> | --runs <n> | --per-run | --students <n> --tutors <n> | --no-timing]',
  },
  {
    keys: '--no-timing',
    action: 'zero wall-clock timing columns in saved CSVs (same as t in the run view)',
  },
  { keys: '--name <file>', action: 'custom filename for the saved CSV (docs/benchmarks/)' },
  { keys: '--out <path>', action: 'explicit output path, bypassing docs/benchmarks/' },
  { keys: '--no-file', action: 'print only — do not write the CSV' },
  { keys: '--table / --csv', action: 'force aligned-table or raw-CSV output' },
  {
    keys: '--moderate / --topk-sweep',
    action: 'narrow the eval harness — at TUI launch these select the moderate / topk suite',
  },
  {
    keys: '--students <n> --tutors <n>',
    action:
      'override student/tutor counts for every harness test — both required (same as C in the run view)',
  },
  {
    keys: '--save-runs <n>',
    action:
      'run each test n times and write EVERY run to the CSV as its own row (one file, max 1000 rows) — same as R set + per-run mode on',
  },
  {
    keys: '--capture-runs <n>',
    action:
      'full capture mode — every run is one row with ALL four strategies’ results plus that run’s started-at time and duration (one file, NO row cap) — same as P cycled to capture',
  },
  {
    keys: '--runs <n>',
    action:
      'repeats per test for the timing stats, default 5 (shown in the results table; same as R in the run view)',
  },
  {
    keys: '--per-run',
    action: 'legacy toggle for --save-runs rows using the --runs count (same as P in the run view)',
  },
  { keys: '--sizes <10,25,50,100>', action: 'optimality-gap sweep sizes (CLI only)' },
  { keys: '--scenario / --strategy', action: 'narrow baseline runs (CLI only)' },
];
