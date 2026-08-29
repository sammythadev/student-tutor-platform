'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button as UiButton } from '@/components/ui/button'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  'primary' | 'secondary' | 'destructive' | 'icon'
  size?:     'sm' | 'md' | 'lg'
  children:  ReactNode
  loading?:  boolean
  icon?:     ReactNode
}

/**
 * Legacy-compat Button. Forwards to the Geist `ui/button` so pages that still
 * import `@/components/Button` render on the new design system.
 */
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
  const uiVariant =
    variant === 'secondary' ? 'outline'
    : variant === 'destructive' ? 'destructive'
    : variant === 'icon' ? 'ghost'
    : 'default'

  const uiSize =
    size === 'sm' ? 'sm'
    : size === 'lg' ? 'lg'
    : 'default'

  return (
    <UiButton
      variant={uiVariant}
      size={uiVariant === 'ghost' ? 'icon' : uiSize}
      className={className}
      disabled={disabled || loading}
      {...props}
    >
      {icon}
      {loading ? (
        <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        children
      )}
    </UiButton>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon:    ReactNode
  label?:  string
}

export function IconButton({ icon, label, className = '', ...props }: IconButtonProps) {
  return (
    <UiButton variant="ghost" size="icon" aria-label={label} title={label} className={className} {...props}>
      {icon}
    </UiButton>
  )
}
