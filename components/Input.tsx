'use client'

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

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
}

export function Input({ label, error, icon, helper, className = '', style, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
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
          className={`${className}`}
          style={{
            ...inputStyle,
            ...(error ? inputErrorStyle : {}),
            paddingLeft: icon ? '38px' : '14px',
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

/* ─── Select ─── */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:       string
  error?:       string
  options:      { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}

      <select
        className={className}
        style={{
          ...inputStyle,
          cursor: 'pointer',
          ...(error ? inputErrorStyle : {}),
        }}
        onFocus={(e) => { Object.assign(e.currentTarget.style, inputFocusStyle) }}
        onBlur={(e) => {
          Object.assign(e.currentTarget.style, {
            borderColor: error ? 'var(--accent-coral-fg)' : 'var(--border)',
            boxShadow: 'none',
          })
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {error && (
        <p className="mt-1.5 text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--accent-coral-fg)' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  )
}

/* ─── Textarea ─── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:  string
  error?:  string
  rows?:   number
}

export function Textarea({ label, error, rows = 4, className = '', ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}

      <textarea
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
    </div>
  )
}
