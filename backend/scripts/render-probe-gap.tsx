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

// initialNoTiming=true must zero greedyMs/optimalMs in the table + saved CSV.
const instance = render(<App initial="gap" initialNoTiming />, {
  stdin: fakeStdin,
  stdout: new FakeStdout() as unknown as NodeJS.WriteStream,
});

setTimeout(() => {
  const finalFrame = output.split('\u001b[2J').pop() ?? output;
  writeFileSync('docs/notes/probe-gap-notiming.txt', finalFrame);
  instance.unmount();
  process.exit(0);
}, 60000);

setTimeout(() => process.exit(1), 90000).unref();
