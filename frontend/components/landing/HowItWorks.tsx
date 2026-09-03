'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { STEPS } from './content'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* ──────────────────────────────────────────────────────────
   Three steps, as type.

   The screenshots came out: the showcase above uses the only three captures we
   have, and repeating them here made six image slots hold three pictures. What
   is left is a line of light that draws itself across the three steps as they
   arrive, which is enough.

   No numbered circles. An ordinal in a round badge is the most recognisable
   generated-page tell there is, so the sequence is carried by the words.
────────────────────────────────────────────────────────── */

export default function HowItWorks() {
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top 74%', once: true },
      })

      /* The rule draws left to right, then each step lands behind it. */
      tl.from('[data-thread]', { scaleX: 0, duration: 0.9, ease: 'power2.inOut' })
        .from('[data-step]', {
          y: 22, opacity: 0, duration: 0.55, stagger: 0.06, ease: 'power2.out',
        }, 0.25)

      return () => { tl.scrollTrigger?.kill(); tl.kill() }
    })

    return () => mm.revert()
  }, { scope: root })

  return (
    <section
      id="how"
      ref={root}
      aria-labelledby="how-title"
      className="relative mx-auto w-full max-w-6xl px-5 pb-24 md:px-8 lg:pb-32"
    >
      <h2 id="how-title" className="mk-h2 max-w-[20ch] text-mk-ink">
        From a request to a booked hour.
      </h2>

      <div className="relative mt-14">
        <div
          data-thread
          aria-hidden
          className="absolute -top-6 left-0 hidden h-px w-full origin-left lg:block"
          style={{
            background:
              'linear-gradient(90deg, var(--mk-accent), var(--mk-hairline) 62%, transparent)',
          }}
        />

        <ol className="grid gap-12 lg:grid-cols-3 lg:gap-10">
          {STEPS.map(step => (
            <li key={step.title} data-step className="relative">
              {/* A tick on the thread, marking where this step sits on it. */}
              <span
                aria-hidden
                className="absolute -top-[26px] left-0 hidden h-[9px] w-[9px] rounded-full bg-mk-accent lg:block"
                style={{ boxShadow: '0 0 0 4px var(--mk-panel-sunken), 0 0 14px var(--atm-bloom)' }}
              />
              <p className="text-[12px] font-medium uppercase tracking-[0.09em] text-mk-accent">
                {step.ordinal}
              </p>
              <h3 className="mt-3 text-mk-h3 font-semibold tracking-tight text-mk-ink">
                {step.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-mk-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
