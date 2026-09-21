'use client'

import { useEffect, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAmbientMotion } from './useAmbientMotion'
import { SHOWCASE, SHOWCASE_TILES } from './content'
import TileArt from './TileArt'
import { Container } from './mk'

/* ──────────────────────────────────────────────────────────
   Full-bleed tile row, drag to scroll.

   Two things make this section read the way the reference's does. The heading is
   the page's second display heading — 52px, centred, split so the last line drops
   to the muted ink; that two-tone treatment is what stops a centred heading from
   looking like a banner. And the row bleeds past both gutters, so tiles are cut
   off at the viewport edge rather than tucked inside the container. A carousel
   that respects the container loses the whole effect.

   Embla drives it: `dragFree` with `containScroll: false` and a loop, which is
   the drag-to-scroll feel the reference has and which a CSS-only marquee cannot
   give (a marquee is not grabbable). Autoplay advances slowly with the public
   scrollNext API; independent pause reasons never override the reader's choice.

   Tiles are 396px square at 12px radius, measured. Their inner content staggers
   in when the tile first enters view, which is the reference's own behaviour.
────────────────────────────────────────────────────────── */
function Tile({
  title, sub, hue, bg, kind, index,
}: (typeof SHOWCASE_TILES)[number] & { index: number }) {
  const slideRef = useRef<HTMLLIElement>(null)
  const reduced = useReducedMotion()
  /* One observer watches the whole slide — the surface and the art animate off
     the same signal, so the two can never disagree again. `once` keeps it
     cheap: after the first reveal the static markup stays put and costs
     nothing to keep on screen. */
  const inView = useInView(slideRef, { amount: 0.2, once: true })
  const shown = reduced || inView

  return (
    <li
      ref={slideRef}
      className="relative w-[280px] shrink-0 overflow-hidden rounded-xl sm:w-[340px] lg:w-[396px]"
      style={{ aspectRatio: '1 / 1', backgroundColor: bg }}
    >
      {/* Light surfaces, deliberately. This row is the one bright band on the
          whole page: the measurement puts #f9fbfd / #fefefe / #ebecf0 at the top
          of the light end of the histogram, and all of it is inside these tiles.
          Making them dark to match the canvas is the single largest visual error
          a clone of this page can make — it cost 89% of one diff band before this
          was fixed. */}
      <div className="flex items-start justify-between gap-3 p-4 lg:p-5">
        <div className="min-w-0">
          <p className="text-mk-body font-medium text-[#141716]">{title}</p>
          <p className="mt-0.5 text-mk-small text-[#635f5f]">{sub}</p>
        </div>
        <span
          aria-hidden
          className="mt-0.5 size-7 shrink-0 rounded-lg"
          style={{ backgroundColor: hue, opacity: 0.9 }}
        />
      </div>

      {/* The tile's own surface, drawn from its `kind`. */}
      <motion.div
        aria-hidden
        initial={false}
        animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.42, ease: [0, 0, 0.2, 1], delay: 0.04 * (index % 4) }}
        className="absolute inset-x-4 bottom-0 top-[86px] overflow-hidden rounded-t-xl border border-b-0 border-black/[0.07] bg-white p-3.5 lg:inset-x-5 lg:top-[96px]"
      >
        <TileArt kind={kind} hue={hue} />
      </motion.div>
    </li>
  )
}

export default function TileCarousel() {
  const host = useRef<HTMLElement>(null)
  const { active, reduced } = useAmbientMotion(host)
  const [emblaRef, embla] = useEmblaCarousel({
    loop: true,
    dragFree: true,
    align: 'start',
    containScroll: false,
    duration: 55,
  })
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const running = active && !paused && !hovered && !focused && !dragging

  useEffect(() => {
    if (!embla || !running) return
    const id = window.setInterval(() => embla.scrollNext(), 4500)
    return () => window.clearInterval(id)
  }, [embla, running])

  useEffect(() => {
    if (!embla) return
    const onDown = () => setDragging(true)
    const onUp = () => setDragging(false)
    embla.on('pointerDown', onDown)
    embla.on('pointerUp', onUp)
    return () => {
      embla.off('pointerDown', onDown)
      embla.off('pointerUp', onUp)
    }
  }, [embla])

  const navigate = (direction: 'previous' | 'next') => {
    if (direction === 'previous') embla?.scrollPrev(Boolean(reduced))
    else embla?.scrollNext(Boolean(reduced))
  }

  return (
    <section
      ref={host}
      aria-labelledby="showcase-title"
      aria-roledescription="carousel"
      className="my-mk-2xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <Container>
        <h2 id="showcase-title" className="mx-auto max-w-[896px] text-center mk-h2 text-mk-ink">
          {SHOWCASE.headline}
          <span className="block text-mk-ink-4">{SHOWCASE.trailing}</span>
        </h2>
      </Container>

      <Container className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-11 min-w-24 text-mk-ink transition-colors hover:bg-mk-panel-hover"
          aria-controls="showcase-tiles"
          aria-pressed={paused}
          aria-label={paused ? 'Play tile autoplay' : 'Pause tile autoplay'}
          onClick={() => setPaused(value => !value)}
        >
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          {paused ? 'Play' : 'Pause'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 text-mk-ink transition-colors hover:bg-mk-panel-hover"
          aria-label="Previous tiles"
          aria-controls="showcase-tiles"
          disabled={!embla}
          onClick={() => navigate('previous')}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 text-mk-ink transition-colors hover:bg-mk-panel-hover"
          aria-label="Next tiles"
          aria-controls="showcase-tiles"
          disabled={!embla}
          onClick={() => navigate('next')}
        >
          <ArrowRight aria-hidden />
        </Button>
      </Container>

      <div ref={emblaRef} id="showcase-tiles" className="mt-mk-md overflow-hidden">
        <ul
          aria-label="What you get"
          className={cn('flex gap-4 lg:gap-mk-gutter', !reduced && 'cursor-grab active:cursor-grabbing')}
        >
          {SHOWCASE_TILES.map((tile, i) => (
            <Tile key={tile.title} {...tile} index={i} />
          ))}
        </ul>
      </div>
    </section>
  )
}
