'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowRight, Star, Search, BookOpen, SlidersHorizontal,
  CalendarCheck, GraduationCap, TrendingUp, Users, ChevronRight,
  Sparkles, Clock, Video, MessageSquare, BarChart3, Sun, Moon,
  CheckCircle2, Zap, Globe,
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
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
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
   Scroll Reveal — whileInView wrapper (motivated: hierarchy)
────────────────────────────────────────────────────────── */
function Reveal({
  children,
  className = '',
  delay = 0,
  y = 28,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────
   Subjects Marquee (motivated: breadth without data-dump)
────────────────────────────────────────────────────────── */
const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English Language',
  'Literature in English', 'Economics', 'Further Mathematics', 'Financial Accounting',
  'Government', 'Geography', 'History', 'Computer Science', 'Statistics',
  'French', 'Yoruba Language', 'Agricultural Science', 'Technical Drawing',
]

function SubjectsMarquee() {
  return (
    <div
      className="overflow-hidden py-5 border-y"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="animate-marquee">
        {[...SUBJECTS, ...SUBJECTS].map((s, i) => (
          <span
            key={i}
            className="flex items-center gap-2.5 text-sm font-semibold px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0"
            style={{
              color: 'var(--text-secondary)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: 'var(--primary)',
                boxShadow: '0 0 5px var(--primary)',
              }}
            />
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   Step Visuals — real product UI previews (not div screenshots)
────────────────────────────────────────────────────────── */
function SearchVisual() {
  const tutors = [
    { name: 'Prof. Julian S.', sub: 'Mathematics', rate: '₦8,500/hr', color: 'lavender', match: '97%' },
    { name: 'Dr. Priya Nair',  sub: 'Computer Science', rate: '₦9,500/hr', color: 'sky',      match: '94%' },
    { name: 'Sarah Jenkins',   sub: 'English Literature', rate: '₦6,000/hr', color: 'mint',   match: '89%' },
  ]
  return (
    <div className="surface-card p-5 space-y-3 w-full">
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Search Mathematics tutors...</span>
        <div
          className="ml-auto flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md"
          style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
        >
          <SlidersHorizontal className="w-3 h-3" /> Filter
        </div>
      </div>
      <div className="space-y-2">
        {tutors.map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
              style={{ background: `var(--accent-${t.color}-bg)`, color: `var(--accent-${t.color}-fg)` }}
            >
              {t.name[0]}{t.name.split(' ')[1]?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.sub}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t.rate}</p>
              <p className="text-[10px] font-bold" style={{ color: 'var(--accent-mint-fg)' }}>{t.match} match</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarVisual() {
  return (
    <div className="surface-card p-5 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Book a Session</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>with Prof. Julian S.</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
        >
          <CalendarCheck className="w-5 h-5" strokeWidth={2} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {['Mon 23', 'Tue 24', 'Wed 25', 'Thu 26'].map((d, i) => (
          <button
            key={i}
            className="rounded-xl py-2.5 text-center text-xs font-semibold transition-all"
            style={
              i === 1
                ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 0 12px rgba(99,102,241,0.35)' }
                : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }
            }
          >
            {d.split(' ').map((p, j) => <span key={j} className="block">{p}</span>)}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {['9:00 AM', '11:00 AM', '2:00 PM'].map((t, i) => (
          <button
            key={i}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
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
      <button className="btn-primary w-full justify-center text-sm py-2.5">Confirm Booking</button>
    </div>
  )
}

function ResultsVisual() {
  return (
    <div className="space-y-3 w-full">
      <div className="surface-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun-fg)' }}
          >
            <TrendingUp className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <p className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Your Progress</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mathematics this month</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Algebra', pct: 88 },
            { label: 'Calculus', pct: 71 },
            { label: 'Statistics', pct: 95 },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.pct}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface-card p-4 flex items-center gap-3">
        <div className="flex gap-0.5 flex-shrink-0">
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} className="w-3.5 h-3.5 fill-current" style={{ color: 'var(--accent-sun-fg)' }} />
          ))}
        </div>
        <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
          <span className="font-semibold">GPA went from 2.8 to 3.7</span> in one semester.
        </p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   GSAP Sticky Stack — "How it works"
   Motivated: storytelling — steps reveal in narrative sequence
────────────────────────────────────────────────────────── */
const HOW_STEPS = [
  {
    step: '01',
    title: 'Find your perfect tutor',
    desc: 'Our algorithm matches you with tutors based on learning style, subject depth, and schedule — not just whoever is available.',
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

function StickyStack() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce || !ref.current) return
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.stack-card')
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return
        ScrollTrigger.create({
          trigger: card,
          start: 'top top',
          endTrigger: cards[cards.length - 1],
          end: 'top top',
          pin: true,
          pinSpacing: false,
        })
        gsap.to(card, {
          scale: 0.93,
          opacity: 0.5,
          ease: 'none',
          scrollTrigger: {
            trigger: cards[i + 1],
            start: 'top bottom',
            end: 'top top',
            scrub: true,
          },
        })
      })
    }, ref)
    return () => ctx.revert()
  }, [reduce])

  return (
    <section ref={ref} className="relative">
      {HOW_STEPS.map(({ step, title, desc, icon: Icon, color, Visual }, i) => (
        <div
          key={i}
          className="stack-card sticky top-0 min-h-[100dvh] flex items-center"
          style={{ background: 'var(--canvas)' }}
        >
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center py-24">
            <div className="space-y-7 order-2 lg:order-1">
              <div className="flex items-end gap-4">
                <span
                  className="font-heading leading-[0.85] font-bold select-none"
                  style={{ fontSize: 'clamp(64px, 10vw, 100px)', color: 'var(--border-strong)' }}
                >
                  {step}
                </span>
                <div
                  className="mb-2 w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
              </div>
              <h3
                className="font-heading font-bold tracking-tight leading-[1.1]"
                style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
              <p
                className="text-base md:text-lg leading-relaxed"
                style={{ color: 'var(--text-secondary)', maxWidth: '46ch' }}
              >
                {desc}
              </p>
            </div>
            <div className="flex items-center justify-center order-1 lg:order-2">
              <div className="w-full max-w-sm mx-auto">
                <Visual />
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Bento Features — 4-cell grid (2+1 / 1+2 pattern)
────────────────────────────────────────────────────────── */
function BentoFeatures() {
  return (
    <section className="py-28 px-4 md:px-8" style={{ background: 'var(--surface)' }}>
      <div className="max-w-7xl mx-auto space-y-12">
        <Reveal className="max-w-2xl">
          <div className="stat-badge w-fit mb-5">For every learner and teacher</div>
          <h2
            className="font-heading font-bold tracking-tight leading-tight"
            style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: 'var(--text-primary)' }}
          >
            Everything you need to learn or teach.
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Cell 1: large student feature (2 cols) */}
          <Reveal
            className="lg:col-span-2 rounded-2xl p-8 space-y-6 relative overflow-hidden flex flex-col justify-between"
            style={{ background: 'var(--canvas)', border: '1px solid var(--border)', minHeight: 240 }}
            delay={0}
          >
            <div
              className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
              style={{ background: 'var(--primary)', filter: 'blur(60px)', opacity: 0.06, transform: 'translate(25%, -25%)' }}
            />
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center relative z-10"
              style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
            >
              <Users className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="relative z-10 space-y-3">
              <h3 className="font-heading text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Fairness-first matching
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: '52ch' }}>
                Our algorithm pairs you with tutors based on learning style, subject depth, and scheduling compatibility — not just whoever is available at that moment.
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

          {/* Cell 2: stat card (1 col) */}
          <Reveal
            className="rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(99,102,241,0.15), rgba(56,189,248,0.1))',
              border: '1px solid rgba(99,102,241,0.2)',
              minHeight: 240,
            }}
            delay={0.1}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--accent-lavender-fg)' }}
            >
              <BarChart3 className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <p
                className="font-heading font-bold mb-2"
                style={{ fontSize: 'clamp(36px, 5vw, 52px)', color: 'var(--text-primary)', lineHeight: 1 }}
              >
                15k+
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Students learning every week across Nigeria
              </p>
            </div>
          </Reveal>

          {/* Cell 3: stat card (1 col) */}
          <Reveal
            className="rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
              border: '1px solid rgba(16,185,129,0.2)',
              minHeight: 220,
            }}
            delay={0.15}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}
            >
              <TrendingUp className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <p
                className="font-heading font-bold mb-2"
                style={{ fontSize: 'clamp(36px, 5vw, 52px)', color: 'var(--text-primary)', lineHeight: 1 }}
              >
                ₦42k+
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Average daily earnings for top tutors
              </p>
            </div>
          </Reveal>

          {/* Cell 4: large tutor feature (2 cols) */}
          <Reveal
            className="lg:col-span-2 rounded-2xl p-8 space-y-6 relative overflow-hidden flex flex-col justify-between"
            style={{ background: 'var(--canvas)', border: '1px solid var(--border)', minHeight: 220 }}
            delay={0.2}
          >
            <div
              className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'var(--accent)', filter: 'blur(60px)', opacity: 0.05, transform: 'translate(-25%, 25%)' }}
            />
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center relative z-10"
              style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}
            >
              <GraduationCap className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="relative z-10 space-y-3">
              <h3 className="font-heading text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Tutors: focus on teaching. We handle the rest.
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: '52ch' }}>
                Automated billing, a global student marketplace, professional profiles, and full booking management. Less admin, more impact.
              </p>
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row gap-5">
              {[
                { icon: MessageSquare, label: 'Built-in messaging' },
                { icon: Video, label: 'HD video sessions' },
                { icon: Clock, label: 'Flexible scheduling' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
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
  { value: '98%',  label: 'Student success rate' },
  { value: '15k+', label: 'Active students' },
  { value: '4.9',  label: 'Average tutor rating' },
  { value: '50+',  label: 'Subjects covered' },
]

function StatsSection() {
  return (
    <section className="py-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div
          className="rounded-2xl py-14 px-8 md:px-16 grid grid-cols-2 md:grid-cols-4 gap-8 animate-gradient"
          style={{ background: 'linear-gradient(135deg, #4338CA, var(--primary), #6366F1, #4338CA)', backgroundSize: '200% 200%' }}
        >
          {STATS.map((stat, i) => (
            <Reveal
              key={i}
              className={`text-center ${i > 0 ? 'border-l border-white/15' : ''}`}
              delay={i * 0.08}
            >
              <p className="font-heading font-bold text-white tracking-tight mb-1" style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}>
                {stat.value}
              </p>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Testimonials — staggered reveal
────────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: 'My GPA went from 2.8 to 3.7 in one semester. Dr. Chen is incredible at breaking down complex calculus problems.',
    name: 'Marcus T.',
    role: 'Engineering student, UST',
    rating: 5,
    color: 'lavender',
  },
  {
    quote: 'I passed my IELTS with band 8.0 after just 6 sessions with Sarah. The structured approach made all the difference.',
    name: 'Amara K.',
    role: 'Graduate applicant',
    rating: 5,
    color: 'sky',
  },
  {
    quote: 'Scheduling is frictionless, lessons are recorded, and tutor quality is far above anything I have tried before.',
    name: 'Liam O.',
    role: 'High school senior',
    rating: 5,
    color: 'mint',
  },
]

function TestimonialsSection() {
  return (
    <section className="py-28 px-4 md:px-8" style={{ background: 'var(--surface)' }}>
      <div className="max-w-7xl mx-auto">
        <Reveal className="mb-16">
          <h2
            className="font-heading font-bold tracking-tight"
            style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: 'var(--text-primary)' }}
          >
            Real results, real students.
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="surface-card p-7 space-y-5 h-full flex flex-col card-interactive">
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-current" style={{ color: 'var(--accent-sun-fg)' }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-primary)' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div
                  className="flex items-center gap-3 pt-4 border-t"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                    style={{ background: `var(--accent-${t.color}-bg)`, color: `var(--accent-${t.color}-fg)` }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
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
    <section className="py-32 px-4 md:px-8" style={{ background: 'var(--canvas)' }}>
      <Reveal className="max-w-5xl mx-auto text-center space-y-8">
        <h2
          className="font-heading font-bold tracking-tighter leading-[1.05]"
          style={{ fontSize: 'clamp(36px, 6vw, 72px)', color: 'var(--text-primary)' }}
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
          className="text-lg md:text-xl mx-auto"
          style={{ color: 'var(--text-secondary)', maxWidth: '44ch' }}
        >
          Join 15,000+ students who found their perfect learning match on Tutorly.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/signup" className="btn-primary text-base px-8 py-4 group pressable">
            Get started free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/tutors" className="btn-secondary text-base px-8 py-4 pressable">
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
        <Aurora colorStops={['#6366F1', '#10B981', '#6366F1']} amplitude={1.2} blend={0.45} />
      </div>

      {/* ── Navigation ── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 pt-4">
        <nav
          className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-6 py-2.5 rounded-pill"
          style={{
            background: 'var(--nav-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Link href="/" className="pressable flex items-center gap-2.5 cursor-pointer">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--primary)' }}
            >
              <BookOpen className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight font-heading" style={{ color: 'var(--text-primary)' }}>
              Tutorly
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['How it works', 'Tutors', 'Pricing', 'Resources'].map(link => (
              <a
                key={link}
                href="#"
                className="text-sm font-medium transition-colors duration-150 cursor-pointer relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:rounded-full after:bg-primary after:transition-all after:duration-200 hover:after:w-full"
                style={{ color: 'var(--text-secondary)' }}
              >
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/signin"
              className="hidden sm:block pressable text-sm font-semibold transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary text-sm px-5 py-2.5 pressable">
              Get started
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">

        {/* ── HERO ── */}
        <section className="px-4 md:px-8 min-h-[100dvh] flex items-center pt-20">
          <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center py-16">

            {/* Left: headline + CTA (max 4 elements) */}
            <div className="space-y-7">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="stat-badge w-fit">
                  <Sparkles className="w-3 h-3" />
                  Trusted by 15,000+ students across Nigeria
                </div>
              </motion.div>

              <motion.h1
                className="font-heading font-bold leading-[1.06] tracking-tighter"
                style={{ fontSize: 'clamp(40px, 6vw, 72px)', color: 'var(--text-primary)' }}
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

              {/* TextType — rotating taglines, motivated: show audience breadth without copy clutter */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                <TextType
                  text={['for WAEC & JAMB prep', 'for A-level students', 'for university entrance', 'for any subject, any level']}
                  typingSpeed={45}
                  deletingSpeed={28}
                  pauseDuration={2200}
                  loop
                  showCursor
                  cursorCharacter="|"
                  className="font-heading font-semibold"
                  style={{ fontSize: 'clamp(18px, 2.5vw, 28px)', color: 'var(--primary)', letterSpacing: '-0.02em' }}
                />
              </motion.div>

              <motion.p
                className="text-lg md:text-xl leading-relaxed"
                style={{ color: 'var(--text-secondary)', maxWidth: '48ch' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                Fairness-first matching connects you with tutors based on your learning style, goals, and real compatibility.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href="/signup" className="btn-primary text-base px-8 py-4 group pressable cursor-pointer">
                  Get started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/tutors" className="btn-secondary text-base px-6 py-3.5 pressable">
                  Browse tutors
                </Link>
              </motion.div>
            </div>

            {/* Right: schedule card with motion entrance */}
            <motion.div
              className="perspective-container relative h-[520px] hidden lg:block"
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
                    { h: '9 AM',  evs: [{ c: 0, s: 'Calculus IV',    tu: 'Dr. Aris',  bc: '#818CF8', bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)' }, { c: 2, s: 'Macroeconomics', tu: 'Prof. Han',  bc: '#38BDF8', bg: 'var(--accent-sky-bg)',      fg: 'var(--accent-sky-fg)' }] },
                    { h: '11 AM', evs: [{ c: 1, s: 'Art History',    tu: 'Ms. Blake', bc: '#FCD34D', bg: 'var(--accent-sun-bg)',      fg: 'var(--accent-sun-fg)' },      { c: 3, s: 'Bio Ethics',     tu: 'Dr. Osei',  bc: '#34D399', bg: 'var(--accent-mint-bg)',     fg: 'var(--accent-mint-fg)' }] },
                    { h: '1 PM',  evs: [{ c: 0, s: 'Psych 101',     tu: 'Dr. Lima',  bc: '#FCA5A5', bg: 'var(--accent-coral-bg)',    fg: 'var(--accent-coral-fg)' },    { c: 4, s: 'Quantum Phys',   tu: 'Prof. Yun', bc: '#818CF8', bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)' }] },
                    { h: '3 PM',  evs: [{ c: 2, s: 'Linear Algebra', tu: 'Dr. Aris',  bc: '#FDBA74', bg: 'var(--accent-tangerine-bg)', fg: 'var(--accent-tangerine-fg)' }, { c: 4, s: 'Spanish B2',     tu: 'Ms. Vega',  bc: '#34D399', bg: 'var(--accent-mint-bg)',     fg: 'var(--accent-mint-fg)' }] },
                    { h: '5 PM',  evs: [{ c: 1, s: 'Essay Writing',  tu: 'Ms. Brown', bc: '#FCD34D', bg: 'var(--accent-sun-bg)',      fg: 'var(--accent-sun-fg)' }] },
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

        {/* ── SUBJECTS MARQUEE ── */}
        <SubjectsMarquee />

        {/* ── HOW IT WORKS — GSAP STICKY STACK ── */}
        <StickyStack />

        {/* ── BENTO FEATURES ── */}
        <BentoFeatures />

        {/* ── STATS ── */}
        <StatsSection />

        {/* ── TESTIMONIALS ── */}
        <TestimonialsSection />

        {/* ── CTA ── */}
        <CTASection />

      </main>

      <CinematicFooter />
    </div>
  )
}
