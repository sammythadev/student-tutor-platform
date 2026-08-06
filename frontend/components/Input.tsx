'use client'

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { Dropdown } from './Dropdown'

/* ─────────────────────────────────────────
   Shared input styles (via inline CSS vars
   so they respect both dark & light mode)
   ───────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text-primary)',
  padding: '0 14px',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
}

const inputFocusStyle: React.CSSProperties = {
  borderColor: 'var(--primary)',
  boxShadow: '0 0 0 3px var(--primary-subtle)',
}

const inputErrorStyle: React.CSSProperties = {
  borderColor: 'var(--accent-coral-fg)',
  boxShadow: '0 0 0 3px rgba(239,68,68,0.12)',
}

/* ─── Input ─── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:  string
  error?:  string
  icon?:   ReactNode
  helper?: string
  rightElement?: ReactNode
}

export function Input({ label, error, icon, helper, rightElement, className = '', style, id, ...props }: InputProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-semibold mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4"
            style={{ color: 'var(--text-muted)' }}
          >
            {icon}
          </div>
        )}

        <input
          id={fieldId}
          className={`${className}`}
          style={{
            ...inputStyle,
            ...(error ? inputErrorStyle : {}),
            paddingLeft: icon ? '38px' : '14px',
            paddingRight: rightElement ? '38px' : '14px',
            ...style,
          }}
          onFocus={(e) => {
            Object.assign(e.currentTarget.style, error ? inputErrorStyle : inputFocusStyle)
          }}
          onBlur={(e) => {
            Object.assign(e.currentTarget.style, {
              borderColor: error ? 'var(--accent-coral-fg)' : 'var(--border)',
              boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.12)' : 'none',
            })
          }}
          {...props}
        />

        {rightElement && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
          >
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--accent-coral-fg)' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{helper}</p>
      )}
    </div>
  )
}

/* ─── Select (uses custom Dropdown) ─── */
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
    <div className="w-full">
      <Dropdown
        label={label}
        value={value ?? ''}
        onChange={(newVal) => {
          // Synthetic event keeps the caller's existing onChange(e) handlers working
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
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{helper}</p>
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
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}

      <textarea
        id={fieldId}
        rows={rows}
        className={className}
        style={{
          ...inputStyle,
          height: 'auto',
          padding: '12px 14px',
          resize: 'none',
          ...(error ? inputErrorStyle : {}),
        }}
        onFocus={(e) => { Object.assign(e.currentTarget.style, { ...inputFocusStyle, height: 'auto' }) }}
        onBlur={(e) => {
          Object.assign(e.currentTarget.style, {
            borderColor: error ? 'var(--accent-coral-fg)' : 'var(--border)',
            boxShadow: 'none',
          })
        }}
        {...props}
      />

      {error && (
        <p className="mt-1.5 text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--accent-coral-fg)' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{helper}</p>
      )}
    </div>
  )
}
