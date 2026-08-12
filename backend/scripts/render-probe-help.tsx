import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { render } from 'ink';
import { writeFileSync } from 'fs';
import { App } from '../src/core/evaluation/tui/app';

const fakeStdin = new Readable({ read() {} }) as unknown as NodeJS.ReadStream;
(fakeStdin as { isTTY?: boolean }).isTTY = true;
(fakeStdin as { setRawMode?: (mode: boolean) => unknown }).setRawMode = () => fakeStdin;
(fakeStdin as { ref?: () => unknown }).ref = () => fakeStdin;
(fakeStdin as { unref?: () => unknown }).unref = () => fakeStdin;

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

const instance = render(<App />, {
  stdin: fakeStdin,
  stdout: new FakeStdout() as unknown as NodeJS.WriteStream,
});

// Open the help panel from the menu exactly like a user pressing `?`.
setTimeout(() => {
  fakeStdin.push('?');
}, 800);

setTimeout(() => {
  const finalFrame = output.split('\u001b[2J').pop() ?? output;
  writeFileSync('docs/notes/probe-help.txt', finalFrame);
  instance.unmount();
  process.exit(0);
}, 3000);

setTimeout(() => process.exit(1), 10000).unref();
