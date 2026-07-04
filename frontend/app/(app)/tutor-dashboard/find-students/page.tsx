'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { getStudentCandidates } from '@/lib/api/users'
import {
  Heart, Search, MessageSquare, Calendar,
  CheckCircle2, Sparkles, X, AlertCircle, SlidersHorizontal,
} from 'lucide-react'
import { MessageModal } from '@/components/MessageModal'

const ACCENTS = ['lavender', 'sky', 'mint', 'sun', 'coral', 'tangerine'] as const

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="h-1 w-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-24 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
            <div className="h-3 w-16 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
          <div className="h-2.5 w-3/4 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        </div>
        <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="h-px w-full" style={{ background: 'var(--border)' }} />
        <div className="flex gap-2">
          <div className="h-9 flex-1 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
          <div className="h-9 flex-1 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
        </div>
      </div>
    </div>
  )
}

export default function FindStudentsPage() {
  const [students, setStudents]         = useState<any[]>([])
  const [liked, setLiked]               = useState<Set<string>>(new Set())
  const [search, setSearch]             = useState('')
  const [subject, setSubject]           = useState('All')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [messageTarget, setMessageTarget] = useState<any | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true); setError(null)
      try {
        const page = await getStudentCandidates({ page: 1, limit: 24 })
        if (alive) setStudents(page.candidates)
      } catch (err: any) {
        if (alive) setError(err?.response?.data?.message ?? 'Could not load students.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const subjects = useMemo(() => {
    const unique = new Set<string>()
    students.forEach(s => { if (s.requiredSubject) unique.add(s.requiredSubject) })
    return ['All', ...Array.from(unique).sort()]
  }, [students])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter(student => {
      const matchSearch  = !q || `${student.firstName} ${student.lastName}`.toLowerCase().includes(q) || (student.requiredSubject?.toLowerCase().includes(q))
      const matchSubject = subject === 'All' || student.requiredSubject === subject
      return matchSearch && matchSubject
    })
  }, [students, search, subject])

  const suggested = useMemo(() => [...filtered].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3), [filtered])

  return (
    <div className="space-y-6 py-3">
      {/* ── Header ── */}
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Find Students
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {loading ? 'Loading matched students…' : `${filtered.length} students looking for tutors like you`}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── Search + chips ── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students or subjects…"
            className="h-12 w-full rounded-2xl pl-11 pr-4 text-sm outline-none transition-all"
            style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-thin">
          {subjects.map(option => (
            <button
              key={option}
              onClick={() => setSubject(option)}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
              style={{
                background: subject === option ? 'var(--primary)' : 'var(--surface)',
                color: subject === option ? 'var(--primary-fg)' : 'var(--text-secondary)',
                border: `1px solid ${subject === option ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* ── Suggested horizontal carousel ── */}
      {!loading && suggested.length > 1 && search === '' && subject === 'All' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'var(--accent-sun-bg)' }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent-sun-fg)' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Suggested Students</h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Best matches for your expertise</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            {suggested.map((student, idx) => {
              const color = ACCENTS[idx % ACCENTS.length]
              const matchPct = Math.round((student.score ?? 0) * 100)
              return (
                <div
                  key={student.studentId ?? student.userId}
                  className="flex-shrink-0 relative rounded-2xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', width: 200 }}
                >
                  {idx === 0 && (
                    <div className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', color: '#78350F' }}>
                      <Sparkles className="h-3 w-3" /> Top
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{student.firstName} {student.lastName}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{student.requiredSubject ?? 'Any subject'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge color={color as any} size="sm">{student.requiredSubject ?? '—'}</Badge>
                    <span className="text-xs font-bold" style={{ color: 'var(--accent-mint-fg)' }}>{matchPct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          className="flex flex-col items-center gap-4 rounded-2xl py-20 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--surface-2)' }}>
            <Search className="h-7 w-7" style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No students match your filters</p>
          <button onClick={() => { setSearch(''); setSubject('All') }} className="text-sm font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>
            Clear all
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student, index) => {
            const color     = ACCENTS[index % ACCENTS.length]
            const id        = student.studentId ?? student.userId
            const isLiked   = liked.has(id)
            const isEligible = student.isEligible !== false
            const matchPct  = Math.round((student.score ?? 0) * 100)

            return (
              <motion.div
                key={id}
                className="relative rounded-2xl flex flex-col overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: (index % 6) * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
              >
                {/* Top accent strip */}
                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, var(--accent-${color}-fg), transparent)` }} />

                <div className="flex flex-col flex-1 p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                    >
                      {student.firstName?.[0]}{student.lastName?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {student.gradeLevel ? `Grade ${student.gradeLevel}` : 'Student'} · {student.region ?? 'Remote'}
                      </p>
                    </div>
                    <button
                      onClick={() => setLiked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })}
                      className="flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0 transition-all hover:scale-110"
                      style={{ color: isLiked ? 'var(--accent-coral-fg)' : 'var(--text-muted)', background: isLiked ? 'var(--accent-coral-bg)' : 'var(--surface-2)' }}
                    >
                      <Heart className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Bio */}
                  <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {student.bio ?? 'Looking for a great tutor.'}
                  </p>

                  {/* Subject */}
                  <div className="flex flex-wrap gap-1.5">
                    {student.requiredSubject && <Badge color={color as any} size="sm">{student.requiredSubject}</Badge>}
                  </div>

                  {!isEligible && (
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{student.reason}</span>
                    </div>
                  )}

                  {/* Match + budget */}
                  <div className="flex items-center justify-between py-3 mt-auto" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-mint-fg)' }}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {matchPct}% match
                    </span>
                    {student.budget && (
                      <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        ₦{Number(student.budget).toLocaleString()}
                        <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>/mo</span>
                      </span>
                    )}
                  </div>

                  {/* CTAs */}
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setMessageTarget(student)} disabled={!isEligible}>
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </Button>
                    <Button size="sm" className="flex-1" disabled={!isEligible}>
                      <Calendar className="w-3.5 h-3.5" />
                      Reach Out
                    </Button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {messageTarget && (
        <MessageModal
          isOpen
          onClose={() => setMessageTarget(null)}
          otherUserId={messageTarget.studentId ?? messageTarget.userId}
          otherUserName={`${messageTarget.firstName} ${messageTarget.lastName}`}
        />
      )}
    </div>
  )
}
