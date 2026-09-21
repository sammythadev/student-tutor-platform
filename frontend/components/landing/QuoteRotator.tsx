'use client'

import { useCallback, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { TRUST_QUOTES } from './content'

/* ──────────────────────────────────────────────────────────
   The trust quote, with the other three reachable.

   A single static pull-quote wastes the slot: there are four quotable facts and
   only one of them was ever visible. So this is a rotator — but a manual one.
   Autoplay is the wrong default for a block of prose you are meant to read; it
   moves the text out from under the reader on a timer they did not set. The
   controls are the whole affordance instead: two 44px buttons, a dot per quote,
   arrow keys when the figure has focus, and a swipe on touch.

   Announcing is done with aria-live on the figure and a visually hidden "n of 4",
   so a screen reader hears the new quote and its position rather than silently
   re-reading the region. The buttons stay in the tab order; the dots are real
   buttons too, each labelled with its own quote's source.

   min-height is set from the longest quote at each breakpoint rather than
   animated, because animating the height of a text block that the reader is
   mid-sentence in is worse than reserving the space.
────────────────────────────────────────────────────────── */

const COUNT = TRUST_QUOTES.length

export default function QuoteRotator() {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const reduced = useReducedMotion()
  const liveId = useId()
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const go = useCallback((next: number, dir: 1 | -1) => {
    setDirection(dir)
    setIndex(((next % COUNT) + COUNT) % COUNT)
  }, [])

  const prev = useCallback(() => go(index - 1, -1), [go, index])
  const next = useCallback(() => go(index + 1, 1), [go, index])

  /* Arrow keys only while the figure holds focus, so they never fight the
     page's own scrolling. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      next()
    }
  }

  /* Horizontal swipe, with a 48px threshold and a vertical-dominance check so a
     scroll gesture that drifts sideways does not change the quote. */
  const onTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    const start = touchStart.current
    touchStart.current = null
    if (start === null) return
    const end = e.changedTouches[0]
    const dx = end.clientX - start.x
    const dy = end.clientY - start.y
    if (Math.abs(dx) < 48) return
    if (Math.abs(dy) > Math.abs(dx)) return
    if (dx < 0) next()
    else prev()
  }

  const quote = TRUST_QUOTES[index]
  const offset = reduced ? 0 : 12 * direction

  return (
    <figure
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-label="Quote carousel. Use left and right arrow keys to change quote."
      className="max-w-[672px] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-mk-hairline"
      aria-roledescription="quote carousel"
    >
      <div
        id={liveId}
        aria-live="polite"
        aria-atomic="true"
        className="min-h-[132px] sm:min-h-[110px] lg:min-h-[132px]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0, x: offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -offset }}
            transition={reduced ? { duration: 0 } : { duration: 0.28, ease: [0, 0, 0.2, 1] }}
          >
            <span className="sr-only">
              Quote {index + 1} of {COUNT}.{' '}
            </span>
            <blockquote className="text-[20px] font-normal leading-[1.375] text-mk-ink-3 lg:text-2xl">
              <span className="text-mk-ink">&ldquo;</span>
              {quote.quote}
              <span className="text-mk-ink">&rdquo;</span>
            </blockquote>
          </motion.div>
        </AnimatePresence>
      </div>

      <figcaption className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-4">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-mk-track font-mono text-[11px] text-mk-ink-3"
        >
          {quote.badge}
        </span>
        <p className="mk-small min-w-0">
          <span className="font-medium text-mk-ink">{quote.source}</span>
          <span className="text-mk-ink-4"> · {quote.detail}</span>
        </p>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Dots index={index} onSelect={go} />
          <Arrow label="Previous quote" onClick={prev} dir="left" />
          <Arrow label="Next quote" onClick={next} dir="right" />
        </div>
      </figcaption>
    </figure>
  )
}

/* One dot per quote, each a real button labelled with its source — a dot row
   that is only a progress indicator wastes four ready-made shortcuts. The pip
   is fixed-size; only its colour and scale change, never its width. */
function Dots({ index, onSelect }: { index: number; onSelect: (next: number, dir: 1 | -1) => void }) {
  return (
    <div className="mr-2 flex items-center gap-1.5">
      {TRUST_QUOTES.map((q, i) => (
        <button
          key={q.source}
          type="button"
          onClick={() => onSelect(i, i > index ? 1 : -1)}
          aria-label={`Show quote ${i + 1} of ${COUNT}: ${q.source}`}
          aria-current={i === index}
          className="group grid size-11 place-items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink"
        >
          <span
            className={cn(
              'block h-1.5 w-4 origin-center rounded-full transition-[background-color,transform] duration-300 ease-mk-out',
              i === index
                ? 'scale-x-100 bg-mk-ink'
                : 'scale-x-[0.375] bg-mk-ink-4 group-hover:bg-mk-ink-3',
            )}
          />
        </button>
      ))}
    </div>
  )
}

function Arrow({
  label,
  onClick,
  dir,
}: {
  label: string
  onClick: () => void
  dir: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'grid size-11 place-items-center rounded-lg text-mk-ink-2 shadow-mk-ring-subtle',
        'transition-colors duration-300 ease-mk-out hover:bg-mk-accent-soft hover:text-mk-ink',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-ink',
      )}
    >
      <svg viewBox="0 0 16 16" aria-hidden className="size-4">
        <path
          d={dir === 'left' ? 'M10 3.5 5.5 8l4.5 4.5' : 'M6 3.5 10.5 8 6 12.5'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

/* Exported for the section that owns the slot, so the count can be asserted in
   a test without reaching into content.ts. */
export { COUNT as QUOTE_COUNT }
