'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from './Modal'
import { Button } from './Button'
import { Badge } from './Badge'
import { getMySessions, acceptSession, declineSession, type SessionItem } from '@/lib/api/sessions'
import { useAuthStore } from '@/lib/store/authStore'
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    getMySessions()
      .then(data => setSessions(data))
      .catch(err => setError(err?.response?.data?.message ?? 'Could not load sessions'))
      .finally(() => setLoading(false))
  }, [isOpen])

  const pendingSessions = sessions.filter(s => s.status === 'pending')
  const otherSessions = sessions.filter(s => s.status !== 'pending').slice(0, 5)

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notifications" size="md">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {error && (
          <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
            <AlertCircle className="w-3 h-3 inline mr-1" />{error}
          </div>
        )}

        {loading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl" style={{ background: 'var(--surface-2)' }} />)}</div>}

        {!loading && pendingSessions.length === 0 && otherSessions.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-8">No notifications yet.</p>
        )}

        {pendingSessions.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Pending Requests ({pendingSessions.length})</p>
            <div className="space-y-2">
              {pendingSessions.map(session => {
                const otherName = user?.id === session.studentId ? session.tutorName : session.studentName
                const isInitiator = user?.id === session.initiatorId
                return (
                  <div key={session.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--accent-sun-bg)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary">
                          {isInitiator ? `Requested with ${otherName ?? 'Unknown'}` : `Request from ${otherName ?? 'Unknown'}`}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">{session.subject}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {new Date(session.startAt).toLocaleDateString()} · {new Date(session.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!isInitiator && (
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleAccept(session.id)}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                            style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button
                            onClick={() => handleDecline(session.id)}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                            style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      )}
                      {isInitiator && (
                        <Badge color="sun" size="sm">Awaiting response</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {otherSessions.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Recent Activity</p>
            <div className="space-y-2">
              {otherSessions.map(session => {
                const otherName = user?.id === session.studentId ? session.tutorName : session.studentName
                return (
                  <div key={session.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary">{session.subject} with {otherName ?? 'Unknown'}</p>
                        <p className="text-xs text-text-muted mt-0.5">{new Date(session.startAt).toLocaleDateString()}</p>
                      </div>
                      <Badge color={session.status === 'upcoming' ? 'mint' : session.status === 'cancelled' ? 'coral' : 'lavender'} size="sm">{session.status}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <Button variant="secondary" size="md" className="w-full" onClick={() => { router.push('/notifications'); onClose() }}>
          View All
        </Button>
      </div>
    </Modal>
  )
}
