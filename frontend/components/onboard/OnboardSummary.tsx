'use client'

import { CircleCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface SummaryItem {
  label: string
  value: string | null
}

/**
 * Live summary of what has been answered so far, so nobody has to remember
 * earlier steps. Badge strip on mobile, checklist card on desktop.
 */
export function OnboardSummary({ items, heading }: { items: SummaryItem[]; heading: string }) {
  const filled = items.filter((i) => i.value)

  return (
    <aside aria-label="Your selections so far" className="w-full min-w-0 max-w-full">
      {/* Mobile: compact horizontal strip */}
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:hidden" aria-live="polite">
        {filled.length === 0 ? (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Your answers collect here as you go.
          </span>
        ) : (
          filled.map((i) => (
            <Badge
              key={i.label}
              variant="outline"
              className="shrink-0 gap-1 rounded-full border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
            >
              <span style={{ color: 'var(--text-muted)' }}>{i.label}</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{i.value}</span>
            </Badge>
          ))
        )}
      </div>

      {/* Desktop: checklist card */}
      <div className="glass-card hidden p-5 lg:sticky lg:top-6 lg:block">
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {heading}
        </h2>
        <ul className="mt-4 space-y-2.5">
          {items.map((i) => (
            <li key={i.label} className="flex items-start gap-2 text-sm">
              <CircleCheck
                className="mt-0.5 size-4 shrink-0"
                strokeWidth={2}
                style={{ color: i.value ? 'var(--primary)' : 'var(--border)' }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {i.label}
                </span>
                <span
                  className="block truncate text-sm font-medium"
                  style={{ color: i.value ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {i.value ?? 'Not set yet'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
