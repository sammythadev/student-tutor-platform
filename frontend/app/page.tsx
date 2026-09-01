'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  animate,
} from 'motion/react'
import {
  ArrowRight, BookOpen, CalendarCheck, CheckCircle2, ChevronRight,
  Funnel, Scale, ShieldCheck, Sigma, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import LaserFlow from '@/components/LaserFlow'
import GradualBlur from '@/components/reactbits/GradualBlur'
import BorderGlow from '@/components/reactbits/BorderGlow'
import StarBorder from '@/components/reactbits/StarBorder'
import TiltedCard from '@/components/reactbits/TiltedCard'
import LogoLoop, { type LogoItem } from '@/components/reactbits/LogoLoop'
import { StatRow, StatStrip } from '@/components/landing/DashboardPreview'

/* ──────────────────────────────────────────────────────────
   The beam is the page's light source. Every rim, glow and
   border below derives from BEAM so the whole surface reads as
   one lit room rather than a dark page with an effect on top.
────────────────────────────────────────────────────────── */
const BEAM = '#6AA6FF'
const CANVAS = '#05060A'
const SPRING = { type: 'spring', stiffness: 100, damping: 20 } as const
const CASCADE = [0, 0.08, 0.16, 0.24, 0.32] as const

/* The pointer-following aperture for the dashboard peep. Soft-shouldered rather
   than a hard disc, so the reveal reads as light falling on the product. */
const PEEP_MASK =
  'radial-gradient(circle at var(--px) var(--py), rgba(255,255,255,1) 0px, rgba(255,255,255,0.8) 110px, rgba(255,255,255,0.32) 200px, rgba(255,255,255,0) 300px)'

/* The beam's canvas spans the whole hero, so the console it strikes sits inside the
   stage rather than below it. Sizing is left at the React Bits defaults — the shader
   is tuned around them and deviating makes the beam thin and erratic — and only the
   strike point is moved: uv.y reaches the beam origin at height·(0.5 − uBeamYFrac)
   measured downward, so RUNWAY_PX from the top needs 0.5 − RUNWAY_PX/height. */
const RUNWAY_PX = 460

/* The runway is where the ghosted dashboard lives, so it has to be tall enough to
   hold a whole one. The lg value is kept in sync with RUNWAY_PX — the beam strikes the
   console's top rim, which is where this spacer ends.

   On a phone the runway earns nothing: a whole dashboard shrunk to 340px of width is
   unreadable however it is lit, and 248px of it pushed the headline to the fold. So the
   phone gets just enough height for the light to travel and land — the product itself is
   handed over further down, at a size you can actually read (see ProductRail). */
const RUNWAY_MOBILE = 'h-[116px]'
const RUNWAY_H = 'h-[116px] sm:h-[300px] lg:h-[460px]'



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

/* A pure-CSS stand-in for the beam. The WebGL beam self-fades over its top 27%
   of container height, which leaves almost nothing visible at phone heights, and
   a fragment shader plus volumetric fog is the wrong cost on a phone anyway. This
   is crisp at any size, costs nothing, and is safe under reduced motion.

   `compact` is the phone tuning: over a 116px runway the full-size flare and hot
   spot took up most of the height and read as a glare rather than as a beam
   striking a surface, so the falling light keeps its length and everything that
   spreads at the point of impact is scaled down. */
function CssBeam({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden', className)}>
      {/* Wide, soft column of scattered light */}
      <div
        className={cn('absolute inset-y-0 left-1/2 -translate-x-1/2 blur-2xl', compact ? 'w-24' : 'w-32')}
        style={{ background: `linear-gradient(to bottom, transparent 6%, ${BEAM}26 55%, ${BEAM}59 100%)` }}
      />
      {/* Bright core, widening as it falls */}
      <div
        className={cn('absolute inset-y-0 left-1/2 -translate-x-1/2 blur-[2px]', compact ? 'w-6' : 'w-8')}
        style={{
          background: `linear-gradient(to bottom, transparent 2%, ${BEAM}80 45%, ${BEAM}e6 80%, #F2F7FF 100%)`,
          clipPath: 'polygon(46% 0%, 54% 0%, 63% 100%, 37% 100%)',
        }}
      />
      {/* A pulse of light travelling down the beam */}
      <div className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 overflow-hidden">
        <div
          className="h-1/3 w-full blur-[3px] motion-safe:animate-beam-flow"
          style={{ background: `linear-gradient(to bottom, transparent, #F2F7FF, transparent)` }}
        />
      </div>
      {/* Flare spreading along the line it strikes */}
      <div
        className={cn(
          'absolute bottom-0 left-1/2 -translate-x-1/2',
          compact ? 'h-12 w-[88%]' : 'h-20 w-[94%]',
        )}
      >
        <div
          className="size-full origin-bottom blur-lg motion-safe:animate-beam-breathe"
          style={{ background: `radial-gradient(ellipse at bottom, ${BEAM}d9, ${BEAM}4d 40%, transparent 74%)` }}
        />
      </div>
      {/* Hot spot exactly where it lands */}
      <div
        className={cn(
          'absolute bottom-0 left-1/2 -translate-x-1/2 blur-md',
          compact ? 'h-5 w-20' : 'h-7 w-28',
        )}
        style={{ background: 'radial-gradient(ellipse at bottom, #F2F7FF, rgba(242,247,255,0.25) 45%, transparent 72%)' }}
      />
    </div>
  )
}

/* What the beam reveals: the dashboard, flanked by the surfaces around it — find a
   tutor, the schedule grid, the feed. All of it exists only inside the pointer mask —
   unlit, there is nothing there — which is how the React Bits example does it:
   lighten-blended screenshots, masked to the cursor. The row is far wider than the
   stage so moving the pointer sideways always uncovers something rather than running
   into empty dark. A short fade keeps the top edge from landing hard under the navbar;
   the foot sits on the rim the beam strikes.

   The dashboard is rendered live and captured at 2x (public/dashboard-shot.png); the
   three flanking shots are real pages, cropped to the browser's content area. They sit
   slightly shorter and dimmer than the centre so the hierarchy survives the blend. */
const GHOST_FADE = 'linear-gradient(to bottom, transparent 0%, black 14%)'

/* Wide enough that the flex-1 groups either side keep the dashboard dead-centre under
   the beam, and that the outer shots stay off-stage until the pointer travels. */
const GHOST_ROW_W = 'w-[3600px]'

/* Every panel dissolves at its own edges. Without this, a pointer sitting between two
   shots lit both of their hard rectangular borders at once and the seam read as two
   pasted screenshots rather than one surface receding into the dark. The flanks get a
   vignette on all four sides; the centre dashboard keeps its foot, which is the rim the
   beam strikes, and only softens left and right. */
const SHOT_VIGNETTE =
  'radial-gradient(88% 78% at 50% 50%, black 38%, rgba(0,0,0,0.55) 72%, transparent 100%)'
const CENTRE_FADE =
  'linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)'

function GhostShot({ src }: { src: string }) {
  return (
    <div
      className="relative h-[86%] self-center overflow-hidden"
      style={{ maskImage: SHOT_VIGNETTE, WebkitMaskImage: SHOT_VIGNETTE }}
    >
      <Image
        src={src}
        alt=""
        width={1920}
        height={878}
        sizes="1000px"
        className="h-full w-auto max-w-none opacity-75 mix-blend-lighten"
      />
    </div>
  )
}

function DashboardGhost({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-x-0 top-0 overflow-hidden', RUNWAY_H, className)}
      style={{ maskImage: GHOST_FADE, WebkitMaskImage: GHOST_FADE }}
    >
      {/* Negative gaps let the faded edges overlap instead of leaving a dark trough
          between panels, so a pointer between two of them reveals a continuous band. */}
      <div className={cn('absolute inset-y-0 left-1/2 flex -translate-x-1/2 gap-0', GHOST_ROW_W)}>
        <div className="flex flex-1 justify-end">
          <GhostShot src="/shot-tutors.png" />
        </div>
        <div
          className="relative -mx-14 h-full shrink-0"
          style={{ maskImage: CENTRE_FADE, WebkitMaskImage: CENTRE_FADE }}
        >
          <Image
            src="/dashboard-shot.png"
            alt=""
            width={2092}
            height={1582}
            sizes="720px"
            priority
            className="h-full w-auto max-w-none mix-blend-lighten"
          />
        </div>
        <div className="flex flex-1 justify-start -space-x-14">
          <GhostShot src="/shot-schedules.png" />
          <GhostShot src="/shot-feed.png" />
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   The tablet's version of the reveal. There is no pointer to follow, so the light
   does the travelling: a soft aperture sweeps the runway on a slow loop, uncovering
   the product a region at a time. Same idea as the desktop stage — nothing exists
   outside the lit patch — just self-driven. Tablets only: on a phone the runway is
   116px tall and the shot inside it never became legible, so phones get the rail
   below the hero instead. Under reduced motion the sweep is dropped and one static
   patch is left lit.
────────────────────────────────────────────────────────── */
const SWEEP_MASK =
  'radial-gradient(circle at var(--sx) var(--sy), rgba(255,255,255,1) 0px, rgba(255,255,255,0.7) 78px, rgba(255,255,255,0.26) 132px, rgba(255,255,255,0) 190px)'

function MobileReveal() {
  const reduce = useReducedMotion()

  return (
    <motion.div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-[5] hidden overflow-hidden opacity-[0.68] sm:block lg:hidden',
        RUNWAY_H,
      )}
      style={{
        ['--sx' as string]: '50%',
        ['--sy' as string]: '54%',
        maskImage: SWEEP_MASK,
        WebkitMaskImage: SWEEP_MASK,
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
      animate={reduce ? undefined : { ['--sx' as string]: ['26%', '74%', '26%'] }}
      transition={{ duration: 16, ease: 'easeInOut', repeat: Infinity }}
    >
      <Image
        src="/dashboard-shot.png"
        alt=""
        width={2092}
        height={1582}
        sizes="600px"
        priority
        className="absolute left-1/2 top-0 h-[150%] w-auto max-w-none -translate-x-1/2 mix-blend-lighten"
      />
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────
   Product rail — phones only. The desktop stage hides the product behind a cursor;
   a phone has no cursor, so the same four surfaces are handed over directly as a
   snap-scrolling rail you swipe. BorderGlow frames each card and sweeps its own edge
   light, which is the beam's language at card scale, and the images are the real pages,
   top-anchored so each one opens on its own headline rather than its chrome.
────────────────────────────────────────────────────────── */
const SURFACES = [
  {
    src: '/dashboard-shot.png',
    w: 2092,
    h: 1582,
    /* How far left to pull the image inside its frame. The three page shots carry the
       app's nav rail on their left edge, which is chrome, not product — skipping it
       opens each card on the page's own heading. */
    x: '0%',
    title: 'Your dashboard',
    body: 'Sessions booked, hours logged and the subject mix, updated as you go.',
  },
  {
    src: '/shot-tutors.png',
    w: 1920,
    h: 878,
    x: '-17%',
    title: 'Ranked matches',
    body: 'Every candidate scored on the four criteria, with the score shown.',
  },
  {
    src: '/shot-schedules.png',
    w: 1920,
    h: 878,
    x: '-17%',
    title: 'One schedule',
    body: 'Week and month views, and the next session a tap from joining.',
  },
  {
    src: '/shot-feed.png',
    w: 1920,
    h: 878,
    x: '-17%',
    title: 'Subject feed',
    body: 'Ask a question, answer one, keep up with the subjects you take.',
  },
] as const

function ProductRail() {
  return (
    <section className="lg:hidden" aria-label="Inside Tutorly">
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <p className="text-[11px] font-medium uppercase tracking-widest text-white/40">
          Inside Tutorly
        </p>
        <p className="mt-1.5 text-sm text-white/55">
          Your dashboard, ranked matches, the schedule and the subject feed.
        </p>
      </div>

      {/* Full-bleed so the next card sits half off-screen and the row reads as scrollable.
          Cards snap to their left edge against scroll-px-4, so a settled card lines up with
          the copy above it instead of floating mid-gutter. */}
      <ul className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-8 scroll-px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SURFACES.map((surface, i) => (
          <li key={surface.src} className="w-[78vw] max-w-[340px] shrink-0 snap-start">
            {/* Only the first card sweeps its edge light. Four independent sweeps firing at
                once on a phone was four rAF loops competing for the same frame, and it read
                as flicker rather than as one light arriving. */}
            <BorderGlow
              animated={i === 0}
              backgroundColor="rgba(255,255,255,0.03)"
              borderRadius={18}
              className="h-full"
              colors={[BEAM, '#A855F7', '#10A37F']}
              glowColor={BEAM}
              glowIntensity={0.5}
            >
              <div className="relative h-[186px] overflow-hidden rounded-t-[17px] border-b border-white/10 bg-black/50">
                <Image
                  src={surface.src}
                  alt={`${surface.title} in Tutorly`}
                  width={surface.w}
                  height={surface.h}
                  sizes="340px"
                  className="absolute top-0 h-auto w-[200%] max-w-none"
                  style={{ left: surface.x }}
                />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold tracking-tight text-white">{surface.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/55">{surface.body}</p>
              </div>
            </BorderGlow>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* Is this a viewport the WebGL beam is meant for? The shader is lg-and-up only, and
   `hidden lg:block` was not enough: the canvas still mounted on a phone, compiled the
   shader and ran a render loop behind display:none. This keeps it unmounted instead. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return isDesktop
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

/* Lit panel that leans toward the pointer. Reserved for the small repeated cards,
   where a 4-up row of identical boxes would otherwise sit dead on the page. */
function TiltPanel({
  children, className, glow = false, rim = false,
}: { children: React.ReactNode; className?: string; glow?: boolean; rim?: boolean }) {
  return (
    <TiltedCard
      containerWidth="100%"
      containerHeight="100%"
      rotateAmplitude={7}
      scaleOnHover={1.02}
      showTooltip={false}
      showMobileWarning={false}
    >
      <Panel glow={glow} rim={rim} className={cn('h-full w-full', className)}>
        {children}
      </Panel>
    </TiltedCard>
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
   Scroll progress — the beam, flattened into a line, tracking how
   far down the page you are. Bound to scroll position rather than
   to time, so it reads as a position indicator and not an effect.
────────────────────────────────────────────────────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
  const reduce = useReducedMotion()

  if (reduce) return null

  return (
    <motion.div
      aria-hidden
      className="absolute inset-x-0 -bottom-px h-[2px] origin-left"
      style={{
        scaleX,
        background: `linear-gradient(90deg, transparent, ${BEAM}, #F2F7FF)`,
      }}
    />
  )
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

const HOW_STEPS = [
  {
    title: 'Tell us what you need',
    desc: 'Subject, level, the hours you are free and what you can spend. Subject is a hard filter: tutors who do not teach it never reach your list.',
  },
  {
    title: 'Pick from a ranked list',
    desc: 'Every eligible tutor comes back scored on schedule overlap, learning style, budget and experience, with the reasons behind the rank shown.',
  },
  {
    title: 'Book, and keep the thread',
    desc: 'Confirm a slot and both sides get it on the same schedule. Sessions, messages and hours logged stay in one place.',
  },
]

/* Subjects for the loop. The hue is decoration, never the only carrier of
   meaning — the name is always right there next to the dot. Four beam-adjacent
   tints, cycled, so the strip has some life without turning into confetti. */
const SUBJECT_TINTS = ['#6AA6FF', '#10A37F', '#C2860B', '#A855F7'] as const

const SUBJECTS = [
  'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Further Maths',
  'Economics', 'Government', 'Literature', 'Computer Science', 'Accounting', 'Geography',
]

const SUBJECT_LOGOS: LogoItem[] = SUBJECTS.map((subject, i) => ({
  title: subject,
  ariaLabel: subject,
  node: (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium whitespace-nowrap text-white/70">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: SUBJECT_TINTS[i % SUBJECT_TINTS.length] }}
      />
      {subject}
    </span>
  ),
}))

const NAV_LINKS: [string, string][] = [
  ['How it works', '#how'],
  ['Features', '#features'],
  ['Browse tutors', '/tutors'],
]

/* ──────────────────────────────────────────────────────────
   Bento cells. Twelve columns on lg, so a cell can be 7 or 5 or
   3 wide and the rows genuinely differ in size — the spans are
   part of the content, not decoration, which is why they live
   next to the copy instead of being scattered through the JSX.
   Widths are chosen to sum to 12 per band: 4·4·4 then 5·4·3.
────────────────────────────────────────────────────────── */
const BENTO_CELLS: {
  icon: typeof Funnel
  title: string
  body: string
  span: string
}[] = [
  {
    icon: CalendarCheck,
    title: 'Booking without the back-and-forth',
    body: 'Pick a slot from the tutor’s real availability. Both sides get the confirmation, and it lands on the same schedule.',
    span: 'lg:col-span-5',
  },
  {
    icon: CheckCircle2,
    title: 'Subject-checked tutors only',
    body: 'A tutor is verified for a subject before they can be matched on it.',
    span: 'lg:col-span-4',
  },
  {
    icon: Sparkles,
    title: 'Why this match',
    body: 'Every rank carries its reasons. Open any tutor to see which criteria raised or lowered their score.',
    span: 'lg:col-span-4',
  },
  {
    icon: Funnel,
    title: 'Subject is a hard filter',
    body: 'Subject is filtered, not weighted, so there is nothing for it to be traded away against.',
    span: 'lg:col-span-4',
  },
  {
    icon: Sigma,
    title: 'Four criteria, one score',
    body: 'Schedule overlap, learning style, budget and experience each feed a single match score. The weights are yours to set.',
    span: 'lg:col-span-5',
  },
  {
    icon: Scale,
    title: 'Assignment stays fair',
    body: 'A greedy assignment with a proven ½-approximation bound spreads students across tutors instead of piling everyone onto the few most popular ones.',
    span: 'lg:col-span-4',
  },
  {
    icon: ShieldCheck,
    title: 'Waitlisting is automatic',
    body: 'If every eligible tutor is full, you keep your place in the queue and a seat is allocated the moment one frees up.',
    span: 'lg:col-span-3',
  },
]

/* ──────────────────────────────────────────────────────────
   Landing page — one dark lit room, the beam as the light source.
────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const reduce = useReducedMotion()
  const isDesktop = useIsDesktop()
  const [menuOpen, setMenuOpen] = useState(false)
  const revealRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)

  /* Scroll-linked hero: as the stage leaves, the light goes with it and the
     console lifts away a little faster than the page. Both are driven off the
     hero's own scroll progress — transform and opacity only, so it stays on the
     compositor — and both are dropped entirely under reduced motion. */
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const beamOpacity = useTransform(heroProgress, [0, 0.55], [1, 0])
  const consoleY = useTransform(heroProgress, [0, 1], [0, -72])

  /* The stage's own height, so the beam can be tuned to it. Measured rather than
     assumed: the hero grows with the copy and the preview at every breakpoint. */
  const [stageH, setStageH] = useState(0)
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setStageH(entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* Cursor spotlight over the stage — the beam lights what you point at, and the
     ghosted dashboard in the runway comes up with it. Coordinates are local to the
     hero section, which is the element the mask is stretched across. */
  const trackReveal = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = revealRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    el.style.setProperty('--px', `${e.clientX - rect.left}px`)
    el.style.setProperty('--py', `${e.clientY - rect.top}px`)
  }
  const clearReveal = () => {
    const el = revealRef.current
    if (!el) return
    el.style.setProperty('--px', '-9999px')
    el.style.setProperty('--py', '-9999px')
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden text-white" style={{ backgroundColor: CANVAS }}>
      {/* ── Scroll edge. One page-target GradualBlur so content dissolves into the
             canvas as it scrolls out at the bottom. Kept to a single edge with a
             low layer count: stacked backdrop-filters over a live WebGL canvas are
             expensive, and the top edge would blur the beam itself. ── */}
      <GradualBlur
        target="page"
        position="bottom"
        height="5rem"
        strength={1.6}
        divCount={3}
        curve="bezier"
        exponential
        opacity={1}
      />

      {/* ── Navigation ── */}
      <header
        className="sticky top-0 z-[1200] border-b border-white/10 backdrop-blur-xl"
        style={{ backgroundColor: 'rgba(5,6,10,0.72)' }}
      >
        <ScrollProgress />
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
              className="inline-flex h-11 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90 active:scale-[0.97] md:h-9 md:px-4"
            >
              Get started <ChevronRight className="size-3.5" />
            </Link>
            <button
              type="button"
              className="relative inline-flex size-11 items-center justify-center rounded-md border border-white/20 md:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}
            >
              {/* Absolute bars so the two lines cross into an X instead of being
                  laid out side by side by the button's flex row. */}
              <span
                className={cn(
                  'absolute h-px w-4 bg-white transition-transform duration-200',
                  menuOpen ? 'rotate-45' : '-translate-y-[5px]',
                )}
              />
              <span
                className={cn(
                  'absolute h-px w-4 bg-white transition-transform duration-200',
                  menuOpen ? '-rotate-45' : 'translate-y-[5px]',
                )}
              />
            </button>
          </div>
        </div>

        {menuOpen && (
          <>
            {/* Tap-anywhere-else to close, and it keeps the lit hero from reading as
                part of the menu. */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              className="fixed inset-x-0 bottom-0 top-16 z-0 cursor-default bg-black/60 md:hidden"
              onClick={() => setMenuOpen(false)}
            />
            {/* Laid over the hero rather than pushed into the flow: opening the menu
                used to shove the stage down the page, and the panel sat in the same
                stacking context as the revealed dashboard. */}
            <nav
              className="absolute inset-x-0 top-full z-10 border-b border-white/10 px-4 py-3 shadow-2xl shadow-black/60 md:hidden"
              style={{ backgroundColor: CANVAS }}
              aria-label="Mobile"
            >
              <div className="flex flex-col">
                {[...NAV_LINKS, ['Sign in', '/signin'] as [string, string]].map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-3 text-sm font-medium text-white/65 transition-[background-color,transform] duration-150 hover:bg-white/10 hover:text-white active:scale-[0.98] active:bg-white/10"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </nav>
          </>
        )}
      </header>

      <main className="relative z-10">
        {/* ── HERO — one LaserFlow stage: beam, cursor-reveal layer, content box ── */}
        <section
          ref={heroRef}
          className="relative overflow-hidden"
          onMouseMove={trackReveal}
          onMouseLeave={clearReveal}
        >
          {/* Light layer — one wrapper so the beam's fade is a single animated value. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={reduce ? undefined : { opacity: beamOpacity }}
          >
              {/* The beam lives in the stage, exactly as the React Bits example nests it
                 with the reveal layer and the content box. WebGL from lg up, and mounted
                 only there. On a phone the CSS stand-in is the beam: it is crisp at 116px
                 where the shader self-fades to nothing, it costs no shader compile on a
                 mid-range phone, and it lands its flare on the hero's top rim. The same
                 stand-in covers the reduced-motion desktop case, where the shader is off. */}
            <CssBeam compact className={cn(RUNWAY_MOBILE, 'sm:hidden')} />
            {reduce && <CssBeam className={cn(RUNWAY_H, 'hidden lg:block')} />}
            {!reduce && isDesktop && stageH > 0 && (
              <div aria-hidden className="pointer-events-none absolute inset-0 z-0 opacity-80">
                <LaserFlow
                  horizontalBeamOffset={0.0}
                  verticalBeamOffset={0.5 - RUNWAY_PX / stageH}
                  horizontalSizing={0.42}
                  verticalSizing={2.0}
                  wispDensity={1}
                  wispSpeed={12}
                  wispIntensity={2.2}
                  flowSpeed={0.32}
                  flowStrength={0.16}
                  fogIntensity={0.26}
                  fogScale={0.3}
                  fogFallSpeed={0.5}
                  mouseTiltStrength={0.014}
                  mouseSmoothTime={0.05}
                  decay={1.1}
                  falloffStart={1.5}
                  color={BEAM}
                  backgroundColor={CANVAS}
                />
              </div>
            )}
          </motion.div>

          {/* Cursor reveal — sits between the beam and the box, exactly where the
              React Bits example puts its image. Nothing is drawn here until the
              pointer arrives: the dashboard, the grid and the tint all exist only
              inside the mask, so an untouched stage is just dark. */}
          <div
            ref={revealRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{
              ['--px' as string]: '-9999px',
              ['--py' as string]: '-9999px',
              maskImage: PEEP_MASK,
              WebkitMaskImage: PEEP_MASK,
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          >
            <DashboardGhost className="hidden opacity-[0.5] lg:block" />
          </div>

          {/* Below lg the light sweeps by itself — a phone has nothing to hover with. */}
          <MobileReveal />

          {/* Runway spacer — nothing competes with the beam here. Its height puts the
              console's top rim exactly where the beam's flare lands. */}
          <div aria-hidden className={RUNWAY_H} />

          {/* The content box the beam strikes, above the reveal layer. Lifts a
              little faster than the page as the hero scrolls out. */}
          <motion.div
            className="relative z-[6] mx-auto max-w-6xl px-4 pb-10 md:px-8 sm:pb-14 lg:pb-28"
            style={reduce ? undefined : { y: consoleY }}
          >
            {/* Full-bleed on a phone. Inset inside a 16px gutter, the frame spent 32px of
                a 360px screen on a border that only repeated the page's own darkness, and
                the rim the beam strikes stopped short of the edges. Edge to edge, the rim
                is the full width of the screen and the copy gets the space back. */}
            <motion.div
              className="relative -mx-4 overflow-hidden border-y sm:mx-0 sm:rounded-[28px] sm:border-x"
              style={{
                borderColor: `${BEAM}33`,
                backgroundColor: 'rgba(255,255,255,0.02)',
                boxShadow: `0 0 0 1px ${BEAM}1a, inset 0 40px 90px -60px ${BEAM}, 0 30px 90px -70px ${BEAM}`,
              }}
              initial={reduce ? false : { opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.1 }}
            >
              <RimLight />
              <DotGrid />

              {/* Hero copy — lit from above by the beam. Left-aligned on a phone: centred
                  display type at 360px wraps into a ragged stack that has to be re-scanned
                  line by line, and a left edge gives the badge, headline, copy and buttons
                  one shared spine to hang off. Centred again from sm, where the measure is
                  wide enough for it to hold. */}
              <div className="relative px-4 pt-6 pb-7 text-left sm:px-10 sm:pb-6 sm:text-center lg:px-14 lg:pt-7">
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: CASCADE[0] }}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 sm:mx-auto sm:text-xs"
                >
                  <ShieldCheck className="size-3.5 shrink-0" style={{ color: BEAM }} />
                  {/* The full claim needs a line of its own on a phone, and it is the
                      headline's job to earn that line — so the badge keeps the half that
                      is new information and the schools are named in the copy below. */}
                  <span className="sm:hidden">Fairness-first matching</span>
                  <span className="hidden sm:inline">
                    Fairness-first matching for Nigerian secondary schools
                  </span>
                </motion.div>

                <motion.h1
                  className="mx-auto mt-4 max-w-3xl text-[2.15rem] leading-[1.04] tracking-[-0.035em] sm:mt-5 sm:text-[2.6rem] sm:leading-[1.06] sm:tracking-tight lg:text-5xl"
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: CASCADE[1] }}
                >
                  The right tutor <span className="text-white/50">changes everything.</span>
                </motion.h1>

                <motion.div
                  className="mt-3 max-w-[36ch] space-y-1.5 sm:mx-auto sm:mt-3.5 sm:max-w-2xl"
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: CASCADE[2] }}
                >
                  <p className="text-[15px] font-medium text-white sm:text-lg">
                    For WAEC &amp; JAMB prep, A-levels, university entrance, any subject, any level.
                  </p>
                  <p className="text-sm leading-relaxed text-white/55 sm:text-base sm:text-white/60">
                    Every tutor you see is ranked on schedule overlap, learning style, budget and
                    experience, and the score is shown.
                  </p>
                </motion.div>

                {/* Stacked and full-width on a phone: one thumb, two targets, both 48px. */}
                <motion.div
                  className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:mt-5 sm:flex-row sm:items-center sm:gap-3"
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: CASCADE[3] }}
                >
                  {/* Star border on the primary action: the same travelling light as
                      the beam, at button scale. Full width on phones, where it is the
                      one thing the thumb should find. */}
                  <StarBorder
                    as={Link}
                    href="/signup"
                    color={BEAM}
                    speed="5s"
                    radius={10}
                    backgroundColor="#ffffff"
                    textColor="#000000"
                    borderColor="rgba(255,255,255,0.55)"
                    innerClassName="flex h-12 items-center justify-center gap-2 px-6 text-sm font-medium sm:h-11"
                    className="w-full transition-transform duration-150 active:scale-[0.97] sm:w-auto"
                  >
                    Get started free <ArrowRight className="size-4" />
                  </StarBorder>
                  <Link
                    href="/tutors"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-white/20 bg-white/5 px-6 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-white/10 active:scale-[0.97] sm:h-[46px] sm:w-auto"
                  >
                    Browse tutors
                  </Link>
                </motion.div>
              </div>

              {/* The console's foot: the headline numbers. The dashboard itself is what the
                  runway ghosts overhead, so this stays small rather than showing the same
                  product twice. Three across in one band on a phone — the 2×2 grid of
                  icon-plus-number cells was a second block of furniture directly under the
                  buttons, and the icons carried no meaning the labels did not already. */}
              <motion.div
                className="relative border-t border-white/10 bg-black/30"
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: CASCADE[4] }}
              >
                <StatRow />
                <StatStrip />
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Product rail (phones) — the touch answer to the desktop hover reveal ── */}
        <ProductRail />

        {/* ── Subject loop — rAF-driven, seam-free at any width, right-to-left ── */}
        <section className="border-y border-white/10 py-7" aria-label="Subjects taught">
          <LogoLoop
            logos={SUBJECT_LOGOS}
            speed={44}
            direction="left"
            gap={16}
            logoHeight={20}
            pauseOnHover
            scaleOnHover
            fadeOut
            fadeOutColor={CANVAS}
            ariaLabel="Subjects taught on Tutorly"
          />
        </section>

        {/* ── Bento — one asymmetric grid: a tall hero cell, a wide stats strip,
               then bands of 4·4·4 and 5·4·3. Twelve columns on lg, two on md,
               one on phones. ── */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-14 md:px-8 sm:py-16 lg:py-24">
          <Reveal className="max-w-2xl">
            <h2 className="text-[1.75rem] leading-[1.1] tracking-tight sm:text-4xl">
              Every ranking traces back to the rule that made it.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
              Built for students and tutors in Nigeria, from WAEC prep to university coursework. The
              same four criteria decide every pairing: no hidden boost, no pay-to-rank.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
            {/* The one cell that is both wide and tall: the claim the rest support. */}
            <Reveal className="md:col-span-2 lg:col-span-7 lg:row-span-2">
              <Panel glow rim className="h-full p-7 lg:p-9">
                <DotGrid />
                <div className="relative flex h-full flex-col justify-between gap-8">
                  <div>
                    <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
                      <Sigma className="size-5" strokeWidth={2} style={{ color: BEAM }} />
                    </div>
                    <h3 className="mt-4 text-xl tracking-tight sm:text-2xl">
                      Fairness-first matching
                    </h3>
                    <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-white/65">
                      You set how much each criterion counts; the engine scores every eligible tutor
                      against it and ranks them. Nothing in the list is there because it was
                      promoted: each position comes out of the four criteria below.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Schedule overlap', 'Learning style', 'Budget range', 'Experience'].map(tag => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Panel>
            </Reveal>

            {/* Wide and short: numbers only, so the row reads at a glance. */}
            <Reveal className="md:col-span-2 lg:col-span-5" delay={0.06}>
              <Panel rim className="h-full p-7">
                <dl className="grid h-full grid-cols-2 items-center gap-y-8">
                  {STATS.map(stat => (
                    <div key={stat.label}>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="text-3xl font-semibold tracking-tight">
                        <CountUp value={stat.value} />
                      </dd>
                      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-widest text-white/40">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </dl>
              </Panel>
            </Reveal>

            {BENTO_CELLS.map((cell, i) => (
              <Reveal key={cell.title} className={cell.span} delay={(i % 3) * 0.06}>
                <TiltPanel className="p-6 lg:p-7">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
                    <cell.icon className="size-5" strokeWidth={2} style={{ color: BEAM }} />
                  </div>
                  <h3 className="mt-4 text-base tracking-tight sm:text-lg">{cell.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{cell.body}</p>
                </TiltPanel>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── How it works — numbered steps ── */}
        <section id="how" className="mx-auto max-w-7xl px-4 pb-14 md:px-8 sm:pb-16 lg:pb-24" aria-label="How it works">
          <Reveal className="mb-8 max-w-2xl sm:mb-10">
            <h2 className="text-[1.75rem] leading-[1.1] tracking-tight sm:text-4xl">
              Three steps, start to finish.
            </h2>
          </Reveal>
          <div className="grid gap-8 sm:gap-10 lg:grid-cols-3">
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
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8 sm:pb-20 lg:pb-28">
          <Reveal>
            <Panel glow rim className="px-5 py-12 text-center sm:px-12 sm:py-14">
              <DotGrid />
              <div className="relative">
                <h2 className="mx-auto max-w-3xl text-[1.75rem] leading-[1.12] tracking-tight sm:text-5xl">
                  Create an account and get your first ranked matches in minutes.
                </h2>
                <p className="mx-auto mt-4 max-w-[42ch] text-sm leading-relaxed text-white/60 sm:text-base">
                  Free to start. Set what matters to you, and see the list it produces.
                </p>
                <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-7 text-sm font-medium text-black transition-[background-color,transform] duration-150 hover:bg-white/90 active:scale-[0.97] sm:h-11"
                  >
                    Get started free <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/tutors"
                    className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 bg-white/5 px-7 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-white/10 active:scale-[0.97] sm:h-11"
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
