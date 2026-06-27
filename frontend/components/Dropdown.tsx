'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
}

interface DropdownProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  error?: string
  searchable?: boolean
  className?: string
}

export function Dropdown({
  label, value, onChange, options, placeholder, error, searchable, className = '',
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(opt: DropdownOption) {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="w-full relative" ref={ref}>
      {label && (
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center justify-between w-full h-11 rounded-xl px-3.5 text-sm outline-none transition-all cursor-pointer ${className}`}
        style={{
          border: error ? '1px solid var(--accent-coral-fg)' : open ? '2px solid var(--primary)' : '1px solid var(--border)',
          background: 'var(--surface-2)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          boxShadow: open ? '0 0 0 3px var(--primary-subtle)' : 'none',
        }}
      >
        <span className="truncate">{selected ? selected.label : placeholder || 'Select...'}</span>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 ml-2 transition-transform"
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl border overflow-hidden shadow-lg"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {searchable && (
            <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                <Search className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="bg-transparent text-sm outline-none w-full"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3.5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No options found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm text-left transition-colors cursor-pointer"
                  style={{
                    color: opt.value === value ? 'var(--primary)' : 'var(--text-primary)',
                    background: opt.value === value ? 'var(--primary-subtle)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (opt.value !== value) e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={(e) => { if (opt.value !== value) e.currentTarget.style.background = 'transparent' }}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <Check className="w-4 h-4 flex-shrink-0" strokeWidth={3} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--accent-coral-fg)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
