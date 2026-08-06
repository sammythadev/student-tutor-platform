'use client'

import { motion } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1] as const

interface MatchRingProps {
  /** Match percentage, 0–100. */
  pct: number
  /** Accent token name (lavender | sky | mint | sun | coral | tangerine) driving the arc colour. */
  accent: string
  size?: number
  stroke?: number
}

/** Circular match-score dial — the shared visual spine of the recommendation
 *  language across the find-tutors and find-students lists. */
export function MatchRing({ pct, accent, size = 52, stroke = 4 }: MatchRingProps) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const offset = circ - (clamped / 100) * circ
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`var(--accent-${accent}-fg)`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="tabular-nums font-bold leading-none" style={{ color: 'var(--text-primary)', fontSize: size * 0.3 }}>
          {clamped}
          <span className="font-medium" style={{ fontSize: size * 0.16, color: 'var(--text-muted)' }}>%</span>
        </span>
      </div>
    </div>
  )
}
