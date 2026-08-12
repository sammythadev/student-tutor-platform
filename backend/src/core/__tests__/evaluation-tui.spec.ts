import { existsSync, readFileSync, rmSync } from 'fs';
import {
  columnWidths,
  parseCsv,
  stripTimingColumns,
  toCsv,
} from '../evaluation/cli-output';
import { defaultNoteName, NOTES_DIR, saveNoteFile } from '../evaluation/tui/files';
import { cursorPosition, indexFromPosition, wrapText } from '../evaluation/tui/text-utils';
import {
  buildEvaluationConfigs,
  buildModerateConfigs,
  buildRealisticConfigs,
  buildTopKSweepConfigs,
  evaluate,
  HEADER,
  runModerateEvaluation,
  runRealisticEvaluation,
  toRow,
} from '../evaluation/evaluation-harness';
import { computeOptimalityGapRow, DEFAULT_GAP_SIZES } from '../evaluation/optimal-baseline';
import { runBaselineCell, SCENARIOS } from '../evaluation/baseline-comparison';
import { getSuite, SUITES } from '../evaluation/tui/suites';

describe('evaluation harness config builders', () => {
  it('export the expected scenario counts', () => {
    expect(buildRealisticConfigs()).toHaveLength(2);
    expect(buildModerateConfigs()).toHaveLength(8);
    expect(buildEvaluationConfigs()).toHaveLength(8);
    expect(buildTopKSweepConfigs()).toHaveLength(8);
  });

  it('evaluates a realistic config into a header-aligned row', () => {
    const config = buildRealisticConfigs()[0];
    const row = toRow(evaluate(config));
    expect(row).toHaveLength(HEADER.length);
    expect(row[1]).toBe('50'); // students
  });

  it('suite runners emit header-aligned rows', () => {
    for (const row of [...runRealisticEvaluation(), ...runModerateEvaluation()]) {
      expect(toRow(row)).toHaveLength(HEADER.length);
    }
  });
});

describe('optimality gap helpers', () => {
  it('computes a well-formed per-size row', () => {
    const row = computeOptimalityGapRow(50);
    expect(row.size).toBe(50);
    expect(row.scoreRatio).toBeGreaterThan(0);
    expect(row.scoreRatio).toBeLessThanOrEqual(1.000001);
  });

  it('exposes the default sweep sizes', () => {
    expect(DEFAULT_GAP_SIZES).toEqual([10, 25, 50, 100]);
  });
});

describe('baseline cell runner', () => {
  it('runs all four strategies per scenario', () => {
    const rows = runBaselineCell(SCENARIOS[0]);
    expect(rows.map((row) => row.strategy)).toEqual([
      'fcfs-filter',
      'fcfs-best',
      'da-stable',
      'greedy-engine',
    ]);
  });
});

describe('shared CSV/table helpers', () => {
  it('parseCsv round-trips toCsv output', () => {
    const header = ['a', 'b'];
    const rows = [
      ['1', 'two'],
      ['3', 'four'],
    ];
    expect(parseCsv(toCsv(header, rows))).toEqual([header, ...rows]);
  });

  it('parseCsv handles quoted fields and CRLF line endings', () => {
    expect(parseCsv('a,b\r\n"x,y",2\r\n')).toEqual([
      ['a', 'b'],
      ['x,y', '2'],
    ]);
  });

  it('parseCsv skips blank lines', () => {
    expect(parseCsv('a,b\n\nc,d\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('columnWidths matches the widest cell per column', () => {
    // Header 'scenario' (8) beats the longest cell 'abcdef' (6).
    expect(
      columnWidths(
        ['scenario', 'x'],
        [
          ['abcdef', '1'],
          ['b', '12345'],
        ],
      ),
    ).toEqual([8, 5]);
  });

  it('stripTimingColumns zeroes only known timing columns', () => {
    const header = ['scenario', 'averageScore', 'elapsedMeanMs', 'greedyMs', 'optimalMs'];
    const rows = [
      ['moderate-2to1', '0.620784', '12.4', '3', '4'],
      ['stress-10to1', '0.712391', '72.0', '55', '90'],
    ];

    expect(stripTimingColumns(header, rows)).toEqual([
      ['moderate-2to1', '0.620784', '0', '0', '0'],
      ['stress-10to1', '0.712391', '0', '0', '0'],
    ]);
  });

  it('stripTimingColumns leaves rows without timing columns untouched (same reference)', () => {
    const header = ['scenario', 'averageScore'];
    const rows = [['stress-10to1', '0.712391']];

    expect(stripTimingColumns(header, rows)).toBe(rows);
  });
});

describe('tui suite registry', () => {
  it('registers every suite and resolves by id', () => {
    for (const suite of SUITES) {
      expect(getSuite(suite.id)).toBe(suite);
    }
  });
});

describe('note pad text utils', () => {
  it('wraps long lines at the given width', () => {
    expect(wrapText('abcdefgh', 4)).toEqual(['abcd', 'efgh']);
    expect(wrapText('a\nb', 10)).toEqual(['a', 'b']);
    expect(wrapText('', 10)).toEqual(['']);
  });

  it('maps a buffer index to a visual position', () => {
    expect(cursorPosition('abcdefgh', 0, 4)).toEqual({ row: 0, col: 0 });
    expect(cursorPosition('abcdefgh', 4, 4)).toEqual({ row: 0, col: 4 });
    expect(cursorPosition('abcdefgh', 5, 4)).toEqual({ row: 1, col: 1 });
    expect(cursorPosition('hello\nworld', 6, 5)).toEqual({ row: 1, col: 0 });
  });

  it('maps a visual position back to a buffer index', () => {
    expect(indexFromPosition('abcdefgh', 1, 0, 4)).toBe(4);
    expect(indexFromPosition('abcdefgh', 0, 2, 4)).toBe(2);
    expect(indexFromPosition('abcdefgh', 1, 9, 4)).toBe(8); // clamped to line end
    expect(indexFromPosition('hello\nworld', 0, 0, 5)).toBe(0);
  });

  it('up/down movement keeps the column', () => {
    const text = 'hello\nworld';
    const width = 5;
    const pos = cursorPosition(text, 6, width); // cursor at start of 'world'
    expect(pos).toEqual({ row: 1, col: 0 });
    expect(indexFromPosition(text, pos.row - 1, pos.col, width)).toBe(0);
  });
});

describe('note files', () => {
  it('builds a timestamped default filename', () => {
    expect(defaultNoteName(new Date(2026, 7, 12, 15, 4, 3))).toBe('note-20260812-150403.txt');
  });

  it('writes a note file and returns its path', () => {
    const name = `test-${Date.now()}`;
    const path = saveNoteFile(name, 'hello notes');
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe('hello notes');
    expect(path.startsWith(NOTES_DIR)).toBe(true);
    expect(path.endsWith('.txt')).toBe(true);
    rmSync(path); // keep the repo clean
  });
});
