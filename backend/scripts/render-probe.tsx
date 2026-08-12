import { Readable } from 'stream';
import { render } from 'ink';
import { App } from '../src/core/evaluation/tui/app';

const fakeStdin = new Readable({ read() {} }) as unknown as NodeJS.ReadStream;
// Mimic a raw-mode TTY stdin so ink's renderer accepts it.
(fakeStdin as { isTTY?: boolean }).isTTY = true;
(fakeStdin as { setRawMode?: (mode: boolean) => unknown }).setRawMode = () => fakeStdin;
(fakeStdin as { ref?: () => unknown }).ref = () => fakeStdin;
(fakeStdin as { unref?: () => unknown }).unref = () => fakeStdin;

const send = (data: string, afterMs: number): void => {
  setTimeout(() => fakeStdin.push(data), afterMs);
};

render(<App initial="notes" />, { stdin: fakeStdin });

send('multi-line\rnote with \r\nCR stripped', 600);
send('\u0013', 1200); // Ctrl+S
send('probe-final', 1600);
send('\r', 2000); // Enter
setTimeout(() => process.exit(0), 2700);
