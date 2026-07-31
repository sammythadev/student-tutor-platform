import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Shared CLI layer for the evaluation scripts (evaluation-harness,
 * optimal-baseline, baseline-comparison): flag parsing, table/CSV rendering, and
 * "write the CSV + tell the user where it went", so all three behave the same
 * way from the terminal.
 *
 * Flags: --csv, --table, --name <file>, --out <path>, --no-file
 */

const DEFAULT_OUTPUT_DIR = join(__dirname, '..', '..', '..', 'docs', 'benchmarks');

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

export function formatTable(header: string[], rows: string[][]): string {
  const widths = header.map((cell, column) =>
    Math.max(cell.length, ...rows.map((row) => row[column].length)),
  );
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

/** Writes CSV content to the resolved output path, creating the directory if missing. */
export function writeCsvOutput(defaultName: string, csv: string): string {
  const outputPath = resolveOutputPath(defaultName);
  mkdirSync(resolve(outputPath, '..'), { recursive: true });
  writeFileSync(outputPath, csv.endsWith('\n') ? csv : `${csv}\n`, 'utf8');
  return outputPath;
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
  const csv = toCsv(header, rows);

  console.log(useTable ? formatTable(header, rows) : csv);

  if (process.argv.includes('--no-file')) {
    return;
  }

  const outputPath = writeCsvOutput(defaultName, csv);
  console.error(`\nSaved ${rows.length} row(s) to: ${outputPath}`);
}
