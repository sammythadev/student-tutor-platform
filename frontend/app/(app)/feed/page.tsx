'use client'

/**
 * Feed — a single column of posts with a companion rail.
 *
 * Stripped of the dashboard hero and the decorative "quick actions" panel: a feed
 * is a reading surface, so the page gives it width and keeps everything else
 * either real or absent. Every control here does something — the composer's tags
 * are parsed from what you type, share copies a link, and the rail links to
 * routes that exist.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NextLink from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import {
  createPost, getFeed, toggleLike,
  type ActiveTutor, type FeedResponse, type PostItem, type TrendingTopic,
} from '@/lib/api/feed'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import { accentFor, IDENTITY_BG, initials, stagger } from '@/lib/ui'
import {
  AlertTriangle, BookOpen, Calendar, Check, ExternalLink, Heart, Link2, Loader2,
  MessageCircle, MessageSquare, RotateCcw, Search, Send, Sparkles, Star,
  TrendingUp, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import StarBorder from '@/components/reactbits/StarBorder'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'tutors', label: 'Tutors' },
  { id: 'resources', label: 'Resources' },
] as const

type Filter = (typeof FILTERS)[number]['id']

const POST_LIMIT = 20
const MAX_LENGTH = 1000

/** Tags come out of the text itself, so the chips always match what you wrote. */
const TAG_PATTERN = /#([\p{L}\p{N}_-]{2,24})/gu

function parseTags(text: string): string[] {
  return [...new Set([...text.matchAll(TAG_PATTERN)].map((m) => m[1].toLowerCase()))].slice(0, 6)
}

/** Coarse near the present, calendar date once "days ago" stops being useful. */
function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const nameInitials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'

/**
 * Composer. Collapsed to a single line until focused, so the feed starts with
 * posts rather than with a form. Tags are read out of the text as you type;
 * there is no separate tag field to keep in sync.
 */
function Composer({
  authorId, authorInitials, posting, onPost,
}: {
  authorId: string
  authorInitials: string
  posting: boolean
  onPost: (content: string, tags: string[]) => Promise<boolean>
}) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  const tags = useMemo(() => parseTags(draft), [draft])
  const over = draft.length > MAX_LENGTH
  const canPost = draft.trim().length > 0 && !over && !posting

  useEffect(() => {
    const el = ref.current
    if (!el || !open) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [draft, open])

  const submit = async () => {
    if (!canPost) return
    const sent = await onPost(draft.trim(), tags)
    if (sent) {
      setDraft('')
      setOpen(false)
    }
  }

  return (
    <StarBorder
      as="div"
      className="block w-full"
      radius={12}
      thickness={1}
      speed="7s"
      color="var(--primary)"
      backgroundColor="var(--card)"
      textColor="var(--card-foreground)"
      borderColor="var(--border)"
      innerClassName="p-3 sm:p-4"
    >
      <div className="flex gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
            IDENTITY_BG[accentFor(authorId)],
          )}
        >
          {authorInitials}
        </span>

        <div className="min-w-0 flex-1">
          <textarea
            ref={ref}
            value={draft}
            rows={open ? 3 : 1}
            onFocus={() => setOpen(true)}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="Share an update, a resource, or a question — use #tags"
            aria-label="Write a post"
            className="max-h-[220px] w-full resize-none bg-transparent text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />

          {open && (
            <>
              {tags.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      #{tag}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <p className="text-[11px] text-muted-foreground">
                  <kbd className="rounded border px-1 font-sans">Ctrl</kbd>
                  {' + '}
                  <kbd className="rounded border px-1 font-sans">Enter</kbd> to post
                </p>
                <div className="flex items-center gap-3">
                  {/* Only shown once it matters, so it is a warning and not a gauge. */}
                  {draft.length > MAX_LENGTH - 120 && (
                    <span
                      className={cn(
                        'text-[11px] tabular-nums',
                        over ? 'font-semibold text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {MAX_LENGTH - draft.length}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canPost}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                  >
                    {posting ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Send className="size-3.5" aria-hidden />
                    )}
                    Post
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </StarBorder>
  )
}

/** Share copies a deep link and says so — no toast system needed for one word. */
function ShareButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const url = `${window.location.origin}/feed?post=${postId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked (insecure origin, denied permission). Nothing to say.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? (
        <>
          <Check className="size-4" aria-hidden /> Link copied
        </>
      ) : (
        <>
          <Link2 className="size-4" aria-hidden /> Copy link
        </>
      )}
    </button>
  )
}

function PostCard({ post, onLike }: { post: PostItem; onLike: (post: PostItem) => void }) {
  return (
    <article className="rounded-xl border bg-card p-4 transition-colors hover:border-foreground/15 sm:p-5">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
            IDENTITY_BG[accentFor(post.authorId)],
          )}
        >
          {nameInitials(post.authorName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{post.authorName}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <span className="capitalize">{post.authorRole}</span> · {timeAgo(post.createdAt)}
          </p>
        </div>
        {post.isPromo && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="size-3" aria-hidden /> Suggested
          </span>
        )}
      </header>

      {/* Preserved line breaks: people write posts with paragraphs. */}
      <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
        {post.content}
      </p>

      {(post.attachments ?? []).map((attachment, i) => {
        const inner = (
          <>
            <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {attachment.title}
              </span>
              {attachment.meta && (
                <span className="block truncate text-xs text-muted-foreground">{attachment.meta}</span>
              )}
            </span>
            {attachment.url && (
              <ExternalLink className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </>
        )
        const shell = 'mt-3 flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5'
        return attachment.url ? (
          <a
            key={`${attachment.title}-${i}`}
            href={attachment.url}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(shell, 'transition-colors hover:bg-muted')}
          >
            {inner}
          </a>
        ) : (
          <div key={`${attachment.title}-${i}`} className={shell}>
            {inner}
          </div>
        )
      })}

      {post.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              #{tag}
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-4 flex items-center gap-5 border-t pt-3">
        <button
          type="button"
          onClick={() => onLike(post)}
          aria-pressed={post.likedByMe}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
            post.likedByMe ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Heart className="size-4" fill={post.likedByMe ? 'currentColor' : 'none'} aria-hidden />
          <span className="tabular-nums">{post.likesCount}</span>
          <span className="sr-only">likes</span>
        </button>
        {/* Plain text, not a button: there is no comment view to open yet. */}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MessageCircle className="size-4" aria-hidden />
          <span className="tabular-nums">{post.commentsCount}</span>
          <span className="sr-only">comments</span>
        </span>
        <ShareButton postId={post.id} />
      </footer>
    </article>
  )
}

function RailCard({
  title, icon: Icon, children,
}: {
  title: string
  icon: typeof Users
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" aria-hidden /> {title}
      </h2>
      {children}
    </section>
  )
}

function PostSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="size-10 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/5 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

/* Real destinations only — every one of these routes exists. */
const SHORTCUTS: { label: string; href: string; icon: typeof Users }[] = [
  { label: 'Browse tutors', href: '/tutors', icon: Search },
  { label: 'Your schedule', href: '/schedules', icon: Calendar },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
]

export default function FeedPage() {
  const reduce = useReducedMotion()
  const user = useAuthStore((s) => s.user)

  const [feed, setFeed] = useState<FeedResponse | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const sentinelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (nextFilter: Filter, pageNum: number) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    try {
      const data = await getFeed({ page: pageNum, limit: POST_LIMIT, filter: nextFilter })
      setFeed((prev) =>
        pageNum === 1 || !prev ? data : { ...data, posts: [...prev.posts, ...data.posts] },
      )
      setPage(pageNum)
    } catch (err) {
      setError(apiErrorText(err))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    load(filter, 1)
  }, [filter, load])

  const posts = feed?.posts ?? []
  const total = feed?.total ?? 0
  const hasMore = posts.length > 0 && posts.length < total

  /* Paginate on approach rather than on a button press; the button below stays as
     the keyboard- and no-observer path. */
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loading || loadingMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) load(filter, page + 1)
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, filter, page, load])

  const handlePost = async (content: string, tags: string[]) => {
    setPosting(true)
    setError(null)
    try {
      const created = await createPost({ content, tags })
      setFeed((prev) => (prev ? { ...prev, posts: [created, ...prev.posts], total: prev.total + 1 } : prev))
      return true
    } catch (err) {
      setError(apiErrorText(err))
      return false
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (post: PostItem) => {
    const optimistic = (liked: boolean, count: number) =>
      setFeed((prev) =>
        prev
          ? {
              ...prev,
              posts: prev.posts.map((p) =>
                p.id === post.id ? { ...p, likedByMe: liked, likesCount: count } : p,
              ),
            }
          : prev,
      )

    optimistic(!post.likedByMe, post.likesCount + (post.likedByMe ? -1 : 1))
    try {
      const result = await toggleLike(post.id)
      optimistic(result.liked, result.likesCount)
    } catch (err) {
      optimistic(post.likedByMe, post.likesCount)
      setError(apiErrorText(err))
    }
  }

  const tutors: ActiveTutor[] = feed?.activeTutors ?? []
  const trending: TrendingTopic[] = feed?.trending ?? []

  return (
    <div className="py-1">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Feed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Updates, resources and questions from tutors and students.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => load(filter, 1)}
            className="inline-flex items-center gap-1 font-medium transition-opacity hover:opacity-80"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Retry
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Composer
            authorId={user?.id ?? ''}
            authorInitials={initials(user?.firstName, user?.lastName)}
            posting={posting}
            onPost={handlePost}
          />

          {/* Sticky so switching lens never means scrolling back up for the tabs. */}
          <div
            role="tablist"
            aria-label="Filter feed"
            className="sticky top-0 z-10 -mx-1 mt-4 flex gap-1 bg-background/90 px-1 py-2 backdrop-blur-sm"
          >
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  filter === item.id
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-1 space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                  <MessageSquare className="size-6 text-muted-foreground" aria-hidden />
                </span>
                <p className="text-sm font-medium text-foreground">
                  {filter === 'all' ? 'Nothing here yet' : `No ${filter} posts yet`}
                </p>
                <p className="max-w-[34ch] text-sm text-muted-foreground">
                  {filter === 'all'
                    ? 'Post the first update — a question about a topic works well.'
                    : 'Try the All tab, or post something yourself.'}
                </p>
              </div>
            ) : (
              posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.3, delay: stagger(index), ease: [0.16, 1, 0.3, 1] }}
                >
                  <PostCard post={post} onLike={handleLike} />
                </motion.div>
              ))
            )}

            <div ref={sentinelRef} aria-hidden className="h-px" />

            {loadingMore && <PostSkeleton />}

            {hasMore && !loadingMore && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => load(filter, page + 1)}
                  className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Load more
                </button>
              </div>
            )}

            {!loading && posts.length > 0 && !hasMore && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                You are all caught up.
              </p>
            )}
          </div>
        </div>

        {/* Rail — hidden below xl rather than stacked, so the reading column is
            never buried under three panels on a phone. */}
        <aside className="hidden space-y-4 xl:sticky xl:top-4 xl:block">
          <RailCard title="Active tutors" icon={Users}>
            {tutors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tutors online right now.</p>
            ) : (
              <ul className="space-y-3">
                {tutors.map((tutor) => (
                  <li key={tutor.id} className="flex items-center gap-3">
                    <span className="relative shrink-0">
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-9 items-center justify-center rounded-full text-xs font-semibold',
                          IDENTITY_BG[accentFor(tutor.id)],
                        )}
                      >
                        {nameInitials(tutor.name)}
                      </span>
                      <span
                        className="absolute right-0 bottom-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card"
                        aria-label="Online"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {tutor.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {tutor.subjects.join(', ') || 'Subjects not set'}
                      </span>
                    </span>
                    {tutor.avgRating && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground tabular-nums">
                        <Star className="size-3 fill-current text-amber-500" aria-hidden />
                        {Number(tutor.avgRating).toFixed(1)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </RailCard>

          <RailCard title="Trending" icon={TrendingUp}>
            {trending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough activity yet.</p>
            ) : (
              <ol className="space-y-2.5">
                {trending.map((topic, index) => (
                  <li key={topic.label} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {topic.label}
                      </span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {topic.postCount} {topic.postCount === 1 ? 'post' : 'posts'}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </RailCard>

          <RailCard title="Shortcuts" icon={Sparkles}>
            <ul className="-mx-1.5 space-y-0.5">
              {SHORTCUTS.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <NextLink
                    href={href}
                    className="flex items-center gap-2.5 rounded-md px-1.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                    {label}
                  </NextLink>
                </li>
              ))}
            </ul>
          </RailCard>
        </aside>
      </div>
    </div>
  )
}
