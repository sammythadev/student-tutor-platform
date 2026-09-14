'use client'

import { CANDIDATES, CRITERIA } from './content'

/* ──────────────────────────────────────────────────────────
   Two smaller surfaces for the hero frame's tab strip.

   Both are drawn from the same fixture the rest of the page scores against, so
   the numbers in the frame agree with the numbers in the demo further down. The
   reference switches between four screenshots here; this switches between four
   live panels, which is the same idea with one less lie in it.
────────────────────────────────────────────────────────── */

const ELIGIBLE = CANDIDATES.filter((c) => !c.filtered)
const HUES = ['#6cb0ef', '#6cefce', '#efd26c', '#ce6cef', '#ef6c6c']

export function ScoredList() {
  const scored = ELIGIBLE.map((c) => ({
    ...c,
    total: CRITERIA.reduce((sum, crit, i) => sum + crit.weight * c.scores[i], 0),
  })).sort((a, b) => b.total - a.total)

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden bg-[#050505] p-4 lg:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-white">Physics · SS2 · Tuesday 16:00</p>
        <p className="text-[11px] text-white/45">
          {scored.length} eligible of {CANDIDATES.length}
        </p>
      </div>

      <ol className="flex min-h-0 flex-1 flex-col gap-2">
        {scored.map((c, i) => (
          <li
            key={c.name}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-white/[0.035] px-3 py-2.5 shadow-[0_0_0_1px_rgb(253_252_252/0.06)]"
          >
            <span className="text-[12px] font-medium tabular-nums text-white/40">{i + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-white">{c.name}</p>
              <p className="truncate text-[11px] text-white/45">{c.teaches}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/10 sm:block">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${c.total * 100}%`, backgroundColor: HUES[i % HUES.length] }}
                />
              </span>
              <span className="text-[13px] font-medium tabular-nums text-white">
                {Math.round(c.total * 100)}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-[11px] text-white/40">
        Weighted sum of the four criteria. Subject and level filtered first.
      </p>
    </div>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = ['14', '15', '16', '17', '18', '19']

/* [dayIndex, hourIndex, kind] — booked, a free overlap, or the tutor's own hold. */
const SLOTS: readonly [number, number, 'booked' | 'overlap' | 'held'][] = [
  [1, 2, 'booked'], [1, 3, 'booked'], [0, 1, 'overlap'], [0, 2, 'overlap'],
  [2, 4, 'overlap'], [3, 1, 'held'], [3, 2, 'held'], [4, 3, 'overlap'], [5, 0, 'overlap'],
]

const FILL = { booked: '#6cefce', overlap: 'rgb(253 252 252 / 0.12)', held: '#efd26c' } as const

export function WeekGrid() {
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden bg-[#050505] p-4 lg:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-white">Hours you both have open</p>
        <span className="flex items-center gap-3 text-[11px] text-white/45">
          <span className="inline-flex items-center gap-1.5">
            <i className="block size-2 rounded-sm" style={{ backgroundColor: FILL.booked }} /> Booked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="block size-2 rounded-sm" style={{ backgroundColor: FILL.held }} /> Held
          </span>
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[2.5rem_repeat(6,minmax(0,1fr))] grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-1">
        <span />
        {DAYS.map((d) => (
          <span key={`head-${d}`} className="text-center text-[11px] text-white/45">
            {d}
          </span>
        ))}

        {HOURS.flatMap((h, hi) => [
          <span key={`hour-${h}`} className="pr-1 text-right text-[11px] tabular-nums text-white/35">
            {h}:00
          </span>,
          ...DAYS.map((d, di) => {
            const slot = SLOTS.find(([sd, sh]) => sd === di && sh === hi)
            return (
              <span
                key={`${d}-${h}`}
                className="rounded-md"
                style={{
                  backgroundColor: slot ? FILL[slot[2]] : 'rgb(253 252 252 / 0.035)',
                  opacity: slot && slot[2] !== 'overlap' ? 0.85 : 1,
                }}
              />
            )
          }),
        ])}
      </div>
    </div>
  )
}
