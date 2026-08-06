'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Badge } from '@/components/Badge'
import { getAdminMetrics, type AdminMetrics } from '@/lib/api/dashboard'
import { apiErrorText } from '@/lib/api/errors'
import { accentBg, accentFg, stagger, type Accent } from '@/lib/ui'
import { AlertCircle, CalendarClock, Star, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

const EASE = [0.16, 1, 0.3, 1] as const

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
      caption: 'Accounts with status “active”',
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
    <div className="space-y-8 py-3">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Administration
        </p>
        <h1
          className="font-heading mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ color: 'var(--text-primary)' }}
        >
          Platform Overview
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Aggregate figures read live from the matchmaking database.
        </p>
      </header>

      {error && (
        <div
          className="flex items-start gap-3 rounded-2xl p-4 text-sm"
          style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`admin-skeleton-${i}`}
              className="h-[168px] animate-pulse rounded-2xl"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            />
          ))
          : cards.map((card, index) => (
            <motion.article
              key={card.label}
              className="rounded-2xl p-5 sm:p-6"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-rest)' }}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: stagger(index), ease: EASE }}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: accentBg(card.accent), color: accentFg(card.accent) }}
              >
                <card.icon className="h-5 w-5" />
              </div>
              <p className="font-heading text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {card.value}
              </p>
              <p className="mt-1.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
              <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>{card.caption}</p>
            </motion.article>
          ))}
      </div>

      <section
        className="rounded-2xl p-5 sm:p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-rest)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              User Directory
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Per-user administration is out of scope for this build.
            </p>
          </div>
          <Badge color="sun" size="sm">Endpoint not implemented</Badge>
        </div>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The dashboard module exposes aggregate counts only (<code>/dashboard/admin-metrics</code>). A listing view will
          require a paginated users endpoint with an admin guard before it can show anything real.
        </p>
      </section>
    </div>
  )
}
