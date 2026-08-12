import React, { useState } from 'react';
import { Text, useApp } from 'ink';
import { getSuite } from './suites';
import { BrowserScreen, MenuScreen, NotePadScreen, RunScreen } from './views';

type Screen =
  | { name: 'menu' }
  | { name: 'run'; suiteId: string }
  | { name: 'browser' }
  | { name: 'notes' };

/**
 * Root of the eval TUI. `initial` lets `pnpm run tui -- <suiteId|browser|notes>`
 * skip the menu and jump straight into a screen.
 */
export function App({ initial }: { initial?: string }): React.JSX.Element {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>(() => {
    if (initial === 'browser' || initial === 'results') {
      return { name: 'browser' };
    }
    if (initial === 'notes' || initial === 'scratchpad') {
      return { name: 'notes' };
    }
    if (initial !== undefined && getSuite(initial) !== undefined) {
      return { name: 'run', suiteId: initial };
    }
    return { name: 'menu' };
  });

  if (screen.name === 'menu') {
    return (
      <MenuScreen
        onRun={(suiteId) => setScreen({ name: 'run', suiteId })}
        onBrowse={() => setScreen({ name: 'browser' })}
        onNotes={() => setScreen({ name: 'notes' })}
        onQuit={() => exit()}
      />
    );
  }

  if (screen.name === 'run') {
    const suite = getSuite(screen.suiteId);
    if (suite === undefined) {
      return <Text color="red">Unknown suite: {screen.suiteId}</Text>;
    }
    return <RunScreen suite={suite} onBack={() => setScreen({ name: 'menu' })} />;
  }

  if (screen.name === 'notes') {
    return <NotePadScreen onBack={() => setScreen({ name: 'menu' })} />;
  }

  return <BrowserScreen onBack={() => setScreen({ name: 'menu' })} />;
}
