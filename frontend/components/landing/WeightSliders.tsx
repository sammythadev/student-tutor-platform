'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { CANDIDATES, CRITERIA } from './content'

gsap.registerPlugin(Flip)

/* ──────────────────────────────────────────────────────────
   The weights, in the reader's hands.

   The claim "the weights are yours to set" is cheap to write and easy to doubt,
   so this hands them over. Moving one weight rescales the other three so the four
   still sum to exactly 1, which is Algorithm.md §5 (AdaptWeights) rather than an
   approximation of it — the draft it corrects bumped one weight and asserted the
   total was still 1 without showing how.

   Flip is the right tool here and the wrong tool in the hero. Here the reader
   caused the change and the DOM order is the current, correct ranking at every
   moment, so reordering the DOM tells the truth. In the hero the ranking is only
   partial until the scroll finishes, so the markup has to stay final and the rows
   move on transforms instead.
────────────────────────────────────────────────────────── */

const DEFAULTS = CRITERIA.map(c => c.weight) as number[]
const ELIGIBLE = CANDIDATES.filter(c => !c.filtered)
const MIN = 0.05

export default function WeightSliders() {
  const [weights, setWeights] = useState<number[]>(DEFAULTS)
  const list = useRef<HTMLOListElement>(null)
  const flipState = useRef<Flip.FlipState | null>(null)

  /* Bump one weight, then rescale the rest proportionally so the total is 1. */
  const setWeight = (index: number, next: number) => {
    if (list.current) {
      flipState.current = Flip.getState(list.current.querySelectorAll('[data-w-row]'))
    }
    setWeights(prev => {
      const target = gsap.utils.clamp(MIN, 1 - MIN * (prev.length - 1), next)
      const restTotal = prev.reduce((sum, w, i) => (i === index ? sum : sum + w), 0)
      const scale = restTotal === 0 ? 0 : (1 - target) / restTotal
      return prev.map((w, i) => (i === index ? target : w * scale))
    })
  }

  useLayoutEffect(() => {
    const state = flipState.current
    if (!state) return
    flipState.current = null
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    Flip.from(state, {
      duration: 0.45,
      ease: 'power2.inOut',
      absolute: true,
      /* Only positions animate. Nothing here touches layout properties. */
      props: 'none',
    })
  }, [weights])

  const scored = ELIGIBLE
    .map(c => ({
      ...c,
      total: weights.reduce((sum, w, i) => sum + w * c.scores[i], 0),
    }))
    .sort((a, b) => b.total - a.total)

  const changed = weights.some((w, i) => Math.abs(w - DEFAULTS[i]) > 0.005)

  return (
    <div className="mk-panel-lit relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-mk-hairline bg-mk-panel-sunken px-4 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-mk-ink-3">
          Move a weight, read the new order
        </p>
        <button
          type="button"
          onClick={() => {
            if (list.current) {
              flipState.current = Flip.getState(list.current.querySelectorAll('[data-w-row]'))
            }
            setWeights(DEFAULTS)
          }}
          disabled={!changed}
          className="rounded-md px-2 py-1 text-[12px] font-medium text-mk-ink-2 transition-colors duration-150 hover:bg-mk-panel-hover hover:text-mk-ink disabled:pointer-events-none disabled:opacity-40"
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
              <input
                id={`w-${crit.key}`}
                type="range"
                min={MIN}
                max={0.8}
                step={0.01}
                value={Number(weights[i].toFixed(2))}
                onChange={e => setWeight(i, Number(e.target.value))}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-mk-track accent-[var(--mk-accent)]"
                aria-describedby={`w-${crit.key}-detail`}
              />
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
          <ol ref={list} className="flex flex-col gap-1.5">
            {scored.map((c, i) => (
              <li
                key={c.name}
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
                <span className="mk-num text-right text-[13px] font-semibold text-mk-ink">
                  {Math.round(c.total * 100)}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] leading-relaxed text-mk-ink-3">
            Push one up and the others give way, so the four always add to 1.00.
            That is what keeps one student's scores comparable with another's.
          </p>
        </div>
      </div>
    </div>
  )
}
