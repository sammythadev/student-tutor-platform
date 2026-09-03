import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Shared CLI layer for the evaluation scripts (evaluation-harness,
 * optimal-baseline, baseline-comparison): flag parsing, table/CSV rendering, and
 * "write the CSV + tell the user where it went", so all three behave the same
 * way from the terminal.
 *
 * Flags: --csv, --table, --name <file>, --out <path>, --no-file.
 * Harness-specific flags (--students/--tutors/--runs/--save-runs/--per-run/
 * --capture-runs) are parsed in evaluation-harness.ts; the flags here are
 * shared by all three eval scripts.
 */

/**
 * Resolves docs/benchmarks: from the source tree in CJS (ts-node CLI scripts),
 * and from the repo root (working directory) when this module is loaded as ESM
 * by the TUI, where `__dirname` does not exist.
 */
function defaultBenchmarksDir(): string {
  if (typeof __dirname === 'string') {
    return join(__dirname, '..', '..', '..', 'docs', 'benchmarks');
  }
  return join(process.cwd(), 'docs', 'benchmarks');
}

export const DEFAULT_OUTPUT_DIR = defaultBenchmarksDir();

/**
 * Value of `--flag <value>` on argv, or undefined if the flag is absent.
 * The LAST occurrence wins: pnpm appends user-supplied args after the ones baked
 * into the package.json script, so `pnpm run eval:topk --name mine.csv` must
 * override the script's own `--name`.
 */
export function getFlagValue(flag: string): string | undefined {
  const index = process.argv.lastIndexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return undefined;
  }
  return process.argv[index + 1];
}

/**
 * Resolves the output path for a CSV result file:
 *   --out <path>   full/relative path, used as-is (resolved against cwd)
 *   --name <name>  custom filename, still placed in docs/benchmarks/
 *   (neither)      defaultName, placed in docs/benchmarks/
 * A `.csv` extension is appended to --name when omitted.
 */
export function resolveOutputPath(defaultName: string): string {
  const explicitPath = getFlagValue('--out');
  if (explicitPath) {
    return resolve(explicitPath);
  }

  const customName = getFlagValue('--name');
  if (!customName) {
    return join(DEFAULT_OUTPUT_DIR, defaultName);
  }

  const fileName = customName.toLowerCase().endsWith('.csv') ? customName : `${customName}.csv`;
  return join(DEFAULT_OUTPUT_DIR, fileName);
}

export function toCsv(header: string[], rows: string[][]): string {
  return [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * True when the rows are per-run records (a `run` column that actually holds
 * run numbers). Such CSVs are saved with a blank line between every run by
 * default so run 1..N reads clearly when opened in an editor. Aggregate rows
 * (empty run cell) and non-harness CSVs are left dense.
 */
export function shouldSpaceRows(header: string[], rows: string[][]): boolean {
  const runIndex = header.indexOf('run');
  if (runIndex === -1) {
    return false;
  }
  return rows.some((row) => (row[runIndex] ?? '') !== '');
}

/**
 * Like `toCsv`, but inserts a blank line between EVERY row. Per-run CSVs use
 * this automatically so each run of a test is visually boxed off — run 1,
 * blank, run 2, blank, … The header stays tight against the first row.
 * `parseCsv` already skips blank lines, so round-trip readers are unaffected.
 */
export function toSpacedCsv(header: string[], rows: string[][]): string {
  const headerLine = header.join(',');
  if (rows.length === 0) {
    return headerLine;
  }
  return `${headerLine}\n${rows.map((row) => row.join(',')).join('\n\n')}`;
}

/** Per-column display widths, shared by the CLI table and the TUI table view. */
export function columnWidths(header: string[], rows: string[][]): number[] {
  return header.map((cell, column) =>
    Math.max(cell.length, ...rows.map((row) => row[column]?.length ?? 0)),
  );
}

export function formatTable(header: string[], rows: string[][]): string {
  const widths = columnWidths(header, rows);
  const pad = (cell: string, column: number): string => cell.padStart(widths[column]);
  const line = (left: string, mid: string, right: string): string =>
    left + widths.map((width) => '─'.repeat(width + 2)).join(mid) + right;
  const renderRow = (cells: string[]): string => '│ ' + cells.map(pad).join(' │ ') + ' │';

  return [
    line('┌', '┬', '┐'),
    renderRow(header),
    line('├', '┼', '┤'),
    ...rows.map(renderRow),
    line('└', '┴', '┘'),
  ].join('\n');
}

/**
 * Minimal CSV parser supporting double-quoted fields and CRLF line endings.
 * Inverse of `toCsv`; used by the TUI results browser to re-render saved CSVs.
 */
export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (inQuotes) {
      if (char === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // ignore CR; handle CRLF line endings
    } else if (char === '\n') {
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') {
        rows.push(row);
      }
      row = [];
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Writes CSV content to the resolved output path, creating the directory if missing. */
export function writeCsvOutput(defaultName: string, csv: string): string {
  const outputPath = resolveOutputPath(defaultName);
  mkdirSync(resolve(outputPath, '..'), { recursive: true });
  writeFileSync(outputPath, csv.endsWith('\n') ? csv : `${csv}\n`, 'utf8');
  return outputPath;
}

/**
 * Column names that report wall-clock timing (noisy across runs) rather than
 * deterministic quality metrics. `--no-timing` / the TUI timing toggle zeroes
 * these so benchmark CSVs only change when the actual results change.
 */
export const TIMING_COLUMNS: ReadonlySet<string> = new Set([
  'elapsedMinMs',
  'elapsedMeanMs',
  'elapsedMaxMs',
  'greedyMs',
  'optimalMs',
]);

/**
 * Returns the rows with every timing column zeroed out. Non-timing rows are
 * returned unchanged (same array identity) so callers can skip rewriting.
 */
export function stripTimingColumns(header: string[], rows: string[][]): string[][] {
  const timingIndexes = header
    .map((column, index) => (TIMING_COLUMNS.has(column) ? index : -1))
    .filter((index) => index !== -1);

  if (timingIndexes.length === 0) {
    return rows;
  }

  return rows.map((row) => row.map((cell, index) => (timingIndexes.includes(index) ? '0' : cell)));
}

/**
 * Runs a script's entry point, reporting a bad-flag failure as a one-line message
 * instead of a stack trace (these are user input errors, not bugs).
 */
export function runCli(entry: () => void): void {
  try {
    entry();
  } catch (error) {
    console.error(error instanceof Error ? `\n${error.message}` : `\n${String(error)}`);
    process.exitCode = 1;
  }
}

export interface EmitOptions {
  /** Filename used when neither --name nor --out is given. */
  defaultName: string;
  header: string[];
  rows: string[][];
}

/**
 * Prints results and saves the CSV artifact.
 *
 * Rendering: aligned table on an interactive terminal, CSV when piped or
 * redirected, so `> file.csv` still yields clean machine-readable output.
 * `--table` / `--csv` force either way.
 *
 * The CSV file is written regardless of render mode (unless --no-file), and the
 * saved path is reported on stderr so it stays out of redirected stdout.
 */
export function emitResults({ defaultName, header, rows }: EmitOptions): void {
  const forceCsv = process.argv.includes('--csv');
  const forceTable = process.argv.includes('--table');
  const useTable = forceTable || (process.stdout.isTTY === true && !forceCsv);
  const noTiming = process.argv.includes('--no-timing');
  const outputRows = noTiming ? stripTimingColumns(header, rows) : rows;
  // Any CSV that carries actual run rows is spaced by default — no flag needed.
  const csv = shouldSpaceRows(header, outputRows)
    ? toSpacedCsv(header, outputRows)
    : toCsv(header, outputRows);

  console.log(useTable ? formatTable(header, outputRows) : csv);

  if (process.argv.includes('--no-file')) {
    return;
  }

  const outputPath = writeCsvOutput(defaultName, csv);
  console.error(`\nSaved ${rows.length} row(s) to: ${outputPath}`);
}
