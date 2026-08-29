'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface ModalProps {
  isOpen: boolean
  title: React.ReactNode
  children: React.ReactNode
  onClose: () => void
  actions?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

/** Legacy-compat Modal. Forwards to shadcn Dialog on the Geist token layer. */
export function Modal({ isOpen, title, children, onClose, actions, size = 'md' }: ModalProps) {
  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className={cn('gap-0 p-0', sizeClasses[size])}>
        <DialogHeader className="flex flex-row items-center justify-between border-b p-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </DialogHeader>

        <div className="max-h-[calc(100dvh-8rem)] flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
            {actions}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
