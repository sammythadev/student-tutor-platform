'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView, useReducedMotion, animate } from 'motion/react'
import {
  ArrowRight, BookOpen, CalendarCheck, CheckCircle2, ChevronRight,
  Funnel, Scale, ShieldCheck, Sigma, Sparkles, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import LaserFlow from '@/components/LaserFlow'
import GradualBlur from '@/components/reactbits/GradualBlur'

/* ──────────────────────────────────────────────────────────
   The beam is the page's light source. Every rim, glow and
   border below derives from BEAM so the whole surface reads as
   one lit room rather than a dark page with an effect on top.
────────────────────────────────────────────────────────── */
const BEAM = '#6AA6FF'
const CANVAS = '#05060A'
const SPRING = { type: 'spring', stiffness: 100, damping: 20 } as const
const CASCADE = [0, 0.08, 0.16, 0.24, 0.32] as const

/* Dotted machine grid — the surface the beam falls on. */
function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        maskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black, transparent 100%)',
      }}
    />
  )
}

/* Hairline + bloom marking where the beam strikes a panel edge. */
function RimLight({ width = '82%', bloom = true }: { width?: string; bloom?: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px left-1/2 h-[2px] -translate-x-1/2 blur-[1px]"
        style={{ width, background: `linear-gradient(90deg, transparent, ${BEAM}, transparent)` }}
      />
      {bloom && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 left-1/2 h-24 w-[64%] -translate-x-1/2 blur-2xl"
          style={{ background: `radial-gradient(ellipse at bottom, ${BEAM}77, transparent 72%)` }}
        />
      )}
    </>
  )
}

/* Lit panel — the one card shape the whole page reuses. */
function Panel({
  children, className, rim = false, glow = false,
}: { children: React.ReactNode; className?: string; rim?: boolean; glow?: boolean }) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]', className)}
      style={glow ? { boxShadow: `0 0 0 1px ${BEAM}22, 0 24px 70px -40px ${BEAM}55` } : undefined}
    >
      {rim && <RimLight width="60%" bloom={false} />}
      {children}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   Count-up — fires once on intersection, keeps trailing units.
────────────────────────────────────────────────────────── */
function CountUp({ value, suffix = '' }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()
  const numeric = Number.parseFloat(value)
  const isNumber = Number.isFinite(numeric)
  const tail = isNumber ? `${value.slice(String(numeric).length)}${suffix}` : suffix

  useEffect(() => {
    if (!inView || !isNumber || reduce || !ref.current) return
    const controls = animate(0, numeric, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${v.toFixed(numeric % 1 === 0 ? 0 : 1)}${tail}`
      },
    })
    return () => controls.stop()
  }, [inView, isNumber, numeric, reduce, tail])

  return <span ref={ref}>{reduce || !isNumber ? `${value}${suffix}` : `0${tail}`}</span>
}

/* ──────────────────────────────────────────────────────────
   Reveal — spring fade-up on scroll into view, once.
────────────────────────────────────────────────────────── */
function Reveal({
  children, className, delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...SPRING, delay }}
    >
      {children}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────
   Copy — unchanged from the original landing page.
────────────────────────────────────────────────────────── */
const STATS = [
  { value: '4', label: 'Weighted match criteria' },
  { value: '½', label: 'Approximation guarantee' },
  { value: '100%', label: 'Subject-verified tutors' },
  { value: '0', label: 'Manual steps to re-match' },
]

const MATCH_STEPS = [
  {
    icon: Funnel,
    title: 'Subject is a hard filter',
    body: 'Tutors who do not teach what you need never reach your list. Subject is a filter, not a weighted preference, so there is nothing to trade it away against.',
  },
  {
    icon: Sigma,
    title: 'Four criteria, one score',
    body: 'Availability overlap, learning style, budget and experience each feed a single match score. You can see exactly why a tutor ranked where they did.',
  },
  {
    icon: Scale,
    title: 'Assignment stays fair',
    body: 'A greedy assignment with a proven ½-approximation bound spreads students across tutors instead of piling everyone onto the few most popular ones.',
  },
  {
    icon: ShieldCheck,
    title: 'Waitlisting is automatic',
    body: 'If every eligible tutor is full, you keep your place in the queue and a seat is allocated the moment one frees up. You never have to re-apply.',
  },
]

const HOW_STEPS = [
  {
    title: 'Find your perfect tutor',
    desc: 'Our algorithm matches you with tutors based on learning style, subject depth, and schedule. Not just whoever is available.',
  },
  {
    title: 'Book a session in seconds',
    desc: 'Pick a time, confirm, and done. Seamless calendar integration with instant booking confirmations sent to both sides.',
  },
  {
    title: 'Track real progress',
    desc: 'Interactive lessons, shared whiteboards, session recordings, and a progress dashboard that shows exactly how far you have come.',
  },
]

const SUBJECTS = [
  'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Further Maths',
  'Economics', 'Government', 'Literature', 'Computer Science', 'Accounting', 'Geography',
]

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Booking that just works',
    body: 'Pick a time, confirm, done. Both sides get instant confirmation — no back-and-forth messages.',
  },
  {
    icon: CheckCircle2,
    title: 'Verified tutors only',
    body: 'Every tutor is subject-checked before they can appear in your list. No guesswork, no unqualified matches.',
  },
  {
    icon: Sparkles,
    title: 'Why this match',
    body: 'Every rank carries its reasons. Open any tutor to see exactly which criteria raised or lowered their score.',
  },
]

const NAV_LINKS: [string, string][] = [
  ['How it works', '#how'],
  ['Features', '#features'],
  ['Browse tutors', '/tutors'],
]

/* Ranked matches shown inside the console the beam lands on. */
const RANKED = [
  { name: 'Adaeze O.', subject: 'Mathematics', score: 97, rating: '4.9' },
  { name: 'Ibrahim K.', subject: 'Physics', score: 92, rating: '4.8' },
  { name: 'Chinedu A.', subject: 'Chemistry', score: 88, rating: '4.7' },
]

/* ──────────────────────────────────────────────────────────
   Landing page — one dark lit room, the beam as the light source.
────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const reduce = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const revealRef = useRef<HTMLDivElement>(null)

  /* Cursor spotlight inside the console — the beam lights what you point at. */
  const trackReveal = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = revealRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }
  const clearReveal = () => {
    const el = revealRef.current
    if (!el) return
    el.style.setProperty('--mx', '-9999px')
    el.style.setProperty('--my', '-9999px')
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden text-white" style={{ backgroundColor: CANVAS }}>
      {/* ── The beam. Page-level so it starts at the navbar and falls through it:
             its top 27% self-fades, so the layer is pulled above the viewport and
             the crisp remainder emerges from behind the translucent header. ── */}
      {!reduce && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-0 -top-[100px] h-[380px] sm:-top-[120px] sm:h-[460px] lg:-top-[140px] lg:h-[540px]"
        >
          <LaserFlow
            horizontalBeamOffset={0.0}
            verticalBeamOffset={-0.5}
            horizontalSizing={0.5}
            verticalSizing={2.0}
            wispDensity={1}
            wispSpeed={14}
            wispIntensity={4.2}
            flowSpeed={0.32}
            flowStrength={0.24}
            fogIntensity={0.5}
            fogScale={0.3}
            fogFallSpeed={0.55}
            mouseTiltStrength={0.014}
            mouseSmoothTime={0.05}
            decay={1.1}
            falloffStart={1.5}
            color={BEAM}
            backgroundColor={CANVAS}
          />
        </div>
      )}

      {/* ── Scroll edge. One page-target GradualBlur so content dissolves into the
             canvas as it scrolls out at the bottom. Kept to a single edge with a
             low layer count: stacked backdrop-filters over a live WebGL canvas are
             expensive, and the top edge would blur the beam itself. ── */}
      <GradualBlur
        target="page"
        position="bottom"
        height="6rem"
        strength={1.8}
        divCount={4}
        curve="bezier"
        exponential
        opacity={1}
      />

      {/* ── Navigation ── */}
      <header
        className="sticky top-0 z-[1200] border-b border-white/10 backdrop-blur-xl"
        style={{ backgroundColor: 'rgba(5,6,10,0.72)' }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Tutorly home">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white text-black">
              <BookOpen className="size-4" strokeWidth={2.25} />
            </span>
            <span className="text-base font-semibold tracking-tight">Tutorly</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_LINKS.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="rounded-md px-3.5 py-2 text-sm font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/signin" className="hidden rounded-md px-4 py-2 text-sm font-medium text-white/65 transition-colors hover:text-white sm:inline-flex">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90 active:scale-[0.97]"
            >
              Get started <ChevronRight className="size-3.5" />
            </Link>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-md border border-white/20 md:hidden"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}
            >
              <span className={cn('block h-px w-4 bg-white transition-transform', menuOpen && 'translate-y-[3px] rotate-45')} />
              <span className={cn('mt-1 block h-px w-4 bg-white transition-transform', menuOpen && '-mt-[2px] -rotate-45')} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-white/10 px-4 py-3 md:hidden" aria-label="Mobile">
            <div className="flex flex-col">
              {[...NAV_LINKS, ['Sign in', '/signin'] as [string, string]].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-white/65 hover:bg-white/10 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="relative z-10">
        {/* ── HERO — the beam falls past the navbar and strikes the console ── */}
        <section className="relative">
          {/* Runway spacer — nothing competes with the beam here. Its height puts the
              console's top rim exactly where the beam's flare lands. */}
          <div aria-hidden className="h-[216px] sm:h-[276px] lg:h-[336px]" />

          {/* The console the beam lands on. */}
          <div className="relative mx-auto max-w-6xl px-4 pb-20 md:px-8 lg:pb-28">
            <motion.div
              className="relative overflow-hidden rounded-[28px] border"
              style={{
                borderColor: `${BEAM}33`,
                backgroundColor: 'rgba(255,255,255,0.02)',
                boxShadow: `0 0 0 1px ${BEAM}1a, inset 0 40px 90px -60px ${BEAM}, 0 30px 90px -70px ${BEAM}`,
              }}
              initial={reduce ? false : { opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.1 }}
              onMouseMove={trackReveal}
              onMouseLeave={clearReveal}
            >
              <RimLight />
              <DotGrid />

              {/* Cursor reveal — the photo exists only where the beam is pointed. */}
              <div
                ref={revealRef}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[70%]"
                style={{
                  ['--mx' as string]: '-9999px',
                  ['--my' as string]: '-9999px',
                  maskImage:
                    'radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,1) 0px, rgba(255,255,255,0.9) 90px, rgba(255,255,255,0.45) 170px, rgba(255,255,255,0) 250px)',
                  WebkitMaskImage:
                    'radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,1) 0px, rgba(255,255,255,0.9) 90px, rgba(255,255,255,0.45) 170px, rgba(255,255,255,0) 250px)',
                }}
              >
                <Image
                  src="/signin-hero.jpg"
                  alt=""
                  width={1280}
                  height={960}
                  priority
                  className="size-full object-cover opacity-30 mix-blend-lighten"
                />
              </div>

              {/* Hero copy — lit from above by the beam. */}
              <div className="relative px-6 pt-14 pb-10 text-center sm:px-10 lg:px-16 lg:pt-20">
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: CASCADE[0] }}
                  className="mx-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80"
                >
                  <ShieldCheck className="size-3.5" style={{ color: BEAM }} />
                  Fairness-first matching for Nigerian secondary schools
                </motion.div>

                <motion.h1
                  className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: CASCADE[1] }}
                >
                  The right tutor <span className="text-white/50">changes everything.</span>
                </motion.h1>

                <motion.div
                  className="mx-auto mt-5 max-w-2xl space-y-2"
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: CASCADE[2] }}
                >
                  <p className="text-base font-medium text-white sm:text-lg">
                    For WAEC &amp; JAMB prep, A-levels, university entrance — any subject, any level.
                  </p>
                  <p className="text-sm leading-relaxed text-white/60 sm:text-base">
                    Fairness-first matching connects you with tutors based on your learning style, goals, and real compatibility.
                  </p>
                </motion.div>

                <motion.div
                  className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: CASCADE[3] }}
                >
                  <Link
                    href="/signup"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-white/90 active:scale-[0.97]"
                  >
                    Get started free <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/tutors"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10 active:scale-[0.97]"
                  >
                    Browse tutors
                  </Link>
                </motion.div>
              </div>

              {/* The components the beam lights up — a live ranked-match strip. */}
              <motion.div
                className="relative border-t border-white/10 bg-black/40 px-5 py-6 sm:px-8"
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: CASCADE[4] }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-white/40">
                    Ranked matches · Mathematics · WAEC
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/50">
                    <span className="size-1.5 rounded-full bg-emerald-400" /> Live
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {RANKED.map((m, i) => (
                    <div
                      key={m.name}
                      className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left"
                      style={i === 0 ? { boxShadow: `inset 0 0 0 1px ${BEAM}33` } : undefined}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                          <Sigma className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{m.name}</p>
                          <p className="truncate text-xs text-white/50">{m.subject}</p>
                        </div>
                        <span
                          className="ml-auto shrink-0 rounded-md px-2 py-1 text-xs font-semibold"
                          style={{ color: BEAM, backgroundColor: `${BEAM}1a` }}
                        >
                          {m.score}%
                        </span>
                      </div>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${m.score}%`, backgroundColor: BEAM }} />
                      </div>
                      <div className="mt-2.5 flex items-center gap-1 text-amber-400">
                        {Array.from({ length: 5 }).map((_, s) => <Star key={s} className="size-3 fill-current" />)}
                        <span className="ml-1 text-[11px] font-medium text-white/50">{m.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Subject marquee ── */}
        <section className="border-y border-white/10 py-6" aria-label="Subjects taught">
          <div className="relative overflow-hidden">
            <div className="flex w-max gap-10 motion-safe:animate-marquee">
              {[...SUBJECTS, ...SUBJECTS].map((subject, i) => (
                <span key={`${subject}-${i}`} className="text-sm font-medium text-white/50">
                  {subject}
                </span>
              ))}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-24"
              style={{ background: `linear-gradient(90deg, ${CANVAS}, transparent)` }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-24"
              style={{ background: `linear-gradient(270deg, ${CANVAS}, transparent)` }}
            />
          </div>
        </section>

        {/* ── Stats — one lit panel, count-up ── */}
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 lg:py-20" aria-label="Platform stats">
          <Reveal>
            <Panel rim className="p-8 md:p-12">
              <dl className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
                {STATS.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      <CountUp value={stat.value} />
                    </dd>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-widest text-white/40">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </dl>
            </Panel>
          </Reveal>
        </section>

        {/* ── Features — bento, the wide cell carries the dotted grid ── */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:px-8 lg:py-24">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl tracking-tight sm:text-4xl">Everything you need to learn or teach.</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
              Built for students and tutors in Nigeria, from WAEC prep to university coursework.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <Reveal className="lg:col-span-4" delay={0}>
              <Panel glow rim className="h-full p-7">
                <DotGrid />
                <div className="relative flex h-full flex-col justify-between gap-6">
                  <div>
                    <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
                      <Sigma className="size-5" strokeWidth={2} style={{ color: BEAM }} />
                    </div>
                    <h3 className="mt-4 text-xl tracking-tight">Fairness-first matching</h3>
                    <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-white/65">
                      Our algorithm pairs you with tutors based on learning style, subject depth, and scheduling compatibility. Not just whoever is available.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Learning style', 'Subject depth', 'Schedule fit', 'Budget range'].map(tag => (
                      <span key={tag} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Panel>
            </Reveal>

            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} className={i === 0 ? 'lg:col-span-2' : 'lg:col-span-3'} delay={i * 0.06}>
                <Panel className="h-full p-7">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
                    <feature.icon className="size-5" strokeWidth={2} style={{ color: BEAM }} />
                  </div>
                  <h3 className="mt-4 text-lg tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{feature.body}</p>
                </Panel>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── How matching works ── */}
        <section id="how" className="mx-auto max-w-7xl px-4 py-16 md:px-8 lg:py-24">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl tracking-tight sm:text-4xl">Every match can be explained.</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
              No black box and no pay-to-rank. The same four rules decide every pairing, and each one traces straight back to your profile.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MATCH_STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.06}>
                <Panel className="h-full p-6">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
                    <step.icon className="size-5" strokeWidth={2} style={{ color: BEAM }} />
                  </div>
                  <h3 className="mt-4 text-base tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{step.body}</p>
                </Panel>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── How it works — numbered steps ── */}
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8 lg:pb-24" aria-label="How it works">
          <div className="grid gap-10 lg:grid-cols-3">
            {HOW_STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="flex h-full flex-col gap-4">
                  <span
                    className="flex size-9 items-center justify-center rounded-full text-sm font-semibold"
                    style={{ color: BEAM, backgroundColor: `${BEAM}1a` }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-xl tracking-tight">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CTA — a second, quieter strike of the same light ── */}
        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8 lg:pb-28">
          <Reveal>
            <Panel glow rim className="px-6 py-14 text-center sm:px-12">
              <DotGrid />
              <div className="relative">
                <h2 className="mx-auto max-w-3xl text-3xl tracking-tight sm:text-5xl">
                  Create an account and get your first ranked matches in minutes.
                </h2>
                <p className="mx-auto mt-4 max-w-[42ch] text-sm leading-relaxed text-white/60 sm:text-base">
                  The right tutor changes everything. Free to start, no commitment.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/signup"
                    className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-7 text-sm font-medium text-black transition-colors hover:bg-white/90 active:scale-[0.97]"
                  >
                    Get started free <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/tutors"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-white/20 bg-white/5 px-7 text-sm font-medium text-white transition-colors hover:bg-white/10 active:scale-[0.97]"
                  >
                    Browse tutors
                  </Link>
                </div>
              </div>
            </Panel>
          </Reveal>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-white text-black">
                  <BookOpen className="size-3.5" strokeWidth={2.25} />
                </span>
                <span className="text-base font-semibold tracking-tight">Tutorly</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Student–tutor matchmaking built for Nigerian secondary schools.
              </p>
            </div>
            <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
              {([
                ['Product', [['Browse tutors', '/tutors'], ['Dashboard', '/dashboard'], ['How it works', '#how']]],
                ['Account', [['Sign in', '/signin'], ['Create account', '/signup']]],
                ['Legal', [['Privacy policy', '/privacy'], ['Terms of service', '/terms']]],
              ] as [string, [string, string][]][]).map(([heading, links]) => (
                <div key={heading}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{heading}</p>
                  <ul className="mt-3 space-y-2">
                    {links.map(([label, href]) => (
                      <li key={label}>
                        <Link href={href} className="text-sm text-white/65 transition-colors hover:text-white">
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6">
            <p className="text-xs text-white/40">© 2026 Tutorly. Final-year research project.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
