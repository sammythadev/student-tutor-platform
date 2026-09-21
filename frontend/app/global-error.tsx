'use client'

import Link from 'next/link'
import { House, RefreshCw, TriangleAlert } from 'lucide-react'
import './globals.css'

/**
 * Last-resort boundary for failures inside the root layout itself.
 * Must render its own <html>/<body> and stay dependency-light: no
 * providers, no store, no data fetching — only framework + icon primitives.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground">
        <div className="flex min-h-[100dvh] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" strokeWidth={1.75} />
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Tutorly failed to start
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The app shell itself crashed. Reloading usually fixes it — if it
                keeps happening, come back in a few minutes.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                <RefreshCw className="size-4" />
                Reload
              </button>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <House className="size-4" />
                Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
