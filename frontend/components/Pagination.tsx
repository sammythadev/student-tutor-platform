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
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex size-11 items-center justify-center rounded-lg border bg-background text-[var(--text-secondary)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      {start > 1 && (
        <>
          <button type="button" aria-label="Page 1" onClick={() => onPageChange(1)} className="flex size-11 items-center justify-center rounded-lg text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">1</button>
          {start > 2 && <span className="text-xs text-[var(--text-secondary)]" aria-hidden="true">...</span>}
        </>
      )}

      {pages.map(p => (
        <button
          key={p}
          type="button"
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onPageChange(p)}
          className="flex size-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          style={p === page ? { background: 'var(--primary)', color: 'var(--primary-fg)' } : { color: 'var(--text-secondary)' }}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-xs text-[var(--text-secondary)]" aria-hidden="true">...</span>}
          <button type="button" aria-label={`Page ${totalPages}`} onClick={() => onPageChange(totalPages)} className="flex size-11 items-center justify-center rounded-lg text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{totalPages}</button>
        </>
      )}

      <button
        type="button"
        aria-label="Next page"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex size-11 items-center justify-center rounded-lg border bg-background text-[var(--text-secondary)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}
