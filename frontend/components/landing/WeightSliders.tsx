'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { CANDIDATES, CRITERIA } from './content'

/* ──────────────────────────────────────────────────────────
   The weights, in the reader's hands.

   The claim "the weights are yours to set" is cheap to write and easy to doubt,
   so this hands them over. Moving one weight rescales the other three so the four
   still sum to exactly 1, which is Algorithm.md §5 (AdaptWeights) rather than an
   approximation of it — the draft it corrects bumped one weight and asserted the
   total was still 1 without showing how.

   The DOM always follows the current ranking. Position-only layout animation
   bridges an actual rank change, not every input event; scores stay synchronous.
────────────────────────────────────────────────────────── */

const DEFAULTS = CRITERIA.map(c => c.weight) as number[]
const ELIGIBLE = CANDIDATES.filter(c => !c.filtered)
const MIN = 0.05

export default function WeightSliders() {
  const [weights, setWeights] = useState<number[]>(DEFAULTS)
  const reduced = useReducedMotion()

  /* Bump one weight, then rescale the rest proportionally so the total is 1. */
  const setWeight = (index: number, next: number) => {
    setWeights(prev => {
      const target = Math.min(1 - MIN * (prev.length - 1), Math.max(MIN, next))
      const restTotal = prev.reduce((sum, w, i) => (i === index ? sum : sum + w), 0)
      const scale = restTotal === 0 ? 0 : (1 - target) / restTotal
      return prev.map((w, i) => (i === index ? target : w * scale))
    })
  }

  const scored = ELIGIBLE
    .map(c => ({
      ...c,
      total: weights.reduce((sum, w, i) => sum + w * c.scores[i], 0),
    }))
    .sort((a, b) => b.total - a.total)

  const order = scored.map(c => c.name).join('|')
  const changed = weights.some((w, i) => Math.abs(w - DEFAULTS[i]) > 0.005)

  /* Frameless on purpose: the demo always sits inside the section's own hairline
     card, and a second frame here would double the border. */
  return (
    <div className="relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-mk-hairline-opaque px-4 py-2.5">
        <p className="text-mk-small font-medium text-mk-ink-3">
          Move a weight, read the new order
        </p>
        <button
          type="button"
          onClick={() => setWeights(DEFAULTS)}
          disabled={!changed}
          className="inline-flex min-h-11 items-center rounded-md px-2.5 py-1 text-[12px] font-medium text-mk-ink-2 transition-colors duration-150 hover:bg-mk-panel-hover hover:text-mk-ink disabled:pointer-events-none disabled:opacity-40"
        >
          Back to defaults
        </button>
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-2 lg:gap-8 lg:p-5">
        <div className="flex flex-col gap-4">
          {CRITERIA.map((crit, i) => (
            <div key={crit.key}>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={`w-${crit.key}`} className="text-[13px] font-medium text-mk-ink">
                  {crit.label}
                </label>
                <span className="mk-num text-[12px] text-mk-ink-2">
                  {weights[i].toFixed(2)}
                </span>
              </div>
              {/* 6px of reserved layout, 44px of grip. The bar is painted by the
                  wrapper and the input is a transparent overlay, so the touch
                  target can be seven times the bar without moving anything. */}
              <div
                className="relative mt-2"
                style={{ ['--range' as string]: ((weights[i] - MIN) / (0.8 - MIN)).toFixed(4) }}
              >
                <div className="mk-range-bar" aria-hidden>
                  <i />
                </div>
                <input
                  id={`w-${crit.key}`}
                  type="range"
                  min={MIN}
                  max={0.8}
                  step={0.01}
                  value={Number(weights[i].toFixed(2))}
                  onChange={e => setWeight(i, Number(e.target.value))}
                  className="mk-range absolute inset-x-0 top-1/2 -translate-y-1/2"
                  aria-describedby={`w-${crit.key}-detail`}
                  aria-valuetext={`${Math.round(weights[i] * 100)} percent`}
                />
              </div>
              <p id={`w-${crit.key}-detail`} className="mt-1.5 text-[11px] leading-relaxed text-mk-ink-3">
                {crit.detail}
              </p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-3 text-[12px] font-medium text-mk-ink-2">
            Ranked for the same student
          </p>
          <ol className="flex flex-col gap-1.5">
            {scored.map((c, i) => (
              <motion.li
                key={c.name}
                layout={reduced ? false : 'position'}
                layoutDependency={order}
                transition={{ layout: { duration: reduced ? 0 : 0.22, ease: [0.77, 0, 0.175, 1] } }}
                data-w-row
                className="grid grid-cols-[1.25rem_minmax(0,1fr)_2.25rem] items-center gap-x-3 rounded-lg bg-mk-panel-sunken px-2.5 py-2.5"
              >
                <span className="mk-num text-[12px] font-medium text-mk-ink-3" aria-hidden>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-mk-ink">{c.name}</p>
                  <div className="mk-bar mt-1.5">
                    <i style={{ ['--fill' as string]: c.total.toFixed(3) }} aria-hidden />
                  </div>
                </div>
                <span className="mk-num text-right text-[13px] font-medium text-mk-ink">
                  {Math.round(c.total * 100)}
                </span>
              </motion.li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] leading-relaxed text-mk-ink-3">
            Push one up and the others give way, so the four always add to 1.00.
            That is what keeps one student&apos;s scores comparable with another&apos;s.
          </p>
        </div>
      </div>
    </div>
  )
}
