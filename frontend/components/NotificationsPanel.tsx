'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal'
import Link from 'next/link'
import { Badge } from './Badge'
import { Button } from './Button'
import { Dropdown } from './Dropdown'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/lib/api/notifications'
import { acceptSession, declineSession, acceptProposal, proposeSession } from '@/lib/api/sessions'
import {
  Bell, CalendarCheck, CalendarX, Clock, CheckCircle, Info, ExternalLink, Check, X, ArrowRight,
} from 'lucide-react'

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
  onRead?: () => void
}

const TYPE_CONFIG = {
  session_request:   { icon: Clock,        color: 'sun',      label: 'Request'   },
  session_upcoming:  { icon: CalendarCheck, color: 'mint',     label: 'Upcoming'  },
  session_accepted:  { icon: CheckCircle,   color: 'mint',     label: 'Accepted'  },
  session_proposed:  { icon: CalendarCheck, color: 'sky',     label: 'Proposed'  },
  session_passed:    { icon: CalendarX,     color: 'lavender', label: 'Completed' },
  session_cancelled: { icon: CalendarX,     color: 'coral',    label: 'Cancelled' },
  general:           { icon: Info,          color: 'sky',      label: 'Info'      },
} as const

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function NotificationDetail({
  notification,
  onClose,
  onRefresh,
}: {
  notification: NotificationItem
  onClose: () => void
  onRefresh: () => void
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [proposeDate, setProposeDate] = useState('')
  const [proposeTime, setProposeTime] = useState('15:00')
  const [showPropose, setShowPropose] = useState(false)
  const [error, setError] = useState('')

  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.general
  const Icon = cfg.icon
  const isSessionRequest = notification.type === 'session_request'
  const isSessionProposed = notification.type === 'session_proposed'
  const sessionId = notification.relatedId

  async function handleAccept() {
    if (!sessionId) return
    setActionLoading('accept')
    try {
      await acceptSession(sessionId)
      await markNotificationRead(notification.id)
      onRefresh()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to accept')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDecline() {
    if (!sessionId) return
    setActionLoading('decline')
    try {
      await declineSession(sessionId)
      await markNotificationRead(notification.id)
      onRefresh()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to decline')
    } finally {
      setActionLoading(null)
    }
  }

  async function handlePropose() {
    if (!sessionId || !proposeDate || !proposeTime) return
    setActionLoading('propose')
    try {
      const [h, m] = proposeTime.split(':')
      const startAt = new Date(`${proposeDate}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`)
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000)
      await proposeSession(sessionId, startAt.toISOString(), endAt.toISOString())
      await markNotificationRead(notification.id)
      onRefresh()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to propose new time')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: `var(--accent-${cfg.color}-bg)`, color: `var(--accent-${cfg.color}-fg)` }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold">{notification.title}</p>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {notification.message}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {formatTime(notification.createdAt)}
          </p>
        </div>
        <Badge color={cfg.color as any} size="sm">{cfg.label}</Badge>
      </div>

      {isSessionProposed && sessionId && (
        <div className="space-y-3 pt-2">
          {error && (
            <div className="p-2 rounded-lg text-xs" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={async () => {
                setActionLoading('accept-proposal')
                try {
                  await acceptProposal(sessionId)
                  await markNotificationRead(notification.id)
                  onRefresh()
                  onClose()
                } catch (err: any) {
                  setError(err?.response?.data?.message ?? 'Failed to accept proposal')
                } finally {
                  setActionLoading(null)
                }
              }}
              loading={actionLoading === 'accept-proposal'}
            >
              <Check className="w-3.5 h-3.5" /> Accept New Time
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                // Close the detail modal, user can message the tutor
                onClose()
              }}
            >
              <X className="w-3.5 h-3.5" /> Message Tutor
            </Button>
          </div>
        </div>
      )}

      {isSessionRequest && sessionId && (
        <div className="space-y-3 pt-2">
          {error && (
            <div className="p-2 rounded-lg text-xs" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={handleAccept}
              loading={actionLoading === 'accept'}
            >
              <Check className="w-3.5 h-3.5" /> Accept
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={handleDecline}
              loading={actionLoading === 'decline'}
            >
              <X className="w-3.5 h-3.5" /> Decline
            </Button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowPropose(!showPropose)}
              className="flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer"
              style={{ color: 'var(--primary)' }}
            >
              <ArrowRight className="w-3 h-3" /> Propose a different time
            </button>

            {showPropose && (
              <div className="mt-3 space-y-2 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <input
                  type="date"
                  value={proposeDate}
                  onChange={(e) => setProposeDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none"
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border)',
                  }}
                />
                <Dropdown
                  value={proposeTime}
                  onChange={setProposeTime}
                  options={Array.from({ length: 17 }, (_, i) => i + 6).flatMap(h =>
                    ['00', '15', '30', '45'].map(m => ({
                      value: `${h}:${m}`,
                      label: `${String(h).padStart(2, '0')}:${m}`,
                    }))
                  )}
                  placeholder="HH:MM"
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handlePropose}
                  loading={actionLoading === 'propose'}
                >
                  Send Proposal
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}

export function NotificationsPanel({ isOpen, onClose, onRead }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailTarget, setDetailTarget] = useState<NotificationItem | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    getNotifications()
      .then((data) => {
        setNotifications(data)
        markAllNotificationsRead().catch(() => {})
        onRead?.()
      })
      .catch((err) => setError(err?.response?.data?.message ?? 'Could not load notifications'))
      .finally(() => setLoading(false))
  }, [isOpen])

  function refreshNotifications() {
    getNotifications()
      .then(setNotifications)
      .catch(() => {})
  }

  const unread = notifications.filter((n) => n.isRead === 0)
  const read = notifications.filter((n) => n.isRead === 1)

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Notifications" size="md">
        <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
          {error && (
            <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl" style={{ background: 'var(--surface-2)' }} />
              ))}
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12" style={{ color: 'var(--text-muted)' }}>
              <Bell className="w-10 h-10 opacity-30" />
              <p className="text-sm">No notifications yet.</p>
            </div>
          )}

          {unread.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                New ({unread.length})
              </p>
              <div className="space-y-2">
                {unread.map((n) => (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    onClick={() => setDetailTarget(n)}
                  />
                ))}
              </div>
            </div>
          )}

          {read.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2 mt-4" style={{ color: 'var(--text-muted)' }}>
                Earlier
              </p>
              <div className="space-y-2">
                {read.slice(0, 8).map((n) => (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    dimmed
                    onClick={() => setDetailTarget(n)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Link
          href="/notifications"
          onClick={onClose}
          className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          style={{ color: 'var(--primary)', background: 'var(--primary-subtle)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-subtle)' }}
        >
          View All Notifications
          <ExternalLink className="w-3 h-3" />
        </Link>
      </Modal>

      {detailTarget && (
        <Modal
          isOpen={!!detailTarget}
          onClose={() => setDetailTarget(null)}
          title="Notification Details"
          size="sm"
        >
          <NotificationDetail
            notification={detailTarget}
            onClose={() => setDetailTarget(null)}
            onRefresh={refreshNotifications}
          />
        </Modal>
      )}
    </>
  )
}

function NotificationCard({
  notification: n, dimmed, onClick,
}: {
  notification: NotificationItem
  dimmed?: boolean
  onClick: () => void
}) {
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.general
  const Icon = cfg.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border p-3 flex items-start gap-3 transition-all cursor-pointer hover:opacity-90"
      style={{
        borderColor: 'var(--border)',
        background: dimmed ? 'transparent' : 'var(--primary-subtle)',
        opacity: dimmed ? 0.7 : 1,
      }}
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ background: `var(--accent-${cfg.color}-bg)`, color: `var(--accent-${cfg.color}-fg)` }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
          {n.title}
        </p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {n.message}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {new Date(n.createdAt).toLocaleString()}
        </p>
      </div>
      <Badge color={cfg.color as any} size="sm">{cfg.label}</Badge>
      <ExternalLink className="w-3 h-3 flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
    </button>
  )
}
