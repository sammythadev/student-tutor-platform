'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'
import { useToast } from '@/lib/toast-context'

function subscribeOnlineStatus(callback: () => void) {
  // online/offline fire on real disconnects. focus/pageshow re-read the
  // snapshot for cases where the event was missed (sleep/wake, emulation).
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  window.addEventListener('focus', callback)
  window.addEventListener('pageshow', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
    window.removeEventListener('focus', callback)
    window.removeEventListener('pageshow', callback)
  }
}

function getOnlineSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  return true
}

/**
 * Global connectivity state. A persistent full-width bar while offline —
 * honest about the state, dismissible only by reconnecting — plus a toast
 * the moment the connection returns.
 */
export function OfflineIndicator() {
  const online = useSyncExternalStore(subscribeOnlineStatus, getOnlineSnapshot, getServerSnapshot)
  const { addToast } = useToast()
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!online) {
      wasOffline.current = true
      return
    }
    if (wasOffline.current) {
      wasOffline.current = false
      addToast('Back online. Anything you tried will work now.', 'success')
    }
  }, [online, addToast])

  if (online) return null

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-card/95 shadow-[var(--shadow-menu)] backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <WifiOff className="size-4.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">You are offline</p>
          <p className="truncate text-xs text-muted-foreground">
            Pages and actions need a connection. What you have open stays put.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className="size-4" />
          Retry
        </button>
      </div>
    </div>
  )
}
