'use client'

import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface StepOption {
  value: string
  label: string
  hint?: string
}

interface SteppedSliderProps {
  label: string
  options: StepOption[]
  value: string
  onChange: (value: string) => void
}

/**
 * Categorical slider: 3 stops on one track instead of a dropdown.
 * User drags or taps; the active stop shows its hint below.
 * Keyboard native via <input type="range"> with min 0 max n-1.
 */
export function SteppedSlider({ label, options, value, onChange }: SteppedSliderProps) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const active = options[index] ?? options[0]
  const id = `stepped-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
  const pct = options.length <= 1 ? 100 : (index / (options.length - 1)) * 100
  const reduce = useReducedMotion()

  return (
    <div className="onboard-field w-full min-w-0 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="min-w-0 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
        <motion.span
          key={active.value}
          initial={reduce ? false : { scale: 0.85, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
          aria-live="polite"
        >
          {active.label}
        </motion.span>
      </div>
      <div className="relative min-w-0">
        <div className="onboard-range-bar" aria-hidden="true">
          <i style={{ width: `calc(${pct} * (100% - 16px) + 8px)` }} />
        </div>
        <input
          id={id}
          type="range"
          min={0}
          max={options.length - 1}
          step={1}
          value={index}
          onChange={(e) => onChange(options[Number(e.target.value)].value)}
          aria-label={label}
          aria-valuetext={`${active.label}${active.hint ? `. ${active.hint}` : ''}`}
          className={cn('onboard-range absolute inset-x-0 top-1/2 -translate-y-1/2')}
        />
      </div>
      <div className="flex justify-between gap-1">
        {options.map((o, i) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={i === index}
            className={cn(
              'min-h-11 min-w-0 flex-1 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            style={{
              color: i === index ? 'var(--primary)' : 'var(--text-muted)',
              background: i === index ? 'var(--primary-subtle)' : 'transparent',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {active.hint && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }} aria-live="polite">
          {active.hint}
        </p>
      )}
    </div>
  )
}
