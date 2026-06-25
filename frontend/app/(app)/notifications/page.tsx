'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { getMySessions, acceptSession, declineSession, type SessionItem } from '@/lib/api/sessions'
import { useAuthStore } from '@/lib/store/authStore'
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react'

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
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not load sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAccept(id: string) {
    try {
      const updated = await acceptSession(id)
      setSessions(prev => prev.map(s => s.id === id ? updated : s))
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not accept session')
    }
  }

  async function handleDecline(id: string) {
    try {
      const updated = await declineSession(id)
      setSessions(prev => prev.map(s => s.id === id ? updated : s))
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not decline session')
    }
  }

  const filtered = sessions.filter(s => {
    if (filter === 'pending') return s.status === 'pending'
    if (filter === 'upcoming') return s.status === 'upcoming' || s.status === 'starting-soon'
    return true
  })

  return (
    <div className="space-y-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">Notifications</h1>
          <p className="mt-1 text-sm text-text-secondary">Session requests and updates</p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>Refresh</Button>
      </div>

      {error && <div className="surface-card p-4 text-sm text-accent-coral-fg">{error}</div>}

      <div className="flex gap-2">
        {(['all', 'pending', 'upcoming'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-lg border px-4 py-2 text-xs font-semibold"
            style={{
              background: filter === f ? 'var(--primary)' : 'var(--surface-2)',
              color: filter === f ? 'var(--primary-fg)' : 'var(--text-secondary)',
              borderColor: 'var(--border)',
            }}
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Upcoming'}
            {f === 'pending' && <span className="ml-1">({sessions.filter(s => s.status === 'pending').length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl" style={{ background: 'var(--surface-2)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="text-sm text-text-secondary">No notifications to show.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(session => {
            const otherName = user?.id === session.studentId ? session.tutorName : session.studentName
            const isInitiator = user?.id === session.initiatorId
            const isPending = session.status === 'pending'
            return (
              <div key={session.id} className="surface-card p-5" style={isPending ? { borderLeft: '4px solid var(--accent-sun-fg)' } : {}}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{session.subject}</p>
                      <Badge color={session.status === 'pending' ? 'sun' : session.status === 'upcoming' ? 'mint' : session.status === 'cancelled' ? 'coral' : 'lavender'} size="sm">{session.status}</Badge>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      {isInitiator ? `You requested this session with ${otherName ?? 'Unknown'}` : `${otherName ?? 'Unknown'} ${isPending ? 'requested a session' : ''}`}
                    </p>
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(session.startAt).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {new Date(session.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {isPending && !isInitiator && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => handleAccept(session.id)}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDecline(session.id)}>
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </div>
                  )}
                  {isPending && isInitiator && (
                    <Badge color="sun" size="sm">Awaiting response</Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
