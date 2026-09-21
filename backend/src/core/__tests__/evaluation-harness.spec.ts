import {
  DEFAULT_RUNS,
  evaluate,
  evaluatePerRunRow,
  emitPerRun,
  CAPTURE_HEADER,
  CAPTURE_STRATEGIES,
  emitCaptureRuns,
  HEADER,
  MAX_SAVED_RUNS,
  parseCountOverride,
  parseRuns,
  parseSaveRuns,
  parseCaptureRuns,
  toRow,
  winnerSummaryFromRows,
  applyCountOverride,
  buildModerateConfigs,
  buildRealisticConfigs,
} from '../evaluation/evaluation-harness';

const WINNERS = ['fcfs-filter', 'fcfs-best', 'da-stable', 'greedy-engine'];

/** Installs a fake process.argv for flag-parsing tests and restores it after. */
const withArgv = (args: string[], body: () => void): void => {
  const original = process.argv;
  process.argv = ['node', 'evaluation-harness.ts', ...args];
  try {
    body();
  } finally {
    process.argv = original;
  }
};

describe('evaluation harness --runs', () => {
  it('defaults to DEFAULT_RUNS and records it in the row', () => {
    const config = buildRealisticConfigs()[0];
    const row = evaluate(config);
    expect(row.runs).toBe(DEFAULT_RUNS);
    expect(row.run).toBeNull();
    expect(row.winner).toBeNull();
  });

  it('respects a custom run count', () => {
    const config = buildRealisticConfigs()[0];
    expect(evaluate(config, 3).runs).toBe(3);
  });

  it('parses --runs from argv and falls back to the default', () => {
    withArgv([], () => expect(parseRuns()).toBe(DEFAULT_RUNS));
    withArgv(['--runs', '7'], () => expect(parseRuns()).toBe(7));
  });

  it('rejects a non-positive or non-integer --runs value', () => {
    withArgv(['--runs', '0'], () => expect(() => parseRuns()).toThrow(/positive integer/));
    withArgv(['--runs', 'abc'], () => expect(() => parseRuns()).toThrow(/positive integer/));
    withArgv(['--runs', '2.5'], () => expect(() => parseRuns()).toThrow(/positive integer/));
  });
});

describe('evaluation harness --save-runs', () => {
  it('returns undefined when the flag is absent', () => {
    withArgv([], () => expect(parseSaveRuns()).toBeUndefined());
  });

  it('parses the run count from --save-runs', () => {
    withArgv(['--save-runs', '100'], () => expect(parseSaveRuns()).toBe(100));
  });

  it('rejects a non-positive or non-integer --save-runs value', () => {
    withArgv(['--save-runs', '0'], () => expect(() => parseSaveRuns()).toThrow(/positive integer/));
    withArgv(['--save-runs', 'abc'], () =>
      expect(() => parseSaveRuns()).toThrow(/positive integer/),
    );
    withArgv(['--save-runs', '1.5'], () =>
      expect(() => parseSaveRuns()).toThrow(/positive integer/),
    );
  });
});

describe('evaluation harness --students/--tutors override', () => {
  it('returns undefined when neither flag is present', () => {
    withArgv([], () => expect(parseCountOverride()).toBeUndefined());
  });

  it('parses both counts when both flags are present', () => {
    withArgv(['--students', '120', '--tutors', '30'], () =>
      expect(parseCountOverride()).toEqual({ students: 120, tutors: 30 }),
    );
  });

  it('requires both flags together', () => {
    withArgv(['--students', '120'], () => expect(() => parseCountOverride()).toThrow(/together/));
    withArgv(['--tutors', '30'], () => expect(() => parseCountOverride()).toThrow(/together/));
  });

  it('rejects invalid counts', () => {
    withArgv(['--students', '0', '--tutors', '30'], () =>
      expect(() => parseCountOverride()).toThrow(/positive integer/),
    );
  });
});

describe('evaluation harness --per-run rows', () => {
  it('emits header-aligned aggregate rows with blank run/winner cells', () => {
    const row = toRow(evaluate(buildRealisticConfigs()[0]));
    expect(row).toHaveLength(HEADER.length);
    expect(row[HEADER.indexOf('run')]).toBe('');
    expect(row[HEADER.indexOf('winner')]).toBe('');
  });

  it('reports a run index and one of the four strategies as winner', () => {
    const config = buildRealisticConfigs()[0];
    const row = evaluatePerRunRow(config, 2, 5);
    expect(row.run).toBe(2);
    expect(row.runs).toBe(5);
    expect(WINNERS).toContain(row.winner);
    expect(row.averageScore).toBeGreaterThan(0);
    expect(row.unassignedPercent).toBeGreaterThanOrEqual(0);
    expect(row.jainFairnessIndex).toBeGreaterThan(0);
  });

  it('serializes per-run rows aligned with the shared header', () => {
    const config = buildRealisticConfigs()[0];
    for (const run of [1, 2]) {
      const row = toRow(evaluatePerRunRow(config, run, 2));
      expect(row).toHaveLength(HEADER.length);
      expect(row[HEADER.indexOf('run')]).toBe(String(run));
      expect(WINNERS).toContain(row[HEADER.indexOf('winner')]);
    }
  });

  it('emits one row per run per test and caps the total at maxRows', () => {
    const { header, rows, dropped } = emitPerRun(buildRealisticConfigs(), 3, 2);
    expect(header).toEqual(HEADER);
    expect(rows).toHaveLength(2);
    expect(dropped).toBe(4); // 2 configs × 3 runs = 6 planned, 2 saved
    expect(rows[0][HEADER.indexOf('run')]).toBe('1');
    expect(rows[1][HEADER.indexOf('run')]).toBe('2');
  });

  it('does not drop rows under the default 1000-row cap', () => {
    const { rows, dropped } = emitPerRun(buildRealisticConfigs(), 5);
    expect(rows).toHaveLength(buildRealisticConfigs().length * 5);
    expect(rows.length).toBeLessThanOrEqual(MAX_SAVED_RUNS);
    expect(dropped).toBe(0);
  });
});

describe('evaluation harness --capture-runs (full capture mode)', () => {
  const smallConfigs = (): ReturnType<typeof applyCountOverride> =>
    applyCountOverride(buildModerateConfigs(), { students: 20, tutors: 10 });

  it('lays out one full row per run: all strategies + per-run time, no cap', () => {
    const { header, rows } = emitCaptureRuns(smallConfigs(), 2);
    expect(header).toEqual(CAPTURE_HEADER);
    // 8 moderate configs × 2 runs — every run kept, nothing dropped/capped.
    expect(rows).toHaveLength(buildModerateConfigs().length * 2);
    expect(CAPTURE_HEADER).toHaveLength(25);
    expect(CAPTURE_HEADER).toContain('startedAt');
    expect(CAPTURE_HEADER).toContain('durationMs');
    for (const strategy of CAPTURE_STRATEGIES) {
      expect(CAPTURE_HEADER).toContain(`${strategy}.averageScore`);
      expect(CAPTURE_HEADER).toContain(`${strategy}.unassignedPercent`);
      expect(CAPTURE_HEADER).toContain(`${strategy}.jainFairnessIndex`);
    }
  });

  it('records a real started-at timestamp and duration for each run', () => {
    const { rows } = emitCaptureRuns(smallConfigs(), 2);
    for (const row of rows) {
      expect(row).toHaveLength(CAPTURE_HEADER.length);
      const startedAt = row[CAPTURE_HEADER.indexOf('startedAt')];
      expect(Number.isNaN(Date.parse(startedAt))).toBe(false);
      expect(Number(row[CAPTURE_HEADER.indexOf('durationMs')])).toBeGreaterThanOrEqual(0);
      expect(['1', '2']).toContain(row[CAPTURE_HEADER.indexOf('run')]);
      expect(WINNERS).toContain(row[CAPTURE_HEADER.indexOf('winner')]);
    }
    // The two runs of the first test get distinct timestamps.
    const first = rows[0][CAPTURE_HEADER.indexOf('startedAt')];
    const second = rows[1][CAPTURE_HEADER.indexOf('startedAt')];
    expect(first).not.toBe(second);
  });

  it('fills every strategy metric cell with a number', () => {
    const { rows } = emitCaptureRuns(smallConfigs(), 1);
    const row = rows[0];
    for (const strategy of CAPTURE_STRATEGIES) {
      for (const metric of ['averageScore', 'unassignedPercent', 'jainFairnessIndex']) {
        const cell = row[CAPTURE_HEADER.indexOf(`${strategy}.${metric}`)];
        expect(Number.isNaN(Number.parseFloat(cell))).toBe(false);
      }
    }
  });

  it('parses --capture-runs and rejects bad values', () => {
    withArgv(['--capture-runs', '100'], () => {
      expect(parseCaptureRuns()).toBe(100);
    });
    withArgv([], () => {
      expect(parseCaptureRuns()).toBeUndefined();
    });
    withArgv(['--capture-runs', '0'], () => {
      expect(() => parseCaptureRuns()).toThrow(/positive integer/);
    });
  });
});

describe('winner summary from result rows', () => {
  const captureRow = (overrides: Record<string, string>): string[] =>
    CAPTURE_HEADER.map((column) => overrides[column] ?? '0');

  it('tallies strict wins, ties and means across capture rows', () => {
    // r1: da and greedy tie for best → tiedBest only, no strict win.
    // r2: greedy strictly best.
    // r3: all four tie → everybody tiedBest, nobody strict.
    const rows = [
      captureRow({
        'fcfs-filter.averageScore': '0.50',
        'fcfs-best.averageScore': '0.55',
        'da-stable.averageScore': '0.60',
        'greedy-engine.averageScore': '0.60',
      }),
      captureRow({
        'fcfs-filter.averageScore': '0.50',
        'fcfs-best.averageScore': '0.60',
        'da-stable.averageScore': '0.59',
        'greedy-engine.averageScore': '0.61',
      }),
      captureRow({}), // all zeros → all four tie
    ];
    const summary = winnerSummaryFromRows(CAPTURE_HEADER, rows);
    expect(summary.mode).toBe('capture');
    expect(summary.rows).toBe(3);
    const byName = new Map(summary.strategies.map((s) => [s.strategy, s]));
    expect(byName.get('greedy-engine')).toMatchObject({ strictWins: 1, tiedBest: 3 }); // r1 tie + r2 win + r3 all-tie
    expect(byName.get('da-stable')).toMatchObject({ strictWins: 0, tiedBest: 2 });
    expect(byName.get('fcfs-best')).toMatchObject({ strictWins: 0, tiedBest: 1 });
    expect(byName.get('fcfs-filter')).toMatchObject({ strictWins: 0, tiedBest: 1 });
    // r3 is all zeros, so the third term is 0: (0.60 + 0.61 + 0) / 3
    expect(byName.get('greedy-engine')?.meanScore).toBeCloseTo(0.403333, 5);
    expect(byName.get('da-stable')?.meanScore).toBeCloseTo(0.396667, 5);
  });

  it('counts wins from per-run rows and falls back for aggregate rows', () => {
    const perRunRows = [
      ['scenario', '', '', '', '', '2', '1', 'da-stable'],
      ['scenario', '', '', '', '', '2', '2', 'greedy-engine'],
      ['scenario', '', '', '', '', '2', '3', 'greedy-engine'],
    ].map((cells) => {
      const row = new Array<string>(HEADER.length).fill('');
      cells.forEach((cell, i) => {
        row[i] = cell;
      });
      return row;
    });
    const perRun = winnerSummaryFromRows(HEADER, perRunRows);
    expect(perRun.mode).toBe('per-run');
    const byName = new Map(perRun.strategies.map((s) => [s.strategy, s]));
    expect(byName.get('greedy-engine')?.strictWins).toBe(2);
    expect(byName.get('da-stable')?.strictWins).toBe(1);
    expect(byName.get('greedy-engine')?.meanScore).toBeNull();

    // Aggregate rows: winner column present but empty → mode 'aggregate'.
    const aggregate = winnerSummaryFromRows(HEADER, [new Array<string>(HEADER.length).fill('')]);
    expect(aggregate.mode).toBe('aggregate');
    expect(aggregate.strategies).toEqual([]);
  });
});
