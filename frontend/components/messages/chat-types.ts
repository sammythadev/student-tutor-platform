import type { MessageItem } from '@/lib/api/messages'

/** A sent message that has not landed yet, or failed on the way. */
export type ThreadMessage = MessageItem & { pending?: boolean; failed?: boolean }

/* Avatar tints. Deterministic per user, so the same person keeps the same colour
   across the list and the thread — recognition, not decoration. */
export const TINTS = [
  'bg-blue-500/12 text-blue-600 dark:text-blue-400',
  'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  'bg-rose-500/12 text-rose-600 dark:text-rose-400',
  'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400',
] as const

export function tintFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return TINTS[Math.abs(hash) % TINTS.length]
}

/** Messages closer than this to the previous one join the same visual run. */
export const GROUP_WINDOW_MS = 5 * 60 * 1000
/** How far off the bottom counts as "reading history" rather than "at the end". */
export const AT_BOTTOM_SLACK = 120

export function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

export function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return 'Today'
  if (sameDay(d, new Date(now.getTime() - 86_400_000))) return 'Yesterday'
  const withinWeek = now.getTime() - d.getTime() < 6 * 86_400_000
  if (withinWeek) return d.toLocaleDateString([], { weekday: 'long' })
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** List timestamps: time today, weekday this week, date beyond that. */
export function listStamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return clockTime(iso)
  if (sameDay(d, new Date(now.getTime() - 86_400_000))) return 'Yesterday'
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function matchesQuery(content: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  return q.length > 0 && content.toLowerCase().includes(q)
}

/**
 * Split content into runs so search hits can be wrapped in a marker without
 * `dangerouslySetInnerHTML`. Plain substring comparison only — a query full of
 * punctuation cannot throw or over-match the way a regex could.
 */
export function splitHighlight(text: string, query: string): { text: string; match: boolean }[] {
  const q = query.trim().toLowerCase()
  if (!q) return [{ text, match: false }]

  const haystack = text.toLowerCase()
  const runs: { text: string; match: boolean }[] = []
  let cursor = 0

  for (;;) {
    const at = haystack.indexOf(q, cursor)
    if (at === -1) break
    if (at > cursor) runs.push({ text: text.slice(cursor, at), match: false })
    runs.push({ text: text.slice(at, at + q.length), match: true })
    cursor = at + q.length
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor), match: false })

  return runs.length > 0 ? runs : [{ text, match: false }]
}