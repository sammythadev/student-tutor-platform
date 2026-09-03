'use client'

import Link from 'next/link'
import { CTA, HERO } from './content'
import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* ──────────────────────────────────────────────────────────
   Hero copy.

   This replaced a pinned scroll-scrub that took the shortlist apart criterion by
   criterion. It was accurate and it was the wrong thing to open with: a visitor
   who has not agreed to care about the scoring yet was being handed the scoring.
   The product assembling itself, immediately below, is the better first move.

   The visual is client-bound because its exploded assembly is scroll-driven.
────────────────────────────────────────────────────────── */

export default function Hero() {
  const visual = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const pieces = visual.current?.querySelectorAll('[data-hero-piece]')
      if (!pieces?.length) return
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: visual.current,
          start: 'top 78%',
          end: 'bottom 28%',
          scrub: 0.8,
        },
      })
      tl.to('[data-hero-piece="shell"]', { y: -16, rotateY: -9, rotateZ: -2, duration: 1 }, 0)
        .to('[data-hero-piece="score"]', { x: -74, y: -62, z: 78, rotateZ: -9, duration: 1 }, 0)
        .to('[data-hero-piece="profile"]', { x: 82, y: -28, z: 100, rotateZ: 8, duration: 1 }, 0)
        .to('[data-hero-piece="bars"]', { x: -66, y: 64, z: 52, rotateZ: 5, duration: 1 }, 0)
        .to('[data-hero-piece="meta"]', { x: 74, y: 70, z: 72, rotateZ: -7, duration: 1 }, 0)
      return () => { tl.scrollTrigger?.kill(); tl.kill() }
    })
    return () => mm.revert()
  }, { scope: visual })

  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="landing-hero mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-10 pt-16 md:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:gap-20 lg:pb-8 lg:pt-28">
        <div>
          <div className="landing-kicker"><span className="landing-kicker-dot" />{HERO.eyebrow}</div>

          <h1 id="hero-title" className="mk-display landing-hero-title mt-5 max-w-[13ch] text-mk-ink">
            Find the right
            <br />
            <span>person to learn from.</span>
          </h1>

          <p className="mk-lead mt-6 max-w-[55ch]">{HERO.lead}</p>

          <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href={CTA.primary.href}
              className="landing-primary-cta inline-flex h-12 w-full items-center justify-center rounded-full px-7 text-[15px] font-semibold transition-[background-color,transform,box-shadow] duration-150 ease-out active:scale-[0.97] sm:h-12 sm:w-auto"
            >
              {CTA.primary.label}<span aria-hidden>↗</span>
            </Link>
            <Link
              href={CTA.secondary.href}
              className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-mk-ink-2 transition-colors duration-200 hover:text-mk-ink"
            >
              {CTA.secondary.label}
              <span aria-hidden className="transition-transform duration-200 ease-out group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="landing-proof mt-10 flex items-center gap-3 text-[11px] text-mk-ink-3">
            <span className="landing-avatar-stack" aria-hidden><i>AO</i><i>IK</i><i>CN</i></span>
            <span><strong className="text-mk-ink-2">Built around real fit.</strong><br />No paid placement. No hidden ranking.</span>
          </div>
        </div>

        <div ref={visual} className="landing-hero-visual" aria-label="Exploded view of a Tutorly tutor match assembling from its ranking layers">
          <div className="landing-orbit landing-orbit-a" />
          <div className="landing-orbit landing-orbit-b" />
          <div className="landing-hero-glow" />
          <div className="landing-match-card landing-match-card-back"><span>03</span><b>Available now</b><small>Thu · 4:00 PM</small></div>
          <div data-hero-piece="shell" className="landing-match-card landing-match-card-front">
            <div data-hero-piece="score" className="landing-piece landing-score-piece"><span className="landing-card-label">TOP MATCH</span><strong>97</strong></div>
            <div data-hero-piece="profile" className="landing-piece landing-profile-row"><span className="landing-profile-avatar">IK</span><span><b>Ibrahim K.</b><small>Physics · SS3 / WAEC</small></span><span className="landing-arrow">↗</span></div>
            <div data-hero-piece="bars" className="landing-piece landing-score-line"><span /><span /><span /><span /></div>
            <div data-hero-piece="meta" className="landing-piece landing-card-meta"><span>Academic fit</span><span>Schedule overlap</span><span>₦5,000 / hr</span></div>
          </div>
          <span className="landing-float-label landing-float-label-one">4 criteria · 1 clear answer</span>
          <span className="landing-float-label landing-float-label-two">scroll to explode</span>
        </div>
      </div>
    </section>
  )
}
