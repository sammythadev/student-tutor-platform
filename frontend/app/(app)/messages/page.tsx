'use client'

/**
 * Messaging — a conversation list and a thread, mobile-first.
 *
 * On phones the two are separate screens that each fill the viewport: the list
 * fills it, picking a conversation replaces it with the thread, and the back arrow
 * returns. From `md` up they sit side by side.
 *
 * The shell hands this route the whole viewport (no page padding, and the app
 * header is hidden on small screens so the thread gets the full height), which
 * means both panes own their own scrolling and the composer never leaves the
 * screen. Nothing here subtracts header heights from `100dvh` — the layout is
 * driven by flex so a mobile browser's collapsing toolbar cannot break it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import {
  getConversations,
  getConversation,
  sendMessage,
  markRead,
  type ConversationItem,
} from '@/lib/api/messages'
import {
  ArrowDown, ArrowLeft, ChevronDown, ChevronUp, MessageSquare, Search, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CustomSidebarTrigger } from '@/components/custom-sidebar-trigger'
import { ChatAvatar } from '@/components/messages/chat-avatar'
import { ChatComposer } from '@/components/messages/chat-composer'
import { DayDivider, MessageBubble } from '@/components/messages/message-bubble'
import {
  AT_BOTTOM_SLACK,
  GROUP_WINDOW_MS,
  listStamp,
  matchesQuery,
  sameDay,
  type ThreadMessage,
} from '@/components/messages/chat-types'

export default function MessagesPage() {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [listNonce, setListNonce] = useState(0)
  const [peer, setPeer] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)
  const [threadNonce, setThreadNonce] = useState(0)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [threadQuery, setThreadQuery] = useState('')
  const [threadSearchOpen, setThreadSearchOpen] = useState(false)
  const [matchCursor, setMatchCursor] = useState(0)
  const [replyingTo, setReplyingTo] = useState<ThreadMessage | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [atBottom, setAtBottom] = useState(true)

  const scrollerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  /** Conversations already marked read, so polling cannot re-PATCH every cycle. */
  const markedRef = useRef<Set<string>>(new Set())
  const scrolledQueryRef = useRef('')

  const peerId = peer?.userId

  /* Read the open peer from the live list so the header and unread badge follow
     polling instead of a second, staler copy of the same conversation. */
  const activePeer = useMemo(
    () => (peerId ? conversations.find((c) => c.userId === peerId) ?? peer : null),
    [conversations, peerId, peer],
  )

  const draft = peerId ? drafts[peerId] ?? '' : ''
  const setDraft = useCallback(
    (text: string) => {
      if (!peerId) return
      setDrafts((prev) => ({ ...prev, [peerId]: text }))
    },
    [peerId],
  )

  /* Thread state is reset where a conversation is opened or closed, not inside
     the polling effect: an effect that only synchronises with the server should
     never queue renders of its own. */
  const selectPeer = useCallback((convo: ConversationItem) => {
    setPeer(convo)
    setMessages([])
    setReplyingTo(null)
    setThreadError(null)
    setLoadingThread(true)
    setAtBottom(true)
    setThreadSearchOpen(false)
    setThreadQuery('')
    setMatchCursor(0)
    scrolledQueryRef.current = ''
  }, [])

  const clearPeer = useCallback(() => {
    setPeer(null)
    setMessages([])
    setReplyingTo(null)
    setLoadingThread(false)
    setThreadSearchOpen(false)
    setThreadQuery('')
    setMatchCursor(0)
    scrolledQueryRef.current = ''
  }, [])

  const loadConversations = useCallback(() => {
    getConversations()
      .then((list) => {
        setConversations(list)
        setListError(null)
      })
      .catch(() =>
        setListError('Could not reach your conversations. Check your connection and try again.'),
      )
      .finally(() => setLoadingList(false))
  }, [])

  useEffect(() => {
    loadConversations()
    const id = setInterval(loadConversations, 15_000)
    return () => clearInterval(id)
  }, [loadConversations, listNonce])

  /* Poll the open thread. Locally pending sends are preserved across refreshes so
     a poll landing mid-flight cannot make a message the user just typed vanish.
     Opening a conversation empties the thread first, so one conversation can never
     flash another one's contents while its request is in flight. */
  useEffect(() => {
    if (!peerId) return
    let cancelled = false

    const load = () =>
      getConversation(peerId)
        .then((fresh) => {
          if (cancelled) return
          setThreadError(null)
          setMessages((prev) => [...fresh, ...prev.filter((m) => m.pending || m.failed)])
        })
        .catch(() => {
          if (!cancelled) setThreadError('Could not load this conversation.')
        })
        .finally(() => {
          if (!cancelled) setLoadingThread(false)
        })

    load()
    const id = setInterval(load, 5_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [peerId, threadNonce])

  /* Clear the unread badge once the thread is actually on screen. Keyed per
     conversation + count so a poll that re-sends an equal object does not fire
     another PATCH, while genuinely new messages still mark read. */
  useEffect(() => {
    if (!activePeer?.unreadCount) return
    const id = activePeer.userId
    const key = `${id}:${activePeer.unreadCount}`
    if (markedRef.current.has(key)) return
    markedRef.current.add(key)
    markRead(id)
      .then(() =>
        setConversations((prev) =>
          prev.map((c) => (c.userId === id ? { ...c, unreadCount: 0 } : c)),
        ),
      )
      .catch(() => markedRef.current.delete(key))
  }, [activePeer])

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

  const jumpToMessage = useCallback((id: string) => {
    const el = document.getElementById(`message-${id}`)
    if (!el) return
    setAtBottom(false)
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const deliver = useCallback(
    async (pending: ThreadMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === pending.id ? { ...m, pending: true, failed: false } : m)),
      )
      try {
        const saved = await sendMessage({
          receiverId: pending.receiverId,
          content: pending.content,
          replyToId: pending.replyToId ?? undefined,
        })
        setMessages((prev) => prev.map((m) => (m.id === pending.id ? saved : m)))
        loadConversations()
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === pending.id ? { ...m, pending: false, failed: true } : m)),
        )
      }
    },
    [loadConversations],
  )

  const handleSend = (text: string) => {
    if (!peer || !user) return
    const target = replyingTo
    const outgoing: ThreadMessage = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: user.id,
      receiverId: peer.userId,
      content: text,
      replyToId: target?.id ?? null,
      /* Quote locally so the optimistic bubble shows what it answers right away;
         the server response replaces this with the canonical quote. */
      replyTo: target
        ? {
            id: target.id,
            content: target.content,
            senderId: target.senderId,
            senderName: target.senderName ?? (target.senderId === user.id ? 'You' : peer.firstName),
          }
        : null,
      readAt: null,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setAtBottom(true)
    setMessages((prev) => [...prev, outgoing])
    setReplyingTo(null)
    setDraft('')
    deliver(outgoing)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.lastMessage}`.toLowerCase().includes(q),
    )
  }, [conversations, query])

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)

  const matches = useMemo(
    () => (threadQuery.trim() ? messages.filter((m) => matchesQuery(m.content, threadQuery)) : []),
    [messages, threadQuery],
  )

  /* Typing a new term restarts navigation at the first hit. */
  const changeThreadQuery = (text: string) => {
    setThreadQuery(text)
    setMatchCursor(0)
  }

  /* Land on the first hit as soon as a new term produces results. Keyed on the
     term rather than on `messages`, so the 5s poll cannot yank the view back.
     `atBottom` is left to the scroll handler that the scroll itself fires. */
  useEffect(() => {
    const term = threadQuery.trim()
    if (!threadSearchOpen || !term || term === scrolledQueryRef.current) return
    const first = messages.find((m) => matchesQuery(m.content, term))
    if (!first) return
    scrolledQueryRef.current = term
    document.getElementById(`message-${first.id}`)?.scrollIntoView({ block: 'center' })
  }, [threadQuery, threadSearchOpen, messages])

  const stepMatch = useCallback(
    (delta: number) => {
      if (matches.length === 0) return
      const next = (matchCursor + delta + matches.length) % matches.length
      setMatchCursor(next)
      document
        .getElementById(`message-${matches[next].id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    [matchCursor, matches],
  )

  const closeThreadSearch = () => {
    setThreadSearchOpen(false)
    setThreadQuery('')
    setMatchCursor(0)
    scrolledQueryRef.current = ''
  }

  const toggleThreadSearch = () => {
    if (threadSearchOpen) {
      closeThreadSearch()
      return
    }
    setThreadSearchOpen(true)
    setMatchCursor(0)
    scrolledQueryRef.current = ''
  }

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
    <div className="flex min-h-0 flex-1 overflow-hidden bg-card md:rounded-xl md:border">
      {/* ── Conversations ── */}
      <aside
        className={cn(
          'min-h-0 w-full flex-col border-r md:flex md:w-80 lg:w-96',
          peer ? 'hidden' : 'flex',
        )}
        aria-label="Conversations"
      >
        <div className="shrink-0 border-b px-3 py-3 md:px-4">
          <div className="flex items-center gap-2">
            {/* The app header is hidden on phones, so the list keeps the only way
                back to navigation. It would be a duplicate on desktop. */}
            <CustomSidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-semibold text-foreground">Messages</h1>
            {totalUnread > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
                {totalUnread}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search conversations"
              className="ml-auto inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            >
              <Search className="size-4" aria-hidden />
            </button>
          </div>

          {/* Full-width search on phones via the icon above; always visible from
              `md` up, where there is room for it. */}
          <div className={cn('mt-3 md:block', searchOpen ? 'block' : 'hidden')}>
            <div className="flex items-center gap-2 rounded-lg border bg-background px-2.5 transition-colors focus-within:border-ring">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                type="search"
                autoFocus={searchOpen}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="h-11 w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:h-9 md:text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false)
                  setQuery('')
                }}
                aria-label="Close search"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:hidden"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
          ) : listError && conversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm font-medium text-foreground">Conversations unavailable</p>
              <p className="max-w-[30ch] text-xs text-muted-foreground">{listError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => {
                  setLoadingList(true)
                  setListNonce((n) => n + 1)
                }}
              >
                Try again
              </Button>
            </div>
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
                      onClick={() => selectPeer(convo)}
                      aria-current={active}
                      className={cn(
                        'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        active ? 'bg-accent' : 'hover:bg-muted/60',
                      )}
                    >
                      <ChatAvatar id={convo.userId} first={convo.firstName} last={convo.lastName} />
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
        className={cn('min-h-0 min-w-0 flex-1 flex-col md:flex', peer ? 'flex' : 'hidden')}
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
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2 md:h-16 md:gap-3 md:px-5">
              <button
                type="button"
                onClick={clearPeer}
                aria-label="Back to conversations"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </button>
              <ChatAvatar id={peer.userId} first={peer.firstName} last={peer.lastName} size="sm" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-foreground">
                  {peer.firstName} {peer.lastName}
                </h2>
              </div>
              <button
                type="button"
                onClick={toggleThreadSearch}
                aria-pressed={threadSearchOpen}
                aria-label="Search in this conversation"
                className={cn(
                  'inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                  threadSearchOpen
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Search className="size-4" aria-hidden />
              </button>
            </header>

            {threadSearchOpen && (
              <div className="flex shrink-0 items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5 md:px-4">
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  autoFocus
                  value={threadQuery}
                  onChange={(e) => changeThreadQuery(e.target.value)}
                  placeholder="Search in conversation"
                  aria-label="Search in conversation"
                  className="h-10 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:h-9 md:text-sm"
                />
                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums" aria-live="polite">
                  {threadQuery.trim()
                    ? matches.length === 0
                      ? 'No results'
                      : `${Math.min(matchCursor + 1, matches.length)}/${matches.length}`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={() => stepMatch(-1)}
                  disabled={matches.length === 0}
                  aria-label="Previous match"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  <ChevronUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => stepMatch(1)}
                  disabled={matches.length === 0}
                  aria-label="Next match"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  <ChevronDown className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={closeThreadSearch}
                  aria-label="Close search"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            )}

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
                ) : threadError && messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm font-medium text-foreground">Conversation unavailable</p>
                    <p className="max-w-[30ch] text-xs text-muted-foreground">{threadError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => {
                        setLoadingThread(true)
                        setThreadNonce((n) => n + 1)
                      }}
                    >
                      Try again
                    </Button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm font-medium text-foreground">No messages yet</p>
                    <p className="max-w-[30ch] text-xs text-muted-foreground">
                      Say hello to {peer.firstName} — mention the subject and what you want to cover.
                    </p>
                  </div>
                ) : (
                  rows.map(({ msg, newDay, first, last }) => (
                    <div key={msg.id}>
                      {newDay && <DayDivider iso={msg.createdAt} />}
                      <MessageBubble
                        msg={msg}
                        mine={msg.senderId === user?.id}
                        first={first}
                        last={last}
                        query={threadSearchOpen ? threadQuery : ''}
                        onRetry={deliver}
                        onReply={setReplyingTo}
                        onJumpTo={jumpToMessage}
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

            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSend={handleSend}
              peerName={peer.firstName}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </>
        )}
      </section>
    </div>
  )
}