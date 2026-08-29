'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Calendar, Clock, Flame, Star, Users } from 'lucide-react'
import BorderGlow from '@/components/reactbits/BorderGlow'
import { useTheme } from '@/lib/theme-context'

/**
 * Efferd-grammar dashboard hero. Greeting, mini-stats, and CTAs inside a
 * BorderGlow shell — the border lights up as the pointer nears an edge.
 */
export function DashboardHero({
  greeting,
  subtitle,
  stats,
  actions,
}: {
  greeting: string
  subtitle?: string
  stats?: { icon: typeof Calendar; label: string; value: string }[]
  actions?: { label: string; href: string; variant?: 'primary' | 'outline' }[]
}) {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  return (
    <BorderGlow
      className="overflow-hidden"
      borderRadius={10}
      edgeSensitivity={26}
      glowRadius={36}
      glowIntensity={dark ? 0.9 : 0.5}
      coneSpread={25}
      glowColor={dark ? '215 90% 70%' : '215 85% 60%'}
      backgroundColor={dark ? '#0B0D12' : '#FFFFFF'}
      colors={['#0072F5', '#38bdf8', '#7820bc']}
      fillOpacity={dark ? 0.5 : 0.35}
    >
      <div className="relative p-6 sm:p-8">
        {/* Subtle corner accent */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 size-40 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--color-chart-2, hsl(220 70% 50%))' }}
          aria-hidden="true"
        />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {greeting}
          </h1>
          {subtitle && (
            <p className="max-w-lg text-sm text-muted-foreground">{subtitle}</p>
          )}
          {stats && stats.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 text-sm">
                  <stat.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-semibold tabular-nums text-foreground">{stat.value}</span>
                  <span className="text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {actions && actions.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            {actions.map((action) => (
              <Link key={action.href} href={action.href}>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    action.variant === 'primary' || !action.variant
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border bg-background hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {action.label}
                </button>
              </Link>
            ))}
          </div>
        )}
        </div>
      </div>
    </BorderGlow>
  )
}