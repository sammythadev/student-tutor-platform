'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

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
    <div className="relative w-full" ref={ref}>
      {label && <Label className="mb-2 block">{label}</Label>}

      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          error ? 'border-rose-500/60' : 'border-input',
          open && 'border-ring ring-3 ring-ring/50',
          className
        )}
        aria-expanded={open}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : placeholder || 'Select...'}
        </span>
        <ChevronDown
          className={cn('ml-2 size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
          {searchable && (
            <div className="border-b p-2">
              <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3.5 py-3 text-xs text-muted-foreground">No options found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-accent',
                    opt.value === value && 'bg-accent font-semibold text-foreground'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check className="size-4 shrink-0" strokeWidth={3} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  )
}
