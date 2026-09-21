'use client'

import React, { createContext, useContext, useCallback, useState } from 'react'
import { Toast } from '@/components/Toast'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toasts: ToastMessage[]
  addToast: (message: string, type: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`
    const toast: ToastMessage = { id, message, type, duration }
    
    /* Auto-dismiss is owned by <Toast>, which is the only place that knows how to
       play the exit slide first. A second timer here would delete the toast at the
       same instant and cut the animation short. */
    setToasts(prev => [...prev, toast])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* z-[100]: toasts must clear the Radix overlay layer. Dialogs, sheets and
          popovers all sit at z-50 and portal into <body>, which paints after the
          provider's node at equal depth — so a toast raised from inside a modal
          used to land behind it. */}
      <div className="fixed z-[100] w-[calc(100%-2rem)] max-w-[420px] flex flex-col gap-3 pointer-events-none items-center md:items-end bottom-4 left-1/2 -translate-x-1/2 md:bottom-6 md:right-6 md:left-auto md:translate-x-0">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
