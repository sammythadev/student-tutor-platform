'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardHero } from '@/components/dashboard-hero'
import { createPost, getFeed, toggleLike, type FeedResponse, type PostItem } from '@/lib/api/feed'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import { accentFor, stagger, type Accent } from '@/lib/ui'
import {
  Bell, BookOpen, Heart, Image, Link, Loader2,
  MessageCircle, MoreHorizontal, SendHorizonal, Share2, Sparkles,
  TrendingUp, Users, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import StarBorder from '@/components/reactbits/StarBorder'

const IDENTITY_BG: Record<Accent, string> = {
  lavender: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  mint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sun: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  coral: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  tangerine: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
}

function timeAgo(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} day ago`
}

export default function FeedPage() {
  const reduce = useReducedMotion()
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
    } catch (err) {
      setError(apiErrorText(err))
    } finally {
      if (pageNum === 1) setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { setPage(1); load(filter, 1) }, [filter])

  const posts = feed?.posts ?? []
  const userInitials = useMemo(() => `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'ME', [user])

  async function handlePost() {
    if (!draft.trim()) return
    setPosting(true)
    setError(null)
    try {
      const created = await createPost({ content: draft.trim(), tags: [] })
      setFeed(prev => prev ? { ...prev, posts: [created, ...prev.posts], total: prev.total + 1 } : prev)
      setDraft('')
      composerRef.current?.focus()
    } catch (err) {
      setError(apiErrorText(err))
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
    } catch (err) {
      setError(apiErrorText(err))
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
    <div className="space-y-6 py-3">
      <DashboardHero
        greeting="Your Feed"
        subtitle="Updates, resources and insights from tutors and students"
      />

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400" role="alert">
          <Zap className="size-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {/* Sticky composer */}
          <div className="sticky top-0 z-10 -mx-3 rounded-lg border bg-background/95 px-3 pt-1 pb-3 backdrop-blur-sm">
            <StarBorder
              as="div"
              className="block w-full"
              radius={8}
              thickness={1}
              speed="7s"
              color="var(--primary)"
              backgroundColor="var(--card)"
              textColor="var(--card-foreground)"
              borderColor="var(--border)"
              innerClassName="p-4"
            >
              <div className="flex gap-3">
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold', IDENTITY_BG[accentFor(user?.id ?? '')])}>
                  {userInitials}
                </span>
                <div className="min-w-0 flex-1">
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost() }}
                    placeholder="Share an update, resource, or question..."
                    rows={2}
                    className="w-full resize-none bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-1">
                      <button type="button" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"><Image className="size-4" /></button>
                      <button type="button" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"><Link className="size-4" /></button>
                    </div>
                    <Button size="sm" onClick={handlePost} disabled={!draft.trim()}>
                      {posting ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizonal className="size-3.5" />} Post
                    </Button>
                  </div>
                </div>
              </div>
            </StarBorder>
          </div>

          {/* Filter tabs */}
          <div className="flex w-fit items-center gap-1 rounded-lg border bg-muted p-1">
            {(['all', 'tutors', 'resources'] as const).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  'cursor-pointer rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all duration-200',
                  filter === item ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item === 'all' ? 'All Posts' : item}
              </button>
            ))}
          </div>

          {/* Skeleton loading */}
          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border bg-background p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-1/4 rounded bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-5/6 rounded bg-muted" />
              </div>
            </div>
          ))}

          {/* Post cards */}
          {!loading && posts.map((post, index) => {
            const accent = accentFor(post.id)
            return (
              <motion.div
                key={post.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.3, delay: stagger(index), ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className="rounded-lg shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-transform group-hover:scale-105', IDENTITY_BG[accent])}>
                          {post.authorName.split(' ').map((word: string) => word[0]).join('').slice(0, 2)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{post.authorName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{post.authorRole} · {timeAgo(post.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {post.isPromo && <Badge variant="outline" className="gap-1"><Sparkles className="size-3" /> Suggested</Badge>}
                        <button type="button" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"><MoreHorizontal className="size-4" /></button>
                      </div>
                    </div>

                    <p className="mb-4 text-sm leading-relaxed text-foreground">{post.content}</p>

                    {(post.attachments ?? []).map((attachment: any, i: number) => (
                      <div key={`${attachment.title}-${i}`} className="mb-4 flex items-center gap-3 rounded-lg bg-accent/50 p-4 transition-colors hover:opacity-80">
                        <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{attachment.title}</p>
                          {attachment.meta && <p className="text-xs text-muted-foreground">{attachment.meta}</p>}
                        </div>
                      </div>
                    ))}

                    {post.tags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {post.tags.map((tag: string) => <Badge key={tag} variant="secondary">#{tag}</Badge>)}
                      </div>
                    )}

                    <div className="flex items-center gap-5 pt-4">
                      <button
                        type="button"
                        onClick={() => handleLike(post)}
                        className={cn(
                          'flex cursor-pointer items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105',
                          post.likedByMe ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                        )}
                      >
                        <Heart className="size-4" fill={post.likedByMe ? 'currentColor' : 'none'} /> {post.likesCount}
                      </button>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <MessageCircle className="size-4" /> {post.commentsCount}
                      </span>
                      <button type="button" className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-all hover:scale-105">
                        <Share2 className="size-4" /> Share
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}

          {/* Load more */}
          {!loading && posts.length > 0 && posts.length < (feed?.total ?? 0) && (
            <div className="py-4 text-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
                Load More
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 xl:sticky xl:top-6">
          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4" /> Active Tutors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(feed?.activeTutors ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No tutors online</p>
                )}
                {(feed?.activeTutors ?? []).map((tutor: any) => (
                  <div key={tutor.id} className="flex items-center gap-3">
                    <div className="relative">
                      <span className={cn('flex size-9 items-center justify-center rounded-full text-xs font-semibold', IDENTITY_BG[accentFor(tutor.id)])}>
                        {tutor.name.split(' ').map((word: string) => word[0]).join('').slice(0, 2)}
                      </span>
                      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{tutor.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{tutor.subjects.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="size-4" /> Trending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {(feed?.trending ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No trending topics</p>
                )}
                {(feed?.trending ?? []).map((topic: any, index: number) => (
                  <div key={topic.label} className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent">
                    <span className={cn(
                      'flex size-6 items-center justify-center rounded-md text-xs font-bold',
                      index < 3 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                    )}>{index + 1}</span>
                    <BookOpen className="size-4 shrink-0 text-violet-500/70" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{topic.label}</p>
                      <p className="text-xs text-muted-foreground">{topic.postCount} posts</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-primary/30 bg-primary shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-primary-foreground">
                <Zap className="size-4" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(isTutor
                ? ['View My Students', 'Manage Availability', 'Browse Resources']
                : ['Find a Tutor', 'Book Session', 'Browse Resources']
              ).map(label => (
                <button
                  key={label}
                  type="button"
                  className="w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-primary-foreground transition-all hover:bg-white/20"
                >
                  {label} →
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}