import { cn } from '@/lib/utils'
import { tintFor } from '@/components/messages/chat-types'

/**
 * Initials avatar. There is no presence data in this product, so this
 * deliberately renders no online dot — a status light nobody can back up is
 * worse than none.
 */
export function ChatAvatar({
  id,
  first,
  last,
  size = 'md',
}: {
  id: string
  first: string
  last: string
  size?: 'sm' | 'md'
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'sm' ? 'size-9 text-xs' : 'size-11 text-sm',
        tintFor(id),
      )}
    >
      {(first[0] ?? '?')}{(last[0] ?? '')}
    </span>
  )
}