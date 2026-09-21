import React, { useState } from 'react';
import { Text, useApp } from 'ink';
import { DEFAULT_RUNS } from '@core/evaluation/evaluation-harness';
import { getSuite, type RunOptions } from './suites';
import { BrowserScreen, MenuScreen, NotePadScreen, RunScreen } from './views';
import type { TuiLaunch } from './launch';

type Screen =
  | { name: 'menu' }
  | { name: 'run'; suiteId: string }
  | { name: 'browser' }
  | { name: 'notes' };

/**
 * Root of the eval TUI.
 *
 * `initial` / `initialNoTiming` let `pnpm run tui -- <suiteId|browser|notes>`
 * skip the menu (kept for the render probes and back-compat). `launch` is the
 * full parsed argv from the real entry (launch.ts) — it supersedes `initial`
 * and also seeds the run options (`runs` / count override / per-run mode) plus
 * the timing toggle, so `pnpm run tui -- eval --save-runs 100` starts the eval
 * suite in per-run mode with 100 runs. The options state lives HERE so it
 * survives navigating back to the menu and picking another suite; the run view
 * edits it through `R` / `C` / `P`.
 */
export function App({
  initial,
  initialNoTiming = false,
  launch,
}: {
  initial?: string;
  initialNoTiming?: boolean;
  launch?: TuiLaunch;
}): React.JSX.Element {
  const { exit } = useApp();
  const target = launch?.target ?? initial;
  const [noTiming, setNoTiming] = useState(launch?.noTiming ?? initialNoTiming);
  const [options, setOptions] = useState<RunOptions>(() => ({
    runs: launch?.runs ?? DEFAULT_RUNS,
    override: launch?.override,
    perRun: launch?.perRun ?? false,
  }));
  const [screen, setScreen] = useState<Screen>(() => {
    if (target === 'browser' || target === 'results') {
      return { name: 'browser' };
    }
    if (target === 'notes' || target === 'scratchpad') {
      return { name: 'notes' };
    }
    if (target !== undefined && getSuite(target) !== undefined) {
      return { name: 'run', suiteId: target };
    }
    return { name: 'menu' };
  });

  const applyOptions = (patch: Partial<RunOptions>): void =>
    setOptions((previous) => ({ ...previous, ...patch }));

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
    return (
      <RunScreen
        suite={suite}
        onBack={() => setScreen({ name: 'menu' })}
        noTiming={noTiming}
        onToggleNoTiming={() => setNoTiming((value) => !value)}
        options={options}
        onOptionsChange={applyOptions}
        // Launch flags already picked the run values — skip the prompts.
        skipConfig={launch?.optionsExplicit === true}
      />
    );
  }

  if (screen.name === 'notes') {
    return <NotePadScreen onBack={() => setScreen({ name: 'menu' })} />;
  }

  return <BrowserScreen onBack={() => setScreen({ name: 'menu' })} />;
}
