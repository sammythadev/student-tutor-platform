'use client'

import { ReactNode } from 'react'

type AccentColor = 'lavender' | 'sky' | 'mint' | 'sun' | 'coral' | 'tangerine'

interface BadgeProps {
  children: ReactNode
  color?: AccentColor
  icon?: ReactNode
  size?: 'sm' | 'md'
}

const COLOR_VARS: Record<AccentColor, { bg: string; fg: string }> = {
  lavender:   { bg: 'var(--accent-lavender-bg)',   fg: 'var(--accent-lavender-fg)'   },
  sky:        { bg: 'var(--accent-sky-bg)',         fg: 'var(--accent-sky-fg)'         },
  mint:       { bg: 'var(--accent-mint-bg)',        fg: 'var(--accent-mint-fg)'        },
  sun:        { bg: 'var(--accent-sun-bg)',         fg: 'var(--accent-sun-fg)'         },
  coral:      { bg: 'var(--accent-coral-bg)',       fg: 'var(--accent-coral-fg)'       },
  tangerine:  { bg: 'var(--accent-tangerine-bg)',   fg: 'var(--accent-tangerine-fg)'   },
}

export function Badge({ children, color = 'lavender', icon, size = 'md' }: BadgeProps) {
  const { bg, fg } = COLOR_VARS[color]
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'

  return (
    <div
      className={`rounded-full font-semibold inline-flex items-center gap-1.5 ${sizeClasses}`}
      style={{ background: bg, color: fg }}
    >
      {icon && <span className="w-3.5 h-3.5 flex-shrink-0">{icon}</span>}
      {children}
    </div>
  )
}

interface CardProps {
  children:   ReactNode
  className?: string
  strong?:    boolean
  hover?:     boolean
  onClick?:   () => void
}

export function Card({ children, className = '', strong = false, hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        ${strong ? 'glass-card-strong' : 'surface-card'}
        ${hover ? 'hover:-translate-y-0.5 transition-all duration-150 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
