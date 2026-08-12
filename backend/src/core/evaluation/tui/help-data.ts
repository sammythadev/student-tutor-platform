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
    { keys: 'm', action: 'back to menu' },
    { keys: 'q', action: 'back · quit from menu' },
  ],
};

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
    { keys: 'r', action: 'rerun the suite' },
    { keys: 's', action: 'save under a new filename' },
    { keys: 't', action: 'timing columns on / off' },
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

/** CLI flags mirrored by the eval scripts (`pnpm run eval*`). */
export const CLI_FLAG_ROWS: HelpRow[] = [
  {
    keys: '--no-timing',
    action: 'zero wall-clock timing columns in saved CSVs (same as t in the run view)',
  },
  { keys: '--name <file>', action: 'custom filename for the saved CSV (docs/benchmarks/)' },
  { keys: '--out <path>', action: 'explicit output path, bypassing docs/benchmarks/' },
  { keys: '--no-file', action: 'print only — do not write the CSV' },
  { keys: '--table / --csv', action: 'force aligned-table or raw-CSV output' },
  { keys: '--moderate / --topk-sweep', action: 'narrow the eval harness (CLI only)' },
  { keys: '--sizes <10,25,50,100>', action: 'optimality-gap sweep sizes (CLI only)' },
  { keys: '--scenario / --strategy', action: 'narrow baseline runs (CLI only)' },
];
