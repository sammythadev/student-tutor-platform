'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { createPost, getFeed, toggleLike, type FeedResponse, type PostItem } from '@/lib/api/feed'
import { useAuthStore } from '@/lib/store/authStore'
import {
  Bell, BookOpen, Heart, Image, Link, Loader2,
  MessageCircle, MoreHorizontal, SendHorizonal, Share2, Sparkles,
  TrendingUp, Users, Zap,
} from 'lucide-react'

const TAG_COLORS = ['sky', 'sun', 'mint', 'lavender', 'coral'] as const

function timeAgo(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} day ago`
}

export default function FeedPage() {
  const user = useAuthStore(s => s.user)
  const isTutor = user?.role === 'tutor'
  const [feed, setFeed] = useState<FeedResponse | null>(null)
  const [filter, setFilter] = useState<'all' | 'tutors' | 'resources'>('all')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  async function load(nextFilter = filter, pageNum = 1) {
    if (pageNum === 1) setLoading(true)
    setError(null)
    try {
      const data = await getFeed({ page: pageNum, limit: 20, filter: nextFilter })
      if (pageNum === 1) {
        setFeed(data)
      } else {
        setFeed(prev => prev ? { ...data, posts: [...(prev?.posts ?? []), ...data.posts] } : data)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not load feed.')
    } finally {
      if (pageNum === 1) setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { setPage(1); load(filter, 1) }, [filter])

  const posts = feed?.posts ?? []
  const initials = useMemo(() => `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'ME', [user])

  async function handlePost() {
    if (!draft.trim()) return
    setPosting(true)
    setError(null)
    try {
      const created = await createPost({ content: draft.trim(), tags: [] })
      setFeed(prev => prev ? { ...prev, posts: [created, ...prev.posts], total: prev.total + 1 } : prev)
      setDraft('')
      composerRef.current?.focus()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not create post.')
    } finally {
      setPosting(false)
    }
  }

  async function handleLike(post: PostItem) {
    setFeed(prev => prev ? {
      ...prev,
      posts: prev.posts.map(item => item.id === post.id
        ? { ...item, likedByMe: !item.likedByMe, likesCount: item.likesCount + (item.likedByMe ? -1 : 1) }
        : item),
    } : prev)
    try {
      const result = await toggleLike(post.id)
      setFeed(prev => prev ? {
        ...prev,
        posts: prev.posts.map(item => item.id === post.id ? { ...item, likedByMe: result.liked, likesCount: result.likesCount } : item),
      } : prev)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not update like.')
      load(filter, 1)
    }
  }

  async function loadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    setLoadingMore(true)
    await load(filter, nextPage)
  }

  return (
    <div className="py-3">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Your Feed</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Updates, resources and insights from tutors and students</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm"><Bell className="h-3.5 w-3.5" /> Following</Button>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
          <Zap className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="grid items-start gap-7 xl:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {/* Sticky composer */}
          <div className="sticky top-0 z-10 -mx-3 px-3 pt-1 pb-3" style={{ background: 'var(--canvas)' }}>
            <div className="rounded-2xl p-4 transition-shadow focus-within:shadow-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}>{initials}</div>
                <div className="min-w-0 flex-1">
                  <textarea
                    ref={composerRef as any}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost() }}
                    placeholder="Share an update, resource, or question..."
                    rows={2}
                    className="w-full resize-none bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }}
                  />
                  <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-1">
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-2" style={{ color: 'var(--text-muted)' }}><Image className="h-4 w-4" /></button>
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-2" style={{ color: 'var(--text-muted)' }}><Link className="h-4 w-4" /></button>
                    </div>
                    <Button size="sm" onClick={handlePost} loading={posting} disabled={!draft.trim()}>
                      <SendHorizonal className="h-3.5 w-3.5" /> Post
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex w-fit items-center gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            {(['all', 'tutors', 'resources'] as const).map(item => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className="cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-all duration-200"
                style={filter === item ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-xs)' } : { color: 'var(--text-secondary)' }}
              >
                {item === 'all' ? 'All Posts' : item}
              </button>
            ))}
          </div>

          {/* Skeleton loading */}
          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full" style={{ background: 'var(--surface-2)' }} />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 rounded" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-3 w-1/4 rounded" style={{ background: 'var(--surface-2)' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded" style={{ background: 'var(--surface-2)' }} />
                <div className="h-3 w-5/6 rounded" style={{ background: 'var(--surface-2)' }} />
              </div>
            </div>
          ))}

          {/* Post cards */}
          {!loading && posts.map((post, index) => {
            const color = TAG_COLORS[index % TAG_COLORS.length]
            return (
              <article key={post.id} className="group rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-transform group-hover:scale-105" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>
                        {post.authorName.split(' ').map((word: string) => word[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{post.authorName}</p>
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{post.authorRole} · {timeAgo(post.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.isPromo && <Badge color="coral" size="sm"><Sparkles className="h-3 w-3" /> Suggested</Badge>}
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-2" style={{ color: 'var(--text-muted)' }}><MoreHorizontal className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{post.content}</p>

                  {(post.attachments ?? []).map((attachment: any, i: number) => (
                    <div key={`${attachment.title}-${i}`} className="mb-4 flex items-center gap-3 rounded-xl p-4 transition-colors hover:opacity-80" style={{ background: `var(--accent-${color}-bg)`, border: `1px solid color-mix(in oklch, var(--accent-${color}-fg) 30%, transparent)` }}>
                      <BookOpen className="h-4 w-4 shrink-0" style={{ color: `var(--accent-${color}-fg)` }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: `var(--accent-${color}-fg)` }}>{attachment.title}</p>
                        {attachment.meta && <p className="text-xs opacity-70" style={{ color: `var(--accent-${color}-fg)` }}>{attachment.meta}</p>}
                      </div>
                    </div>
                  ))}

                  {post.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {post.tags.map((tag: string, i: number) => <Badge key={tag} color={TAG_COLORS[i % TAG_COLORS.length]} size="sm">#{tag}</Badge>)}
                    </div>
                  )}

                  <div className="flex items-center gap-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <button onClick={() => handleLike(post)} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all hover:scale-105" style={{ color: post.likedByMe ? 'var(--accent-coral-fg)' : 'var(--text-muted)' }}>
                      <Heart className="h-4 w-4" fill={post.likedByMe ? 'currentColor' : 'none'} /> {post.likesCount}
                    </button>
                    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}><MessageCircle className="h-4 w-4" /> {post.commentsCount}</span>
                    <button className="ml-auto flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all hover:scale-105" style={{ color: 'var(--text-muted)' }}>
                      <Share2 className="h-4 w-4" /> Share
                    </button>
                  </div>
                </div>
              </article>
            )
          })}

          {/* Load more */}
          {!loading && posts.length > 0 && posts.length < (feed?.total ?? 0) && (
            <div className="text-center py-4">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load More
              </Button>
            </div>
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6">
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              <h3 className="font-heading text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Active Tutors</h3>
            </div>
            <div className="space-y-3">
              {(feed?.activeTutors ?? []).length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tutors online</p>
              )}
              {(feed?.activeTutors ?? []).map((tutor: any) => (
                <div key={tutor.id} className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'var(--accent-sky-bg)', color: 'var(--accent-sky-fg)' }}>
                      {tutor.name.split(' ').map((word: string) => word[0]).join('').slice(0, 2)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2" style={{ background: 'var(--accent-mint-fg)', borderColor: 'var(--surface)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tutor.name}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{tutor.subjects.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              <h3 className="font-heading text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Trending</h3>
            </div>
            <div className="space-y-2.5">
              {(feed?.trending ?? []).length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No trending topics</p>
              )}
              {(feed?.trending ?? []).map((topic: any, index: number) => (
                <div key={topic.label} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold" style={{
                    background: index < 3 ? `var(--accent-sun-bg)` : 'transparent',
                    color: index < 3 ? 'var(--accent-sun-fg)' : 'var(--text-muted)',
                  }}>{index + 1}</span>
                  <BookOpen className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-lavender-fg)' }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{topic.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{topic.postCount} posts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'var(--primary)' }}>
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-white" />
              <h3 className="font-heading text-sm font-bold text-white">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              {(isTutor
                ? ['View My Students', 'Manage Availability', 'Browse Resources']
                : ['Find a Tutor', 'Book Session', 'Browse Resources']
              ).map(label => (
                <button key={label} className="w-full cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white transition-all hover:bg-white/20">
                  {label} →
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
