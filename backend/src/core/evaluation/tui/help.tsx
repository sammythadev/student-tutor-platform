import React, { useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import {
  BROWSER_KEYS,
  CLI_FLAG_ROWS,
  GLOBAL_KEYS,
  isHelpCloseChord,
  MENU_KEYS,
  NOTES_KEYS,
  RUN_KEYS,
  type HelpSection,
} from './help-data';

const SCREEN_KEY_WIDTH = 20;
const FLAG_KEY_WIDTH = 34;

type Segment =
  | { kind: 'title'; text: string }
  | { kind: 'row'; keys: string; action: string }
  | { kind: 'blank' };

function sectionSegments(section: HelpSection): Segment[] {
  return [
    { kind: 'title', text: section.title },
    ...section.rows.map((row): Segment => ({ kind: 'row', keys: row.keys, action: row.action })),
    { kind: 'blank' },
  ];
}

interface ScrollLine {
  keyWidth: number;
  maxActionWidth: number;
  left?: Segment;
  right?: Segment;
  full?: Segment;
}

const fit = (value: string, width: number): string =>
  value.length <= width ? value : `${value.slice(0, Math.max(width - 1, 1))}…`;

function renderSegment(
  segment: Segment | undefined,
  keyWidth: number,
  maxActionWidth: number,
): React.JSX.Element {
  if (segment === undefined || segment.kind === 'blank') {
    return <Box height={1} />;
  }
  if (segment.kind === 'title') {
    return (
      <Box height={1}>
        <Text bold color="cyan">
          {fit(segment.text, maxActionWidth + keyWidth)}
        </Text>
      </Box>
    );
  }
  return (
    <Box height={1}>
      <Box width={keyWidth}>
        <Text color="green">{fit(segment.keys, keyWidth)}</Text>
      </Box>
      <Text>{fit(segment.action, maxActionWidth)}</Text>
    </Box>
  );
}

/**
 * Help reference shown while help is open. It REPLACES the hosting screen's
 * content (the host stays mounted, so its state is preserved) and is capped to
 * the terminal height with deterministic row slicing — if the combined output
 * ever exceeded the terminal height, ink switches to a full-clear render path
 * that desyncs its line tracking and leaves stale help rows on screen after
 * closing (the reported "? won't close help" bug).
 *
 * The panel is modal: it owns its close keys (`?`, Esc, q, m, Ctrl+O — see
 * `isHelpCloseChord`), so closing never depends on the host screen's handler.
 * `closeKeys` advertises the chord in the footer ('?' or 'Ctrl+O').
 */
export function HelpContent({
  closeKeys = '?',
  onClose,
}: {
  closeKeys?: string;
  onClose: () => void;
}): React.JSX.Element {
  const { stdout } = useStdout();
  const rows = stdout.rows ?? 24;
  const columns = stdout.columns ?? 100;

  const headerLines = 2; // title + subtitle
  const footerLines = 1; // close hint
  const maxHeight = Math.max(10, rows - 2);
  const viewport = Math.max(4, maxHeight - 2 - headerLines - footerLines);
  const halfWidth = Math.max(24, Math.floor((columns - 6) / 2));

  const leftSegments = useMemo<Segment[]>(
    () => [
      ...sectionSegments(GLOBAL_KEYS),
      ...sectionSegments(MENU_KEYS),
      ...sectionSegments(BROWSER_KEYS),
    ],
    [],
  );
  const rightSegments = useMemo<Segment[]>(
    () => [...sectionSegments(RUN_KEYS), ...sectionSegments(NOTES_KEYS)],
    [],
  );
  const flagSegments = useMemo<Segment[]>(
    () => [
      { kind: 'title', text: 'CLI flags — pnpm run eval* (TUI: --no-timing, suite id)' },
      ...CLI_FLAG_ROWS.map((row): Segment => ({ kind: 'row', keys: row.keys, action: row.action })),
    ],
    [],
  );

  const scrollLines = useMemo<ScrollLine[]>(() => {
    const columnLines: ScrollLine[] = [];
    const count = Math.max(leftSegments.length, rightSegments.length);
    for (let i = 0; i < count; i += 1) {
      columnLines.push({
        keyWidth: SCREEN_KEY_WIDTH,
        maxActionWidth: Math.max(8, halfWidth - SCREEN_KEY_WIDTH - 2),
        left: leftSegments[i],
        right: rightSegments[i],
      });
    }
    return [
      ...columnLines,
      {
        keyWidth: SCREEN_KEY_WIDTH,
        maxActionWidth: Math.max(8, halfWidth - SCREEN_KEY_WIDTH - 2),
        left: { kind: 'blank' },
        right: { kind: 'blank' },
      },
      ...flagSegments.map(
        (segment): ScrollLine => ({
          keyWidth: FLAG_KEY_WIDTH,
          maxActionWidth: Math.max(8, columns - 6 - FLAG_KEY_WIDTH - 2),
          full: segment,
        }),
      ),
    ];
  }, [leftSegments, rightSegments, flagSegments, halfWidth, columns]);

  const maxScroll = Math.max(0, scrollLines.length - viewport);
  const [scrollTop, setScrollTop] = useState(0);
  const clamped = Math.min(scrollTop, maxScroll);

  useInput((input, key) => {
    if (isHelpCloseChord(input, key)) {
      onClose();
    } else if (input === 'j' || key.downArrow) {
      setScrollTop((value) => Math.min(value + 1, maxScroll));
    } else if (input === 'k' || key.upArrow) {
      setScrollTop((value) => Math.max(value - 1, 0));
    } else if (key.pageDown) {
      setScrollTop((value) => Math.min(value + viewport, maxScroll));
    } else if (key.pageUp) {
      setScrollTop((value) => Math.max(value - viewport, 0));
    }
  });

  const visible = scrollLines.slice(clamped, clamped + viewport);

  return (
    <Box
      flexDirection="column"
      height={maxHeight}
      paddingX={1}
      borderStyle="round"
      borderColor="cyan"
    >
      <Text bold color="cyan">
        Help — EVAL RUNNER
      </Text>
      <Text color="gray" dimColor>
        Keys per screen · CLI flags below
        {maxScroll > 0 ? ' · j/k or ↑/↓ scroll' : ''}
      </Text>
      <Box flexDirection="column">
        {visible.map((line, index) =>
          line.full !== undefined ? (
            <Box key={`f-${index}`} flexDirection="row" height={1}>
              {renderSegment(line.full, line.keyWidth, line.maxActionWidth)}
            </Box>
          ) : (
            <Box key={`c-${index}`} flexDirection="row" height={1}>
              <Box width={halfWidth}>
                {renderSegment(line.left, line.keyWidth, line.maxActionWidth)}
              </Box>
              <Box width={halfWidth}>
                {renderSegment(line.right, line.keyWidth, line.maxActionWidth)}
              </Box>
            </Box>
          ),
        )}
      </Box>
      <Text color="gray" dimColor>
        {closeKeys} close help{maxScroll > 0 ? ' · j/k or ↑/↓ scroll' : ''}
      </Text>
    </Box>
  );
}
