'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { SUBJECTS } from './content'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* ──────────────────────────────────────────────────────────
   Breadth, honestly.

   There is no logo wall here on purpose: a strip of unfamiliar logos reads as a
   page with nothing to show, and inventing recognisable ones would be a lie.
   What is true is the subject coverage, so that is what moves.

   The marquee's speed follows scroll velocity, which ties the one piece of
   ambient motion on the page to something the reader is actually doing.
────────────────────────────────────────────────────────── */

export default function SubjectStrip() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const track = root.current?.querySelector<HTMLElement>('[data-track]')
    if (!track) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      /* Two copies of the list sit side by side, so -50% lands exactly on the
         seam and the loop is invisible at any width. */
      const loop = gsap.to(track, {
        xPercent: -50,
        duration: 46,
        ease: 'none',
        repeat: -1,
      })

      const st = ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: self => {
          const v = self.getVelocity()
          /* Sign follows scroll direction, magnitude is capped: past about 5x
             the type stops being readable and it reads as a glitch. */
          const boost = gsap.utils.clamp(1, 5, 1 + Math.abs(v) / 900)
          gsap.to(loop, {
            timeScale: v < 0 ? -boost : boost,
            duration: 0.5,
            ease: 'power2.out',
            overwrite: true,
          })
        },
        /* A marquee that keeps painting off-screen is battery spent on nothing. */
        onEnter: () => loop.play(),
        onEnterBack: () => loop.play(),
        onLeave: () => loop.pause(),
        onLeaveBack: () => loop.pause(),
      })

      const pause = () => loop.pause()
      const play = () => loop.play()
      root.current?.addEventListener('pointerenter', pause)
      root.current?.addEventListener('pointerleave', play)
      root.current?.addEventListener('focusin', pause)
      root.current?.addEventListener('focusout', play)

      return () => {
        st.kill()
        loop.kill()
        root.current?.removeEventListener('pointerenter', pause)
        root.current?.removeEventListener('pointerleave', play)
        root.current?.removeEventListener('focusin', pause)
        root.current?.removeEventListener('focusout', play)
      }
    })

    return () => mm.revert()
  }, { scope: root })

  return (
    <section aria-labelledby="subjects-title" className="relative py-12 lg:py-14">
      <div aria-hidden className="mk-rule absolute inset-x-0 top-0" />
      <div aria-hidden className="mk-rule absolute inset-x-0 bottom-0" />

      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <h2 id="subjects-title" className="text-[13px] font-medium text-mk-ink-3">
          Matched across the WAEC and JAMB syllabus, and beyond it
        </h2>
      </div>

      <div
        ref={root}
        className="relative mt-5 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]"
      >
        <ul data-track className="flex w-max gap-2.5 will-change-transform">
          {[...SUBJECTS, ...SUBJECTS].map((subject, i) => (
            <li
              key={`${subject}-${i}`}
              /* The duplicate half is decoration; only the first pass is read. */
              aria-hidden={i >= SUBJECTS.length}
              className="whitespace-nowrap rounded-full border border-mk-hairline bg-mk-panel px-4 py-2 text-[13px] font-medium text-mk-ink-2"
            >
              {subject}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
