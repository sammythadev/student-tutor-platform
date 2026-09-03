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
