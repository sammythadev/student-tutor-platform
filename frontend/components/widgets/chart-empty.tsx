'use client'

/**
 * ChartEmpty — what a chart shows before there is anything to plot.
 *
 * A fresh account still gets seven days back from the API, just with every value
 * at zero, so the plot area draws a flat line against an axis and reads as broken
 * rather than new. This replaces that with the chart's own shape ghosted in behind
 * an explanation and one thing to go do about it.
 */

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Heights that read as "a chart lives here" without pretending to hold data. */
const GHOST_BARS = [38, 62, 30, 74, 46, 84, 54] as const

function GhostBars() {
  return (
    <div aria-hidden className="absolute inset-x-4 bottom-6 flex items-end gap-2 sm:gap-3">
      {GHOST_BARS.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-gradient-to-t from-transparent to-muted-foreground/12"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  )
}

function GhostLine() {
  return (
    <svg
      aria-hidden
      className="absolute inset-x-0 bottom-0 h-2/3 w-full text-muted-foreground/15"
      preserveAspectRatio="none"
      viewBox="0 0 100 40"
    >
      {[10, 20, 30].map((y) => (
        <line key={y} stroke="currentColor" strokeWidth={0.4} x1="0" x2="100" y1={y} y2={y} />
      ))}
      <path
        d="M0 32 L16 32 L16 22 L33 22 L33 27 L50 27 L50 14 L66 14 L66 20 L83 20 L83 9 L100 9"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
      />
    </svg>
  )
}

function GhostRing() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 m-auto size-40 text-muted-foreground/20"
      viewBox="0 0 100 100"
    >
      <circle
        cx="50"
        cy="50"
        fill="none"
        r="34"
        stroke="currentColor"
        strokeDasharray="5 5"
        strokeWidth={10}
      />
    </svg>
  )
}

const GHOSTS = { bars: GhostBars, line: GhostLine, ring: GhostRing } as const

export function ChartEmpty({
  icon: Icon,
  title,
  description,
  action,
  shape = 'bars',
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; href: string }
  shape?: keyof typeof GHOSTS
  className?: string
}) {
  const Ghost = GHOSTS[shape]

  return (
    <div
      className={cn(
        'relative flex h-60 w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed px-6 text-center',
        className
      )}
    >
      <Ghost />

      <div className="relative flex flex-col items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-[34ch] text-xs leading-relaxed text-muted-foreground">{description}</p>
        {action ? (
          <Button asChild className="mt-1" size="sm" variant="outline">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
