'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface ModalProps {
  isOpen: boolean
  title: React.ReactNode
  children: React.ReactNode
  onClose: () => void
  actions?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ isOpen, title, children, onClose, actions, size = 'md' }: ModalProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      setIsExiting(false)
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isOpen])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 200)
  }

  if (!isOpen && !isExiting) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-40
          transition-opacity duration-200
          ${isExiting ? 'opacity-0' : 'opacity-100'}
        `}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
        <div
          className={`
            glass-card-strong w-full ${sizeClasses[size]} my-auto
            flex max-h-[calc(100dvh-2rem)] flex-col
            transition-all duration-200
            ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
          `}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between shrink-0 p-6 pb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--ink-900)' }}>
              {title}
            </h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {children}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center justify-end gap-3 shrink-0 border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
