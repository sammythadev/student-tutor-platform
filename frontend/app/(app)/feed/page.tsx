'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { createPost, getFeed, toggleLike, type FeedResponse, type PostItem } from '@/lib/api/feed'
import { useAuthStore } from '@/lib/store/authStore'
import { Bell, BookOpen, Heart, MessageCircle, MoreHorizontal, Pencil, Share2, TrendingUp, Users, Zap } from 'lucide-react'

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
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(nextFilter = filter) {
    setLoading(true)
    setError(null)
    try {
      setFeed(await getFeed({ page: 1, limit: 20, filter: nextFilter }))
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not load feed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(filter) }, [filter])

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
      load()
    }
  }

  return (
    <div className="py-3">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-text-primary">Your Feed</h1>
          <p className="mt-1 text-sm text-text-secondary">Updates, resources and insights from tutors and students</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm"><Bell className="h-3.5 w-3.5" /> Following</Button>
          <Button size="sm" onClick={handlePost} loading={posting}><Pencil className="h-3.5 w-3.5" /> Post Update</Button>
        </div>
      </div>

      {error && <div className="surface-card mb-5 p-4 text-sm text-accent-coral-fg">{error}</div>}

      <div className="grid items-start gap-7 xl:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="surface-card flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-lavender-bg text-xs font-bold text-accent-lavender-fg">{initials}</div>
            <input
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) handlePost() }}
              placeholder="Share an update, resource, or question..."
              className="flex-1 bg-transparent text-sm text-text-primary outline-none"
            />
            <Button size="sm" onClick={handlePost} loading={posting}>Post</Button>
          </div>

          <div className="flex w-fit items-center gap-1 rounded-xl bg-surface-2 p-1.5">
            {(['all', 'tutors', 'resources'] as const).map(item => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className="rounded-lg px-4 py-1.5 text-sm font-semibold capitalize"
                style={filter === item ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-xs)' } : { color: 'var(--text-secondary)' }}
              >
                {item === 'all' ? 'All Posts' : item}
              </button>
            ))}
          </div>

          {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="surface-card h-56 animate-pulse" />)}

          {!loading && posts.map((post, index) => {
            const color = TAG_COLORS[index % TAG_COLORS.length]
            return (
              <article key={post.id} className="surface-card overflow-hidden" style={{ borderLeft: `4px solid var(--accent-${color}-fg)` }}>
                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>
                        {post.authorName.split(' ').map(word => word[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{post.authorName}</p>
                        <p className="mt-0.5 text-xs text-text-muted">{post.authorRole} · {timeAgo(post.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.isPromo && <Badge color="coral" size="sm">Suggested</Badge>}
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted"><MoreHorizontal className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <p className="mb-4 text-sm leading-relaxed text-text-primary">{post.content}</p>

                  {(post.attachments ?? []).map((attachment, i) => (
                    <div key={`${attachment.title}-${i}`} className="mb-4 flex items-center gap-3 rounded-xl border p-4" style={{ background: `var(--accent-${color}-bg)`, borderColor: `var(--accent-${color}-fg)30` }}>
                      <BookOpen className="h-4 w-4" style={{ color: `var(--accent-${color}-fg)` }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: `var(--accent-${color}-fg)` }}>{attachment.title}</p>
                        {attachment.meta && <p className="text-xs opacity-70" style={{ color: `var(--accent-${color}-fg)` }}>{attachment.meta}</p>}
                      </div>
                    </div>
                  ))}

                  {post.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {post.tags.map((tag, i) => <Badge key={tag} color={TAG_COLORS[i % TAG_COLORS.length]} size="sm">#{tag}</Badge>)}
                    </div>
                  )}

                  <div className="flex items-center gap-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => handleLike(post)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: post.likedByMe ? 'var(--accent-coral-fg)' : 'var(--text-muted)' }}>
                      <Heart className="h-4 w-4" fill={post.likedByMe ? 'currentColor' : 'none'} /> {post.likesCount}
                    </button>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-text-muted"><MessageCircle className="h-4 w-4" /> {post.commentsCount}</span>
                    <button className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-text-muted"><Share2 className="h-4 w-4" /> Share</button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6">
          <div className="surface-card p-5">
            <div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h3 className="font-heading text-sm font-bold text-text-primary">Active Tutors</h3></div>
            <div className="space-y-3">
              {(feed?.activeTutors ?? []).map(tutor => (
                <div key={tutor.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-sky-bg text-xs font-bold text-accent-sky-fg">{tutor.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{tutor.name}</p>
                    <p className="truncate text-xs text-text-muted">{tutor.subjects.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><h3 className="font-heading text-sm font-bold text-text-primary">Trending</h3></div>
            <div className="space-y-2.5">
              {(feed?.trending ?? []).map((topic, index) => (
                <div key={topic.label} className="flex items-center gap-3 rounded-xl p-2.5">
                  <span className="w-5 text-right text-xs font-bold text-text-muted">{index + 1}</span>
                  <BookOpen className="h-4 w-4 text-accent-lavender-fg" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{topic.label}</p>
                    <p className="text-xs text-text-muted">{topic.postCount} posts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-primary p-5 text-white shadow-sm">
            <div className="mb-3 flex items-center gap-2"><Zap className="h-4 w-4" /><h3 className="font-heading text-sm font-bold">Quick Actions</h3></div>
            <div className="space-y-2">
              {(isTutor
                ? ['View My Students', 'Manage Availability', 'Browse Resources']
                : ['Find a Tutor', 'Book Session', 'Browse Resources']
              ).map(label => (
                <button key={label} className="w-full rounded-xl bg-white/15 px-3 py-2.5 text-left text-sm font-semibold">{label} →</button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
