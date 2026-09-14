'use client'

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
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
   give (a marquee is not grabbable). Autoplay is a slow scrollTo loop rather than
   a plugin, so hover, drag and reduced-motion all stop it by the same switch.

   Tiles are 396px square at 12px radius, measured. Their inner content staggers
   in when the tile first enters view, which is the reference's own behaviour.
────────────────────────────────────────────────────────── */

function Tile({
  title, sub, hue, bg, kind, index,
}: (typeof SHOWCASE_TILES)[number] & { index: number }) {
  const reduced = useReducedMotion()

  return (
    <li
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

      {/* The tile's own surface, drawn from its `kind`. It staggers in the first
          time the tile enters view -- and only the wrapper animates, so a ten-tile
          row costs ten transforms rather than a few hundred. */}
      <motion.div
        aria-hidden
        className="absolute inset-x-4 bottom-0 top-[86px] overflow-hidden rounded-t-xl border border-b-0 border-black/[0.07] bg-white p-3.5 lg:inset-x-5 lg:top-[96px]"
        initial={reduced ? undefined : { opacity: 0, y: 10 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.42, ease: [0, 0, 0.2, 1], delay: 0.04 * (index % 4) }}
      >
        <TileArt kind={kind} hue={hue} />
      </motion.div>
    </li>
  )
}

export default function TileCarousel() {
  const reduced = useReducedMotion()
  const [emblaRef, embla] = useEmblaCarousel({
    loop: true,
    dragFree: true,
    align: 'start',
    containScroll: false,
  })
  const [paused, setPaused] = useState(false)

  /* Autoplay as a slow, continuous scroll rather than slide-by-slide, so the row
     reads as a moving band. One rAF loop, cancelled on hover, drag and unmount. */
  const drift = useCallback(() => {
    if (!embla) return undefined
    let raf = 0
    let stopped = false
    const engine = embla.internalEngine()

    const step = () => {
      if (!stopped) {
        engine.location.add(-0.45)
        engine.target.set(engine.location)
        engine.scrollLooper.loop(-1)
        engine.slideLooper.loop()
        engine.translate.to(engine.location.get())
        raf = requestAnimationFrame(step)
      }
    }
    raf = requestAnimationFrame(step)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [embla])

  useEffect(() => {
    if (!embla || reduced || paused) return
    return drift()
  }, [embla, reduced, paused, drift])

  useEffect(() => {
    if (!embla) return
    const onDown = () => setPaused(true)
    const onUp = () => setPaused(false)
    embla.on('pointerDown', onDown)
    embla.on('pointerUp', onUp)
    return () => {
      embla.off('pointerDown', onDown)
      embla.off('pointerUp', onUp)
    }
  }, [embla])

  return (
    <section aria-labelledby="showcase-title" className="my-mk-2xl">
      <Container>
        <h2 id="showcase-title" className="mx-auto max-w-[896px] text-center mk-h2 text-mk-ink">
          {SHOWCASE.headline}
          <span className="block text-mk-ink-4">{SHOWCASE.trailing}</span>
        </h2>
      </Container>

      <div
        ref={emblaRef}
        className="mt-mk-md overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
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
