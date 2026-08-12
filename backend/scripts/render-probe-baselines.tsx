import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { render } from 'ink';
import { writeFileSync } from 'fs';
import { App } from '../src/core/evaluation/tui/app';

const fakeStdin = new Readable({ read() {} }) as unknown as NodeJS.ReadStream;
// Mimic a raw-mode TTY stdin so ink's renderer accepts it.
(fakeStdin as { isTTY?: boolean }).isTTY = true;
(fakeStdin as { setRawMode?: (mode: boolean) => unknown }).setRawMode = () => fakeStdin;
(fakeStdin as { ref?: () => unknown }).ref = () => fakeStdin;
(fakeStdin as { unref?: () => unknown }).unref = () => fakeStdin;

// A real TTY exposes .columns on process.stdout; mirror that so DataTable's
// width scaling behaves like the real terminal.
(process.stdout as { columns?: number }).columns = 140;
(process.stdout as { rows?: number }).rows = 40;

let output = '';
class FakeStdout extends EventEmitter {
  public columns = 140;
  public rows = 40;
  public write(chunk: string): boolean {
    output += chunk;
    return true;
  }
}
const instance = render(<App initial="baselines" />, {
  stdin: fakeStdin,
  stdout: new FakeStdout() as unknown as NodeJS.WriteStream,
});

// Let the suite run to completion, then capture and dump the final frame.
setTimeout(() => {
  const finalFrame = output.split('\u001b[2J').pop() ?? output;
  writeFileSync('docs/notes/probe-baselines.txt', finalFrame);
  instance.unmount();
  process.exit(0);
}, 120000);

// Safety: force-exit if the suite somehow hangs.
setTimeout(() => process.exit(1), 150000).unref();
