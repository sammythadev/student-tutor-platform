import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────────────────
   The bento icons.

   Every small bento cell used to open with `size-6 rounded-md bg-mk-track` — a
   grey square standing in for an icon that was never drawn. Twelve of those
   across three sections is most of why the page read as empty: the reference has
   a line icon in exactly these slots and they are the only mark above each title.

   Measured from the reference: 24px box, 1.5px stroke, round caps and joins, no
   fill, monochrome. They inherit `currentColor` so a cell can dim its own icon
   with text colour instead of a second token, and they are drawn on the 24-grid
   with a 3.5px inset so the strokes land on half-pixels at 1x rather than
   straddling them.
────────────────────────────────────────────────────────── */

export type IconName =
  | 'book' | 'compass' | 'overlap' | 'spread'
  | 'breakdown' | 'calendar' | 'recycle' | 'ticket'
  | 'noEntry' | 'sliders' | 'columns' | 'gauge'

const PATHS: Record<IconName, React.ReactNode> = {
  /* Academic fit — an open book. */
  book: (
    <>
      <path d="M12 7.2c-1.6-1.4-3.5-2.1-5.8-2.1a1.2 1.2 0 0 0-1.2 1.2v10.4a1.2 1.2 0 0 0 1.2 1.2c2.3 0 4.2.7 5.8 2.1" />
      <path d="M12 7.2c1.6-1.4 3.5-2.1 5.8-2.1a1.2 1.2 0 0 1 1.2 1.2v10.4a1.2 1.2 0 0 1-1.2 1.2c-2.3 0-4.2.7-5.8 2.1" />
      <path d="M12 7.2V20" />
    </>
  ),
  /* How you learn — pace, budget, your side of town. */
  compass: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M14.9 9.1 13.4 13.4 9.1 14.9l1.5-4.3z" />
    </>
  ),
  /* Hours you both have — the intersection, not the union. */
  overlap: (
    <>
      <circle cx="9.4" cy="12" r="5.6" />
      <circle cx="14.6" cy="12" r="5.6" />
    </>
  ),
  /* Spread across tutors — three loads, none of them tall. */
  spread: (
    <>
      <path d="M4 19.5h16" />
      <path d="M7.5 19.5v-6.2M12 19.5v-8.4M16.5 19.5v-5" />
    </>
  ),
  /* A reason beside the rank — the score opens into its terms. */
  breakdown: (
    <>
      <rect x="3.7" y="3.7" width="16.6" height="16.6" rx="3.2" />
      <path d="M8.2 16v-3.1M12 16V8.6M15.8 16v-4.6" />
    </>
  ),
  /* Hours that actually exist. */
  calendar: (
    <>
      <rect x="3.7" y="5.7" width="16.6" height="14.6" rx="2.6" />
      <path d="M3.7 10.4h16.6M8.2 3.7v4M15.8 3.7v4" />
      <circle cx="12" cy="15.2" r=".9" />
    </>
  ),
  /* Reordering is free — as often as you like. */
  recycle: (
    <>
      <path d="M19.8 12a7.8 7.8 0 1 1-2.3-5.5" />
      <path d="M20.3 4.6v3.4h-3.4" />
    </>
  ),
  /* A place, not a near miss. */
  ticket: <path d="M6.8 3.7h10.4a1.1 1.1 0 0 1 1.1 1.1v15.5l-6.3-3.9-6.3 3.9V4.8a1.1 1.1 0 0 1 1.1-1.1z" />,
  /* No paid placement — there is nothing to buy. */
  noEntry: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M6.2 17.8 17.8 6.2" />
    </>
  ),
  /* The weights are yours. */
  sliders: (
    <>
      <path d="M4 8.6h4.4M13.2 8.6h6.8" />
      <circle cx="10.8" cy="8.6" r="2.3" />
      <path d="M4 15.4h9.2M18 15.4h2" />
      <circle cx="15.7" cy="15.4" r="2.3" />
    </>
  ),
  /* Load is spread — a ceiling nobody passes. */
  columns: (
    <>
      <path d="M4 5.2h16" />
      <path d="M8.2 20.3V9.4M12 20.3V9.4M15.8 20.3V9.4" />
    </>
  ),
  /* Measured, not asserted. */
  gauge: (
    <>
      <path d="M4.4 17.2a8.4 8.4 0 1 1 15.2 0" />
      <path d="M12 17.2l3.6-5.4" />
    </>
  ),
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-6', className)}
    >
      {PATHS[name]}
    </svg>
  )
}

/* Cell order is the icon order. Keeping the lists here rather than in content.ts
   keeps the copy module free of presentation, and keeps each section's icons in
   one place where a reordered cell list is obvious. */
export const CRITERIA_ICONS: readonly IconName[] = ['book', 'compass', 'overlap', 'spread']
export const HOW_ICONS: readonly IconName[] = ['breakdown', 'calendar', 'recycle', 'ticket']
export const TRUST_ICONS: readonly IconName[] = ['noEntry', 'sliders', 'columns', 'gauge']
