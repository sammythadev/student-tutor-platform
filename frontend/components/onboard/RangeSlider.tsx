'use client'

import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

interface RangeSliderProps {
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  format?: (v: number) => string
  label: string
  minLabel?: string
  maxLabel?: string
  hint?: string
}

/**
 * Accessible native range slider with live value pill.
 * Uses a real <input type="range"> so keyboard, screen reader,
 * and touch all work without extra deps. Styled like catalog/price-slider.
 */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  format = (v) => `${v}`,
  label,
  minLabel,
  maxLabel,
  hint,
}: RangeSliderProps) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100
  const id = `slider-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
  const reduce = useReducedMotion()
  const display = format(value)

  return (
    <div className="onboard-field w-full min-w-0 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="min-w-0 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
        <motion.span
          key={display}
          initial={reduce ? false : { scale: 0.85, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0 rounded-full px-3 py-1 text-xs font-bold tabular-nums"
          style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
          aria-live="polite"
        >
          {display}
        </motion.span>
      </div>
      <div className="relative min-w-0">
        <div className="onboard-range-bar" aria-hidden="true">
          <i style={{ width: `calc(${pct} * (100% - 16px) + 8px)` }} />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          aria-valuetext={format(value)}
          className={cn('onboard-range absolute inset-x-0 top-1/2 -translate-y-1/2')}
        />
      </div>
      <div className="flex justify-between gap-2 text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
        <span className="min-w-0 truncate">{minLabel ?? format(min)}</span>
        {hint ? <span className="shrink-0">{hint}</span> : <span className="min-w-0 truncate">{maxLabel ?? format(max)}</span>}
      </div>
    </div>
  )
}
