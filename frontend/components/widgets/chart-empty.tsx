'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { AlertCircle, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface ChartRequestState {
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function ChartState({ loading, error, onRetry, children }: ChartRequestState & { children: ReactNode }) {
  if (loading) {
    return (
      <div className="flex min-h-60 items-center" role="status" aria-busy="true">
        <Skeleton className="h-60 w-full motion-reduce:animate-none" />
        <span className="sr-only">Loading chart</span>
      </div>
    )
  }

  if (error) {
    return (
      <Empty className="min-h-60 gap-4 px-2 py-6 md:p-6" role="alert">
        <EmptyHeader>
          <EmptyMedia variant="icon"><AlertCircle className="size-5" aria-hidden="true" /></EmptyMedia>
          <EmptyTitle className="text-sm">Unable to load chart</EmptyTitle>
          <EmptyDescription className="break-words text-xs">{error}</EmptyDescription>
        </EmptyHeader>
        {onRetry && (
          <EmptyContent>
            <Button type="button" variant="outline" className="min-h-11" onClick={onRetry}>Retry</Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  return children
}

export function ChartEmpty({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; href: string }
  className?: string
}) {

  return (
    <Empty className={cn('min-h-60 w-full gap-4 px-2 py-6 md:p-6', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon"><Icon className="size-5" aria-hidden="true" /></EmptyMedia>
        <EmptyTitle className="text-sm">{title}</EmptyTitle>
        <EmptyDescription className="max-w-[34ch] break-words text-xs">{description}</EmptyDescription>
      </EmptyHeader>
      {action && (
        <EmptyContent>
          <Button asChild className="min-h-11 max-w-full whitespace-normal" variant="outline">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
