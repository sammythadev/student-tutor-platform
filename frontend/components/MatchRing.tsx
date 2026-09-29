'use client'

import { motion, useReducedMotion } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1] as const

interface MatchRingProps {
  /** Match percentage, 0–100. */
  pct: number
  /** Accent token name (lavender | sky | mint | sun | coral | tangerine) driving the arc colour. */
  accent: string
  size?: number
  stroke?: number
  /** Render for a fixed-dark surface (e.g. the featured spotlight card), where the
   *  theme-driven text tokens would go near-invisible in light mode. */
  onDark?: boolean
  /** Overrides the screen-reader announcement when "NN% match" needs more context. */
  label?: string
}

/** Circular match-score dial — the shared visual spine of the recommendation
 *  language across the find-tutors and find-students lists. */
export function MatchRing({
  pct,
  accent,
  size = 52,
  stroke = 4,
  onDark = false,
  label,
}: MatchRingProps) {
  // The sweep is decoration: when motion is unwanted the arc must simply be
  // present at its final value rather than animating into place.
  const reduced = useReducedMotion()
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const offset = circ - (clamped / 100) * circ
  const trackColor = onDark ? 'rgba(242,237,227,0.18)' : 'var(--surface-2)'
  const arcColor = onDark ? '#E6C87E' : `var(--accent-${accent}-fg)`
  const numberColor = onDark ? '#F4F0E8' : 'var(--text-primary)'
  const unitColor = onDark ? 'rgba(242,237,227,0.65)' : 'var(--text-muted)'
  return (
    // One image with one name: without this the dial announces "92 % " as loose
    // text, which reads as an unexplained number next to the tutor's name.
    <div
      role="img"
      aria-label={label ?? `${clamped}% match`}
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={arcColor} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduced ? false : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : { duration: 0.9, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <span className="tabular-nums font-bold leading-none" style={{ color: numberColor, fontSize: size * 0.3 }}>
          {clamped}
          <span className="font-medium" style={{ fontSize: size * 0.16, color: unitColor }}>%</span>
        </span>
      </div>
    </div>
  )
}
