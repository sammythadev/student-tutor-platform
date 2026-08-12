import { EventEmitter } from 'events';
import { render } from 'ink';
import { App } from '../src/core/evaluation/tui/app';

// Render probe used during development to verify the TUI screens and input
// flows in a non-interactive context. A fake TTY stdin lets ink's input hooks
// initialize and receive keypresses without a real pty.
const fakeStdin = Object.assign(new EventEmitter(), {
  isTTY: true,
  setRawMode: () => fakeStdin,
  setEncoding: () => fakeStdin,
  ref: () => fakeStdin,
  unref: () => fakeStdin,
});

const send = (data: string, afterMs: number): void => {
  setTimeout(() => fakeStdin.emit('data', data), afterMs);
};

render(<App initial={process.argv[2]} />, { stdin: fakeStdin });

const scenario = process.env.PROBE_SCENARIO ?? 'menu';
let exitAt = 1500;

if (scenario === 'type') {
  // Type "hello world", press Ctrl+S, type "my-notes", press Enter to save.
  const chars = 'hello world';
  let t = 500;
  for (const ch of chars) {
    send(ch, t);
    t += 30;
  }
  send('\u0013', t + 250); // Ctrl+S
  t += 450;
  for (const ch of 'my-notes') {
    send(ch, t);
    t += 30;
  }
  send('\r', t + 250); // Enter
  exitAt = t + 700;
} else if (scenario === 'saveas') {
  // Run the gap suite, then press 's' and save under a custom name.
  send('s', 2500);
  let t = 2750;
  for (const ch of 'probe-gap') {
    send(ch, t);
    t += 30;
  }
  send('\r', t + 200);
  exitAt = t + 600;
} else if (scenario === 'notes-esc') {
  send('\u001b', 800); // Esc back to menu
  exitAt = 1600;
}

setTimeout(() => process.exit(0), exitAt);
