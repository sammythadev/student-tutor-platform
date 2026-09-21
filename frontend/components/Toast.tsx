'use client'

import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose: () => void
}

// Keep status color on the icon; the panel stays opaque in both themes.
const ACCENTS: Record<ToastProps['type'], string> = {
  success: 'var(--chip-teal-fg)',
  error: 'var(--chip-red-fg)',
  warning: 'var(--chip-amber-fg)',
  info: 'var(--chip-blue-fg)',
}

export function Toast({ message, type, duration = 4000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)
  const accent = ACCENTS[type]

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="size-4" strokeWidth={2} />
      case 'error':
        return <AlertCircle className="size-4" strokeWidth={2} />
      case 'warning':
        return <AlertTriangle className="size-4" strokeWidth={2} />
      default:
        return <Info className="size-4" strokeWidth={2} />
    }
  }

  const handleClose = useCallback(() => {
    setIsExiting(true)
  }, [])

  /* The exit slide owns the hand-off back to the provider, so its 200ms timer is
     cleaned up on unmount instead of leaking past a toast that is already gone. */
  useEffect(() => {
    if (!isExiting) return
    const timer = setTimeout(onClose, 200)
    return () => clearTimeout(timer)
  }, [isExiting, onClose])

  useEffect(() => {
    if (duration <= 0) return
    const timer = setTimeout(handleClose, duration)
    return () => clearTimeout(timer)
  }, [duration, handleClose])

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`
        flex w-full min-w-0 items-center gap-3 rounded-xl border border-border
        bg-popover p-4 text-foreground shadow-[var(--shadow-menu)] pointer-events-auto
        transition-opacity duration-200 motion-reduce:transition-none
        ${isExiting ? 'opacity-0' : 'opacity-100'}
      `}
    >
      <span
        className="flex size-5 shrink-0 items-center justify-center"
        style={{ color: accent }}
        aria-hidden="true"
      >
        {getIcon()}
      </span>
      <p className="min-w-0 flex-1 break-words text-sm font-medium leading-snug">{message}</p>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Dismiss notification"
        className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <X className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  )
}
