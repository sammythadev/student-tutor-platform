'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import {
  Heart, MessageCircle, Share2, Star, MoreHorizontal,
  BookOpen, Zap, TrendingUp, Users, Pencil, Filter,
  Bell, FlaskConical, Calculator, Globe2,
} from 'lucide-react'

/* ─── types ─── */
type AccentKey = 'lavender' | 'sky' | 'mint' | 'sun' | 'coral'

interface Post {
  id: number
  author: string
  role: string
  time: string
  accentBg: string
  accentFg: string
  content: string
  attachment?: { title: string; meta: string; icon: React.ElementType; bg: string; fg: string } | null
  books?: string[]
  isPromo?: boolean
  rating?: string
  students?: string
  likes: number
  comments: number
  tags: string[]
}

const POSTS: Post[] = [
  {
    id: 1,
    author: 'Dr. Sarah Chen',
    role: 'Mathematics Tutor',
    time: '2 hours ago',
    accentBg: 'var(--accent-lavender-bg)',
    accentFg: 'var(--accent-lavender-fg)',
    content: "I've just created a new study guide for calculus! It covers derivatives, integrals, and real-world applications. Available now — free for all enrolled students.",
    attachment: {
      title: 'Calculus Essentials — Study Guide',
      meta:  '5 chapters · 120 min read · Updated today',
      icon:  BookOpen,
      bg:    'var(--accent-lavender-bg)',
      fg:    'var(--accent-lavender-fg)',
    },
    likes: 24, comments: 5,
    tags: ['Calculus', 'Mathematics'],
  },
  {
    id: 2,
    author: 'Prof. James Wilson',
    role: 'Physics Tutor',
    time: '4 hours ago',
    accentBg: 'var(--accent-mint-bg)',
    accentFg: 'var(--accent-mint-fg)',
    content: "Incredible progress this week from the group session! Keep working through the practice problems — the exam is well within reach. You've all got this 🎯",
    attachment: null,
    likes: 18, comments: 3,
    tags: ['Physics', 'Exam Prep'],
  },
  {
    id: 3,
    author: 'Ms. Emily Brown',
    role: 'English Literature Tutor',
    time: '1 day ago',
    accentBg: 'var(--accent-sun-bg)',
    accentFg: 'var(--accent-sun-fg)',
    content: 'My recommended reading list for this month. Each of these shaped how I teach narrative analysis:',
    books: ['To Kill a Mockingbird — Harper Lee', '1984 — George Orwell', 'Jane Eyre — Charlotte Brontë'],
    attachment: null,
    likes: 32, comments: 8,
    tags: ['Literature', 'Reading'],
  },
  {
    id: 4,
    author: 'Marco Rossi',
    role: 'Recommended Tutor · New',
    time: '',
    accentBg: 'var(--accent-coral-bg)',
    accentFg: 'var(--accent-coral-fg)',
    content: 'Marco specialises in European languages with a focus on conversational fluency. Great track record with exam prep and travel vocabulary.',
    isPromo: true,
    rating: '4.9',
    students: '85+',
    attachment: null,
    likes: 0, comments: 0,
    tags: [],
  },
]

const TAG_COLORS: AccentKey[] = ['sky', 'sun', 'mint', 'lavender', 'coral']

const TRENDING = [
  { icon: Calculator,   label: 'Calculus',    count: '128 posts' },
  { icon: FlaskConical, label: 'Physics',      count: '94 posts'  },
  { icon: Globe2,       label: 'Languages',    count: '76 posts'  },
  { icon: BookOpen,     label: 'Literature',   count: '61 posts'  },
]

const ACTIVE_TUTORS = [
  { name: 'Dr. Sarah Chen',     subject: 'Mathematics', color: 'lavender' as AccentKey, online: true  },
  { name: 'Prof. James Wilson', subject: 'Physics',     color: 'sky'      as AccentKey, online: true  },
  { name: 'Ms. Emily Brown',    subject: 'English',     color: 'sun'      as AccentKey, online: false },
]

export default function FeedPage() {
  const [liked,  setLiked]  = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<'all' | 'tutors' | 'resources'>('all')

  const toggleLike = (id: number) => {
    setLiked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = POSTS.filter(p => {
    if (filter === 'tutors')    return p.isPromo
    if (filter === 'resources') return !!p.attachment || !!p.books
    return true
  })

  return (
    <div className="py-3">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Your Feed
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Updates, resources and insights from your tutors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Bell className="w-3.5 h-3.5" />
            Following
          </Button>
          <Button size="sm">
            <Pencil className="w-3.5 h-3.5" />
            Post Update
          </Button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid xl:grid-cols-[1fr_300px] gap-7 items-start">

        {/* ── LEFT: Feed ── */}
        <div className="space-y-5">

          {/* Composer bar */}
          <div
            className="rounded-2xl p-4 flex items-center gap-3 cursor-text transition-all"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-xs)',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div
              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs"
              style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
            >
              JD
            </div>
            <p className="text-sm flex-1" style={{ color: 'var(--text-muted)' }}>
              Share an update, resource, or question...
            </p>
            <Button size="sm">Post</Button>
          </div>

          {/* Filter tabs */}
          <div
            className="flex items-center gap-1 p-1.5 rounded-xl w-fit"
            style={{ background: 'var(--surface-2)' }}
          >
            {(['all', 'tutors', 'resources'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all duration-150 cursor-pointer"
                style={
                  filter === f
                    ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-xs)' }
                    : { color: 'var(--text-secondary)' }
                }
              >
                {f === 'all' ? 'All Posts' : f === 'tutors' ? 'Tutors' : 'Resources'}
              </button>
            ))}
          </div>

          {/* Posts */}
          {filtered.map(post => (
            <div
              key={post.id}
              className="rounded-2xl overflow-hidden transition-all duration-150"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xs)',
                borderLeft: `4px solid ${post.accentFg}`,
              }}
            >
              <div className="p-5">
                {/* Author row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                      style={{ background: post.accentBg, color: post.accentFg }}
                    >
                      {post.author.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {post.author}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {post.role}{post.time && ` · ${post.time}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {post.isPromo && <Badge color="coral" size="sm">Suggested</Badge>}
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body text */}
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-primary)' }}>
                  {post.content}
                </p>

                {/* Attachment */}
                {post.attachment && (
                  <div
                    className="p-4 rounded-xl mb-4 flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-90"
                    style={{
                      background: post.attachment.bg,
                      border: `1px solid ${post.attachment.fg}30`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${post.attachment.fg}25` }}
                    >
                      <post.attachment.icon className="w-4 h-4" style={{ color: post.attachment.fg }} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: post.attachment.fg }}>
                        {post.attachment.title}
                      </p>
                      <p className="text-xs mt-0.5 opacity-70" style={{ color: post.attachment.fg }}>
                        {post.attachment.meta}
                      </p>
                    </div>
                  </div>
                )}

                {/* Book list */}
                {post.books && (
                  <div className="space-y-2 mb-4">
                    {post.books.map((book, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-sun-fg)50')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >
                        <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-sun-fg)' }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {book.split(' — ')[0]}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {book.split(' — ')[1]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag, i) => (
                      <Badge key={tag} color={TAG_COLORS[i % TAG_COLORS.length]} size="sm">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Promo actions */}
                {post.isPromo && (
                  <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-current" style={{ color: 'var(--accent-sun-fg)' }} />
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {post.rating}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {post.students} students
                      </span>
                    </div>
                    <Button size="sm">View Profile</Button>
                  </div>
                )}

                {/* Engagement bar */}
                {!post.isPromo && (
                  <div className="flex items-center gap-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => toggleLike(post.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all duration-150 group"
                      style={{ color: liked.has(post.id) ? 'var(--accent-coral-fg)' : 'var(--text-muted)' }}
                    >
                      <Heart
                        className="w-4 h-4 transition-transform group-hover:scale-110"
                        fill={liked.has(post.id) ? 'currentColor' : 'none'}
                        strokeWidth={2}
                      />
                      {post.likes + (liked.has(post.id) ? 1 : 0)}
                    </button>
                    <button
                      className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-sky-fg)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <MessageCircle className="w-4 h-4" strokeWidth={2} />
                      {post.comments}
                    </button>
                    <button
                      className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ml-auto"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-mint-fg)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <Share2 className="w-4 h-4" strokeWidth={2} />
                      Share
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="space-y-5 xl:sticky xl:top-6">

          {/* Active Tutors */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} strokeWidth={2} />
              <h3 className="font-heading font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Active Tutors
              </h3>
            </div>
            <div className="space-y-3">
              {ACTIVE_TUTORS.map(t => (
                <div key={t.name} className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs"
                      style={{
                        background: `var(--accent-${t.color}-bg)`,
                        color: `var(--accent-${t.color}-fg)`,
                      }}
                    >
                      {t.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                      style={{
                        background: t.online ? 'var(--accent-mint-fg)' : 'var(--text-muted)',
                        borderColor: 'var(--surface)',
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {t.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.subject}</p>
                  </div>
                  {t.online && (
                    <Button size="sm" variant="secondary">Message</Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Trending Topics */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--primary)' }} strokeWidth={2} />
              <h3 className="font-heading font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Trending
              </h3>
            </div>
            <div className="space-y-2.5">
              {TRENDING.map((t, i) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.label}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors text-left"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span
                      className="text-xs font-bold w-5 flex-shrink-0 text-right"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {i + 1}
                    </span>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--accent-lavender-bg)' }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent-lavender-fg)' }} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.count}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, #4338CA 100%)',
              boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-white" strokeWidth={2} />
              <h3 className="font-heading font-bold text-sm text-white">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              {['Find a Tutor', 'Book Session', 'Browse Resources'].map(label => (
                <button
                  key={label}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-left cursor-pointer transition-all duration-150"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                >
                  {label} →
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
