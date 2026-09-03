import { existsSync, readFileSync, rmSync } from 'fs';
import { columnWidths, parseCsv, stripTimingColumns, toCsv } from '../evaluation/cli-output';
import { defaultNoteName, NOTES_DIR, saveNoteFile } from '../evaluation/tui/files';
import { cursorPosition, indexFromPosition, wrapText } from '../evaluation/tui/text-utils';
import {
  buildEvaluationConfigs,
  buildModerateConfigs,
  buildRealisticConfigs,
  buildTopKSweepConfigs,
  CAPTURE_HEADER,
  DEFAULT_RUNS,
  evaluate,
  HEADER,
  runModerateEvaluation,
  runRealisticEvaluation,
  toRow,
} from '../evaluation/evaluation-harness';
import { computeOptimalityGapRow, DEFAULT_GAP_SIZES } from '../evaluation/optimal-baseline';
import { runBaselineCell, SCENARIOS } from '../evaluation/baseline-comparison';
import { getSuite, harnessSuite, moderateSuite, topkSuite, SUITES } from '../evaluation/tui/suites';
import { wrapClearDesync } from '../evaluation/tui/stdout-clear-patch';
import {
  CLI_FLAG_ROWS,
  currentSaveMode,
  HELP_SECTIONS,
  isHelpCloseChord,
  SAVE_MODES,
} from '../evaluation/tui/help-data';
import { parseTuiArgs, tuiUsage } from '../evaluation/tui/launch';

const WINNERS = ['fcfs-filter', 'fcfs-best', 'da-stable', 'greedy-engine'];

/** No-op progress emitter for suite-run tests. */
const noopEmit = (): void => {};

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

  it('marks only harness-style suites as supporting run options', () => {
    expect(harnessSuite.supportsOptions).toBe(true);
    expect(moderateSuite.supportsOptions).toBe(true);
    expect(topkSuite.supportsOptions).toBe(true);
  });
});

describe('tui suite run options', () => {
  it('aggregate rows honor runs and the counts override', async () => {
    const [result] = await moderateSuite.run(noopEmit, {
      runs: 2,
      override: { students: 12, tutors: 6 },
    });
    expect(result.defaultName).toBe('moderate-results.csv');
    expect(result.header).toEqual(HEADER);
    expect(result.rows).toHaveLength(buildModerateConfigs().length);
    for (const row of result.rows) {
      expect(row[HEADER.indexOf('students')]).toBe('12');
      expect(row[HEADER.indexOf('tutors')]).toBe('6');
      expect(row[HEADER.indexOf('runs')]).toBe('2');
      expect(row[HEADER.indexOf('run')]).toBe('');
    }
  });

  it('per-run mode emits one row per run with a winning algorithm', async () => {
    const [result] = await moderateSuite.run(noopEmit, {
      runs: 2,
      override: { students: 12, tutors: 6 },
      perRun: true,
    });
    expect(result.defaultName).toBe('moderate-per-run-results.csv');
    expect(result.header).toEqual(HEADER);
    expect(result.rows).toHaveLength(buildModerateConfigs().length * 2);
    expect(result.dropped).toBe(0);
    for (const row of result.rows) {
      expect(['1', '2']).toContain(row[HEADER.indexOf('run')]);
      expect(WINNERS).toContain(row[HEADER.indexOf('winner')]);
    }
  });

  it('runs with default options when none are passed', async () => {
    const [result] = await moderateSuite.run(noopEmit);
    expect(result.defaultName).toBe('moderate-results.csv');
    expect(result.rows).toHaveLength(buildModerateConfigs().length);
    expect(result.rows[0][HEADER.indexOf('students')]).toBe('150'); // suite defaults kept
    expect(result.rows[0][HEADER.indexOf('runs')]).toBe(String(DEFAULT_RUNS));
  }, 30_000);

  it('capture mode emits every run with the full multi-strategy header, no cap', async () => {
    const [result] = await moderateSuite.run(noopEmit, {
      runs: 2,
      override: { students: 12, tutors: 6 },
      capture: true,
    });
    expect(result.defaultName).toBe('moderate-capture-results.csv');
    expect(result.header).toEqual(CAPTURE_HEADER);
    expect(result.dropped).toBeUndefined(); // capture never drops rows
    expect(result.rows).toHaveLength(buildModerateConfigs().length * 2);
    for (const row of result.rows) {
      expect(['1', '2']).toContain(row[CAPTURE_HEADER.indexOf('run')]);
      expect(WINNERS).toContain(row[CAPTURE_HEADER.indexOf('winner')]);
      // Every run records its own moment in time.
      expect(Number.isNaN(Date.parse(row[CAPTURE_HEADER.indexOf('startedAt')]))).toBe(false);
    }
  });
});

describe('tui launch argument parsing', () => {
  it('defaults to the menu with no overrides when no args are given', () => {
    const launch = parseTuiArgs([]);
    expect(launch.target).toBeUndefined();
    expect(launch.runs).toBe(DEFAULT_RUNS);
    expect(launch.perRun).toBe(false);
    expect(launch.override).toBeUndefined();
    expect(launch.noTiming).toBe(false);
    expect(launch.optionsExplicit).toBe(false);
    expect(launch.errors).toEqual([]);
    expect(launch.ignored).toEqual([]);
  });

  it('resolves positional suite ids and screen aliases, last one winning', () => {
    expect(parseTuiArgs(['eval']).target).toBe('eval');
    expect(parseTuiArgs(['gap']).target).toBe('gap');
    expect(parseTuiArgs(['results']).target).toBe('browser');
    expect(parseTuiArgs(['scratchpad']).target).toBe('notes');
    expect(parseTuiArgs(['eval', 'topk']).target).toBe('topk');
    // Unknown positional tokens fall through to the menu, as before.
    expect(parseTuiArgs(['not-a-suite']).target).toBeUndefined();
  });

  it('maps --moderate and --topk-sweep onto the matching suites', () => {
    expect(parseTuiArgs(['--moderate']).target).toBe('moderate');
    expect(parseTuiArgs(['--topk-sweep']).target).toBe('topk');
    // Selector flags and positional ids share one last-wins target slot.
    expect(parseTuiArgs(['eval', '--topk-sweep']).target).toBe('topk');
    expect(parseTuiArgs(['--topk-sweep', 'eval']).target).toBe('eval');
  });

  it('--no-timing seeds the timing toggle', () => {
    expect(parseTuiArgs(['--no-timing']).noTiming).toBe(true);
  });

  it('--runs seeds the run count, last occurrence winning', () => {
    expect(parseTuiArgs(['--runs', '3']).runs).toBe(3);
    expect(parseTuiArgs(['--runs', '3', '--runs', '7']).runs).toBe(7);
    expect(parseTuiArgs(['--runs', '3']).perRun).toBe(false);
  });

  it('--save-runs seeds the count AND per-run mode, winning over --runs', () => {
    for (const argv of [
      ['--save-runs', '100'],
      ['--runs', '8', '--save-runs', '100'],
      ['--save-runs', '100', '--runs', '8'],
    ]) {
      const launch = parseTuiArgs(argv);
      expect(launch.runs).toBe(100);
      expect(launch.perRun).toBe(true);
    }
  });

  it('--per-run alone toggles per-run rows at the default run count', () => {
    const launch = parseTuiArgs(['--per-run']);
    expect(launch.perRun).toBe(true);
    expect(launch.runs).toBe(DEFAULT_RUNS);
  });

  it('--students and --tutors must come together and be positive integers', () => {
    expect(parseTuiArgs(['--students', '40', '--tutors', '12']).override).toEqual({
      students: 40,
      tutors: 12,
    });
    expect(parseTuiArgs(['--students', '40']).errors[0]).toContain('must be passed together');
    expect(parseTuiArgs(['--tutors', '12']).errors[0]).toContain('must be passed together');
    expect(parseTuiArgs(['--students', '40', '--tutors', '0']).errors[0]).toContain(
      '--tutors expects a positive integer',
    );
  });

  it('rejects malformed run counts with one-line errors', () => {
    expect(parseTuiArgs(['--runs', 'abc']).errors[0]).toBe(
      '--runs expects a positive integer, got "abc"',
    );
    expect(parseTuiArgs(['--save-runs', '-5']).errors[0]).toContain('--save-runs');
    expect(parseTuiArgs(['--runs']).errors[0]).toBe('--runs expects a value');
    expect(parseTuiArgs(['--runs', '--per-run']).errors[0]).toBe('--runs expects a value');
  });

  it('reports unknown flags as errors and ignores known CLI-only flags', () => {
    expect(parseTuiArgs(['--wat']).errors[0]).toBe('Unknown flag "--wat"');
    // CLI-script flags are consumed (their values too) and reported as ignored.
    const launch = parseTuiArgs(['eval', '--name', 'mine.csv', '--no-file']);
    expect(launch.errors).toEqual([]);
    expect(launch.target).toBe('eval');
    expect(launch.ignored).toEqual(expect.arrayContaining(['--name', '--no-file']));
  });

  it('flags --help / -h as a usage request', () => {
    expect(parseTuiArgs(['--help']).requestedHelp).toBe(true);
    expect(parseTuiArgs(['-h']).requestedHelp).toBe(true);
    expect(parseTuiArgs([]).requestedHelp).toBe(false);
    expect(tuiUsage()).toContain('pnpm run tui');
  });

  it('tracks whether run options were given explicitly at launch', () => {
    expect(parseTuiArgs(['--runs', '3']).optionsExplicit).toBe(true);
    expect(parseTuiArgs(['--save-runs', '10']).optionsExplicit).toBe(true);
    expect(parseTuiArgs(['--per-run']).optionsExplicit).toBe(true);
    expect(parseTuiArgs(['--students', '40', '--tutors', '12']).optionsExplicit).toBe(true);
    expect(parseTuiArgs(['eval']).optionsExplicit).toBe(false);
    // The timing toggle is not a run option — config prompts still show.
    expect(parseTuiArgs(['--no-timing']).optionsExplicit).toBe(false);
  });
});

describe('tui help content', () => {
  it('documents the global ? help key and the notes Ctrl+O chord', () => {
    const global = HELP_SECTIONS.find((section) => section.title === 'Global');
    expect(global?.rows.some((row) => row.keys === '?' && row.action.includes('help'))).toBe(true);

    const notes = HELP_SECTIONS.find((section) => section.title === 'Notes');
    expect(notes?.rows.some((row) => row.keys === 'Ctrl+O' && row.action.includes('help'))).toBe(
      true,
    );
  });

  it('covers every interactive screen with non-empty key/action rows', () => {
    expect(HELP_SECTIONS.map((section) => section.title)).toEqual([
      'Global',
      'Menu',
      'Run',
      'Results browser',
      'Notes',
    ]);
    for (const section of HELP_SECTIONS) {
      expect(section.rows.length).toBeGreaterThan(0);
      for (const row of section.rows) {
        expect(row.keys.length).toBeGreaterThan(0);
        expect(row.action.length).toBeGreaterThan(0);
      }
    }
  });

  it('documents the CLI flags, including --no-timing', () => {
    const keys = CLI_FLAG_ROWS.map((row) => row.keys);
    expect(keys.some((key) => key.startsWith('--no-timing'))).toBe(true);
    expect(keys.some((key) => key.includes('--name'))).toBe(true);
    expect(keys.some((key) => key.includes('--out'))).toBe(true);
    expect(keys.some((key) => key.includes('--no-file'))).toBe(true);
  });

  it('isHelpCloseChord closes on ?, Esc, q, m and Ctrl+O only', () => {
    expect(isHelpCloseChord('?', {})).toBe(true);
    expect(isHelpCloseChord('q', {})).toBe(true);
    expect(isHelpCloseChord('m', {})).toBe(true);
    expect(isHelpCloseChord('', { escape: true })).toBe(true);
    expect(isHelpCloseChord('o', { ctrl: true })).toBe(true);

    // Regular typing keys must not dismiss help (notes editor keeps them).
    expect(isHelpCloseChord('a', {})).toBe(false);
    expect(isHelpCloseChord('o', {})).toBe(false);
    expect(isHelpCloseChord('', {})).toBe(false);
  });
});

describe('tui save-as row modes', () => {
  it('offers summary, per-run and capture in that order', () => {
    expect(SAVE_MODES.map((mode) => mode.id)).toEqual(['summary', 'per-run', 'capture']);
    for (const mode of SAVE_MODES) {
      expect(mode.label.length).toBeGreaterThan(0);
      expect(mode.hint.length).toBeGreaterThan(0);
    }
  });

  it('currentSaveMode matches the run options (capture wins over per-run)', () => {
    expect(currentSaveMode(false, false)).toBe('summary');
    expect(currentSaveMode(true, false)).toBe('per-run');
    expect(currentSaveMode(false, true)).toBe('capture');
    expect(currentSaveMode(true, true)).toBe('capture');
  });
});

describe('stdout clear-desync patch', () => {
  it('passes ordinary frames through untouched', () => {
    const writes: string[] = [];
    const wrapped = wrapClearDesync((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    wrapped('erase\u001b[2K\u001b[1A\nframe one\n');
    wrapped('\u001b[2K\u001b[1A\nframe two\n');
    expect(writes).toEqual([
      'erase\u001b[2K\u001b[1A\nframe one\n',
      '\u001b[2K\u001b[1A\nframe two\n',
    ]);
  });

  it('injects a full clear before the frame that follows a taller-than-terminal frame', () => {
    const writes: string[] = [];
    const wrapped = wrapClearDesync((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    // Ink's tall-frame path: clearTerminal + tall output.
    wrapped('\u001b[2J\u001b[3J\u001b[Htall frame line 1\ntall frame line 2\n');
    // Next (shorter) frame: must start with a fresh clear before ink's stale
    // eraseLines bookkeeping can misfire.
    wrapped('\u001b[2K\u001b[1A\nshort frame\n');
    expect(writes[1]).toBe(
      String.fromCharCode(0x1b) +
        '[2J' +
        String.fromCharCode(0x1b) +
        '[3J' +
        String.fromCharCode(0x1b) +
        '[H' +
        String.fromCharCode(0x1b) +
        '[2K' +
        String.fromCharCode(0x1b) +
        '[1A\nshort frame\n',
    );
  });

  it('only injects once — the following frame is untouched again', () => {
    const writes: string[] = [];
    const wrapped = wrapClearDesync((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    wrapped('\u001b[2J\u001b[3J\u001b[Htall\n');
    wrapped('short one\n');
    wrapped('short two\n');
    expect(writes[1]).toMatch(
      new RegExp('^' + String.fromCharCode(0x1b) + '\\[2J' + String.fromCharCode(0x1b) + '\\[3J'),
    );
    expect(writes[2]).toBe('short two\n');
  });

  it('keeps the pending clear across non-frame writes (cursor controls)', () => {
    const writes: string[] = [];
    const wrapped = wrapClearDesync((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    wrapped('\u001b[2J\u001b[3J\u001b[Htall\n');
    wrapped('\u001b[?25l'); // cursor hide — not a frame, must not consume the flag
    wrapped('short frame\n');
    expect(writes[1]).toBe('\u001b[?25l');
    expect(writes[2]).toBe(
      String.fromCharCode(0x1b) +
        '[2J' +
        String.fromCharCode(0x1b) +
        '[3J' +
        String.fromCharCode(0x1b) +
        '[Hshort frame\n',
    );
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
