'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  'primary' | 'secondary' | 'destructive' | 'icon'
  size?:     'sm' | 'md' | 'lg'
  children:  ReactNode
  loading?:  boolean
  icon?:     ReactNode
}

export function Button({
  variant  = 'primary',
  size     = 'md',
  children,
  loading  = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {

  const base = 'rounded-pill font-semibold transition-all duration-150 inline-flex items-center justify-center gap-2 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'

  const variantStyles: Record<string, React.CSSProperties> = {
    primary:     { background: 'var(--primary)',      color: 'var(--primary-fg)' },
    secondary:   { background: 'var(--surface-glass)', color: 'var(--text-primary)', border: 'var(--surface-border)' },
    destructive: { background: 'var(--accent-coral-fg)', color: '#fff' },
    icon:        { background: 'var(--surface-glass)', color: 'var(--text-secondary)' },
  }

  const sizeClasses = {
    sm: 'px-4  py-2    text-xs',
    md: 'px-5  py-2.5  text-sm',
    lg: 'px-6  py-3    text-base',
  }

  const iconClass = variant === 'icon' ? 'w-10 h-10 rounded-xl p-0' : (sizeClasses[size] ?? sizeClasses.md)

  const hoverMap: Record<string, React.CSSProperties> = {
    primary:     { background: 'var(--primary-hover)', boxShadow: '0 0 0 4px var(--primary-subtle)' },
    secondary:   { background: 'var(--surface-glass-strong)', borderColor: 'var(--border-strong)' },
    destructive: { opacity: '0.88' } as unknown as React.CSSProperties,
    icon:        { background: 'var(--primary-subtle)', color: 'var(--primary)' },
  }

  return (
    <button
      className={`${base} ${iconClass} ${className}`}
      style={{ ...variantStyles[variant], backdropFilter: variant === 'secondary' || variant === 'icon' ? 'var(--blur-panel)' : undefined }}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign((e.currentTarget as HTMLElement).style, hoverMap[variant] ?? {})
        }
      }}
      onMouseLeave={(e) => {
        Object.assign((e.currentTarget as HTMLElement).style, variantStyles[variant] ?? {})
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
      onMouseUp={(e)   => { (e.currentTarget as HTMLElement).style.transform = '' }}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {!loading && children}
      {loading && (
        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon:    ReactNode
  label?:  string
}

export function IconButton({ icon, label, className = '', ...props }: IconButtonProps) {
  return (
    <button
      className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${className}`}
      style={{ color: 'var(--text-secondary)', background: 'transparent' }}
      aria-label={label}
      title={label}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--primary-subtle)'
        ;(e.currentTarget as HTMLElement).style.color     = 'var(--primary)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = ''
        ;(e.currentTarget as HTMLElement).style.color     = 'var(--text-secondary)'
      }}
      {...props}
    >
      {icon}
    </button>
  )
}
