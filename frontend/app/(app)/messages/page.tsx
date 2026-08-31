'use client'

/**
 * Messaging — a conversation list and a thread, mobile-first.
 *
 * On phones the two are separate screens: the list fills the viewport, picking a
 * conversation replaces it with the thread, and the back arrow returns. From `md`
 * up they sit side by side. Everything below the header scrolls internally so the
 * composer never leaves the screen and the page itself never scrolls.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import {
  getConversations,
  getConversation,
  sendMessage,
  markRead,
  type ConversationItem,
  type MessageItem,
} from '@/lib/api/messages'
import {
  ArrowLeft, ArrowDown, Check, CheckCheck, MessageSquare, RotateCcw, Search, Send, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import StarBorder from '@/components/reactbits/StarBorder'

/** A sent message that has not landed yet, or failed on the way. */
type ThreadMessage = MessageItem & { pending?: boolean; failed?: boolean }

/* Avatar tints. Deterministic per user, so the same person keeps the same colour
   across the list and the thread — recognition, not decoration. */
const TINTS = [
  'bg-blue-500/12 text-blue-600 dark:text-blue-400',
  'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  'bg-rose-500/12 text-rose-600 dark:text-rose-400',
  'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400',
] as const

function tintFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return TINTS[Math.abs(hash) % TINTS.length]
}

/** Messages closer than this to the previous one join the same visual run. */
const GROUP_WINDOW_MS = 5 * 60 * 1000
/** How far off the bottom counts as "reading history" rather than "at the end". */
const AT_BOTTOM_SLACK = 120

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return 'Today'
  if (sameDay(d, new Date(now.getTime() - 86_400_000))) return 'Yesterday'
  const withinWeek = now.getTime() - d.getTime() < 6 * 86_400_000
  if (withinWeek) return d.toLocaleDateString([], { weekday: 'long' })
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** List timestamps: time today, weekday this week, date beyond that. */
function listStamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return clockTime(iso)
  if (sameDay(d, new Date(now.getTime() - 86_400_000))) return 'Yesterday'
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function Avatar({
  id, first, last, size = 'md', online,
}: {
  id: string
  first: string
  last: string
  size?: 'sm' | 'md'
  online?: boolean
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        aria-hidden
        className={cn(
          'inline-flex items-center justify-center rounded-full font-semibold',
          size === 'sm' ? 'size-9 text-xs' : 'size-11 text-sm',
          tintFor(id),
        )}
      >
        {(first[0] ?? '?')}{(last[0] ?? '')}
      </span>
      {online && (
        <span
          className="absolute right-0 bottom-0 size-3 rounded-full bg-emerald-500 ring-2 ring-card"
          aria-label="Active now"
        />
      )}
    </span>
  )
}

/** Sticky so you always know which day you are reading while scrolling back. */
function DayDivider({ iso }: { iso: string }) {
  return (
    <div className="sticky top-0 z-10 flex justify-center py-2">
      <span className="rounded-full border bg-card/85 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
        {dayLabel(iso)}
      </span>
    </div>
  )
}

/**
 * One bubble in a run. `first`/`last` describe its position within the run: only
 * the last bubble of a run gets the pointed corner and carries the timestamp and
 * receipt, which is what keeps a long exchange from looking like a list of cards.
 */
function Bubble({
  msg, mine, first, last, onRetry,
}: {
  msg: ThreadMessage
  mine: boolean
  first: boolean
  last: boolean
  onRetry: (msg: ThreadMessage) => void
}) {
  return (
    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start', first ? 'mt-3' : 'mt-0.5')}>
      <div
        className={cn(
          'max-w-[85%] px-3.5 py-2 text-sm whitespace-pre-wrap break-words sm:max-w-[72%]',
          'rounded-2xl',
          mine
            ? cn('bg-primary text-primary-foreground', last && 'rounded-br-md')
            : cn('bg-muted text-foreground', last && 'rounded-bl-md'),
          msg.pending && 'opacity-60',
          msg.failed && 'ring-1 ring-destructive/60',
        )}
      >
        {msg.content}
      </div>

      {/* Metadata stays visible on the last bubble of a run rather than appearing
          on hover — a receipt you have to go looking for is not a receipt. */}
      {(last || msg.failed) && (
        <div className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
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
        </div>
      )}
    </div>
  )
}

/**
 * Composer. Grows with the text up to five lines, then scrolls — a textarea that
 * grows without limit pushes the conversation off screen. Enter sends, Shift+Enter
 * breaks the line, which is what anyone who has used a chat app will try first.
 */
function Composer({ onSend, peerName }: { onSend: (text: string) => void; peerName: string }) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [])

  useEffect(resize, [text, resize])

  const submit = () => {
    const value = text.trim()
    if (!value) return
    onSend(value)
    setText('')
    ref.current?.focus()
  }

  return (
    <form
      className="flex items-end gap-2 border-t bg-card p-3 md:p-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={`Message ${peerName}`}
          aria-label={`Message ${peerName}`}
          className="block max-h-[132px] w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
        />
      </StarBorder>
      <button
        type="submit"
        disabled={!text.trim()}
        aria-label="Send message"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
      >
        <Send className="size-4" aria-hidden />
      </button>
    </form>
  )
}

export default function MessagesPage() {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [peer, setPeer] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [query, setQuery] = useState('')
  const [atBottom, setAtBottom] = useState(true)

  const scrollerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(
    () =>
      getConversations()
        .then(setConversations)
        .catch(() => undefined)
        .finally(() => setLoadingList(false)),
    [],
  )

  useEffect(() => {
    loadConversations()
    const id = setInterval(loadConversations, 15_000)
    return () => clearInterval(id)
  }, [loadConversations])

  const peerId = peer?.userId

  /* Poll the open thread. Locally pending sends are preserved across refreshes so
     a poll landing mid-flight cannot make a message the user just typed vanish. */
  useEffect(() => {
    if (!peerId) {
      setMessages([])
      return
    }
    let cancelled = false
    setLoadingThread(true)

    const load = () =>
      getConversation(peerId)
        .then((fresh) => {
          if (cancelled) return
          setMessages((prev) => [...fresh, ...prev.filter((m) => m.pending || m.failed)])
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setLoadingThread(false)
        })

    load()
    const id = setInterval(load, 5_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [peerId])

  /* Clear the unread badge once the thread is actually on screen. */
  useEffect(() => {
    if (!peer?.unreadCount) return
    const id = peer.userId
    markRead(id)
      .then(() => setConversations((prev) => prev.map((c) => (c.userId === id ? { ...c, unreadCount: 0 } : c))))
      .catch(() => undefined)
  }, [peer])

  /* Follow new messages only while the reader is already at the end; yanking the
     view down while someone reads history is the classic chat-app annoyance. */
  useEffect(() => {
    if (!atBottom) return
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, atBottom])

  const onScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < AT_BOTTOM_SLACK)
  }

  const jumpToEnd = () => {
    setAtBottom(true)
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  const deliver = useCallback(
    async (draft: ThreadMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === draft.id ? { ...m, pending: true, failed: false } : m)),
      )
      try {
        const saved = await sendMessage({ receiverId: draft.receiverId, content: draft.content })
        setMessages((prev) => prev.map((m) => (m.id === draft.id ? saved : m)))
        loadConversations()
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === draft.id ? { ...m, pending: false, failed: true } : m)),
        )
      }
    },
    [loadConversations],
  )

  const handleSend = (text: string) => {
    if (!peer || !user) return
    const draft: ThreadMessage = {
      id: `local-${Date.now()}`,
      senderId: user.id,
      receiverId: peer.userId,
      content: text,
      readAt: null,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setAtBottom(true)
    setMessages((prev) => [...prev, draft])
    deliver(draft)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.lastMessage}`.toLowerCase().includes(q),
    )
  }, [conversations, query])

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)

  /* Precompute run boundaries once, so the bubbles stay dumb. */
  const rows = useMemo(
    () =>
      messages.map((msg, i) => {
        const prev = messages[i - 1]
        const next = messages[i + 1]
        const sameSenderAsPrev = prev?.senderId === msg.senderId
        const sameSenderAsNext = next?.senderId === msg.senderId
        const newDay = !prev || !sameDay(new Date(prev.createdAt), new Date(msg.createdAt))
        const near = (a?: ThreadMessage, b?: ThreadMessage) =>
          !!a && !!b &&
          Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < GROUP_WINDOW_MS
        return {
          msg,
          newDay,
          first: newDay || !sameSenderAsPrev || !near(prev, msg),
          last: !sameSenderAsNext || !near(msg, next),
        }
      }),
    [messages],
  )

  return (
    // Fixed to the viewport minus the app header and the shell's own padding, so
    // only the list and the thread scroll — never the page.
    <div className="flex h-[calc(100dvh-5.5rem)] overflow-hidden rounded-xl border bg-card md:h-[calc(100dvh-6.5rem)]">
      {/* ── Conversations ── */}
      <aside
        className={cn(
          'w-full flex-col border-r md:flex md:w-80 lg:w-96',
          peer ? 'hidden' : 'flex',
        )}
        aria-label="Conversations"
      >
        <div className="shrink-0 border-b px-4 py-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold text-foreground">Messages</h1>
            {totalUnread > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border bg-background px-2.5 transition-colors focus-within:border-ring">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loadingList && conversations.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                <div className="size-11 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                <MessageSquare className="size-6 text-muted-foreground" aria-hidden />
              </span>
              <p className="text-sm font-medium text-foreground">
                {query ? 'No matches' : 'No conversations yet'}
              </p>
              <p className="max-w-[22ch] text-xs text-muted-foreground">
                {query
                  ? 'Try a different name or word.'
                  : 'Book a tutor and your conversation with them starts here.'}
              </p>
            </div>
          ) : (
            <ul>
              {filtered.map((convo) => {
                const active = peer?.userId === convo.userId
                const unread = convo.unreadCount ?? 0
                return (
                  <li key={convo.userId}>
                    <button
                      type="button"
                      onClick={() => setPeer(convo)}
                      aria-current={active}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        active ? 'bg-accent' : 'hover:bg-muted/60',
                      )}
                    >
                      <Avatar id={convo.userId} first={convo.firstName} last={convo.lastName} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span
                            className={cn(
                              'truncate text-sm text-foreground',
                              unread ? 'font-semibold' : 'font-medium',
                            )}
                          >
                            {convo.firstName} {convo.lastName}
                          </span>
                          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
                            {listStamp(convo.lastMessageAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span
                            className={cn(
                              'truncate text-xs',
                              unread ? 'font-medium text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {convo.lastMessage}
                          </span>
                          {unread > 0 && (
                            <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Thread ── */}
      <section
        className={cn('min-w-0 flex-1 flex-col md:flex', peer ? 'flex' : 'hidden')}
        aria-label="Conversation"
      >
        {!peer ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <MessageSquare className="size-7 text-muted-foreground" aria-hidden />
            </span>
            <p className="text-sm font-medium text-foreground">Pick a conversation</p>
            <p className="max-w-[30ch] text-sm text-muted-foreground">
              Your messages with tutors and students appear here.
            </p>
          </div>
        ) : (
          <>
            <header className="flex h-16 shrink-0 items-center gap-3 border-b px-3 md:px-5">
              <button
                type="button"
                onClick={() => setPeer(null)}
                aria-label="Back to conversations"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </button>
              <Avatar id={peer.userId} first={peer.firstName} last={peer.lastName} size="sm" online />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-foreground">
                  {peer.firstName} {peer.lastName}
                </h2>
                <p className="text-[11px] text-muted-foreground">Active now</p>
              </div>
            </header>

            <div className="relative min-h-0 flex-1">
              <div
                ref={scrollerRef}
                onScroll={onScroll}
                className="h-full overflow-y-auto overscroll-contain px-3 pb-4 md:px-5"
              >
                {loadingThread && messages.length === 0 ? (
                  <div className="space-y-3 py-4">
                    {[72, 56, 84, 48].map((w, i) => (
                      <div
                        key={i}
                        className={cn('flex', i % 2 ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className="h-9 animate-pulse rounded-2xl bg-muted"
                          style={{ width: `${w}%`, maxWidth: '18rem' }}
                        />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm font-medium text-foreground">No messages yet</p>
                    <p className="max-w-[28ch] text-xs text-muted-foreground">
                      Say hello to {peer.firstName} — mention the subject and what you want to cover.
                    </p>
                  </div>
                ) : (
                  rows.map(({ msg, newDay, first, last }) => (
                    <div key={msg.id}>
                      {newDay && <DayDivider iso={msg.createdAt} />}
                      <Bubble
                        msg={msg}
                        mine={msg.senderId === user?.id}
                        first={first}
                        last={last}
                        onRetry={deliver}
                      />
                    </div>
                  ))
                )}
                <div ref={endRef} className="h-px" />
              </div>

              {/* Only offered when it is actually useful — otherwise it is chrome. */}
              {!atBottom && messages.length > 0 && (
                <button
                  type="button"
                  onClick={jumpToEnd}
                  aria-label="Jump to latest message"
                  className="absolute right-4 bottom-4 inline-flex size-10 items-center justify-center rounded-full border bg-card text-foreground shadow-md transition-colors hover:bg-muted"
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
              )}
            </div>

            <Composer onSend={handleSend} peerName={peer.firstName} />
          </>
        )}
      </section>
    </div>
  )
}
