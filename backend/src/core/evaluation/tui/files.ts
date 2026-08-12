import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_OUTPUT_DIR, parseCsv } from '@core/evaluation/cli-output';

/** User notes written from the TUI scratchpad land in docs/notes/. */
export const NOTES_DIR = join(process.cwd(), 'docs', 'notes');

export interface CsvFileInfo {
  name: string;
  path: string;
  dataRows: number;
  bytes: number;
  modified: Date;
}

export function listSavedCsvs(): CsvFileInfo[] {
  try {
    return readdirSync(DEFAULT_OUTPUT_DIR)
      .filter((name) => name.toLowerCase().endsWith('.csv'))
      .map((name) => {
        const path = join(DEFAULT_OUTPUT_DIR, name);
        const stats = statSync(path);
        const content = readFileSync(path, 'utf8');
        return {
          name,
          path,
          dataRows: Math.max(0, parseCsv(content).length - 1),
          bytes: stats.size,
          modified: stats.mtime,
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());
  } catch {
    return [];
  }
}

/**
 * Writes a note file under docs/notes/, appending a `.txt` extension when
 * missing. Returns the absolute path that was written.
 */
export function saveNoteFile(name: string, content: string): string {
  const fileName = name.toLowerCase().endsWith('.txt') ? name : `${name}.txt`;
  const path = join(NOTES_DIR, fileName);
  mkdirSync(NOTES_DIR, { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

/** Default scratchpad filename, e.g. note-20260812-150304.txt. */
export function defaultNoteName(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `note-${stamp}.txt`;
}
