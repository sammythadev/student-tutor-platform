import type { SessionItem } from '@/lib/api/sessions'

export type Accent = 'lavender' | 'sky' | 'mint' | 'sun' | 'coral' | 'tangerine'

const ACCENTS: Accent[] = ['lavender', 'sky', 'mint', 'sun', 'coral', 'tangerine']

/**
 * Stable accent for an entity. Keyed on the entity id so the same tutor keeps
 * the same colour on every page — list position must never decide colour.
 */
export function accentFor(id: string): Accent {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return ACCENTS[Math.abs(hash) % ACCENTS.length]
}

export function accentBg(accent: Accent): string {
  return `var(--accent-${accent}-bg)`
}

export function accentFg(accent: Accent): string {
  return `var(--accent-${accent}-fg)`
}

export function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?'
}

/** Session status → accent. Colour encodes state, never identity. */
export const SESSION_ACCENT: Record<SessionItem['status'], Accent> = {
  pending: 'sun',
  upcoming: 'sky',
  'starting-soon': 'mint',
  completed: 'lavender',
  cancelled: 'coral',
}

export const SESSION_LABEL: Record<SessionItem['status'], string> = {
  pending: 'Awaiting confirmation',
  upcoming: 'Scheduled',
  'starting-soon': 'Starting soon',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** A session is joinable once it is confirmed and currently running. */
export function isJoinable(session: Pick<SessionItem, 'status'>): boolean {
  return session.status === 'upcoming' || session.status === 'starting-soon'
}

/**
 * Explains a match percentage instead of showing a bare number.
 * The score is the composite M(s,t) from Algorithm.md.
 */
export function matchStrength(score: number): { label: string; accent: Accent } {
  const pct = score * 100
  if (pct >= 80) return { label: 'Strong match', accent: 'mint' }
  if (pct >= 60) return { label: 'Good match', accent: 'sky' }
  if (pct >= 40) return { label: 'Fair match', accent: 'sun' }
  return { label: 'Weak match', accent: 'coral' }
}

export function formatNaira(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return `₦${Number(amount).toLocaleString('en-NG')}`
}

/** Caps stagger so late items in a long list do not wait seconds to appear. */
export function stagger(index: number, step = 0.05, max = 0.4): number {
  return Math.min(index * step, max)
}
