/**
 * Character-wrap helpers for the note pad editor.
 *
 * Wrapping is character-based (not word-based) so the mapping between buffer
 * index and visual (row, col) stays exact — that mapping is what makes the
 * arrow-key cursor movement in the editor correct.
 */

export interface VisualSpan {
  /** Index of this visual line's first character in the source text. */
  start: number;
  /** Number of source characters on this visual line (newlines excluded). */
  len: number;
}

/** Splits text into visual lines, each at most `width` characters. */
export function visualSpans(text: string, width: number): VisualSpan[] {
  const spans: VisualSpan[] = [];
  let index = 0;
  for (const rawLine of text.split('\n')) {
    if (rawLine === '') {
      spans.push({ start: index, len: 0 });
      index += 1; // the '\n'
      continue;
    }
    for (let offset = 0; offset < rawLine.length; offset += width) {
      spans.push({ start: index + offset, len: Math.min(width, rawLine.length - offset) });
    }
    index += rawLine.length + 1; // include the '\n'
  }
  return spans;
}

export interface CursorPosition {
  row: number;
  col: number;
}

/** Visual (row, col) of a buffer index, given the wrap width. */
export function cursorPosition(text: string, cursor: number, width: number): CursorPosition {
  const spans = visualSpans(text.slice(0, cursor), width);
  const row = Math.max(0, spans.length - 1);
  const col = cursor - spans[row].start;
  return { row, col };
}

/** Buffer index of a visual (row, col), clamped to the wrapped line. */
export function indexFromPosition(text: string, row: number, col: number, width: number): number {
  const spans = visualSpans(text, width);
  if (spans.length === 0) {
    return 0;
  }
  const targetRow = Math.min(Math.max(row, 0), spans.length - 1);
  const span = spans[targetRow];
  return Math.min(Math.max(col, 0), span.len) + span.start;
}

/** The wrapped display lines for `text` at the given width. */
export function wrapText(text: string, width: number): string[] {
  return visualSpans(text, width).map((span) => text.slice(span.start, span.start + span.len));
}
