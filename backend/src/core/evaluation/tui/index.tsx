import { pathToFileURL } from 'url';
import { render } from 'ink';
import { App } from './app';
import { parseTuiArgs, tuiUsage } from './launch';

/**
 * Entry point for the eval TUI (`pnpm run tui`), which runs as an ES module
 * (ink is ESM-only). `require.main === module` does not exist under ESM, so
 * direct invocation is detected via the entry file URL instead.
 *
 * Arguments jump straight into a screen and/or seed the run options — the same
 * flags the CLI harness accepts, resolved by launch.ts:
 *   pnpm run tui -- gap --no-timing            → gap suite, timing zeroed
 *   pnpm run tui -- eval --save-runs 100       → eval, every run saved to the CSV
 *   pnpm run tui -- topk --students 40 --tutors 12 → topk sweep, counts overridden
 */
const isDirectRun =
  typeof require !== 'undefined'
    ? require.main === module
    : pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  if (process.stdin.isTTY !== true) {
    console.error(
      'The eval TUI needs an interactive terminal (TTY).\n' +
        'Pipe output through the CLI scripts instead: pnpm run eval / eval:topk / eval:gap / eval:baselines',
    );
    process.exit(1);
  }

  const launch = parseTuiArgs(process.argv.slice(2));
  if (launch.requestedHelp) {
    console.error(tuiUsage());
    process.exit(0);
  }
  if (launch.errors.length > 0) {
    for (const message of launch.errors) {
      console.error(`  ✗ ${message}`);
    }
    console.error(`\n${tuiUsage()}`);
    process.exit(1);
  }
  for (const flag of launch.ignored) {
    console.error(
      `Note: ${flag} is a CLI-script flag and has no effect in the TUI — results always auto-save to docs/benchmarks/.`,
    );
  }

  render(<App launch={launch} />);
}
