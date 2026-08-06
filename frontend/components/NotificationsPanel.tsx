'use client'

import { useEffect, useState } from 'react'
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
import { apiErrorText } from '@/lib/api/errors'
import type { Accent } from '@/lib/ui'
import {
  Bell, CalendarCheck, CalendarX, Clock, CheckCircle, Info, ExternalLink, Check, X, ArrowRight,
} from 'lucide-react'

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
  onRead?: () => void
}

/** Colour encodes what happened, not which row it is. */
const TYPE_CONFIG: Record<
  NotificationItem['type'],
  { icon: typeof Clock; color: Accent; label: string }
> = {
  session_request:   { icon: Clock,         color: 'sun',      label: 'Request'   },
  session_upcoming:  { icon: CalendarCheck, color: 'sky',      label: 'Scheduled' },
  session_accepted:  { icon: CheckCircle,   color: 'mint',     label: 'Accepted'  },
  session_proposed:  { icon: CalendarCheck, color: 'sun',      label: 'New time'  },
  session_passed:    { icon: CalendarX,     color: 'lavender', label: 'Completed' },
  session_cancelled: { icon: CalendarX,     color: 'coral',    label: 'Cancelled' },
  general:           { icon: Info,          color: 'sky',      label: 'Info'      },
}

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
    } catch (err) {
      setError(apiErrorText(err))
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
    } catch (err) {
      setError(apiErrorText(err))
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
    } catch (err) {
      setError(apiErrorText(err))
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
        <Badge color={cfg.color} size="sm">{cfg.label}</Badge>
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
                } catch (err) {
                  setError(apiErrorText(err))
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
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getNotifications()
      .then((data) => {
        if (controller.signal.aborted) return
        setNotifications(data)
        markAllNotificationsRead().catch(() => {})
        onRead?.()
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(apiErrorText(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => { controller.abort() }
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
            <div
              className="rounded-lg p-3 text-xs"
              role="alert"
              style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}
            >
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border p-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-lg" style={{ background: 'var(--surface-2)' }} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-2/5 animate-pulse rounded" style={{ background: 'var(--surface-2)' }} />
                    <div className="h-3 w-4/5 animate-pulse rounded" style={{ background: 'var(--surface-2)' }} />
                    <div className="h-3 w-24 animate-pulse rounded" style={{ background: 'var(--surface-2)' }} />
                  </div>
                  <div className="h-5 w-16 flex-shrink-0 animate-pulse rounded-full" style={{ background: 'var(--surface-2)' }} />
                </div>
              ))}
            </div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Bell className="h-8 w-8" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No notifications yet</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Session requests and updates will appear here.
              </p>
            </div>
          )}

          {unread.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                New <span className="tabular">({unread.length})</span>
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
      className="flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.99]"
      style={{
        borderColor: dimmed ? 'var(--border)' : 'var(--border-strong)',
        background: dimmed ? 'transparent' : 'var(--primary-subtle)',
      }}
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ background: `var(--accent-${cfg.color}-bg)`, color: `var(--accent-${cfg.color}-fg)` }}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
          {n.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {n.message}
        </p>
        <p className="tabular mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatTime(n.createdAt)}
        </p>
      </div>
      <Badge color={cfg.color} size="sm">{cfg.label}</Badge>
    </button>
  )
}
