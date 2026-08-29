'use client'

import { ReactNode } from 'react'
import { Badge as UiBadge } from '@/components/ui/badge'
import { Card as UiCard } from '@/components/ui/card'

type AccentColor = 'lavender' | 'sky' | 'mint' | 'sun' | 'coral' | 'tangerine'

interface BadgeProps {
  children: ReactNode
  color?: AccentColor
  icon?: ReactNode
  size?: 'sm' | 'md'
}

/** Legacy-compat Badge. Forwards to ui/badge with tinted accent classes. */
export function Badge({ children, color = 'lavender', icon, size = 'md' }: BadgeProps) {
  const tintMap: Record<AccentColor, string> = {
    lavender: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    mint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    sun: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    coral: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    tangerine: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  }

  return (
    <UiBadge
      variant="outline"
      className={`inline-flex items-center gap-1.5 font-semibold ${tintMap[color]} ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'}`}
    >
      {icon && <span className="size-3.5 shrink-0">{icon}</span>}
      {children}
    </UiBadge>
  )
}

interface CardProps {
  children:   ReactNode
  className?: string
  strong?:    boolean
  hover?:     boolean
  onClick?:   () => void
}

/** Legacy-compat Card. Some pages import Card from this file (a bug). Forwards to ui/card. */
export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <UiCard
      className={`p-5 ${hover ? 'hover:-translate-y-0.5 transition-all duration-150 cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </UiCard>
  )
}