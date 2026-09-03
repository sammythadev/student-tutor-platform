'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* ──────────────────────────────────────────────────────────
   The room the page sits in.

   One accent hue, three soft radial fields, a masked grid and a grain tile.
   Everything is fixed or absolute behind the content, nothing is interactive, and
   the only motion is a slow transform on the bloom plus a scroll-linked parallax
   drift, so it stays on the compositor and costs no layout.
────────────────────────────────────────────────────────── */

export default function Atmosphere() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      /* The light sits slightly behind the page: it moves at about two-thirds of
         scroll, which reads as depth rather than as a moving background. */
      const tween = gsap.to('[data-bloom]', {
        yPercent: 22,
        ease: 'none',
        scrollTrigger: {
          trigger: document.documentElement,
          start: 'top top',
          end: '+=1800',
          scrub: true,
        },
      })
      return () => { tween.scrollTrigger?.kill(); tween.kill() }
    })

    return () => mm.revert()
  }, { scope: root })

  return (
    <div ref={root} aria-hidden>
      {/* Hero field: three aurora bodies and one slow conic sheen, layered under a
          masked grid. The bloom stays as the warm centre of the group. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[150vh] overflow-hidden">
        <div className="atm-sheen" />
        <div className="atm-aurora atm-aurora-1" />
        <div className="atm-aurora atm-aurora-2" />
        <div className="atm-aurora atm-aurora-3" />
        <div data-bloom className="atm-bloom opacity-70" />
        <div className="atm-grid" />
      </div>

      {/* Mid-page and closing fields, so the light does not run out after the
          hero. Weaker, static, and positioned off the section boundaries rather
          than on them. */}
      <div className="pointer-events-none absolute inset-x-0 top-[155vh] h-[150vh] overflow-hidden opacity-[0.55]">
        <div className="atm-aurora atm-aurora-1" style={{ animationDelay: '-19s' }} />
        <div className="atm-aurora atm-aurora-3" style={{ animationDelay: '-11s' }} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[130vh] overflow-hidden opacity-[0.5]">
        <div className="atm-aurora atm-aurora-2" style={{ animationDelay: '-27s' }} />
        <div className="atm-aurora atm-aurora-3" style={{ animationDelay: '-33s' }} />
      </div>

      <div className="atm-grain" />
    </div>
  )
}
