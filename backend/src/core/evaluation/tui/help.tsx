import React from 'react';
import { Box, Text, useStdout } from 'ink';
import {
  BROWSER_KEYS,
  CLI_FLAG_ROWS,
  GLOBAL_KEYS,
  MENU_KEYS,
  NOTES_KEYS,
  RUN_KEYS,
  type HelpSection,
} from './help-data';

const SCREEN_KEY_WIDTH = 20;
const FLAG_KEY_WIDTH = 34;

function Section({ title, rows, keyWidth }: HelpSection & { keyWidth: number }): React.JSX.Element {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="cyan">
        {title}
      </Text>
      {rows.map((row) => (
        <Box key={row.keys} marginLeft={1}>
          <Box width={keyWidth}>
            <Text color="green">{row.keys}</Text>
          </Box>
          <Text>{row.action}</Text>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Reference panel shown inside a screen when help is toggled. Keybindings are
 * laid out in two balanced columns, with the CLI flags full-width below. It is
 * rendered inline (not an overlay), so the hosting screen keeps its state.
 *
 * `closeKeys` lets the hosting screen advertise its actual help-toggle chord:
 * '?' on the menu / run / browser, 'Ctrl+O' in the notes editor (where '?'
 * must stay typable).
 */
export function HelpContent({ closeKeys = '?' }: { closeKeys?: string }): React.JSX.Element {
  const { stdout } = useStdout();
  const availableWidth = Math.max(60, (stdout.columns ?? 100) - 4);
  const columnWidth = Math.floor((availableWidth - 1) / 2);

  return (
    <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">
        Help — EVAL RUNNER
      </Text>
      <Text color="gray" dimColor>
        Keys per screen · below them, the CLI flags accepted by pnpm run eval*
      </Text>

      <Box flexDirection="row" marginTop={1}>
        <Box flexDirection="column" width={columnWidth} paddingRight={1}>
          <Section {...GLOBAL_KEYS} keyWidth={SCREEN_KEY_WIDTH} />
          <Section {...MENU_KEYS} keyWidth={SCREEN_KEY_WIDTH} />
          <Section {...BROWSER_KEYS} keyWidth={SCREEN_KEY_WIDTH} />
        </Box>
        <Box flexDirection="column" width={columnWidth}>
          <Section {...RUN_KEYS} keyWidth={SCREEN_KEY_WIDTH} />
          <Section {...NOTES_KEYS} keyWidth={SCREEN_KEY_WIDTH} />
        </Box>
      </Box>

      <Section
        title="CLI flags — pnpm run eval* (the TUI also takes --no-timing and a suite id)"
        rows={CLI_FLAG_ROWS}
        keyWidth={FLAG_KEY_WIDTH}
      />

      <Text color="gray" dimColor>
        {closeKeys} close help
      </Text>
    </Box>
  );
}
