'use client'

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { Input as UiInput } from '@/components/ui/input'
import { Textarea as UiTextarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dropdown } from './Dropdown'

/* ─── Input ─── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:  string
  error?:  string
  icon?:   ReactNode
  helper?: string
  rightElement?: ReactNode
}

export function Input({ label, error, icon, helper, rightElement, className = '', id, ...props }: InputProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <div className="w-full space-y-2">
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <UiInput
          id={fieldId}
          className={`${className} ${icon ? 'pl-10' : ''} ${rightElement ? 'pr-10' : ''}`}
          data-error={error ? true : undefined}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {rightElement}
          </span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-xs text-muted-foreground">{helper}</p>
      )}
    </div>
  )
}

/* ─── Select ─── */
interface SelectProps {
  label?:       string
  error?:       string
  helper?:      string
  name?:        string
  value?:       string
  onChange?:    (e: React.ChangeEvent<HTMLSelectElement>) => void
  options:      { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, helper, name, value, onChange, options, placeholder }: SelectProps) {
  return (
    <div className="w-full space-y-2">
      <Dropdown
        label={label}
        value={value ?? ''}
        onChange={(newVal) => {
          const syntheticEvent = {
            target: { name: name ?? '', value: newVal },
            currentTarget: { name: name ?? '', value: newVal },
          } as React.ChangeEvent<HTMLSelectElement>
          onChange?.(syntheticEvent)
        }}
        options={options}
        placeholder={placeholder}
        error={error}
      />
      {helper && !error && (
        <p className="text-xs text-muted-foreground">{helper}</p>
      )}
    </div>
  )
}

/* ─── Textarea ─── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:  string
  error?:  string
  helper?: string
  rows?:   number
}

export function Textarea({ label, error, helper, rows = 4, className = '', id, ...props }: TextareaProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <div className="w-full space-y-2">
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <UiTextarea id={fieldId} rows={rows} className={className} data-error={error ? true : undefined} {...props} />
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-xs text-muted-foreground">{helper}</p>
      )}
    </div>
  )
}