'use client'

import Link from 'next/link'
import { Calendar } from 'lucide-react'
import {
  motion, useMotionValue, useSpring, useTransform, useReducedMotion,
  type Variants,
} from 'motion/react'

interface HeroStat {
  icon: typeof Calendar
  label: string
  value: string
}

interface HeroAction {
  label: string
  href: string
  variant?: 'primary' | 'secondary'
}

interface DashboardHeroProps {
  title: string
  eyebrow?: string
  stats?: HeroStat[]
  actions?: HeroAction[]
  accent?: 'primary' | 'accent'
}

const EASE = [0.16, 1, 0.3, 1] as const

// Orchestrated entrance — the band reveals top-to-bottom like a printed page
// being set: eyebrow, then headline, then the supporting rows.
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
}
const passThrough: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}
const headline: Variants = {
  hidden: { opacity: 0, y: 22, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.75, ease: EASE } },
}

/** Deep, editorial hero band. Two toneable backgrounds — pine (primary) and
 *  a warmer brass-lit pine (accent) — both built to read as expensive in either
 *  colour scheme. Ambient glows drift with the cursor and breathe on a slow
 *  loop; a brass filament sweeps the top edge. All motion yields to
 *  prefers-reduced-motion. */
export function DashboardHero({
  title, eyebrow, stats, actions, accent = 'primary',
}: DashboardHeroProps) {
  const isPrimary = accent === 'primary'
  const reduce = useReducedMotion()
  const background = isPrimary
    ? 'linear-gradient(150deg, #12241D 0%, #0C1A15 55%, #0A1410 100%)'
    : 'linear-gradient(150deg, #241C0C 0%, #1A1408 55%, #14100A 100%)'
  const label = eyebrow ?? (isPrimary ? 'Student dashboard' : 'Tutor dashboard')

  // Pointer parallax — motion values so cursor movement never re-renders React.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 60, damping: 18, mass: 0.6 })
  const sy = useSpring(py, { stiffness: 60, damping: 18, mass: 0.6 })
  // Brass glow tracks the cursor; pine glow pushes the opposite way for depth.
  const brassX = useTransform(sx, v => v * 28)
  const brassY = useTransform(sy, v => v * 28)
  const pineX = useTransform(sx, v => v * -40)
  const pineY = useTransform(sy, v => v * -40)

  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return
    const rect = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width - 0.5)
    py.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  function resetPointer() {
    px.set(0)
    py.set(0)
  }

  const breathe = reduce
    ? undefined
    : { scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }
  const breatheAlt = reduce
    ? undefined
    : { scale: [1, 1.12, 1], opacity: [1, 0.82, 1] }

  return (
    <motion.div
      onPointerMove={handlePointer}
      onPointerLeave={resetPointer}
      className="relative overflow-hidden rounded-3xl px-6 py-7 md:px-9 md:py-9"
      style={{ background, boxShadow: 'var(--shadow-lg)' }}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Ambient glows — parallax + slow breathing */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full"
        style={{
          x: brassX, y: brassY,
          background: 'radial-gradient(circle, rgba(201,162,75,0.22), transparent 65%)',
          filter: 'blur(20px)',
        }}
        animate={breathe}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 rounded-full"
        style={{
          x: pineX, y: pineY,
          background: 'radial-gradient(circle, rgba(47,122,99,0.30), transparent 65%)',
          filter: 'blur(20px)',
        }}
        animate={breatheAlt}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Dot-grid texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{ backgroundImage: 'radial-gradient(rgba(242,237,227,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      {/* Grain */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      {/* Hairline top edge with a brass filament that sweeps across */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(230,200,126,0.28), transparent)' }}>
        {!reduce && (
          <motion.div
            className="absolute inset-y-0 w-1/3"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(240,214,140,0.9), transparent)' }}
            initial={{ x: '-120%' }}
            animate={{ x: '360%' }}
            transition={{ duration: 4.2, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
          />
        )}
      </div>

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <motion.div className="min-w-0 flex-1" variants={passThrough}>
          <motion.p className="label-caps" style={{ color: '#D9B868' }} variants={rise}>
            {label}
          </motion.p>
          <motion.h1
            className="text-display mt-2.5 text-[1.9rem] leading-[1.05] md:text-4xl"
            style={{ color: '#F4F0E8' }}
            variants={headline}
          >
            {title}
          </motion.h1>

          {stats && stats.length > 0 && (
            <motion.div className="mt-5 flex flex-wrap gap-2.5" variants={passThrough}>
              {stats.map(stat => (
                <motion.div
                  key={stat.label}
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold"
                  style={{
                    background: 'rgba(242,237,227,0.06)',
                    border: '1px solid rgba(242,237,227,0.12)',
                    backdropFilter: 'blur(8px)',
                    color: '#EDE7DA',
                  }}
                  variants={rise}
                  whileHover={reduce ? undefined : { y: -2, background: 'rgba(242,237,227,0.10)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                >
                  <stat.icon className="h-3.5 w-3.5" style={{ color: '#D9B868' }} strokeWidth={2} />
                  <span className="tabular-nums" style={{ color: '#F4F0E8' }}>{stat.value}</span>
                  <span style={{ color: '#8A9187' }}>{stat.label}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {actions && actions.length > 0 && (
          <motion.div className="flex flex-wrap items-center gap-2.5" variants={passThrough}>
            {actions.map((action, i) => {
              const primary = action.variant === 'primary'
              return (
                <motion.div key={i} variants={rise}>
                  <Link
                    href={action.href}
                    className="rounded-pill inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer active:scale-[0.98]"
                    style={primary
                      ? { background: '#F4F0E8', color: '#12241D', boxShadow: '0 8px 24px rgba(0,0,0,0.28)' }
                      : { background: 'rgba(242,237,227,0.08)', color: '#F4F0E8', border: '1px solid rgba(242,237,227,0.16)', backdropFilter: 'blur(8px)' }}
                  >
                    {action.label}
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
