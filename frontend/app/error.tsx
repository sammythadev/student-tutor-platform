'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Route-level error boundary. Rendered in place of the crashed segment;
 * `reset()` re-renders it without losing the rest of the session.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error boundary caught:', error)
  }, [error])

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-lg)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" strokeWidth={1.75} />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This section failed to load. Your session is safe — try again, or head
            back and carry on from there.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => reset()} className="min-h-11">
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Button asChild className="min-h-11">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
