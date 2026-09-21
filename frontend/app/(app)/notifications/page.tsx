'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isCancel } from 'axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getMySessions, acceptSession, declineSession, type SessionItem } from '@/lib/api/sessions'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { CheckCircle2, Clock, XCircle, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

type RequestLifetime = {
  active: boolean
  userId: string
  sequence: number
  controller: AbortController | null
  loaded: boolean
  pendingIds: Set<string>
}

function isCurrent(lifetime: RequestLifetime) {
  const auth = useAuthStore.getState()
  return lifetime.active && auth.user?.id === lifetime.userId && !!auth.accessToken
}

export default function NotificationsPage() {
  const userId = useAuthStore(s => s.user?.id)
  const authenticated = useAuthStore(s => !!s.accessToken)

  // Account changes discard the previous account's rows before the next effect runs.
  return userId && authenticated ? (
    <NotificationsContent key={userId} userId={userId} />
  ) : (
    <div className="space-y-2 py-3">
      <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Notifications</h1>
      <p className="text-sm text-muted-foreground">Sign in to see session requests and updates.</p>
    </div>
  )
}

function NotificationsContent({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'upcoming'>('all')
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const lifetimeRef = useRef<RequestLifetime | null>(null)

  const load = useCallback(async (lifetime: RequestLifetime) => {
    if (!isCurrent(lifetime) || lifetime.pendingIds.size > 0) return
    lifetime.controller?.abort()
    const controller = new AbortController()
    lifetime.controller = controller
    const sequence = ++lifetime.sequence
    const canCommit = () => isCurrent(lifetime) && sequence === lifetime.sequence && !controller.signal.aborted
    setLoadError(null)
    setInitialLoading(!lifetime.loaded)
    setRefreshing(lifetime.loaded)
    try {
      const data = await getMySessions(controller.signal)
      if (!canCommit()) return
      lifetime.loaded = true
      setSessions(data)
      setHasLoaded(true)
    } catch (error) {
      if (canCommit() && !isCancel(error)) setLoadError(apiErrorText(error))
    } finally {
      if (canCommit()) {
        lifetime.controller = null
        setInitialLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    const lifetime: RequestLifetime = {
      active: true, userId, sequence: 0, controller: null, loaded: false, pendingIds: new Set(),
    }
    lifetimeRef.current = lifetime
    void load(lifetime)
    return () => {
      lifetime.active = false
      lifetime.sequence++
      lifetime.controller?.abort()
      if (lifetimeRef.current === lifetime) lifetimeRef.current = null
    }
  }, [load, userId])

  function refresh() {
    const lifetime = lifetimeRef.current
    if (lifetime) void load(lifetime)
  }

  async function respond(id: string, action: 'accept' | 'decline') {
    const lifetime = lifetimeRef.current
    if (!lifetime || !isCurrent(lifetime) || lifetime.pendingIds.has(id)) return
    // The ref-held set locks immediately, before React renders disabled controls.
    lifetime.pendingIds.add(id)
    setPendingIds(new Set(lifetime.pendingIds))
    setRowErrors(previous => {
      const next = { ...previous }
      delete next[id]
      return next
    })
    lifetime.sequence++
    lifetime.controller?.abort()
    lifetime.controller = null
    setRefreshing(false)
    try {
      const updated = await (action === 'accept' ? acceptSession(id) : declineSession(id))
      if (isCurrent(lifetime)) {
        setSessions(previous => previous.map(session => session.id === id ? updated : session))
      }
    } catch (error) {
      if (isCurrent(lifetime) && !isCancel(error)) {
        setRowErrors(previous => ({ ...previous, [id]: apiErrorText(error) }))
      }
    } finally {
      if (isCurrent(lifetime)) {
        lifetime.pendingIds.delete(id)
        setPendingIds(new Set(lifetime.pendingIds))
        // Reconciliation is independent of action success: its failure only sets loadError.
        if (lifetime.pendingIds.size === 0) void load(lifetime)
      }
    }
  }

  const filtered = sessions.filter(session => {
    if (filter === 'pending') return session.status === 'pending'
    if (filter === 'upcoming') return session.status === 'upcoming' || session.status === 'starting-soon'
    return true
  })
  const pendingCount = sessions.filter(session => session.status === 'pending').length

  return (
    <div className="space-y-4 py-1 md:space-y-6 md:py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Session requests and updates</p>
        </div>
        <Button className="min-h-11" variant="outline" onClick={refresh} disabled={initialLoading || refreshing || pendingIds.size > 0}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {loadError && (
        <div className="space-y-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400" role="alert">
          <p>{loadError}</p>
          {!hasLoaded && <Button className="min-h-11" variant="outline" onClick={refresh} disabled={initialLoading}>Retry</Button>}
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter notifications">
        {(['all', 'pending', 'upcoming'] as const).map(value => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              'min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors',
              filter === value
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            )}
          >
            {value === 'all' ? 'All' : value === 'pending' ? 'Pending' : 'Upcoming'}
            {value === 'pending' && hasLoaded && <span className="ml-1">({pendingCount})</span>}
          </button>
        ))}
      </div>

      {initialLoading ? (
        <div className="grid grid-cols-1 gap-px bg-border p-px" role="status" aria-label="Loading notifications">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse bg-background/90 motion-reduce:animate-none" />
          ))}
        </div>
      ) : !hasLoaded ? null : filtered.length === 0 ? (
        <div className="rounded-lg border bg-background p-6 md:p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Bell aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>No notifications to show</EmptyTitle>
              <EmptyDescription>Session requests and updates will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-border p-px">
          {filtered.map(session => {
            const otherName = userId === session.studentId ? session.tutorName : session.studentName
            const isInitiator = userId === session.initiatorId
            const isPending = session.status === 'pending'
            const responding = pendingIds.has(session.id)
            return (
              <div
                key={session.id}
                className={cn(
                  'flex flex-wrap items-start justify-between gap-3 bg-background p-4',
                  isPending && 'border-l-4 border-l-amber-500'
                )}
              >
                <div className="min-w-0 flex-1 basis-48">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-semibold text-foreground">{session.subject}</p>
                    <Badge variant="secondary">{session.status}</Badge>
                  </div>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {isInitiator ? `You requested this session with ${otherName ?? 'Unknown'}` : `${otherName ?? 'Unknown'} ${isPending ? 'requested a session' : ''}`}
                  </p>
                  <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                    <Clock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                    <span>{new Date(session.startAt).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {new Date(session.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                  {rowErrors[session.id] && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400" role="alert">{rowErrors[session.id]}</p>}
                </div>
                {isPending && !isInitiator && (
                  <div className="flex flex-wrap gap-2" aria-busy={responding}>
                    <Button className="min-h-11" size="sm" disabled={responding} onClick={() => void respond(session.id, 'accept')}>
                      <CheckCircle2 className="size-3.5" aria-hidden="true" /> Accept
                    </Button>
                    <Button className="min-h-11" variant="outline" size="sm" disabled={responding} onClick={() => void respond(session.id, 'decline')}>
                      <XCircle className="size-3.5" aria-hidden="true" /> Decline
                    </Button>
                  </div>
                )}
                {isPending && isInitiator && <Badge variant="secondary">Awaiting response</Badge>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
