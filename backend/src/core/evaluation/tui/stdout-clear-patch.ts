/**
 * Ink bug workaround for the eval TUI.
 *
 * When a rendered frame is TALLER than the terminal, ink switches from its
 * line-erasing redraw to a full clear + write — but it never updates the
 * internal line counter it uses to erase the NEXT (shorter) frame. The stale
 * count erases too few lines and leaves debris from the previous frame on
 * screen ("clumpy" output after a rerun, or when a tall results table is
 * followed by the short spinner). This wrapper detects those full clears and
 * forces a clean full clear before the next frame write so the stale
 * bookkeeping is harmless.
 *
 * The module is ink-free and pure (a stream wrapper), so it can be unit-tested
 * under jest while index.tsx wires it onto process.stdout.
 */

/** Full-screen clear sequences ink/ansi-escapes emit on the tall-frame path. */
const FULL_CLEAR_MARKERS = ['\u001b[2J', '\u001b[3J'];

/** The clear sequence injected before the next frame after a tall frame. */
const CLEAR_BEFORE_NEXT_FRAME = '\u001b[2J\u001b[3J\u001b[H';

/**
 * Wraps a stream's `write` so that any frame written after a taller-than-
 * terminal frame (detected via its full-clear escape) starts with a full
 * screen + scrollback clear. Returns the wrapped write function.
 */
export function wrapClearDesync(
  rawWrite: (chunk: string | Uint8Array, ...args: unknown[]) => boolean,
): (chunk: string | Uint8Array, ...args: unknown[]) => boolean {
  let nextFrameNeedsClear = false;
  return (chunk, ...args) => {
    const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    const isFullClear = FULL_CLEAR_MARKERS.some((marker) => text.includes(marker));
    const isFrame = text.includes('\n');
    if (isFullClear) {
      // Ink just drew a taller-than-terminal frame. Its line counter is now
      // stale, so the next frame must start from a wiped screen.
      nextFrameNeedsClear = true;
      return rawWrite(chunk, ...args);
    }
    if (nextFrameNeedsClear && isFrame) {
      nextFrameNeedsClear = false;
      // Clear screen + scrollback, home the cursor — same sequence ansi-escapes
      // clearTerminal uses — before the stale eraseLines math can misfire.
      return rawWrite(CLEAR_BEFORE_NEXT_FRAME + text, ...args);
    }
    return rawWrite(chunk, ...args);
  };
}

/**
 * Patches `process.stdout.write` with the desync wrapper. Call once, before
 * rendering, in the TUI entry (`pnpm run tui`).
 */
export function patchInkClearDesync(): void {
  const rawWrite = process.stdout.write.bind(process.stdout) as (
    chunk: string | Uint8Array,
    ...args: unknown[]
  ) => boolean;
  // `write` has several overloads (chunk only, chunk+encoding, chunk+callback,
  // chunk+encoding+callback); the wrapper accepts them all and forwards them.
  process.stdout.write = wrapClearDesync(rawWrite);
}
