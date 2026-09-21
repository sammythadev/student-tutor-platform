import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import figlet from 'figlet';
import { readFileSync } from 'fs';
import {
  DEFAULT_RUNS,
  MAX_SAVED_RUNS,
  winnerSummaryFromRows,
} from '@core/evaluation/evaluation-harness';
import {
  columnWidths,
  parseCsv,
  shouldSpaceRows,
  stripTimingColumns,
  toCsv,
  toSpacedCsv,
  writeCsvOutput,
} from '@core/evaluation/cli-output';
import { defaultNoteName, listSavedCsvs, saveNoteFile, type CsvFileInfo } from './files';
import { cursorPosition, indexFromPosition, visualSpans } from './text-utils';
import { HelpContent } from './help';
import { currentSaveMode, SAVE_MODES, type SaveRowMode } from './help-data';
import {
  SUITES,
  type RunOptions,
  type Suite,
  type SuiteResult,
  type SuiteRunState,
} from './suites';

/** ── shared building blocks ─────────────────────────────────────────────── */

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function Spinner(): React.JSX.Element {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(timer);
  }, []);

  return <Text color="cyan">{SPINNER_FRAMES[frame]}</Text>;
}

function ProgressBar({
  done,
  total,
  width = 24,
}: {
  done: number;
  total: number;
  width?: number;
}): React.JSX.Element {
  const filled = total === 0 ? width : Math.round((done / total) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
  return (
    <Box>
      <Text color="green">{bar}</Text>
      <Text color="gray">{` ${done}/${total}`}</Text>
    </Box>
  );
}

interface DataTableProps {
  header: string[];
  rows: string[][];
  highlights?: Array<{ column: string; mode: 'max' | 'min' }>;
}

const NO_HIGHLIGHTS: NonNullable<DataTableProps['highlights']> = [];

/**
 * Cap on rendered rows. The TUI has no internal scrollback (ink renders one
 * frame), so a 1000-row per-run result must not flood the terminal — the full
 * table always lives in the saved CSV.
 */
const MAX_TABLE_ROWS = 40;

/**
 * Terminal lines reserved for chrome above/below the table (heading, status
 * lines, saved-file line, key hints). The visible table is capped so the whole
 * frame fits the terminal height: ink's renderer switches to a full-screen
 * clear when output exceeds the terminal rows, which desyncs its line-erase
 * counter and leaves debris on the next shorter frame ("clumpy" output after a
 * rerun). Fitting on screen avoids that path entirely.
 */
const TABLE_CHROME_LINES = 16;

/** Column-aligned table that fits the terminal width and tints best-in-class cells. */
function DataTable({
  header,
  rows,
  highlights = NO_HIGHLIGHTS,
}: DataTableProps): React.JSX.Element {
  const { stdout } = useStdout();
  const availableWidth = Math.max(24, (stdout.columns ?? 80) - 4);
  const columnGap = 2;
  const maxRows = Math.max(4, Math.min(MAX_TABLE_ROWS, (stdout.rows ?? 30) - TABLE_CHROME_LINES));
  const truncated = rows.length - maxRows;
  const visibleRows = truncated > 0 ? rows.slice(0, maxRows) : rows;

  const { widths, bestCells } = useMemo(() => {
    const base = columnWidths(header, visibleRows);
    const natural = base.reduce((sum, width) => sum + width, 0) + columnGap * (base.length - 1);
    const scaled = base.map((width) =>
      natural > availableWidth
        ? Math.max(6, Math.floor((width / natural) * availableWidth))
        : width,
    );

    const bestCells = new Set<string>();
    for (const { column, mode } of highlights) {
      const columnIndex = header.indexOf(column);
      if (columnIndex === -1) {
        continue;
      }
      let bestIndex = -1;
      let bestValue = mode === 'max' ? -Infinity : Infinity;
      visibleRows.forEach((row, rowIndex) => {
        const value = Number.parseFloat(row[columnIndex] ?? '');
        if (Number.isNaN(value)) {
          return;
        }
        if ((mode === 'max' && value > bestValue) || (mode === 'min' && value < bestValue)) {
          bestValue = value;
          bestIndex = rowIndex;
        }
      });
      if (bestIndex !== -1) {
        bestCells.add(`${columnIndex}:${bestIndex}`);
      }
    }

    return { widths: scaled, bestCells };
  }, [header, visibleRows, highlights, availableWidth]);

  const fit = (value: string, width: number): string =>
    value.length <= width ? value : `${value.slice(0, Math.max(width - 1, 1))}…`;

  // The gap width is part of the scaling math above, so it must actually be
  // rendered between cells — otherwise columns whose width exactly equals their
  // longest content merge together (e.g. `studentstutors`).
  const gap = <Box width={columnGap} />;

  return (
    <Box flexDirection="column">
      <Box>
        {header.map((column, i) => (
          <Box key={column} flexDirection="row">
            <Box width={widths[i]}>
              <Text bold color="cyan">
                {fit(column, widths[i])}
              </Text>
            </Box>
            {i < header.length - 1 && gap}
          </Box>
        ))}
      </Box>
      {visibleRows.map((row, rowIndex) => (
        <Box key={`row-${rowIndex}`}>
          {row.map((value, columnIndex) => (
            <Box key={`${rowIndex}-${columnIndex}`} flexDirection="row">
              <Box width={widths[columnIndex] ?? 6}>
                <Text color={bestCells.has(`${columnIndex}:${rowIndex}`) ? 'green' : undefined}>
                  {fit(value, widths[columnIndex] ?? 6)}
                </Text>
              </Box>
              {columnIndex < row.length - 1 && gap}
            </Box>
          ))}
        </Box>
      ))}
      {truncated > 0 && (
        <Box>
          <Text color="gray" dimColor>
            … {truncated} more row(s) — see the saved CSV for the full table
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * "Which algorithm wins" tally over the current results (see
 * winnerSummaryFromRows): full per-strategy means + win counts on capture
 * rows, win counts on per-run rows, or a prompt to switch modes on aggregate
 * rows. Replaces the table while the W panel is open.
 */
function WinnerSummaryTable({
  header,
  rows,
}: {
  header: string[];
  rows: string[][];
}): React.JSX.Element {
  const summary = useMemo(() => winnerSummaryFromRows(header, rows), [header, rows]);

  if (summary.mode === 'aggregate') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Winner summary
        </Text>
        <Text color="gray">
          These are aggregate rows (one averaged result per test) — press P for per-run rows, twice
          for capture mode, to tally winners.
        </Text>
      </Box>
    );
  }

  const bestScore = summary.strategies.reduce<number | null>(
    (best, strategy) =>
      strategy.meanScore !== null && (best === null || strategy.meanScore > best)
        ? strategy.meanScore
        : best,
    null,
  );
  const pad = (text: string, width: number): string =>
    text.length >= width ? text : `${text}${' '.repeat(width - text.length)}`;
  const cell = (text: string, width: number): string => pad(text, width);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Winner summary — {summary.rows} run(s)
      </Text>
      <Text color="gray" dimColor>
        {summary.mode === 'per-run'
          ? 'per-run rows: win counts only — ties break to the first strategy; press P again for capture to see all strategies + means'
          : 'capture rows — every strategy’s full metrics per run (seeded fixtures, so the tally is exact)'}
      </Text>
      <Box>
        <Text bold>{cell('strategy', 14)}</Text>
        <Text bold>{cell('wins', 9)}</Text>
        <Text bold>{cell('tiedBest', 11)}</Text>
        <Text bold>{cell('meanScore', 12)}</Text>
        <Text bold>{cell('unassigned%', 14)}</Text>
        <Text bold>{cell('fairness', 11)}</Text>
      </Box>
      {summary.strategies.map((strategy) => (
        <Box key={strategy.strategy}>
          <Text>{cell(strategy.strategy, 14)}</Text>
          <Text>{cell(String(strategy.strictWins), 9)}</Text>
          <Text>{cell(strategy.tiedBest === null ? '—' : String(strategy.tiedBest), 11)}</Text>
          <Text
            color={
              strategy.meanScore !== null && strategy.meanScore === bestScore ? 'green' : undefined
            }
          >
            {cell(strategy.meanScore === null ? '—' : strategy.meanScore.toFixed(6), 12)}
          </Text>
          <Text>
            {cell(strategy.meanUnassigned === null ? '—' : strategy.meanUnassigned.toFixed(2), 14)}
          </Text>
          <Text>
            {cell(strategy.meanFairness === null ? '—' : strategy.meanFairness.toFixed(6), 11)}
          </Text>
        </Box>
      ))}
      <Text color="gray" dimColor>
        W toggles this panel · best meanScore in green
      </Text>
    </Box>
  );
}

/** Single-line text input with a block cursor; used for filename prompts. */
function TextInput({
  label,
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder?: string;
}): React.JSX.Element {
  // Windows terminals often send DEL (\x7f) for the Backspace key, which ink
  // reports as `key.delete` rather than `key.backspace` — so handle both. These
  // prompts are single-line with no cursor, so both erase the last character.
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      onSubmit();
    } else if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
    } else if (input && !key.ctrl) {
      onChange(value + input);
    }
  });

  return (
    <Box>
      <Text color="cyan">{label}</Text>
      <Text> </Text>
      {value === '' && placeholder !== undefined ? (
        <Text color="gray" dimColor>
          {placeholder}
        </Text>
      ) : (
        <Text>{value}</Text>
      )}
      <Text inverse> </Text>
    </Box>
  );
}

/** ── main menu ──────────────────────────────────────────────────────────── */

const BANNER_FONTS = ['ANSI Shadow', 'Standard', 'Small'] as const;

/** Font-name union from the figlet module itself (avoids the UMD global type). */
type FigletFontName = NonNullable<Parameters<typeof figlet.textSync>[1]>['font'];

/** Claude-style figlet banner, choosing the widest font that fits the screen. */
function renderBanner(text: string, availableWidth: number): string[] {
  for (const font of BANNER_FONTS) {
    try {
      const art = figlet.textSync(text, { font: font as FigletFontName });
      const lines = art.replace(/\n$/, '').split('\n');
      if (Math.max(...lines.map((line) => line.length)) <= availableWidth) {
        return lines;
      }
    } catch {
      // try the next font
    }
  }
  return [text];
}

export function MenuScreen({
  onRun,
  onBrowse,
  onNotes,
  onQuit,
}: {
  onRun: (suiteId: string) => void;
  onBrowse: () => void;
  onNotes: () => void;
  onQuit: () => void;
}): React.JSX.Element {
  const { stdout } = useStdout();
  const [selected, setSelected] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const itemCount = SUITES.length + 2; // suites + "browse" + "notes"

  const banner = useMemo(
    () => renderBanner('EVAL RUNNER', Math.max(40, (stdout.columns ?? 100) - 2)),
    [stdout.columns],
  );
  const latest = useMemo(() => listSavedCsvs()[0], []);

  // While help is open it is modal: the panel owns all keys (`isHelpCloseChord`).
  useInput(
    (input, key) => {
      if (key.upArrow || input === 'k') {
        setSelected((i) => (i - 1 + itemCount) % itemCount);
      } else if (key.downArrow || input === 'j') {
        setSelected((i) => (i + 1) % itemCount);
      } else if (key.return || input === ' ') {
        if (selected < SUITES.length) {
          onRun(SUITES[selected].id);
        } else if (selected === SUITES.length) {
          onBrowse();
        } else {
          onNotes();
        }
      } else if (input === 'b') {
        onBrowse();
      } else if (input === 'n') {
        onNotes();
      } else if (input === '?') {
        setShowHelp((value) => !value);
      } else if (input === 'q' || key.escape) {
        onQuit();
      }
    },
    { isActive: !showHelp },
  );

  const showBanner = (stdout.rows ?? 40) >= 28;

  if (showHelp) {
    return <HelpContent onClose={() => setShowHelp(false)} />;
  }

  return (
    <Box flexDirection="column" padding={1}>
      {showBanner &&
        banner.map((line, i) => (
          <Text key={`banner-${i}`} color="magenta">
            {line}
          </Text>
        ))}
      {!showBanner && (
        <Text bold color="magenta">
          🎓 EVAL RUNNER
        </Text>
      )}
      <Text color="gray" dimColor>
        Tutor matchmaking · in-process eval runner · results → docs/benchmarks/
      </Text>
      {latest !== undefined && (
        <Text color="green">
          Latest run: {latest.name} · {latest.dataRows} rows · {latest.modified.toLocaleString()}
        </Text>
      )}
      <Box flexDirection="column" marginTop={1} marginLeft={1}>
        <Text bold underline>
          Pick a suite (↑/↓ or j/k · Enter to run)
        </Text>
        {SUITES.map((suite, i) => (
          <Box key={suite.id} flexDirection="column">
            <Text color={selected === i ? 'cyan' : 'white'} bold={selected === i}>
              {selected === i ? ' ❯ ' : '   '}
              {suite.label}
            </Text>
            {selected === i && <Text color="gray"> {suite.description}</Text>}
          </Box>
        ))}
        <Box marginTop={1}>
          <Text
            color={selected === SUITES.length ? 'cyan' : 'white'}
            bold={selected === SUITES.length}
          >
            {selected === SUITES.length ? ' ❯ ' : '   '}Browse saved results
          </Text>
        </Box>
        <Box>
          <Text
            color={selected === SUITES.length + 1 ? 'cyan' : 'white'}
            bold={selected === SUITES.length + 1}
          >
            {selected === SUITES.length + 1 ? ' ❯ ' : '   '}Notes / scratchpad
          </Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          b browse · n notes · ? help · q quit
        </Text>
      </Box>
    </Box>
  );
}

/** ── run view ───────────────────────────────────────────────────────────── */

export function RunScreen({
  suite,
  onBack,
  noTiming,
  onToggleNoTiming,
  options,
  onOptionsChange,
  skipConfig = false,
}: {
  suite: Suite;
  onBack: () => void;
  /** Zero the wall-clock timing columns in the table and the saved CSV. */
  noTiming: boolean;
  onToggleNoTiming: () => void;
  /** Run options (runs / count override / per-run mode) owned by App. */
  options: RunOptions;
  /** App-level setter; the R / C / P keys patch these options and re-run. */
  onOptionsChange: (patch: Partial<RunOptions>) => void;
  /**
   * Skip the pre-run config prompts (set when the suite was launched with
   * explicit run-option flags — the user already chose the values).
   */
  skipConfig?: boolean;
}): React.JSX.Element {
  const [runId, setRunId] = useState(0);
  const [state, setState] = useState<SuiteRunState | null>(null);
  const [results, setResults] = useState<SuiteResult[] | null>(null);
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Save flow: `s` first asks WHICH rows to save (summary / per-run / capture),
  // then the filename. `saveAsStep` is 'mode' while the picker is open, 'name'
  // while the filename TextInput is open, and null when closed. When the picked
  // mode differs from the current run mode the suite is re-run in that mode
  // (same cost as pressing P then r) before the name prompt opens.
  const [saveAsStep, setSaveAsStep] = useState<'mode' | 'name' | null>(null);
  const [saveAsPick, setSaveAsPick] = useState<SaveRowMode>('summary');
  const [saveAsName, setSaveAsName] = useState('');
  const [saveAsError, setSaveAsError] = useState<string | null>(null);
  // Set when `s` picks a row mode different from the current one: the suite is
  // re-run in that mode, and when it finishes the name prompt opens itself.
  const pendingSaveAfterRun = useRef(false);
  const [extraSaved, setExtraSaved] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  // W panel: "which algorithm wins" tally over the current results.
  const [showSummary, setShowSummary] = useState(false);
  // Run options mirroring the CLI flags (--runs, --save-runs, --students/--tutors,
  // --per-run). State lives in App so launch flags seed it and it survives
  // switching suites; only suites with `supportsOptions` honor them.
  const runs = options.runs ?? DEFAULT_RUNS;
  const override = options.override;
  const perRun = options.perRun === true;
  const capture = options.capture === true;
  const [optionPrompt, setOptionPrompt] = useState<'runs' | 'counts' | null>(null);
  const [optionValue, setOptionValue] = useState('');
  const [optionError, setOptionError] = useState<string | null>(null);
  // Pre-run configuration: harness suites (eval/topk/moderate/all) stop at a
  // runs → counts prompt sequence before their first run, unless the suite was
  // launched with explicit run-option flags (skipConfig). gap/baselines have no
  // options and always run immediately.
  const configNeeded = suite.supportsOptions && !skipConfig;
  const [ready, setReady] = useState(() => !configNeeded);
  const [configStep, setConfigStep] = useState<'runs' | 'counts' | null>(() =>
    configNeeded ? 'runs' : null,
  );
  const [configValue, setConfigValue] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    // Harness suites wait for the pre-run config prompts (ready flips when the
    // runs + counts steps are accepted) before the first run starts.
    if (!ready) {
      return;
    }
    let cancelled = false;
    setState(null);
    setResults(null);
    setSavedPaths([]);
    setError(null);
    setExtraSaved(null);
    setShowHelp(false);
    setShowSummary(false);
    startRef.current = Date.now();

    const run = async (): Promise<void> => {
      try {
        const suiteResults = await suite.run(
          (progress) => {
            if (!cancelled) {
              setState({ ...progress });
            }
          },
          { runs, override, perRun, capture },
        );
        if (!cancelled) {
          setResults(suiteResults);
          if (pendingSaveAfterRun.current) {
            // A save picked a different row mode and re-ran the suite for it:
            // results just landed in that mode — open the filename prompt.
            pendingSaveAfterRun.current = false;
            setSaveAsStep('name');
            setSaveAsName('');
            setSaveAsError(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          pendingSaveAfterRun.current = false;
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [suite, runId, runs, override, perRun, capture, ready]);

  // Save whenever results or the timing toggle changes, so the CSV on disk
  // always matches what is displayed (timing columns zeroed when noTiming).
  useEffect(() => {
    if (results === null) {
      return;
    }
    try {
      const paths = results.map((result) => {
        const rows = noTiming ? stripTimingColumns(result.header, result.rows) : result.rows;
        // Per-run and capture CSVs carry real run numbers → spaced by default.
        const csv = shouldSpaceRows(result.header, rows)
          ? toSpacedCsv(result.header, rows)
          : toCsv(result.header, rows);
        return writeCsvOutput(result.defaultName, csv);
      });
      setSavedPaths(paths);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [results, noTiming]);

  /**
   * Starts the save-as flow for a picked row mode. When the mode matches what's
   * on screen the filename prompt opens immediately; otherwise the suite is
   * re-run in that mode (same cost as P then r) and the prompt opens when the
   * run lands.
   */
  const beginSaveAs = (mode: SaveRowMode): void => {
    const current = currentSaveMode(perRun, capture);
    if (mode === current) {
      setSaveAsStep('name');
      setSaveAsName('');
      setSaveAsError(null);
      return;
    }
    pendingSaveAfterRun.current = true;
    setSaveAsStep(null);
    setSaveAsError(null);
    onOptionsChange({
      perRun: mode !== 'summary',
      capture: mode === 'capture',
    });
  };

  // While help is open it is modal: the panel owns all keys (`isHelpCloseChord`).
  useInput(
    (input, key) => {
      // Save-mode picker is NOT a TextInput — it owns arrow/1-3/Enter/Esc keys.
      if (saveAsStep === 'mode') {
        const index = SAVE_MODES.findIndex((mode) => mode.id === saveAsPick);
        if (input === '1' || input === '2' || input === '3') {
          setSaveAsPick(SAVE_MODES[Number(input) - 1].id);
        } else if (key.upArrow || input === 'k') {
          setSaveAsPick(SAVE_MODES[(index - 1 + SAVE_MODES.length) % SAVE_MODES.length].id);
        } else if (key.downArrow || input === 'j') {
          setSaveAsPick(SAVE_MODES[(index + 1) % SAVE_MODES.length].id);
        } else if (key.return) {
          beginSaveAs(saveAsPick);
        } else if (key.escape || input === 'q' || input === 'm') {
          setSaveAsStep(null);
          setSaveAsError(null);
        }
        return;
      }
      if (saveAsStep === 'name' || optionPrompt !== null || configStep !== null) {
        return; // TextInput handles the keys
      }
      if (input === 'q' || key.escape || input === 'm') {
        onBack();
      } else if (input === 'r' && results !== null) {
        setRunId((id) => id + 1);
      } else if (input === 's' && results !== null && results.length === 1) {
        // Ask which rows to save first; the currently-shown mode is preselected.
        const current = currentSaveMode(perRun, capture);
        if (!suite.supportsOptions) {
          // gap/baselines have no row modes — straight to the filename.
          setSaveAsStep('name');
          setSaveAsName('');
          setSaveAsError(null);
        } else {
          setSaveAsPick(current);
          setSaveAsStep('mode');
          setSaveAsName('');
          setSaveAsError(null);
        }
      } else if (input === 't') {
        onToggleNoTiming();
      } else if (input === 'R' && results !== null && suite.supportsOptions) {
        setOptionPrompt('runs');
        setOptionValue(String(runs));
        setOptionError(null);
      } else if (input === 'C' && results !== null && suite.supportsOptions) {
        setOptionPrompt('counts');
        setOptionValue(override === undefined ? '' : `${override.students}, ${override.tutors}`);
        setOptionError(null);
      } else if (input === 'P' && results !== null && suite.supportsOptions) {
        // Cycle the row mode: summary → per-run (winner) → capture (all
        // strategies, no cap) → summary. Mirrors the CLI row modes.
        onOptionsChange(
          perRun && !capture
            ? { perRun: true, capture: true }
            : capture
              ? { perRun: false, capture: false }
              : { perRun: true, capture: false },
        );
      } else if (input === 'W' && results !== null && results.length === 1) {
        setShowSummary((value) => !value);
      } else if (input === '?' && results !== null) {
        setShowHelp((value) => !value);
      }
    },
    { isActive: !showHelp },
  );

  const elapsed =
    startRef.current === null ? '' : `${((Date.now() - startRef.current) / 1000).toFixed(1)}s`;

  const COUNTS_HINT = 'Enter two positive integers separated by a comma (e.g. 120, 30).';

  /**
   * Applies a "students, tutors" prompt value. Blank resets to auto counts.
   * Returns an error message when the input is invalid, null when applied.
   */
  const applyCountsValue = (text: string): string | null => {
    const trimmed = text.trim();
    if (trimmed === '') {
      onOptionsChange({ override: undefined });
      return null;
    }
    const parts = trimmed.split(/\s*,\s*|\s+/).filter((part) => part !== '');
    if (parts.length !== 2) {
      return COUNTS_HINT;
    }
    const students = Number(parts[0]);
    const tutors = Number(parts[1]);
    if (!Number.isInteger(students) || !Number.isInteger(tutors) || students <= 0 || tutors <= 0) {
      return COUNTS_HINT;
    }
    onOptionsChange({ override: { students, tutors } });
    return null;
  };

  /** Parses and applies the runs/counts prompt value, then re-runs the suite. */
  const submitOption = (): void => {
    if (optionPrompt === 'runs') {
      const value = Number(optionValue.trim());
      if (!Number.isInteger(value) || value <= 0) {
        setOptionError('Runs per test must be a positive integer.');
        return;
      }
      onOptionsChange({ runs: value });
      setOptionPrompt(null);
      setOptionError(null);
      return;
    }
    if (optionPrompt === 'counts') {
      const errorMessage = applyCountsValue(optionValue);
      if (errorMessage !== null) {
        setOptionError(errorMessage);
        return;
      }
      setOptionPrompt(null);
      setOptionError(null);
      return;
    }
    setOptionPrompt(null);
    setOptionError(null);
  };

  /**
   * Advances the pre-run config prompts: runs → counts → start the run.
   * Blank input keeps the current runs / resets counts to auto.
   */
  const acceptConfigStep = (): void => {
    if (configStep === 'runs') {
      const trimmed = configValue.trim();
      if (trimmed !== '') {
        const value = Number(trimmed);
        if (!Number.isInteger(value) || value <= 0) {
          setConfigError('Runs per test must be a positive integer.');
          return;
        }
        onOptionsChange({ runs: value });
      }
      setConfigStep('counts');
      setConfigValue(override === undefined ? '' : `${override.students}, ${override.tutors}`);
      setConfigError(null);
      return;
    }
    if (configStep === 'counts') {
      const errorMessage = applyCountsValue(configValue);
      if (errorMessage !== null) {
        setConfigError(errorMessage);
        return;
      }
      setConfigStep(null);
      setConfigError(null);
      setReady(true);
      return;
    }
    setReady(true);
  };

  const countsLabel = override === undefined ? 'auto' : `${override.students}×${override.tutors}`;

  const heading = (
    <Box>
      <Text bold color="cyan">
        {suite.label}
      </Text>
      <Text color="gray"> — {suite.description}</Text>
    </Box>
  );

  if (showHelp) {
    return <HelpContent onClose={() => setShowHelp(false)} />;
  }

  if (error !== null) {
    return (
      <Box flexDirection="column" padding={1}>
        {heading}
        <Box marginTop={1}>
          <Text color="red">✗ {error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">q back to menu</Text>
        </Box>
      </Box>
    );
  }

  if (!ready) {
    const onCounts = configStep === 'counts';
    return (
      <Box flexDirection="column" padding={1}>
        {heading}
        <Box marginTop={1}>
          <Text bold color="yellow">
            Configure this run
          </Text>
        </Box>
        <Box>
          <Text color="gray" dimColor>
            {onCounts
              ? '2 of 2 — Student/tutor counts override, e.g. 120, 30 (blank = auto)'
              : `1 of 2 — Runs per test (blank = keep current ${runs})`}
          </Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <TextInput
            label={onCounts ? 'Counts:' : 'Runs:'}
            value={configValue}
            onChange={setConfigValue}
            placeholder={onCounts ? 'e.g. 120, 30' : String(runs)}
            onSubmit={acceptConfigStep}
            onCancel={onBack}
          />
          <Text color="gray" dimColor>
            {onCounts ? 'Enter start · Esc back to menu' : 'Enter next · Esc back to menu'}
          </Text>
        </Box>
        {configError !== null && (
          <Box marginTop={1}>
            <Text color="red">✗ {configError}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="cyan" dimColor>
            Current: {runs} run(s) · counts {countsLabel}
            {capture ? ' · capture on' : perRun ? ' · per-run on' : ''}
          </Text>
        </Box>
      </Box>
    );
  }

  if (results === null) {
    const progress = state;
    return (
      <Box flexDirection="column" padding={1}>
        {heading}
        <Box marginTop={1}>
          <Spinner />
          <Text> Running{progress?.currentSuite ? ` — ${progress.currentSuite}` : ''}…</Text>
        </Box>
        {progress !== null && (
          <Box flexDirection="column" marginTop={1}>
            <ProgressBar done={progress.done} total={progress.total} />
            <Box marginTop={1}>
              <Text color="gray">{progress.current}</Text>
            </Box>
            {progress.rows.slice(-3).map((row, i) => (
              <Text key={`done-${progress.rows.length - 3 + i}`} color="green">
                ✓ {row[0]}
              </Text>
            ))}
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            q back to menu
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {heading}
      <Box marginTop={1}>
        <Text color="green">✓ Completed in {elapsed}</Text>
      </Box>
      {suite.supportsOptions && (
        <Box>
          <Text color="gray">
            Each test ran {runs} time(s)
            {runs === DEFAULT_RUNS ? ' (default)' : ''}
            {capture
              ? ' · capture mode (every run: all strategies + per-run time, no cap)'
              : perRun
                ? ' · per-run mode (one row per run, winner column)'
                : ''}
            {override !== undefined ? ` · counts ${override.students}/${override.tutors}` : ''}
          </Text>
        </Box>
      )}
      {results.length === 1 ? (
        <>
          <Box marginTop={1} flexDirection="column">
            {showSummary ? (
              <WinnerSummaryTable header={results[0].header} rows={results[0].rows} />
            ) : (
              <DataTable
                header={results[0].header}
                rows={
                  noTiming
                    ? stripTimingColumns(results[0].header, results[0].rows)
                    : results[0].rows
                }
                highlights={suite.highlights}
              />
            )}
          </Box>
          <Box marginTop={1}>
            <Text color="green">
              Saved {results[0].rows.length} row(s) to: {savedPaths[0] ?? '…'}
              {noTiming ? ' (timing stripped)' : ''}
            </Text>
          </Box>
        </>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {results.map((result, i) => (
            <Text key={result.defaultName} color="green">
              ✓ {result.defaultName} — {result.rows.length} rows → {savedPaths[i]}
            </Text>
          ))}
        </Box>
      )}
      {saveAsStep === 'mode' && results.length === 1 && suite.supportsOptions && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">Save which rows?</Text>
          {SAVE_MODES.map((mode) => (
            <Text
              key={mode.id}
              color={saveAsPick === mode.id ? 'cyan' : 'white'}
              bold={saveAsPick === mode.id}
            >
              {saveAsPick === mode.id ? ' ❯ ' : '   '}
              {mode.label} — {mode.hint}
            </Text>
          ))}
          <Text color="gray" dimColor>
            ↑/↓ or 1-3 choose · Enter next · Esc cancel
          </Text>
          {saveAsError !== null && (
            <Box marginTop={1}>
              <Text color="red">✗ {saveAsError}</Text>
            </Box>
          )}
        </Box>
      )}
      {saveAsStep === 'name' && results.length === 1 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">Save results as (docs/benchmarks/)</Text>
          <TextInput
            label="Name:"
            value={saveAsName}
            onChange={setSaveAsName}
            placeholder={results[0].defaultName}
            onSubmit={() => {
              try {
                const result = results[0];
                const typed = saveAsName.trim() === '' ? result.defaultName : saveAsName;
                const name = typed.toLowerCase().endsWith('.csv') ? typed : `${typed}.csv`;
                const rows = noTiming
                  ? stripTimingColumns(result.header, result.rows)
                  : result.rows;
                const csv = shouldSpaceRows(result.header, rows)
                  ? toSpacedCsv(result.header, rows)
                  : toCsv(result.header, rows);
                const path = writeCsvOutput(name, csv);
                setExtraSaved(path);
                setSaveAsStep(null);
                setSaveAsName('');
              } catch (err) {
                setSaveAsError(err instanceof Error ? err.message : String(err));
              }
            }}
            onCancel={() => {
              setSaveAsStep(null);
              setSaveAsError(null);
            }}
          />
          <Text color="gray" dimColor>
            Enter save · Esc cancel
          </Text>
          {saveAsError !== null && (
            <Box marginTop={1}>
              <Text color="red">✗ {saveAsError}</Text>
            </Box>
          )}
        </Box>
      )}
      {extraSaved !== null && saveAsStep === null && (
        <Box marginTop={1}>
          <Text color="green">✓ Also saved to: {extraSaved}</Text>
        </Box>
      )}
      {optionPrompt !== null && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">
            {optionPrompt === 'runs'
              ? `Runs per test (default ${DEFAULT_RUNS})`
              : 'Counts override for every test — blank resets to auto'}
          </Text>
          <TextInput
            label={optionPrompt === 'runs' ? 'Runs:' : 'Counts:'}
            value={optionValue}
            onChange={setOptionValue}
            placeholder={optionPrompt === 'runs' ? String(DEFAULT_RUNS) : 'e.g. 120, 30'}
            onSubmit={submitOption}
            onCancel={() => {
              setOptionPrompt(null);
              setOptionError(null);
            }}
          />
          <Text color="gray" dimColor>
            Enter apply · Esc cancel
          </Text>
          {optionError !== null && (
            <Box marginTop={1}>
              <Text color="red">✗ {optionError}</Text>
            </Box>
          )}
        </Box>
      )}
      {results.some((result) => (result.dropped ?? 0) > 0) && (
        <Box marginTop={1}>
          <Text color="yellow">
            ⚠ Per-run CSV capped at {MAX_SAVED_RUNS} rows — some runs were skipped. Lower the run
            count (R) or the test sizes (C).
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          r rerun · s save as · t timing {noTiming ? 'off' : 'on'} · W winner summary · ? help · m
          menu · q quit
        </Text>
      </Box>
      {suite.supportsOptions && (
        <Box>
          <Text color="cyan" dimColor>
            R runs:{runs}
            {runs === DEFAULT_RUNS ? ' (default)' : ''} · C counts:
            {override === undefined ? 'auto' : `${override.students}×${override.tutors}`} · P mode:
            {capture ? 'capture' : perRun ? 'per-run' : 'summary'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

/** ── results browser ────────────────────────────────────────────────────── */

export function BrowserScreen({ onBack }: { onBack: () => void }): React.JSX.Element {
  const [files, setFiles] = useState<CsvFileInfo[]>(() => listSavedCsvs());
  const [selected, setSelected] = useState(0);
  const [openFile, setOpenFile] = useState<CsvFileInfo | null>(null);
  const [table, setTable] = useState<string[][] | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const refresh = (): void => {
    const next = listSavedCsvs();
    setFiles(next);
    setSelected((i) => Math.min(i, Math.max(next.length - 1, 0)));
  };

  // While help is open it is modal: the panel owns all keys (`isHelpCloseChord`).
  useInput(
    (input, key) => {
      if (input === '?') {
        setShowHelp((value) => !value);
        return;
      }
      if (openFile !== null) {
        if (input === 'm' || input === 'q' || key.escape || key.backspace) {
          setOpenFile(null);
          setTable(null);
        }
        return;
      }
      if (key.upArrow || input === 'k') {
        setSelected((i) => (i - 1 + Math.max(files.length, 1)) % Math.max(files.length, 1));
      } else if (key.downArrow || input === 'j') {
        setSelected((i) => (i + 1) % Math.max(files.length, 1));
      } else if (key.return && files.length > 0) {
        const file = files[selected];
        setOpenFile(file);
        setTable(parseCsv(readFileSync(file.path, 'utf8')));
      } else if (input === 'r') {
        refresh();
      } else if (input === 'q' || key.escape || input === 'm') {
        onBack();
      }
    },
    { isActive: !showHelp },
  );

  if (showHelp) {
    return <HelpContent onClose={() => setShowHelp(false)} />;
  }

  if (openFile !== null && table !== null) {
    if (table.length === 0) {
      return (
        <Box flexDirection="column" padding={1}>
          <Text bold color="cyan">
            {openFile.name}
          </Text>
          <Box marginTop={1}>
            <Text color="yellow">(empty file — nothing to show)</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              ? help · m back to list · q back to menu
            </Text>
          </Box>
        </Box>
      );
    }
    const [header, ...rows] = table;
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          {openFile.name}
        </Text>
        <Text color="gray">
          {rows.length} rows · {openFile.path}
        </Text>
        <Box marginTop={1} flexDirection="column">
          <DataTable header={header} rows={rows} />
        </Box>
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            ? help · m back to list · q back to menu
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Saved results — docs/benchmarks/
      </Text>
      {files.length === 0 ? (
        <Box marginTop={1}>
          <Text color="gray">No CSVs yet — run a suite first.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {files.map((file, i) => (
            <Box key={file.name} flexDirection="column">
              <Text color={selected === i ? 'cyan' : 'white'} bold={selected === i}>
                {selected === i ? ' ❯ ' : '   '}
                {file.name}
              </Text>
              <Text color="gray">
                {'     '}
                {file.dataRows} rows · {(file.bytes / 1024).toFixed(1)} KB ·{' '}
                {file.modified.toLocaleString()}
              </Text>
            </Box>
          ))}
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑/↓ browse · Enter view · r refresh · ? help · m/q back to menu
        </Text>
      </Box>
    </Box>
  );
}

/** ── notes / scratchpad ─────────────────────────────────────────────────── */

export function NotePadScreen({ onBack }: { onBack: () => void }): React.JSX.Element {
  const [text, setText] = useState('');
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState(() => defaultNoteName());
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const { stdout } = useStdout();

  const editorWidth = Math.max(20, (stdout.columns ?? 80) - 2);
  const viewportHeight = Math.max(5, (stdout.rows ?? 24) - 8);

  const spans = useMemo(() => visualSpans(text, editorWidth), [text, editorWidth]);
  const pos = useMemo(() => cursorPosition(text, cursor, editorWidth), [text, cursor, editorWidth]);
  // When the cursor sits exactly at the end of a full-width wrapped line, show
  // the block at the start of the next line instead of overflowing the border.
  const shifted =
    pos.col === spans[pos.row]?.len &&
    spans[pos.row]?.len === editorWidth &&
    pos.row + 1 < spans.length;
  const cursorRow = shifted ? pos.row + 1 : pos.row;
  const cursorCol = shifted ? 0 : pos.col;
  const scrollTop = Math.min(
    Math.max(cursorRow - (viewportHeight - 1), 0),
    Math.max(0, spans.length - viewportHeight),
  );

  const insert = (fragment: string): void => {
    const cleaned = fragment.replace(/\r/g, ''); // strip CR from pasted Windows text
    setText(text.slice(0, cursor) + cleaned + text.slice(cursor));
    setCursor(cursor + cleaned.length);
  };

  // While help is open it is modal: the panel owns all keys (`isHelpCloseChord`).
  useInput(
    (input, key) => {
      if (saving) {
        return; // TextInput handles the keys
      }
      if (key.ctrl && input === 'o') {
        setShowHelp((value) => !value);
        return;
      }
      if (savedPath !== null || saveError !== null) {
        setSavedPath(null);
        setSaveError(null);
      }
      if (key.escape) {
        onBack();
        return;
      }
      if (key.ctrl && input === 's') {
        setFileName('');
        setSaving(true);
        return;
      }
      if (key.return) {
        insert('\n');
        return;
      }
      if (key.backspace && cursor > 0) {
        setText(text.slice(0, cursor - 1) + text.slice(cursor));
        setCursor(cursor - 1);
        return;
      }
      if (key.delete && cursor < text.length) {
        setText(text.slice(0, cursor) + text.slice(cursor + 1));
        return;
      }
      if (key.leftArrow && cursor > 0) {
        setCursor(cursor - 1);
        return;
      }
      if (key.rightArrow && cursor < text.length) {
        setCursor(cursor + 1);
        return;
      }
      if (key.upArrow) {
        setCursor(indexFromPosition(text, pos.row - 1, pos.col, editorWidth));
        return;
      }
      if (key.downArrow) {
        setCursor(indexFromPosition(text, pos.row + 1, pos.col, editorWidth));
        return;
      }
      if (input && !key.ctrl) {
        insert(input);
      }
    },
    { isActive: !showHelp },
  );

  // Defined before the early help return so future hooks can't slip in between.
  const save = (): void => {
    try {
      const name = fileName.trim() === '' ? defaultNoteName() : fileName;
      const path = saveNoteFile(name, text);
      setSavedPath(path);
      setSaving(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  };

  if (showHelp) {
    return <HelpContent closeKeys="Ctrl+O" onClose={() => setShowHelp(false)} />;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold color="cyan">
          Notes / scratchpad
        </Text>
        <Text color="gray"> — type freely, Ctrl+S to save to a file</Text>
      </Box>

      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        {spans.slice(scrollTop, scrollTop + viewportHeight).map((span, i) => {
          const rowIndex = scrollTop + i;
          const line = text.slice(span.start, span.start + span.len);
          if (rowIndex === cursorRow) {
            const before = line.slice(0, cursorCol);
            const at = line[cursorCol] ?? ' ';
            const after = line.slice(cursorCol + 1);
            return (
              <Text key={rowIndex}>
                {before}
                <Text inverse>{at}</Text>
                {after}
              </Text>
            );
          }
          return <Text key={rowIndex}>{line}</Text>;
        })}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {text.length} chars · row {cursorRow + 1}, col {cursorCol + 1} · Ctrl+S save · Ctrl+O help
          · Esc back
        </Text>
      </Box>

      {saving && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">Save note to docs/notes/</Text>
          <TextInput
            label="Name:"
            value={fileName}
            onChange={setFileName}
            onSubmit={save}
            onCancel={() => setSaving(false)}
            placeholder={defaultNoteName()}
          />
          <Text color="gray" dimColor>
            Enter save · Esc cancel
          </Text>
        </Box>
      )}

      {savedPath !== null && !saving && (
        <Box marginTop={1}>
          <Text color="green">✓ Saved to {savedPath}</Text>
        </Box>
      )}

      {saveError !== null && !saving && (
        <Box marginTop={1}>
          <Text color="red">✗ {saveError}</Text>
        </Box>
      )}
    </Box>
  );
}
