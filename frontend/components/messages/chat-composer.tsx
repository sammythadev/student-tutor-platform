'use client'

import { useCallback, useEffect, useRef } from 'react'
import { Reply, Send, X } from 'lucide-react'
import StarBorder from '@/components/reactbits/StarBorder'
import type { ThreadMessage } from '@/components/messages/chat-types'

/**
 * Composer. Grows with the text up to five lines, then scrolls — a textarea that
 * grows without limit pushes the conversation off screen. Enter sends, Shift+Enter
 * breaks the line, which is what anyone who has used a chat app will try first.
 *
 * The value is controlled by the page so switching conversations cannot lose a
 * half-typed message, and the input is 16px on phones so iOS does not zoom the
 * viewport when it takes focus.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  peerName,
  replyingTo,
  onCancelReply,
}: {
  value: string
  onChange: (text: string) => void
  onSend: (text: string) => void
  peerName: string
  replyingTo: ThreadMessage | null
  onCancelReply: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [])

  useEffect(resize, [value, resize])

  /* Choosing a reply target should put the cursor where the typing happens. */
  useEffect(() => {
    if (replyingTo) ref.current?.focus()
  }, [replyingTo])

  const submit = () => {
    const text = value.trim()
    if (!text) return
    onSend(text)
    ref.current?.focus()
  }

  return (
    <form
      className="flex shrink-0 flex-col border-t bg-card pb-[env(safe-area-inset-bottom)]"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {replyingTo && (
        <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
          <Reply className="size-3.5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-foreground">
              {replyingTo.senderName ?? 'Earlier message'}
            </p>
            <p className="truncate text-xs text-muted-foreground">{replyingTo.content}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors before:absolute before:-inset-1 before:content-[''] hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 p-2.5 md:p-4">
        <StarBorder
          as="div"
          className="min-w-0 flex-1"
          radius={16}
          thickness={1}
          speed="7s"
          color="var(--primary)"
          backgroundColor="var(--background)"
          textColor="var(--foreground)"
          borderColor="var(--input)"
          innerClassName="px-1"
        >
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={replyingTo ? `Reply to ${peerName}` : `Message ${peerName}`}
            aria-label={replyingTo ? `Reply to ${peerName}` : `Message ${peerName}`}
            className="block max-h-[132px] w-full resize-none bg-transparent px-3 py-2.5 text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
          />
        </StarBorder>
        <button
          type="submit"
          disabled={!value.trim()}
          aria-label="Send message"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>
    </form>
  )
}