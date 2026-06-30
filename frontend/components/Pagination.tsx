'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (totalPages <= 1) return null

  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-30"
        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200" style={{ color: 'var(--text-secondary)' }}>1</button>
          {start > 2 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>...</span>}
        </>
      )}

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200"
          style={p === page ? { background: 'var(--primary)', color: 'var(--primary-fg)' } : { color: 'var(--text-secondary)' }}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>...</span>}
          <button onClick={() => onPageChange(totalPages)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200" style={{ color: 'var(--text-secondary)' }}>{totalPages}</button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-30"
        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
