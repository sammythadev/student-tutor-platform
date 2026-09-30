'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Loading placeholders sized to the layout they stand in for.
 *
 * Both variants mirror their real row's grid track-for-track rather than being a
 * generic grey block. That is the whole point of a skeleton: the page must not
 * jump when data lands, and a placeholder whose box differs from the card it
 * becomes guarantees the jump. These are also wrapped in the real `aria-busy`
 * region and hidden from assistive tech, because a screen reader should be told
 * "finding tutors" once rather than read eight anonymous grey rectangles.
 *
 * `aria-hidden` on the placeholder plus a single `role="status"` message is the
 * pattern ui-ux-pro-max's loading-state guidance resolves to: feedback during an
 * async operation, from skeleton screens rather than a spinner.
 */

function IdentityRailSkeleton() {
  return (
    <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1.5">
      <Skeleton className="h-3 w-5" />
      <Skeleton className="size-11 rounded-full" />
    </div>
  )
}

/** Same tracks as `MatchRow`: rail, identity, decision panel. */
export function MatchRowSkeleton() {
  return (
    <li
      aria-hidden="true"
      className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
    >
      <IdentityRailSkeleton />
      <div className="flex min-w-0 flex-col gap-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3 border-t border-[var(--border)] pt-3 sm:col-start-3 sm:row-start-1 sm:border-0 sm:pt-0">
        <div className="flex items-center gap-2">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[9.5rem]">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </div>
    </li>
  )
}

/** Same two bands and two columns as `MatchSpotlight`. */
export function MatchSpotlightSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]"
    >
      <div className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="grid min-w-0 gap-6 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8 lg:p-6">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="flex min-w-0 flex-col gap-4 border-t border-[var(--border)] pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex items-center gap-4">
            <Skeleton className="size-[72px] rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * A list of placeholders, with the count the real list will hold.
 *
 * `withSpotlight` decides whether the leader cell is included, so a page that
 * renders a spotlight reserves that taller cell on the first paint instead of
 * pushing every row down a full screen once the response lands.
 */
export function MatchListSkeleton({
  rows = 5,
  withSpotlight = false,
  className,
}: {
  rows?: number
  withSpotlight?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {withSpotlight && <MatchSpotlightSkeleton />}
      <ol className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <MatchRowSkeleton key={`match-row-skeleton-${index}`} />
        ))}
      </ol>
    </div>
  )
}