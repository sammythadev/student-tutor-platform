import { pathToFileURL } from 'url';
import { render } from 'ink';
import { App } from './app';

/**
 * Entry point for the eval TUI (`pnpm run tui`), which runs as an ES module
 * (ink is ESM-only). `require.main === module` does not exist under ESM, so
 * direct invocation is detected via the entry file URL instead.
 *
 * Optional argument jumps straight into a screen:
 *   pnpm run tui -- gap        → run the optimality-gap suite directly
 *   pnpm run tui -- browser    → open the saved-results browser
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

  render(<App initial={process.argv[2]} initialNoTiming={process.argv.includes('--no-timing')} />);
}
