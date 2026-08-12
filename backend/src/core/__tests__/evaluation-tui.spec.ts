import { columnWidths, parseCsv, toCsv } from '../evaluation/cli-output';
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
  it('runs all three strategies per scenario', () => {
    const rows = runBaselineCell(SCENARIOS[0]);
    expect(rows.map((row) => row.strategy)).toEqual(['fcfs-filter', 'fcfs-best', 'greedy-engine']);
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
});

describe('tui suite registry', () => {
  it('registers every suite and resolves by id', () => {
    for (const suite of SUITES) {
      expect(getSuite(suite.id)).toBe(suite);
    }
  });
});
