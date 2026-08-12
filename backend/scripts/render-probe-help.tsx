import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { render } from 'ink';
import { appendFileSync, readFileSync, writeFileSync } from 'fs';
import { App } from '../src/core/evaluation/tui/app';

const LOG = 'docs/notes/probe-help-toggle.txt';

const fakeStdin = new Readable({ read() {} }) as unknown as NodeJS.ReadStream;
(fakeStdin as { isTTY?: boolean }).isTTY = true;
(fakeStdin as { setRawMode?: (mode: boolean) => unknown }).setRawMode = () => fakeStdin;
(fakeStdin as { ref?: () => unknown }).ref = () => fakeStdin;
(fakeStdin as { unref?: () => unknown }).unref = () => fakeStdin;

// A SHORT terminal reproduces the reported bug: menu + help exceeded the
// terminal height, so ink switched to its full-clear render path and left the
// help panel stuck on screen after closing.
(process.stdout as { columns?: number }).columns = 120;
(process.stdout as { rows?: number }).rows = 24;

const ESC = String.fromCharCode(27);
const ERASE_RE = new RegExp(`${ESC}\\[2K`, 'g');
const CLEAR_RE = new RegExp(`${ESC}\\[2J`, 'g');

let output = '';
let eraseOps = 0;
let clearOps = 0;
class FakeStdout extends EventEmitter {
  public columns = 120;
  public rows = 24;
  public write(chunk: string): boolean {
    output += chunk;
    eraseOps += (chunk.match(ERASE_RE) ?? []).length;
    clearOps += (chunk.match(CLEAR_RE) ?? []).length;
    return true;
  }
}

const frame = (): string => output.split('\u001b[2J').pop() ?? output;

const instance = render(<App />, {
  stdin: fakeStdin,
  stdout: new FakeStdout() as unknown as NodeJS.WriteStream,
});

// First '?' opens the help panel.
setTimeout(() => {
  output = '';
  eraseOps = 0;
  clearOps = 0;
  fakeStdin.push('?');
}, 800);

setTimeout(() => {
  writeFileSync('docs/notes/probe-help-after-open.txt', frame());
  appendFileSync(LOG, `open: clearOps=${clearOps} eraseOps=${eraseOps}\n`);
  // Scroll to the bottom so the flags section enters the viewport. Push keys
  // one at a time with gaps — a real keyboard does, and rapid pushes would be
  // coalesced into a single chunk by the Readable.
  for (let i = 0; i < 12; i += 1) {
    setTimeout(() => fakeStdin.push('j'), 60 * i);
  }
}, 2000);

setTimeout(() => {
  writeFileSync('docs/notes/probe-help-after-scroll.txt', frame());
  // Second '?' should close it again.
  output = '';
  eraseOps = 0;
  clearOps = 0;
  fakeStdin.push('?');
}, 2600);

setTimeout(() => {
  const afterClose = frame();
  writeFileSync('docs/notes/probe-help-after-close.txt', afterClose);
  const opened = readFileSync('docs/notes/probe-help-after-open.txt', 'utf8').includes(
    'Help — EVAL RUNNER',
  );
  const stillOpen = afterClose.includes('Help — EVAL RUNNER');
  const scrolled = readFileSync('docs/notes/probe-help-after-scroll.txt', 'utf8').includes(
    'wall-clock',
  );
  appendFileSync(
    LOG,
    `close: clearOps=${clearOps} eraseOps=${eraseOps} opened=${opened} stillOpenAfterClose=${stillOpen} scrolledToFlags=${scrolled}\n`,
  );
  instance.unmount();
  process.exit(0);
}, 3400);

setTimeout(() => process.exit(1), 10000).unref();
