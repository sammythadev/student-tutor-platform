'use client'

import { Check, CheckCheck, Reply, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  clockTime,
  dayLabel,
  splitHighlight,
  type ThreadMessage,
} from '@/components/messages/chat-types'

/** Sticky so you always know which day you are reading while scrolling back. */
export function DayDivider({ iso }: { iso: string }) {
  return (
    <div className="sticky top-0 z-10 flex justify-center py-2">
      <span className="rounded-full border bg-card/85 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
        {dayLabel(iso)}
      </span>
    </div>
  )
}

/** Search hits get a marker around the text — the message itself is never altered. */
function Content({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  return (
    <>
      {splitHighlight(text, query).map((run, i) =>
        run.match ? (
          <mark
            key={i}
            className="rounded-sm bg-amber-300/70 text-inherit dark:bg-amber-400/40"
          >
            {run.text}
          </mark>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </>
  )
}

/**
 * One bubble in a run. `first`/`last` describe its position within the run: only
 * the last bubble of a run gets the pointed corner and carries the timestamp and
 * receipt, which is what keeps a long exchange from looking like a list of cards.
 * A quoted reply rides above the text and jumps back to the original on tap.
 */
export function MessageBubble({
  msg,
  mine,
  first,
  last,
  query,
  onRetry,
  onReply,
  onJumpTo,
}: {
  msg: ThreadMessage
  mine: boolean
  first: boolean
  last: boolean
  query: string
  onRetry: (msg: ThreadMessage) => void
  onReply: (msg: ThreadMessage) => void
  onJumpTo: (messageId: string) => void
}) {
  const quote = msg.replyTo

  return (
    <div
      id={`message-${msg.id}`}
      className={cn('flex flex-col', mine ? 'items-end' : 'items-start', first ? 'mt-3' : 'mt-0.5')}
    >
      <div className={cn('flex max-w-[85%] flex-col sm:max-w-[72%]', mine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words',
            mine
              ? cn('bg-primary text-primary-foreground', last && 'rounded-br-md')
              : cn('bg-muted text-foreground', last && 'rounded-bl-md'),
            msg.pending && 'opacity-60',
            msg.failed && 'ring-1 ring-destructive/60',
          )}
        >
          {quote && (
            <button
              type="button"
              onClick={() => onJumpTo(quote.id)}
              className={cn(
                'mb-1.5 flex w-full flex-col gap-0.5 rounded-md border-l-2 px-2 py-1 text-left transition-opacity hover:opacity-80',
                mine ? 'border-primary-foreground/70 bg-black/10' : 'border-primary bg-background/70',
              )}
            >
              <span className="text-[11px] font-semibold">{quote.senderName ?? 'Earlier message'}</span>
              <span className="line-clamp-2 text-xs opacity-80">{quote.content}</span>
            </button>
          )}
          <Content text={msg.content} query={query} />
        </div>

        {/* Metadata stays visible on the last bubble of a run rather than appearing
            on hover — a receipt you have to go looking for is not a receipt. */}
        {(last || msg.failed) && (
          <div className="mt-1 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
            {msg.failed ? (
              <button
                type="button"
                onClick={() => onRetry(msg)}
                className="inline-flex items-center gap-1 font-medium text-destructive transition-colors hover:underline"
              >
                <RotateCcw className="size-3" aria-hidden /> Not sent · Retry
              </button>
            ) : (
              <>
                <span className="tabular-nums">{msg.pending ? 'Sending…' : clockTime(msg.createdAt)}</span>
                {mine && !msg.pending && (
                  msg.readAt
                    ? <CheckCheck className="size-3.5 text-primary" aria-label="Read" />
                    : <Check className="size-3.5" aria-label="Sent" />
                )}
              </>
            )}
            {
              /* `before:-inset-1` grows the tap area to ~44px without inflating
                 the visual weight of the row. */
            }
            {!msg.pending && (
              <button
                type="button"
                onClick={() => onReply(msg)}
                aria-label="Reply to this message"
                className="relative inline-flex size-9 items-center justify-center rounded-lg transition-colors before:absolute before:-inset-1 before:content-[''] hover:text-foreground focus-visible:text-foreground"
              >
                <Reply className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}