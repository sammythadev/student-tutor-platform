'use client'

import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OptionCardProps {
  title: string
  blurb?: string
  icon?: LucideIcon
  selected: boolean
  onClick: () => void
  ariaLabel?: string
  /** Compact centered tile for tight 3-up rows (e.g. exam boards). */
  compact?: boolean
}

/**
 * Visual option card. Recognition over recall: tap a card instead of
 * opening a dropdown. 44px+ target, keyboard operable, single accent lock.
 */
export function OptionCard({ title, blurb, icon: Icon, selected, onClick, ariaLabel, compact }: OptionCardProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-label={ariaLabel ?? title}
        className={cn(
          'flex min-h-11 w-full min-w-0 items-center justify-center rounded-xl border px-2 py-2.5 text-center transition-all pressable',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          selected
            ? 'border-[var(--primary)] bg-[var(--primary-subtle)] shadow-sm'
            : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--primary)]/50 hover:shadow-sm'
        )}
        style={{ borderWidth: 1 }}
      >
        <span
          className="flex min-w-0 items-center justify-center gap-1 text-xs font-semibold sm:text-sm"
          style={{ color: selected ? 'var(--primary)' : 'var(--text-primary)' }}
        >
          {selected && <Check className="size-3.5 shrink-0" strokeWidth={3} style={{ color: 'var(--primary)' }} />}
          <span className="truncate">{title}</span>
        </span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel ?? title}
      className={cn(
        'flex min-h-[68px] w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all pressable',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected
          ? 'border-[var(--primary)] bg-[var(--primary-subtle)] shadow-sm'
          : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--primary)]/50 hover:shadow-sm'
      )}
      style={{ borderWidth: 1 }}
    >
      {Icon && (
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: selected ? 'var(--primary)' : 'var(--surface-2)',
            color: selected ? 'var(--primary-fg)' : 'var(--text-secondary)',
          }}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className="flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {selected && <Check className="size-3.5 shrink-0" strokeWidth={3} style={{ color: 'var(--primary)' }} />}
          {title}
        </span>
        {blurb && (
          <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
            {blurb}
          </span>
        )}
      </span>
    </button>
  )
}
