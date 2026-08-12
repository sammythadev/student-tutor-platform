import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import figlet from 'figlet';
import { readFileSync } from 'fs';
import { columnWidths, parseCsv, toCsv, writeCsvOutput } from '@core/evaluation/cli-output';
import { defaultNoteName, listSavedCsvs, saveNoteFile, type CsvFileInfo } from './files';
import { cursorPosition, indexFromPosition, visualSpans } from './text-utils';
import { SUITES, type Suite, type SuiteResult, type SuiteRunState } from './suites';

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

/** Column-aligned table that fits the terminal width and tints best-in-class cells. */
function DataTable({
  header,
  rows,
  highlights = NO_HIGHLIGHTS,
}: DataTableProps): React.JSX.Element {
  const { stdout } = useStdout();
  const availableWidth = Math.max(24, (stdout.columns ?? 80) - 4);
  const columnGap = 2;

  const { widths, bestCells } = useMemo(() => {
    const base = columnWidths(header, rows);
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
      rows.forEach((row, rowIndex) => {
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
  }, [header, rows, highlights, availableWidth]);

  const fit = (value: string, width: number): string =>
    value.length <= width ? value : `${value.slice(0, Math.max(width - 1, 1))}…`;

  return (
    <Box flexDirection="column">
      <Box>
        {header.map((column, i) => (
          <Box key={column} width={widths[i]}>
            <Text bold color="cyan">
              {fit(column, widths[i])}
            </Text>
          </Box>
        ))}
      </Box>
      {rows.map((row, rowIndex) => (
        <Box key={`row-${rowIndex}`}>
          {row.map((value, columnIndex) => (
            <Box key={`${rowIndex}-${columnIndex}`} width={widths[columnIndex] ?? 6}>
              <Text color={bestCells.has(`${columnIndex}:${rowIndex}`) ? 'green' : undefined}>
                {fit(value, widths[columnIndex] ?? 6)}
              </Text>
            </Box>
          ))}
        </Box>
      ))}
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
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      onSubmit();
    } else if (key.backspace) {
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

const BANNER_FONTS = ['ANSI Shadow', 'Standard', 'Small'];

/** Claude-style figlet banner, choosing the widest font that fits the screen. */
function renderBanner(text: string, availableWidth: number): string[] {
  for (const font of BANNER_FONTS) {
    try {
      const art = figlet.textSync(text, { font: font as figlet.Fonts });
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
  const itemCount = SUITES.length + 2; // suites + "browse" + "notes"

  const banner = useMemo(
    () => renderBanner('EVAL RUNNER', Math.max(40, (stdout.columns ?? 100) - 2)),
    [stdout.columns],
  );
  const latest = useMemo(() => listSavedCsvs()[0], []);

  useInput((input, key) => {
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
    } else if (input === 'q' || key.escape) {
      onQuit();
    }
  });

  const showBanner = (stdout.rows ?? 40) >= 28;

  return (
    <Box flexDirection="column" padding={1}>
      {showBanner &&
        banner.map((line) => (
          <Text key={line} color="magenta">
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
          b browse · n notes · q quit
        </Text>
      </Box>
    </Box>
  );
}

/** ── run view ───────────────────────────────────────────────────────────── */

export function RunScreen({
  suite,
  onBack,
}: {
  suite: Suite;
  onBack: () => void;
}): React.JSX.Element {
  const [runId, setRunId] = useState(0);
  const [state, setState] = useState<SuiteRunState | null>(null);
  const [results, setResults] = useState<SuiteResult[] | null>(null);
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveAs, setSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [extraSaved, setExtraSaved] = useState<string | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setResults(null);
    setSavedPaths([]);
    setError(null);
    setExtraSaved(null);
    startRef.current = Date.now();

    const run = async (): Promise<void> => {
      try {
        const suiteResults = await suite.run((progress) => {
          if (!cancelled) {
            setState({ ...progress });
          }
        });
        if (cancelled) {
          return;
        }
        const paths = suiteResults.map((result) => {
          const csv = toCsv(result.header, result.rows);
          return writeCsvOutput(result.defaultName, csv);
        });
        setResults(suiteResults);
        setSavedPaths(paths);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [suite, runId]);

  useInput((input, key) => {
    if (saveAs) {
      return; // TextInput handles the keys
    }
    if (input === 'q' || key.escape || input === 'm') {
      onBack();
    } else if (input === 'r' && results !== null) {
      setRunId((id) => id + 1);
    } else if (input === 's' && results !== null && results.length === 1) {
      setSaveAs(true);
      setSaveAsName('');
    }
  });

  const elapsed =
    startRef.current === null ? '' : `${((Date.now() - startRef.current) / 1000).toFixed(1)}s`;

  const heading = (
    <Box>
      <Text bold color="cyan">
        {suite.label}
      </Text>
      <Text color="gray"> — {suite.description}</Text>
    </Box>
  );

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

      {results.length === 1 ? (
        <>
          <Box marginTop={1} flexDirection="column">
            <DataTable
              header={results[0].header}
              rows={results[0].rows}
              highlights={suite.highlights}
            />
          </Box>
          <Box marginTop={1}>
            <Text color="green">
              Saved {results[0].rows.length} row(s) to: {savedPaths[0]}
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

      {saveAs && results.length === 1 && (
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
                const name = saveAsName.trim() === '' ? result.defaultName : saveAsName;
                const path = writeCsvOutput(name, toCsv(result.header, result.rows));
                setExtraSaved(path);
                setSaveAs(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
              }
            }}
            onCancel={() => setSaveAs(false)}
          />
          <Text color="gray" dimColor>
            Enter save · Esc cancel
          </Text>
        </Box>
      )}

      {extraSaved !== null && !saveAs && (
        <Box marginTop={1}>
          <Text color="green">✓ Also saved to: {extraSaved}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          r rerun · s save as · m menu · q quit
        </Text>
      </Box>
    </Box>
  );
}

/** ── results browser ────────────────────────────────────────────────────── */

export function BrowserScreen({ onBack }: { onBack: () => void }): React.JSX.Element {
  const [files, setFiles] = useState<CsvFileInfo[]>(() => listSavedCsvs());
  const [selected, setSelected] = useState(0);
  const [openFile, setOpenFile] = useState<CsvFileInfo | null>(null);
  const [table, setTable] = useState<string[][] | null>(null);

  const refresh = (): void => {
    const next = listSavedCsvs();
    setFiles(next);
    setSelected((i) => Math.min(i, Math.max(next.length - 1, 0)));
  };

  useInput((input, key) => {
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
  });

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
              m back to list · q back to menu
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
            m back to list · q back to menu
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
          ↑/↓ browse · Enter view · r refresh · m/q back to menu
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
  const { stdout } = useStdout();

  const editorWidth = Math.max(20, (stdout.columns ?? 80) - 2);
  const viewportHeight = Math.max(5, (stdout.rows ?? 24) - 8);

  const spans = useMemo(() => visualSpans(text, editorWidth), [text, editorWidth]);
  const pos = useMemo(() => cursorPosition(text, cursor, editorWidth), [text, cursor, editorWidth]);
  const scrollTop = Math.min(
    Math.max(pos.row - (viewportHeight - 1), 0),
    Math.max(0, spans.length - viewportHeight),
  );

  const insert = (fragment: string): void => {
    setText(text.slice(0, cursor) + fragment + text.slice(cursor));
    setCursor(cursor + fragment.length);
  };

  useInput((input, key) => {
    if (saving) {
      return; // TextInput handles the keys
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
  });

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
          if (rowIndex === pos.row) {
            const before = line.slice(0, pos.col);
            const at = line[pos.col] ?? ' ';
            const after = line.slice(pos.col + 1);
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
          {text.length} chars · row {pos.row + 1}, col {pos.col + 1} · Ctrl+S save · Esc back
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
