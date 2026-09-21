import Link from 'next/link'
import { Compass, House } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Branded 404. Server component — no hooks, no browser APIs.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-lg)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
          <Compass className="size-6" strokeWidth={1.75} />
        </span>
        <div className="space-y-2">
          <p className="font-mono text-sm text-muted-foreground">404</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            This page wandered off
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The link is broken or the page moved. Your matches, sessions and
            messages are untouched.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/dashboard">
              Dashboard
            </Link>
          </Button>
          <Button asChild className="min-h-11">
            <Link href="/">
              <House className="size-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
