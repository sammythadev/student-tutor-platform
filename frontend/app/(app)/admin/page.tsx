'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Badge } from '@/components/ui/badge'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardCard } from '@/components/dashboard-card'
import { DashboardHero } from '@/components/dashboard-hero'
import { getAdminMetrics, type AdminMetrics } from '@/lib/api/dashboard'
import { apiErrorText } from '@/lib/api/errors'
import { stagger, type Accent } from '@/lib/ui'
import { AlertCircle, CalendarClock, Star, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const EASE = [0.16, 1, 0.3, 1] as const

const IDENTITY_BG: Record<Accent, string> = {
  lavender: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  mint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sun: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  coral: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  tangerine: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
}

interface MetricCard {
  label: string
  value: string
  caption: string
  icon: typeof Users
  accent: Accent
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getAdminMetrics()
        if (alive) setMetrics(data)
      } catch (err) {
        if (alive) setError(apiErrorText(err))
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const cards: MetricCard[] = [
    {
      label: 'Active users',
      value: metrics ? metrics.totalUsers.toLocaleString('en-NG') : '—',
      caption: 'Accounts with status "active"',
      icon: Users,
      accent: 'lavender',
    },
    {
      label: 'Live sessions',
      value: metrics ? metrics.activeSessions.toLocaleString('en-NG') : '—',
      caption: 'Scheduled or starting soon',
      icon: CalendarClock,
      accent: 'mint',
    },
    {
      label: 'Platform rating',
      value: metrics?.avgRating ? `${metrics.avgRating}/5` : '—',
      caption: metrics?.avgRating ? 'Mean tutor rating' : 'No ratings recorded yet',
      icon: Star,
      accent: 'sun',
    },
  ]

  return (
    <div className="space-y-6 py-3">
      <DashboardHero
        greeting="Platform overview"
        subtitle="Aggregate figures read live from the matchmaking database."
        stats={metrics ? [
          { icon: Users, label: 'active users', value: metrics.totalUsers.toLocaleString('en-NG') },
          { icon: CalendarClock, label: 'live sessions', value: metrics.activeSessions.toLocaleString('en-NG') },
          { icon: Star, label: 'platform rating', value: metrics.avgRating ? `${metrics.avgRating}/5` : '—' },
        ] : undefined}
      />

      {error && (
        <div
          className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-px bg-border p-px sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
            <div key={`admin-skeleton-${i}`} className="h-[168px] animate-pulse bg-background/90" />
          ))
          : cards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: stagger(index), ease: EASE }}
            >
              <DashboardCard className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-normal text-xs tracking-wide text-muted-foreground">
                    <span className={cn('flex size-8 items-center justify-center rounded-lg', IDENTITY_BG[card.accent])}>
                      <card.icon className="size-4" />
                    </span>
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.caption}</p>
                </CardContent>
              </DashboardCard>
            </motion.div>
          ))}
      </div>

      <DashboardCard className="gap-0">
        <CardHeader className="border-b">
          <CardTitle className="text-base">User Directory</CardTitle>
          <CardDescription>Per-user administration is out of scope for this build.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
              The dashboard module exposes aggregate counts only (<code>/dashboard/admin-metrics</code>). A listing view will
              require a paginated users endpoint with an admin guard before it can show anything real.
            </p>
            <Badge variant="secondary">Endpoint not implemented</Badge>
          </div>
        </CardContent>
      </DashboardCard>
    </div>
  )
}
