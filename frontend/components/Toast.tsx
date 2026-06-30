'use client'

import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose: () => void
}

export function Toast({ id, message, type, duration = 4000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
      case 'error':
        return <AlertCircle className="w-5 h-5" strokeWidth={2} />
      case 'warning':
        return <AlertTriangle className="w-5 h-5" strokeWidth={2} />
      default:
        return <Info className="w-5 h-5" strokeWidth={2} />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-[var(--accent-mint-bg)] text-[var(--accent-mint-fg)]'
      case 'error':
        return 'bg-[var(--accent-coral-bg)] text-[var(--accent-coral-fg)]'
      case 'warning':
        return 'bg-[var(--accent-tangerine-bg)] text-[var(--accent-tangerine-fg)]'
      default:
        return 'bg-[var(--accent-sky-bg)] text-[var(--accent-sky-fg)]'
    }
  }

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 200)
  }

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(handleClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  return (
    <div
      className={`
        flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-lg pointer-events-auto
        transition-all duration-300 min-w-[300px] max-w-[420px]
        ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        ${getColors()}
      `}
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <p className="text-sm font-medium flex-grow">{message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  )
}
