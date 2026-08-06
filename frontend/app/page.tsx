'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion, animate } from 'motion/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import {
  ArrowRight, Search, BookOpen, SlidersHorizontal,
  CalendarCheck, GraduationCap, TrendingUp, Users, ChevronRight,
  Clock, Video, MessageSquare, Sun, Moon,
  Funnel, Sigma, Scale, ShieldCheck,
} from 'lucide-react'
import Aurora from '@/components/Aurora'
import TextType from '@/components/TextType'
import { CinematicFooter } from '@/components/ui/motion-footer'

gsap.registerPlugin(ScrollTrigger)

/* ──────────────────────────────────────────────────────────
   Theme Toggle
────────────────────────────────────────────────────────── */
function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('tutorly-theme')
    const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = saved ? saved === 'dark' : prefersDark
    setIsDark(dark)
    document.documentElement.classList.toggle('dark-mode', dark)
    document.documentElement.classList.toggle('light-mode', !dark)
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark-mode', next)
    document.documentElement.classList.toggle('light-mode', !next)
    localStorage.setItem('tutorly-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="pressable w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer"
      style={{ color: 'var(--text-secondary)' }}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

/* ──────────────────────────────────────────────────────────
   Navigation links
────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────
   Scroll Reveal — whileInView wrapper
────────────────────────────────────────────────────────── */
function Reveal({
  children,
  className = '',
  delay = 0,
  y = 40,
  style,
}: Readonly<{
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
  style?: React.CSSProperties
}>) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      style={style}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────
   Lenis smooth scroll — skipped entirely under reduced motion
────────────────────────────────────────────────────────── */
function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const lenis = new Lenis({ lerp: 0.1 })
    let rafId = 0
    const raf = (t: number) => {
      lenis.raf(t)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    lenis.on('scroll', ScrollTrigger.update)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.off('scroll', ScrollTrigger.update)
      lenis.destroy()
    }
  }, [enabled])
}

/* ──────────────────────────────────────────────────────────
   Step Visuals — real product UI previews
────────────────────────────────────────────────────────── */
function SearchVisual() {
  const tutors = [
    { id: 'tv-1', name: 'Adaeze Okonkwo', sub: 'Mathematics · SS3', rate: '₦4,500/hr', color: 'mint', match: '97%' },
    { id: 'tv-2', name: 'Ibrahim Bello', sub: 'Further Maths · SS2', rate: '₦3,800/hr', color: 'mint', match: '91%' },
    { id: 'tv-3', name: 'Funmi Adeyemi', sub: 'Mathematics · SS1', rate: '₦3,000/hr', color: 'sun', match: '74%' },
  ]
  return (
    <div className="surface-card p-4 sm:p-5 space-y-3 w-full">
      <div
        className="flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Mathematics tutors</span>
        <div
          className="ml-auto flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
          style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
        >
          <SlidersHorizontal className="w-3 h-3" /> Filter
        </div>
      </div>
      <div className="space-y-2">
        {tutors.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
              style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
            >
              {t.name[0]}{t.name.split(' ')[1]?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{t.sub}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold tabular" style={{ color: 'var(--text-primary)' }}>{t.rate}</p>
              <p className="text-[10px] font-bold tabular" style={{ color: `var(--accent-${t.color}-fg)` }}>{t.match} match</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarVisual() {
  return (
    <div className="surface-card p-4 sm:p-5 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Book a session</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>with Adaeze Okonkwo</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-sky-bg)', color: 'var(--accent-sky-fg)' }}
        >
          <CalendarCheck className="w-5 h-5" strokeWidth={2} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {['Mon 23', 'Tue 24', 'Wed 25', 'Thu 26'].map((d, i) => (
          <button
            key={d}
            type="button"
            className="rounded-xl py-2.5 text-center text-xs font-semibold cursor-pointer"
            style={
              i === 1
                ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
                : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }
            }
          >
            {d.split(' ').map(p => <span key={p} className="block tabular">{p}</span>)}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {['9:00 AM', '11:00 AM', '2:00 PM'].map((t, i) => (
          <button
            key={t}
            type="button"
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium tabular cursor-pointer"
            style={
              i === 0
                ? { background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)', border: '1.5px solid var(--accent-mint-fg)' }
                : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
            }
          >
            {t}{i === 0 && <span className="ml-2 font-bold">Selected</span>}
          </button>
        ))}
      </div>
      <button type="button" className="btn-primary w-full justify-center text-sm py-2.5">Confirm booking</button>
    </div>
  )
}

function ResultsVisual() {
  return (
    <div className="space-y-3 w-full">
      <div className="surface-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun-fg)' }}
          >
            <TrendingUp className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <p className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Session history</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mathematics, SS2</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Algebra', pct: 88 },
            { label: 'Geometry', pct: 71 },
            { label: 'Statistics', pct: 95 },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span className="font-bold tabular" style={{ color: 'var(--text-primary)' }}>{item.pct}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface-card p-4 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}
        >
          <ShieldCheck className="w-4 h-4" strokeWidth={2} />
        </div>
        <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
          Every completed session feeds back into your next match score.
        </p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   GSAP Sticky Stack — "How it works"
   Motivated: storytelling — steps reveal in narrative sequence
   Pattern: CSS sticky top-0 pins each card; GSAP scrubs scale
   + opacity on the PREVIOUS card as the next card arrives.
   Mobile: Motion whileInView stagger — no conflicting sticky.
────────────────────────────────────────────────────────── */
const HOW_STEPS = [
  {
    step: '01',
    title: 'Find your perfect tutor',
    desc: 'Our algorithm matches you with tutors based on learning style, subject depth, and schedule. Not just whoever is available.',
    icon: Search,
    color: 'lavender',
    Visual: SearchVisual,
  },
  {
    step: '02',
    title: 'Book a session in seconds',
    desc: 'Pick a time, confirm, and done. Seamless calendar integration with instant booking confirmations sent to both sides.',
    icon: CalendarCheck,
    color: 'mint',
    Visual: CalendarVisual,
  },
  {
    step: '03',
    title: 'Track real progress',
    desc: 'Interactive lessons, shared whiteboards, session recordings, and a progress dashboard that shows exactly how far you have come.',
    icon: TrendingUp,
    color: 'sun',
    Visual: ResultsVisual,
  },
]

/* Card content — shared between desktop sticky and mobile reveal */
function StepCardContent({
  step, title, desc, color, icon: Icon, Visual,
}: (typeof HOW_STEPS)[number]) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-8 lg:gap-20 items-center">
      {/* Left: text */}
      <div className="space-y-5 sm:space-y-6 order-2 lg:order-1">
        <div className="flex items-end gap-3">
          <span
            className="font-heading leading-[0.85] font-black select-none"
            style={{ fontSize: 'clamp(56px, 9vw, 112px)', color: 'var(--border-strong)', lineHeight: 1 }}
          >
            {step}
          </span>
          <div
            className="mb-2 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
          >
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        </div>
        <h3
          className="font-heading font-bold tracking-tight leading-[1.08]"
          style={{ fontSize: 'clamp(24px, 3.2vw, 46px)', color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        <p
          className="text-sm sm:text-base lg:text-lg leading-relaxed"
          style={{ color: 'var(--text-secondary)', maxWidth: '44ch' }}
        >
          {desc}
        </p>
      </div>
      {/* Right: visual */}
      <div className="flex items-center justify-center order-1 lg:order-2">
        <div className="w-full max-w-sm mx-auto">
          <Visual />
        </div>
      </div>
    </div>
  )
}

/* ── Desktop sticky stack ── */
function StickyStackDesktop() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce || !ref.current) return

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.stack-card-desktop', ref.current!)
      if (cards.length < 2) return

      // For each card except the last: shrink it as the NEXT card scrolls into view.
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return
        const nextCard = cards[i + 1]

        // Pin the current card at the top while the next scrolls over it.
        ScrollTrigger.create({
          trigger: card,
          start: 'top top',
          endTrigger: cards[cards.length - 1],
          end: 'bottom bottom',
          pin: true,
          pinSpacing: false,
        })

        // Shrink + fade this card as the next card approaches.
        gsap.to(card, {
          scale: 0.92,
          opacity: 0.5,
          filter: 'blur(1px)',
          ease: 'none',
          scrollTrigger: {
            trigger: nextCard,
            start: 'top bottom',
            end: 'top top',
            scrub: true,
          },
        })
      })

      ScrollTrigger.refresh()
    }, ref)

    return () => ctx.revert()
  }, [reduce])

  return (
    <div ref={ref} className="relative hidden lg:block">
      {HOW_STEPS.map((step, i) => (
        <div
          key={i}
          className="stack-card-desktop min-h-[100dvh] flex items-center py-20"
          style={{
            background: 'var(--canvas)',
            transformOrigin: 'top center',
            willChange: 'transform, opacity, filter',
          }}
        >
          <StepCardContent {...step} />
        </div>
      ))}
    </div>
  )
}

/* ── Mobile sticky stack — GSAP pin + scrub, adapted for mobile ── */
function MobileSteps() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce || !ref.current) return

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.stack-card-mobile', ref.current!)
      if (cards.length < 2) return

      cards.forEach((card, i) => {
        if (i === cards.length - 1) return
        const nextCard = cards[i + 1]

        // Pin each card (except last) at top of viewport (below navbar ~64px)
        ScrollTrigger.create({
          trigger: card,
          start: 'top 64px',
          endTrigger: cards[cards.length - 1],
          end: 'bottom bottom',
          pin: true,
          pinSpacing: false,
        })

        // Scale + fade this card as the next card scrolls over it
        gsap.to(card, {
          scale: 0.88,
          opacity: 0.4,
          filter: 'blur(2px)',
          ease: 'none',
          scrollTrigger: {
            trigger: nextCard,
            start: 'top bottom',
            end: 'top 64px',
            scrub: true,
          },
        })
      })

      ScrollTrigger.refresh()
    }, ref)

    return () => ctx.revert()
  }, [reduce])

  return (
    <div ref={ref} className="lg:hidden relative">
      {HOW_STEPS.map((step, i) => (
        <div
          key={i}
          className="stack-card-mobile min-h-[100dvh] flex items-center py-12 sm:py-16"
          style={{
            background: 'var(--canvas)',
            transformOrigin: 'top center',
            willChange: 'transform, opacity, filter',
          }}
        >
          {/* Mobile layout: visual top, text below */}
          <div className="w-full px-4 sm:px-6 flex flex-col gap-6">
            {/* Visual */}
            <div className="w-full max-w-xs mx-auto">
              <step.Visual />
            </div>
            {/* Text */}
            <div className="space-y-3">
              <div className="flex items-end gap-2.5">
                <span
                  className="font-heading font-black select-none leading-none"
                  style={{ fontSize: 'clamp(48px, 14vw, 80px)', color: 'var(--border-strong)' }}
                >
                  {step.step}
                </span>
                <div
                  className="mb-1.5 w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `var(--accent-${step.color}-bg)`, color: `var(--accent-${step.color}-fg)` }}
                >
                  <step.icon className="w-4.5 h-4.5" strokeWidth={2} />
                </div>
              </div>
              <h3
                className="font-heading font-bold tracking-tight leading-[1.1]"
                style={{ fontSize: 'clamp(22px, 6vw, 34px)', color: 'var(--text-primary)' }}
              >
                {step.title}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: '38ch' }}>
                {step.desc}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Combined section ── */
function StickyStack() {
  return (
    <section>
      <StickyStackDesktop />
      <MobileSteps />
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Bento Features — 4-cell grid (2+1 / 1+2 pattern)
────────────────────────────────────────────────────────── */
function BentoFeatures() {
  return (
    <section className="py-16 sm:py-24 lg:py-28 px-4 md:px-8" style={{ background: 'var(--surface)' }}>
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        <Reveal className="max-w-2xl">
          <h2
            className="font-heading font-bold tracking-tight leading-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)', color: 'var(--text-primary)' }}
          >
            Everything you need to learn or teach.
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: '48ch' }}>
            Built for students and tutors in Nigeria, from WAEC prep to university coursework.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Cell 1: large student feature (2 cols) */}
          <Reveal
            className="lg:col-span-2 rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden flex flex-col justify-between"
            style={{ background: 'var(--canvas)', border: '1px solid var(--border)', minHeight: 240 }}
            delay={0}
          >
            <div
              className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
              style={{ background: 'var(--primary)', filter: 'blur(60px)', opacity: 0.07, transform: 'translate(25%, -25%)' }}
            />
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center relative z-10"
              style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
            >
              <Users className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="relative z-10 space-y-3">
              <h3 className="font-heading text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Fairness-first matching
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: '52ch' }}>
                Our algorithm pairs you with tutors based on learning style, subject depth, and scheduling compatibility. Not just whoever is available.
              </p>
            </div>
            <div className="relative z-10 flex flex-wrap gap-2">
              {['Learning style', 'Subject depth', 'Schedule fit', 'Budget range'].map(tag => (
                <span
                  key={tag}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Cell 2: algorithm fact (1 col) */}
          <Reveal
            className="rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden"
            style={{
              background: 'var(--canvas)',
              border: '1px solid var(--border)',
              minHeight: 220,
            }}
            delay={0.1}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
            >
              <Sigma className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <p
                className="font-heading font-bold mb-2 tabular"
                style={{ fontSize: 'clamp(36px, 5vw, 52px)', color: 'var(--text-primary)', lineHeight: 1 }}
              >
                4
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Weighted criteria scored into every match
              </p>
            </div>
          </Reveal>

          {/* Cell 3: algorithm fact (1 col) */}
          <Reveal
            className="rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden"
            style={{
              background: 'var(--canvas)',
              border: '1px solid var(--border)',
              minHeight: 200,
            }}
            delay={0.15}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}
            >
              <Scale className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <p
                className="font-heading font-bold mb-2 tabular"
                style={{ fontSize: 'clamp(36px, 5vw, 52px)', color: 'var(--text-primary)', lineHeight: 1 }}
              >
                ½
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Approximation bound the greedy assignment is proven to hold
              </p>
            </div>
          </Reveal>

          {/* Cell 4: large tutor feature (2 cols) */}
          <Reveal
            className="lg:col-span-2 rounded-2xl p-6 sm:p-8 space-y-5 sm:space-y-6 relative overflow-hidden flex flex-col justify-between"
            style={{ background: 'var(--canvas)', border: '1px solid var(--border)', minHeight: 200 }}
            delay={0.2}
          >
            <div
              className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'var(--accent)', filter: 'blur(60px)', opacity: 0.06, transform: 'translate(-25%, 25%)' }}
            />
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center relative z-10"
              style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}
            >
              <GraduationCap className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="relative z-10 space-y-3">
              <h3 className="font-heading text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Tutors: focus on teaching. We handle the rest.
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: '52ch' }}>
                Automated billing, a student marketplace, professional profiles, and full booking management. Less admin, more impact.
              </p>
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row gap-4 sm:gap-5">
              {[
                { icon: MessageSquare, label: 'Built-in messaging' },
                { icon: Video, label: 'HD video sessions' },
                { icon: Clock, label: 'Flexible scheduling' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Stats Strip
────────────────────────────────────────────────────────── */
const STATS = [
  { value: '4',    label: 'Weighted match criteria' },
  { value: '½',    label: 'Approximation guarantee' },
  { value: '100%', label: 'Subject-verified tutors' },
  { value: '0',    label: 'Manual steps to re-match' },
]

function StatsSection() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div
            className="rounded-2xl py-10 sm:py-14 px-6 sm:px-8 md:px-16 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 animate-gradient"
            style={{ background: 'linear-gradient(135deg, var(--primary-hover), var(--primary), var(--primary-hover))', backgroundSize: '200% 200%' }}
          >
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="text-center"
                /* Only show divider line on md+ where all 4 are in a row */
                style={i > 0 ? undefined : undefined}
              >
                <p className="font-heading font-bold text-white tracking-tight mb-1" style={{ fontSize: 'clamp(24px, 4vw, 48px)' }}>
                  {stat.value}
                </p>
                <p className="text-white/60 text-[10px] sm:text-xs font-bold uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   How matching works — honest, algorithm-first explainer.
   This is a final-year research project, not a deployed product,
   so it explains the decision rules instead of quoting students
   who do not exist.
────────────────────────────────────────────────────────── */
const MATCH_STEPS = [
  {
    icon: Funnel,
    color: 'lavender',
    title: 'Subject is a hard filter',
    body: 'Tutors who do not teach what you need never reach your list. Subject is a filter, not a weighted preference, so there is nothing to trade it away against.',
  },
  {
    icon: Sigma,
    color: 'sky',
    title: 'Four criteria, one score',
    body: 'Availability overlap, learning style, budget and experience each feed a single match score. You can see exactly why a tutor ranked where they did.',
  },
  {
    icon: Scale,
    color: 'mint',
    title: 'Assignment stays fair',
    body: 'A greedy assignment with a proven ½-approximation bound spreads students across tutors instead of piling everyone onto the few most popular ones.',
  },
  {
    icon: ShieldCheck,
    color: 'sun',
    title: 'Waitlisting is automatic',
    body: 'If every eligible tutor is full, you keep your place in the queue and a seat is allocated the moment one frees up. You never have to re-apply.',
  },
]

function HowMatchingWorks() {
  return (
    <section className="py-16 sm:py-24 lg:py-28" style={{ background: 'var(--surface)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <Reveal className="mb-10 sm:mb-14 lg:mb-16 max-w-2xl">
          <p className="label-caps" style={{ color: 'var(--text-muted)' }}>How matching works</p>
          <h2
            className="font-heading font-bold tracking-tight mt-2"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)', color: 'var(--text-primary)' }}
          >
            Every match can be explained.
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: '52ch' }}>
            No black box and no pay-to-rank. The same four rules decide every pairing, and each one traces straight back to your profile.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {MATCH_STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="surface-card p-6 sm:p-7 h-full flex flex-col gap-4">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `var(--accent-${step.color}-bg)`, color: `var(--accent-${step.color}-fg)` }}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {step.body}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   CTA Section — full-width editorial
────────────────────────────────────────────────────────── */
function CTASection() {
  return (
    <section className="py-20 sm:py-28 lg:py-32 px-4 md:px-8" style={{ background: 'var(--canvas)' }}>
      <Reveal className="max-w-4xl lg:max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
        <h2
          className="font-heading font-bold tracking-tighter leading-[1.05]"
          style={{ fontSize: 'clamp(32px, 6vw, 72px)', color: 'var(--text-primary)' }}
        >
          The right tutor{' '}
          <span
            className="gradient-text-animate"
            style={{ backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent), var(--primary))' }}
          >
            changes everything.
          </span>
        </h2>
        <p
          className="text-base sm:text-lg md:text-xl mx-auto"
          style={{ color: 'var(--text-secondary)', maxWidth: '40ch' }}
        >
          Create an account and get your first ranked matches in minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
          <Link href="/signup" className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-3.5 sm:py-4 group pressable justify-center">
            Get started free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/tutors" className="btn-secondary text-sm sm:text-base px-6 sm:px-8 py-3.5 sm:py-4 pressable justify-center">
            Browse tutors
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Main Landing Page
────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'var(--canvas)' }}>

      {/* Aurora background */}
      <div
        className="pointer-events-none"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          width: '100vw',
          height: '100vh',
          mixBlendMode: 'var(--aurora-blend)' as any,
          opacity: 'var(--aurora-opacity)' as any,
        }}
      >
        <Aurora colorStops={['#2F7A63', '#C9A24B', '#3E9179']} amplitude={1.2} blend={0.45} speed={0.35} />
      </div>

      {/* ── Navigation ── */}
      <header className="fixed top-0 left-0 right-0 z-50">

        {/* ── DESKTOP NAV ── full squircle pill with center links ── */}
        <div className="hidden md:flex justify-center pt-4 px-6">
          <nav
            className="w-full max-w-5xl flex items-center justify-between gap-4 px-5 py-3"
            style={{
              background: 'color-mix(in srgb, var(--surface-glass) 80%, transparent)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 9999,
              boxShadow: '0 4px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Left: Logo */}
            <Link href="/" className="pressable flex items-center gap-2 cursor-pointer shrink-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--primary)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}
              >
                <BookOpen className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-base font-bold tracking-tight font-heading" style={{ color: 'var(--text-primary)' }}>
                Tutorly
              </span>
            </Link>

            {/* Center: Nav links */}
            <div className="flex items-center gap-1">
              {[['How it works', '#how'], ['Features', '#features'], ['Browse Tutors', '/tutors'], ['Pricing', '#pricing']].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:text-white"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--primary-subtle)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle />
              <Link href="/signin"
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-150"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary text-sm px-5 py-2.5 pressable whitespace-nowrap">
                Get started
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </nav>
        </div>

        {/* ── MOBILE NAV ── floating pill, compact ── */}
        <div className="md:hidden flex items-center justify-between px-3 pt-3">
          <div
            className="flex items-center justify-between w-full px-3 py-2.5"
            style={{
              background: 'color-mix(in srgb, var(--surface-glass) 85%, transparent)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 9999,
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Logo */}
            <Link href="/" className="pressable flex items-center gap-2 cursor-pointer">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--primary)', boxShadow: '0 0 10px rgba(99,102,241,0.45)' }}
              >
                <BookOpen className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold tracking-tight font-heading" style={{ color: 'var(--text-primary)' }}>Tutorly</span>
            </Link>

            {/* Right: theme + CTA */}
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <Link href="/signin" className="btn-primary text-xs px-3.5 py-2 pressable whitespace-nowrap">
                Sign in
              </Link>
            </div>
          </div>
        </div>

      </header>

      <main className="relative z-10">

        {/* ── HERO ── */}
        <section className="px-4 md:px-8 pt-20 sm:pt-24 md:pt-24 lg:pt-20 pb-10 sm:pb-14 min-h-[100dvh] flex items-center md:mt-3">
          <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

            {/* Left: headline + CTA */}
            <div className="w-full min-w-0 space-y-4 sm:space-y-5 md:space-y-6">

              {/* 1. Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="stat-badge w-fit">
                  <ShieldCheck className="w-3 h-3" />
                  Fairness-first matching for Nigerian secondary schools
                </div>
              </motion.div>

              {/* 2. Headline */}
              <motion.h1
                className="font-heading font-bold leading-[1.06] tracking-tighter"
                style={{ fontSize: 'clamp(38px, 7vw, 72px)', color: 'var(--text-primary)' }}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                The right tutor{' '}
                <span
                  className="gradient-text-animate"
                  style={{ backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent), var(--primary))' }}
                >
                  changes everything.
                </span>
              </motion.h1>

              {/* 3. Typewriter + subtext */}
              <motion.div
                className="space-y-2.5 sm:space-y-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <div style={{ minHeight: '2rem' }}>
                  <TextType
                    text={['for WAEC & JAMB prep', 'for A-level students', 'for university entrance', 'for any subject, any level']}
                    typingSpeed={45}
                    deletingSpeed={28}
                    pauseDuration={2200}
                    loop
                    showCursor
                    cursorCharacter="|"
                    className="font-heading font-semibold"
                    style={{ fontSize: 'clamp(17px, 3vw, 26px)', color: 'var(--primary)', letterSpacing: '-0.02em' }}
                  />
                </div>
                <p
                  className="text-sm sm:text-base md:text-lg leading-relaxed"
                  style={{ color: 'var(--text-secondary)', maxWidth: '42ch' }}
                >
                  Fairness-first matching connects you with tutors based on your learning style, goals, and real compatibility.
                </p>
              </motion.div>

              {/* 4. CTAs — use grid so cells are always full-width on mobile */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href="/signup"
                  className="btn-primary text-sm sm:text-base px-4 py-3.5 group pressable cursor-pointer"
                  style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
                >
                  Get started free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/tutors"
                  className="btn-secondary text-sm sm:text-base px-4 py-3.5 pressable"
                  style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
                >
                  Browse tutors
                </Link>
              </motion.div>

              {/* Mobile-only: quick trust stats strip — grid-cols-3 guarantees even distribution */}
              <motion.div
                className="grid grid-cols-3 lg:hidden w-full pt-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
              >
                {[{ value: '4', label: 'Criteria' }, { value: '100%', label: 'Subject-checked' }, { value: 'Auto', label: 'Waitlist' }].map(({ value, label }, i) => (
                  <div key={label} className={`flex flex-col items-center gap-0.5 py-2 ${i !== 0 ? 'border-l' : ''}`} style={{ borderColor: 'var(--border)' }}>
                    <span className="font-heading font-bold text-base" style={{ color: 'var(--text-primary)' }}>{value}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  </div>
                ))}
              </motion.div>

              {/* Mobile-only: featured tutors micro-strip — negative margin bleed so scroll stays within page bounds */}
              <motion.div
                className="lg:hidden -mx-4"
                style={{ overflow: 'clip' }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.44, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="flex gap-2 overflow-x-auto pb-1 px-4"
                  style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                >
                  {[
                    { name: 'Adaeze Okonkwo', sub: 'Maths', color: 'lavender', match: '97%' },
                    { name: 'Ibrahim Bello', sub: 'Physics', color: 'sky', match: '94%' },
                    { name: 'Funmi Adeyemi', sub: 'English', color: 'mint', match: '89%' },
                  ].map((t) => (
                    <div
                      key={t.name}
                      className="shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', width: 152 }}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: `var(--accent-${t.color}-bg)`, color: `var(--accent-${t.color}-fg)` }}
                      >
                        {t.name[0]}{t.name.split(' ')[1]?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t.sub} · {t.match}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>

            {/* Right: schedule card with tilt — desktop only */}
            <motion.div
              className="perspective-container relative h-120 lg:h-130 hidden lg:block"
              initial={{ opacity: 0, scale: 0.94, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <div
                className="tilted-card absolute inset-0 surface-card overflow-hidden"
                style={{ padding: 0 }}
              >
                <div
                  className="flex justify-between items-center px-5 py-4 border-b"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: 'var(--primary)' }}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-heading font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                      Weekly Schedule
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['‹', '›'] as const).map((ch, i) => (
                      <button
                        key={i}
                        className="pressable w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-sm font-bold"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(5, 1fr)', overflow: 'hidden' }}>
                  <div style={{ height: 52, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }} />
                  {[{ d: 'Mon', n: 23, t: true }, { d: 'Tue', n: 24, t: false }, { d: 'Wed', n: 25, t: false }, { d: 'Thu', n: 26, t: false }, { d: 'Fri', n: 27, t: false }].map(({ d, n, t }) => (
                    <div key={d} style={{ height: 52, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t ? 'var(--primary)' : 'var(--text-muted)' }}>{d}</span>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: t ? 'var(--primary)' : 'transparent', color: t ? '#fff' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, boxShadow: t ? '0 2px 8px rgba(99,102,241,0.35)' : 'none' }}>{n}</div>
                    </div>
                  ))}
                  {[
                    { h: '9 AM',  evs: [{ c: 0, s: 'Calculus IV',    tu: 'Dr. Aris',  bc: 'var(--accent-lavender-fg)', bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)' }, { c: 2, s: 'Macroeconomics', tu: 'Prof. Han',  bc: 'var(--accent-sky-fg)', bg: 'var(--accent-sky-bg)',      fg: 'var(--accent-sky-fg)' }] },
                    { h: '11 AM', evs: [{ c: 1, s: 'Art History',    tu: 'Ms. Blake', bc: 'var(--accent-sun-fg)', bg: 'var(--accent-sun-bg)',      fg: 'var(--accent-sun-fg)' },      { c: 3, s: 'Bio Ethics',     tu: 'Dr. Osei',  bc: 'var(--accent-mint-fg)', bg: 'var(--accent-mint-bg)',     fg: 'var(--accent-mint-fg)' }] },
                    { h: '1 PM',  evs: [{ c: 0, s: 'Psych 101',     tu: 'Dr. Lima',  bc: 'var(--accent-coral-fg)', bg: 'var(--accent-coral-bg)',    fg: 'var(--accent-coral-fg)' },    { c: 4, s: 'Quantum Phys',   tu: 'Prof. Yun', bc: 'var(--accent-lavender-fg)', bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)' }] },
                    { h: '3 PM',  evs: [{ c: 2, s: 'Linear Algebra', tu: 'Dr. Aris',  bc: 'var(--accent-tangerine-fg)', bg: 'var(--accent-tangerine-bg)', fg: 'var(--accent-tangerine-fg)' }, { c: 4, s: 'Spanish B2',     tu: 'Ms. Vega',  bc: 'var(--accent-mint-fg)', bg: 'var(--accent-mint-bg)',     fg: 'var(--accent-mint-fg)' }] },
                    { h: '5 PM',  evs: [{ c: 1, s: 'Essay Writing',  tu: 'Ms. Brown', bc: 'var(--accent-sun-fg)', bg: 'var(--accent-sun-bg)',      fg: 'var(--accent-sun-fg)' }] },
                  ].map((row, ri) => (
                    <React.Fragment key={ri}>
                      <div style={{ height: 56, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>{row.h}</span>
                      </div>
                      {[0, 1, 2, 3, 4].map(col => {
                        const ev = row.evs.find((e: any) => e.c === col)
                        return (
                          <div key={col} style={{ height: 56, borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)', background: col % 2 === 0 ? 'var(--surface)' : 'var(--canvas)', position: 'relative' }}>
                            {ev && (
                              <div
                                className="hover-lift"
                                style={{ position: 'absolute', inset: 3, background: ev.bg, borderLeft: `3px solid ${ev.bc}`, borderRadius: 8, overflow: 'hidden', padding: '4px 6px' }}
                              >
                                <div style={{ color: ev.fg, fontSize: 10, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{ev.s}</div>
                                <div style={{ color: ev.fg, fontSize: 9, opacity: 0.7, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginTop: 1 }}>{ev.tu}</div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>

                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', animation: 'pulse-breathe 2s ease-in-out infinite' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>3 sessions today</span>
                  </div>
                  <span className="pressable" style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}>
                    View full week
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── HOW IT WORKS — GSAP STICKY STACK ── */}
        <StickyStack />

        {/* ── BENTO FEATURES ── */}
        <BentoFeatures />

        {/* ── STATS ── */}
        <StatsSection />

        {/* ── HOW MATCHING WORKS ── */}
        <HowMatchingWorks />

        {/* ── CTA ── */}
        <CTASection />

      </main>

      <CinematicFooter />
    </div>
  )
}
