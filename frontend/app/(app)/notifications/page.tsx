'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getMySessions, acceptSession, declineSession, type SessionItem } from '@/lib/api/sessions'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import { DashboardHero } from '@/components/dashboard-hero'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { CheckCircle2, Clock, XCircle, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_DOT: Record<SessionItem['status'], string> = {
  pending: 'bg-amber-500',
  upcoming: 'bg-sky-500',
  'starting-soon': 'bg-emerald-500',
  completed: 'bg-violet-500',
  cancelled: 'bg-rose-500',
}

export default function NotificationsPage() {
  const user = useAuthStore(s => s.user)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'upcoming'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await getMySessions()
      setSessions(data)
    } catch (err) {
      setError(apiErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAccept(id: string) {
    try {
      const updated = await acceptSession(id)
      setSessions(prev => prev.map(s => s.id === id ? updated : s))
    } catch (err) {
      setError(apiErrorText(err))
    }
  }

  async function handleDecline(id: string) {
    try {
      const updated = await declineSession(id)
      setSessions(prev => prev.map(s => s.id === id ? updated : s))
    } catch (err) {
      setError(apiErrorText(err))
    }
  }

  const filtered = sessions.filter(s => {
    if (filter === 'pending') return s.status === 'pending'
    if (filter === 'upcoming') return s.status === 'upcoming' || s.status === 'starting-soon'
    return true
  })

  const pendingCount = sessions.filter(s => s.status === 'pending').length

  return (
    <div className="space-y-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Session requests and updates</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {(['all', 'pending', 'upcoming'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-lg border px-4 py-2 text-xs font-semibold transition-colors',
              filter === f
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            )}
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Upcoming'}
            {f === 'pending' && <span className="ml-1">({pendingCount})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-px bg-border p-px">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse bg-background/90" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-background p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No notifications to show</EmptyTitle>
              <EmptyDescription className="text-xs">
                Session requests and updates will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-border p-px">
          {filtered.map(session => {
            const otherName = user?.id === session.studentId ? session.tutorName : session.studentName
            const isInitiator = user?.id === session.initiatorId
            const isPending = session.status === 'pending'
            return (
              <div
                key={session.id}
                className={cn(
                  'flex flex-wrap items-start justify-between gap-3 bg-background p-5',
                  isPending && 'border-l-4 border-l-amber-500'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{session.subject}</p>
                    <Badge variant="secondary" className="gap-1.5">
                      <span className={cn('size-1.5 rounded-full', STATUS_DOT[session.status])} />
                      {session.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isInitiator ? `You requested this session with ${otherName ?? 'Unknown'}` : `${otherName ?? 'Unknown'} ${isPending ? 'requested a session' : ''}`}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {new Date(session.startAt).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {new Date(session.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isPending && !isInitiator && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => handleAccept(session.id)}>
                      <CheckCircle2 className="size-3.5" /> Accept
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDecline(session.id)}>
                      <XCircle className="size-3.5" /> Decline
                    </Button>
                  </div>
                )}
                {isPending && isInitiator && (
                  <Badge variant="secondary">Awaiting response</Badge>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
