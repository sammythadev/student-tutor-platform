'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { BookSessionModal } from '@/components/BookSessionModal'
import { MessageModal } from '@/components/MessageModal'
import { Dropdown, type DropdownOption } from '@/components/Dropdown'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import {
  CheckCircle2, Heart, Search, SlidersHorizontal, MessageSquare,
  Sparkles, X, BookOpen,
} from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { StarRating } from '@/components/StarRating'
import { Pagination } from '@/components/Pagination'
import { TutorProfileModal } from '@/components/TutorProfileModal'

const ACCENTS = ['lavender', 'sky', 'mint', 'sun', 'coral', 'tangerine'] as const
const PER_PAGE = 12

// ─── Skeleton card ───────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 w-28 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
          <div className="h-3 w-20 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-full rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="h-2.5 w-4/5 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="h-2.5 w-3/5 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="h-px w-full" style={{ background: 'var(--border)' }} />
      <div className="flex gap-2">
        <div className="h-9 flex-1 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="h-9 flex-1 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
      </div>
    </div>
  )
}

export function FindTutors() {
  const [candidates, setCandidates]   = useState<TutorCandidate[]>([])
  const [liked, setLiked]             = useState<Set<string>>(new Set())
  const [search, setSearch]           = useState('')
  const [subject, setSubject]         = useState('All')
  const [filterOpen, setFilterOpen]   = useState(false)
  const [minRating, setMinRating]     = useState(0)
  const [maxRate, setMaxRate]         = useState(0)
  const [sortBy, setSortBy]           = useState<'score' | 'rating' | 'price_asc' | 'price_desc'>('score')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [bookTarget, setBookTarget]   = useState<TutorCandidate | null>(null)
  const [messageTarget, setMessageTarget] = useState<TutorCandidate | null>(null)
  const [profileTarget, setProfileTarget] = useState<TutorCandidate | null>(null)
  const [page, setPage]               = useState(1)
  const { addToast } = useToast()

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true); setError(null)
      try {
        const result = await getTutorCandidates({ page: 1, limit: 50 })
        if (alive) { setCandidates(result.candidates) }
      } catch (err: any) {
        if (alive) setError(err?.response?.data?.message ?? 'Could not load tutors.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const subjects = useMemo(() => {
    const unique = new Set<string>()
    candidates.forEach(c => { c.subjectsTaught?.forEach((s: string) => unique.add(s)) })
    return ['All', ...Array.from(unique).sort()]
  }, [candidates])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return candidates.filter(c => {
      const cSubjects = c.subjectsTaught ?? []
      const matchSearch  = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || cSubjects.some((s: string) => s.toLowerCase().includes(q))
      const matchSubject = subject === 'All' || cSubjects.includes(subject)
      const matchRating  = !minRating || (c.avgRating ?? 0) >= minRating
      const matchRate    = !maxRate || (c.hourlyRate ?? 0) <= maxRate
      return matchSearch && matchSubject && matchRating && matchRate
    }).sort((a, b) => {
      switch (sortBy) {
        case 'rating':     return (b.avgRating ?? 0) - (a.avgRating ?? 0)
        case 'price_asc':  return (a.hourlyRate ?? 0) - (b.hourlyRate ?? 0)
        case 'price_desc': return (b.hourlyRate ?? 0) - (a.hourlyRate ?? 0)
        default:           return (b.score ?? 0) - (a.score ?? 0)
      }
    })
  }, [candidates, search, subject, minRating, maxRate, sortBy])

  const suggested = useMemo(() => [...filtered].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3), [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, subject, minRating, maxRate, sortBy])

  const hasFilters = minRating > 0 || maxRate > 0 || sortBy !== 'score'

  return (
    <div className="space-y-6 py-3">

      {/* ── Page header ── */}
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Find Tutors
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {loading ? 'Loading matched tutors…' : `${filtered.length} tutors match your profile`}
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── Search + filter bar ── */}
      <div className="space-y-3">
        {/* Search row */}
        <div className="flex items-center gap-3">
          {/* Search pill */}
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
              strokeWidth={2}
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tutors or subjects…"
              className="h-11 w-full rounded-xl pl-11 pr-4 text-sm outline-none transition-all"
              style={{
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Subject dropdown */}
          <div className="w-44 flex-shrink-0">
            <Dropdown
              value={subject}
              onChange={setSubject}
              options={subjects.map(s => ({ value: s, label: s }))}
              searchable={subjects.length > 6}
              placeholder="All Subjects"
            />
          </div>

          {/* Filters button */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex-shrink-0 flex items-center gap-2 rounded-xl px-4 h-11 text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: filterOpen || hasFilters ? 'var(--primary)' : 'var(--surface)',
              color: filterOpen || hasFilters ? 'var(--primary-fg)' : 'var(--text-secondary)',
              border: `1px solid ${filterOpen || hasFilters ? 'var(--primary)' : 'var(--border)'}`,
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters{hasFilters ? ` (${[minRating && '★', maxRate && '₦', sortBy !== 'score' && '↕'].filter(Boolean).length})` : ''}</span>
          </button>
        </div>

        {/* Filter drawer */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              className="rounded-2xl p-5 space-y-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
              animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid gap-5 sm:grid-cols-3">
                {/* Min rating */}
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Min Rating
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[0, 3, 4, 4.5].map(r => (
                      <button
                        key={r}
                        onClick={() => setMinRating(r === minRating ? 0 : r)}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all"
                        style={{
                          background: minRating === r ? 'var(--primary)' : 'var(--surface-2)',
                          color: minRating === r ? 'var(--primary-fg)' : 'var(--text-secondary)',
                        }}
                      >
                        {r === 0 ? 'Any' : `${r}+`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max rate */}
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Max Rate (₦/hr)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[0, 5000, 10000, 20000].map(r => (
                      <button
                        key={r}
                        onClick={() => setMaxRate(r === maxRate ? 0 : r)}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all"
                        style={{
                          background: maxRate === r ? 'var(--primary)' : 'var(--surface-2)',
                          color: maxRate === r ? 'var(--primary-fg)' : 'var(--text-secondary)',
                        }}
                      >
                        {r === 0 ? 'Any' : `₦${r.toLocaleString()}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Sort By
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['score', 'rating', 'price_asc', 'price_desc'] as const).map(key => {
                      const labels = { score: 'Best Match', rating: 'Top Rated', price_asc: 'Price ↑', price_desc: 'Price ↓' }
                      return (
                        <button
                          key={key}
                          onClick={() => setSortBy(key)}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all"
                          style={{
                            background: sortBy === key ? 'var(--primary)' : 'var(--surface-2)',
                            color: sortBy === key ? 'var(--primary-fg)' : 'var(--text-secondary)',
                          }}
                        >
                          {labels[key]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {hasFilters && (
                <button
                  onClick={() => { setMinRating(0); setMaxRate(0); setSortBy('score') }}
                  className="text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--accent-coral-fg)' }}
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Suggested Tutors ── */}
      {!loading && suggested.length > 1 && search === '' && subject === 'All' && (
        <motion.div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'var(--accent-sun-bg)' }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent-sun-fg)' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Suggested for You</h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Best matches based on your learning profile</p>
            </div>
          </div>

          {/* Cards row */}
          <div className="flex gap-0 divide-x" style={{ borderColor: 'var(--border)' }}>
            {suggested.map((tutor, idx) => {
              const color = ACCENTS[idx % ACCENTS.length]
              const matchPct = Math.round((tutor.score ?? 0) * 100)
              return (
                <div
                  key={tutor.userId}
                  className="flex-1 relative p-5 cursor-pointer group transition-all"
                  style={{ minWidth: 0 }}
                  onClick={() => setProfileTarget(tutor)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {idx === 0 && (
                    <div
                      className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
                      style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun-fg)', border: '1px solid rgba(245,158,11,0.3)' }}
                    >
                      <Sparkles className="h-2.5 w-2.5" /> Best match
                    </div>
                  )}

                  {/* Accent strip */}
                  <div className="h-0.5 w-8 rounded-full mb-3" style={{ background: `var(--accent-${color}-fg)` }} />

                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                    >
                      {tutor.firstName?.[0]}{tutor.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {tutor.firstName} {tutor.lastName}
                      </p>
                      <StarRating rating={tutor.avgRating} count={tutor.ratingCount} size="sm" showCount={false} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {(tutor.subjectsTaught ?? []).slice(0, 1).map((s: string) => (
                        <Badge key={s} color={color as any} size="sm">{s}</Badge>
                      ))}
                    </div>
                    <span
                      className="flex-shrink-0 text-xs font-bold tabular-nums"
                      style={{ color: 'var(--accent-mint-fg)' }}
                    >
                      {matchPct}% match
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── Tutor grid ── */}
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
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No tutors match your filters</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Try adjusting your search or subject filter</p>
          </div>
          <button
            onClick={() => { setSearch(''); setSubject('All'); setMinRating(0); setMaxRate(0) }}
            className="text-sm font-semibold cursor-pointer"
            style={{ color: 'var(--primary)' }}
          >
            Clear all
          </button>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((person, index) => {
              const color = ACCENTS[index % ACCENTS.length]
              const id = person.userId
              const isLiked = liked.has(id)
              const isEligible = person.isEligible !== false
              const personSubjects = [...new Set(person.subjectsTaught ?? [])] as string[]
              const matchPct = Math.round((person.score ?? 0) * 100)

              return (
                <motion.div
                  key={id}
                  className="relative rounded-2xl flex flex-col overflow-hidden group"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: (index % 6) * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
                >
                  {/* Top strip accent */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, var(--accent-${color}-fg), transparent)` }} />

                  <div className="flex flex-col flex-1 p-5 space-y-4">
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => setProfileTarget(person)}
                        className="relative flex-shrink-0 transition-transform hover:scale-105"
                      >
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold"
                          style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}
                        >
                          {person.firstName?.[0]}{person.lastName?.[0]}
                        </div>
                        {person.isVerified && (
                          <CheckCircle2
                            className="absolute -bottom-1 -right-1 h-4 w-4"
                            style={{ color: 'var(--accent-mint-fg)', background: 'var(--surface)', borderRadius: 999 }}
                            fill="currentColor"
                          />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => setProfileTarget(person)}
                          className="text-left"
                        >
                          <p className="truncate text-sm font-bold hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                            {person.firstName} {person.lastName}
                          </p>
                        </button>
                        <div className="mt-0.5">
                          <StarRating rating={person.avgRating} count={person.ratingCount} size="sm" />
                        </div>
                      </div>

                      {/* Like button */}
                      <button
                        onClick={() => setLiked(prev => {
                          const next = new Set(prev)
                          next.has(id) ? next.delete(id) : next.add(id)
                          return next
                        })}
                        className="flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0 transition-all hover:scale-110"
                        style={{ color: isLiked ? 'var(--accent-coral-fg)' : 'var(--text-muted)', background: isLiked ? 'var(--accent-coral-bg)' : 'var(--surface-2)' }}
                      >
                        <Heart className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    {/* Bio */}
                    <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {person.bio ?? 'No bio provided yet.'}
                    </p>

                    {/* Subject tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {personSubjects.slice(0, 3).map((s, i) => (
                        <Badge key={`${s}-${i}`} color={color as any} size="sm">{s}</Badge>
                      ))}
                      {personSubjects.length > 3 && (
                        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>+{personSubjects.length - 3}</span>
                      )}
                    </div>

                    {/* Match + rate row */}
                    <div
                      className="flex items-center justify-between py-3 mt-auto"
                      style={{ borderTop: '1px solid var(--border)' }}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-mint-fg)' }}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {matchPct}% match
                      </span>
                      <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        ₦{Number(person.hourlyRate ?? 0).toLocaleString()}
                        <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>/hr</span>
                      </span>
                    </div>

                    {/* CTA buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setMessageTarget(person)}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Message
                      </Button>
                      <div className="flex-1 relative group/btn">
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => setBookTarget(person)}
                          disabled={!isEligible}
                        >
                          Book Session
                        </Button>
                        {!isEligible && (
                          <div
                            className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-semibold opacity-0 group-hover/btn:opacity-100 transition-opacity"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)', zIndex: 10 }}
                          >
                            {person.reason || 'Tutor is currently full'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <Pagination page={safePage} total={filtered.length} limit={PER_PAGE} onPageChange={setPage} />
        </>
      )}

      {/* ── Modals ── */}
      {bookTarget && (
        <BookSessionModal
          isOpen
          onClose={() => setBookTarget(null)}
          onSuccess={() => { addToast(`Session request sent to ${bookTarget.firstName}!`, 'success'); setBookTarget(null) }}
          onError={msg => addToast(msg, 'error')}
          tutorId={bookTarget.userId}
          tutorName={`${bookTarget.firstName} ${bookTarget.lastName}`}
          subjects={bookTarget.subjectsTaught}
        />
      )}
      {messageTarget && (
        <MessageModal
          isOpen
          onClose={() => setMessageTarget(null)}
          otherUserId={messageTarget.userId}
          otherUserName={`${messageTarget.firstName} ${messageTarget.lastName}`}
          otherUserVerified={messageTarget.isVerified}
        />
      )}
      {profileTarget && (
        <TutorProfileModal
          tutor={profileTarget}
          onClose={() => setProfileTarget(null)}
          onBook={t => { setProfileTarget(null); setBookTarget(t) }}
          onMessage={t => { setProfileTarget(null); setMessageTarget(t) }}
        />
      )}
    </div>
  )
}
