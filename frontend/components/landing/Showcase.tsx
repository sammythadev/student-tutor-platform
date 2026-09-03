'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { SHOWCASE, SURFACES } from './content'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* ──────────────────────────────────────────────────────────
   Three real pages, shown.

   This is where a wall of prose about how matching works used to be. A reader
   takes four seconds to understand a screenshot and thirty to read a paragraph
   that says the same thing, so the screenshots won.

   Each frame rises and settles as it arrives, and drifts at a slightly different
   rate to the page while it is on screen. Transform and opacity only.
────────────────────────────────────────────────────────── */

export default function Showcase() {
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-card]', root.current)

      const tweens = cards.flatMap((card, i) => {
        const frame = card.querySelector<HTMLElement>('[data-frame]')
        const arrive = gsap.from(card, {
          y: 32,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 94%', once: true },
        })

        /* The image inside its frame moves a little slower than the frame does,
           which is what gives a flat screenshot some depth as it passes. */
        const drift = frame
          ? gsap.fromTo(frame,
              { yPercent: i % 2 === 0 ? -4 : -6 },
              {
                yPercent: i % 2 === 0 ? 4 : 6,
                ease: 'none',
                scrollTrigger: {
                  trigger: card,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: true,
                },
              })
          : null

        return [arrive, drift].filter(Boolean) as gsap.core.Tween[]
      })

      return () => tweens.forEach(t => { t.scrollTrigger?.kill(); t.kill() })
    })

    return () => mm.revert()
  }, { scope: root })

  return (
    <section
      ref={root}
      aria-labelledby="showcase-title"
      className="relative mx-auto w-full max-w-6xl px-5 pb-24 pt-16 md:px-8 lg:pb-32 lg:pt-24"
    >
      <p className="text-[13px] font-medium text-mk-accent">{SHOWCASE.eyebrow}</p>
      <h2 id="showcase-title" className="mk-h2 mt-4 max-w-[22ch] text-mk-ink">
        {SHOWCASE.headline}
      </h2>

      <div className="mt-10 flex flex-col gap-6 lg:gap-8">
        {SURFACES.map((s, i) => (
          <article
            key={s.shot}
            data-card
            className={
              'mk-panel-lit relative grid overflow-hidden lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] ' +
              (i % 2 === 1 ? 'lg:[&>figure]:order-first' : '')
            }
          >
            <div className="p-6 lg:self-center lg:p-9">
              <p className="text-[12px] font-medium uppercase tracking-[0.09em] text-mk-accent">
                {s.eyebrow}
              </p>
              <h3 className="mt-3 text-mk-h3 font-semibold leading-snug tracking-tight text-mk-ink">
                {s.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-mk-ink-2">{s.body}</p>
            </div>

            {/* The frame is cropped and the image over-tall inside it, which is
                what leaves room for the drift without ever showing an edge. */}
            <figure className="relative m-4 overflow-hidden rounded-xl border border-mk-hairline bg-mk-panel-sunken lg:my-6 lg:mr-6 lg:ml-0">
              <div className="relative h-[210px] sm:h-[280px] lg:h-[340px]">
                <div data-frame className="absolute inset-x-0 -top-[8%] h-[116%] will-change-transform">
                  <Image
                    src={s.shot}
                    alt={s.alt}
                    width={s.w}
                    height={s.h}
                    sizes="(min-width: 1024px) 46rem, 100vw"
                    className={`h-full w-full object-cover ${s.focus}`}
                  />
                </div>
              </div>
            </figure>
          </article>
        ))}
      </div>
    </section>
  )
}
