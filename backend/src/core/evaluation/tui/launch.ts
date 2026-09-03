import { DEFAULT_RUNS, type CountOverride } from '@core/evaluation/evaluation-harness';

/**
 * Launch-argument resolver for the eval TUI (`pnpm run tui -- <args>`).
 *
 * The TUI is a separate process from the `pnpm run eval*` CLI scripts, so flags
 * the user is used to typing on the command line (`--runs`, `--save-runs`,
 * `--per-run`, `--students/--tutors`, `--no-timing`) are parsed HERE and seed
 * the run view instead of being applied in a harness main block. Pure (no ink,
 * no argv globals) so it can be unit-tested under jest.
 *
 * Resolution rules mirror evaluation-harness.ts:
 *   --save-runs <n>  ⇒ per-run rows with n runs per test (wins over --runs)
 *   --runs <n>       ⇒ runs per test for the aggregate row
 *   --per-run        ⇒ per-run rows using the resolved --runs count
 *   --students/--tutors ⇒ both or neither (error otherwise)
 *   --moderate / --topk-sweep select the moderate / topk suite (same sweep the
 *   CLI flags narrow the harness to), alongside positional suite ids.
 *
 * Flags that only make sense for the piped CLI scripts (--name, --out,
 * --no-file, --table/--csv, --sizes, --scenario/--strategy) are recognized,
 * their values consumed, and reported in `ignored` so the user is told they
 * had no effect. Unknown flags and malformed values land in `errors` — the TUI
 * entry prints them (plus usage) and exits rather than silently misbehaving.
 */

export interface TuiLaunch {
  /** Suite id or screen to jump into; the menu when undefined. */
  target: string | undefined;
  /** Runs per test seeded into the run view (always resolved). */
  runs: number;
  /** Per-run rows mode seeded into the run view. */
  perRun: boolean;
  /** Student/tutor count override seeded into the run view. */
  override: CountOverride | undefined;
  /** Zero the wall-clock timing columns from launch. */
  noTiming: boolean;
  /**
   * True when any run-option flag was passed at launch — the entry skips the
   * pre-run config prompts for the launched suite (values were already chosen).
   */
  optionsExplicit: boolean;
  /** True when --help / -h was passed — the entry prints usage and exits. */
  requestedHelp: boolean;
  /** Recognized-but-unused CLI flags (values already consumed). */
  ignored: string[];
  /** Fatal parse problems; the entry prints these and exits when non-empty. */
  errors: string[];
}

const SUITE_IDS = new Set(['eval', 'topk', 'moderate', 'gap', 'baselines', 'all']);
const SCREEN_NAMES = new Set(['browser', 'results', 'notes', 'scratchpad']);

/** Non-suite positional ids normalized to their canonical screen name. */
const CANONICAL_TARGET: Record<string, string> = {
  results: 'browser',
  scratchpad: 'notes',
};

/** Flags that pick a suite (the sweep the CLI harness flag would narrow to). */
const SELECTOR_FLAGS: Record<string, string> = {
  '--moderate': 'moderate',
  '--topk-sweep': 'topk',
};

/** Flags the run view honors (seed RunScreen's options state). */
const USED_VALUE_FLAGS = new Set(['--runs', '--save-runs', '--students', '--tutors']);
const USED_BOOL_FLAGS = new Set(['--no-timing', '--per-run']);

/** Flags that belong to the piped CLI scripts; consumed here and ignored. */
const IGNORED_VALUE_FLAGS = new Set(['--name', '--out', '--sizes', '--scenario', '--strategy']);
const IGNORED_BOOL_FLAGS = new Set(['--no-file', '--table', '--csv', '--optimality-gap']);

const ALL_VALUE_FLAGS = new Set([...USED_VALUE_FLAGS, ...IGNORED_VALUE_FLAGS]);
const ALL_BOOL_FLAGS = new Set([...USED_BOOL_FLAGS, ...IGNORED_BOOL_FLAGS]);

/** Multi-line usage summary printed on --help / -h / a bad flag. */
export function tuiUsage(): string {
  return [
    'Usage: pnpm run tui [-- <suite>] [options]',
    '',
    'Suites: eval | topk | moderate | gap | baselines | all | browser | notes',
    '  (--moderate and --topk-sweep also select the moderate / topk suite)',
    '',
    'Run options (seed the run view — the R / C / P keys adjust them live):',
    '  --runs <n>                 repeats per test (default 5)',
    '  --save-runs <n>            write EVERY run to the CSV (R + per-run mode on)',
    '  --per-run                  one row per run using the --runs count',
    '  --students <n> --tutors <n>   count override for every test (both required)',
    '  --no-timing                zero wall-clock timing columns in saved CSVs',
    '',
    'Ignored by the TUI (CLI-script flags): --name --out --no-file --table --csv',
    '  --sizes --scenario --strategy',
  ].join('\n');
}

function isTargetToken(token: string): boolean {
  return SUITE_IDS.has(token) || SCREEN_NAMES.has(token);
}

/** Parses the full argv list for the TUI process (everything after `--`). */
export function parseTuiArgs(argv: string[]): TuiLaunch {
  const launch: TuiLaunch = {
    target: undefined,
    runs: DEFAULT_RUNS,
    perRun: false,
    override: undefined,
    noTiming: false,
    optionsExplicit: false,
    requestedHelp: false,
    ignored: [],
    errors: [],
  };

  const rawValues = new Map<string, string>();
  const booleans = new Set<string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h' || token === '-?') {
      launch.requestedHelp = true;
      continue;
    }
    if (token.startsWith('--')) {
      const selector = SELECTOR_FLAGS[token];
      if (selector !== undefined) {
        launch.target = selector;
        continue;
      }
      if (ALL_VALUE_FLAGS.has(token)) {
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) {
          launch.errors.push(`${token} expects a value`);
          continue;
        }
        rawValues.set(token, next); // last occurrence wins (CLI convention)
        i += 1;
        continue;
      }
      if (ALL_BOOL_FLAGS.has(token)) {
        booleans.add(token);
        continue;
      }
      launch.errors.push(`Unknown flag "${token}"`);
      continue;
    }
    if (isTargetToken(token)) {
      launch.target = CANONICAL_TARGET[token] ?? token;
    }
    // Unknown positional tokens fall through to the menu, as before.
  }

  launch.ignored = [
    ...[...rawValues.keys()].filter((flag) => IGNORED_VALUE_FLAGS.has(flag)),
    ...[...booleans].filter((flag) => IGNORED_BOOL_FLAGS.has(flag)),
  ];

  // Numeric flags. A flag that is present but not a positive integer reports a
  // precise one-line error, mirroring the CLI's parsePositiveInt message.
  const readReportedCount = (flag: string): number | undefined => {
    const raw = rawValues.get(flag);
    if (raw === undefined) {
      return undefined;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
      launch.errors.push(`${flag} expects a positive integer, got "${raw}"`);
      return undefined;
    }
    return value;
  };

  const saveRuns = readReportedCount('--save-runs');
  const runs = readReportedCount('--runs');
  // --save-runs is the discoverable "save every run" command and wins over
  // --runs when both appear (same precedence as the CLI harness).
  launch.runs = saveRuns ?? runs ?? DEFAULT_RUNS;
  launch.perRun = booleans.has('--per-run') || saveRuns !== undefined;
  launch.noTiming = booleans.has('--no-timing');

  // Count override: both or neither, like parseCountOverride in the harness.
  const students = readReportedCount('--students');
  const tutors = readReportedCount('--tutors');
  if (rawValues.has('--students') !== rawValues.has('--tutors')) {
    launch.errors.push('--students and --tutors must be passed together (both or neither)');
  } else if (students !== undefined && tutors !== undefined) {
    launch.override = { students, tutors };
  }

  launch.optionsExplicit =
    rawValues.has('--runs') ||
    rawValues.has('--save-runs') ||
    rawValues.has('--students') ||
    rawValues.has('--tutors') ||
    booleans.has('--per-run');

  return launch;
}
