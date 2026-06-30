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
    
    setToasts(prev => [...prev, toast])

    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 pointer-events-none items-center">
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
