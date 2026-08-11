'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { BookSessionModal } from '@/components/BookSessionModal'
import { MessageModal } from '@/components/MessageModal'
import { Dropdown } from '@/components/Dropdown'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { apiErrorText } from '@/lib/api/errors'
import { accentFor, matchStrength } from '@/lib/ui'
import {
  CheckCircle2, Heart, Search, SlidersHorizontal, MessageSquare,
  Sparkles, X, BookOpen, Star, Wallet, ArrowRight,
} from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { StarRating } from '@/components/StarRating'
import { Pagination } from '@/components/Pagination'
import { TutorProfileModal } from '@/components/TutorProfileModal'
import { MatchRing } from '@/components/MatchRing'

const PER_PAGE = 12
// Backend PaginationQueryDto caps limit at 50 and exposes no filter params, so
// filtering happens client-side over whatever this fetch returned.
const PAGE_SIZE = 50
const EASE = [0.16, 1, 0.3, 1] as const

// ─── Human-readable reasons a tutor surfaced — the "why recommended" layer ───
function matchReasons(t: TutorCandidate): string[] {
  const reasons: string[] = []
  const rating = Number(t.avgRating ?? 0)
  if (rating >= 4.5) reasons.push('Top-rated by students')
  else if (rating >= 4) reasons.push('Highly rated')
  if ((t.subjectsTaught?.length ?? 0) > 0) reasons.push(`Teaches ${t.subjectsTaught![0]}`)
  if (t.isVerified) reasons.push('Verified tutor')
  const rate = Number(t.hourlyRate ?? 0)
  if (rate > 0 && rate <= 5000) reasons.push('Budget-friendly rate')
  return reasons.slice(0, 3)
}

// ─── Skeleton card ───────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-3xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 w-28 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
          <div className="h-3 w-20 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        </div>
        <div className="h-12 w-12 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-full rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="h-2.5 w-4/5 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="h-px w-full" style={{ background: 'var(--border)' }} />
      <div className="h-11 w-full rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
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
  const [total, setTotal]             = useState(0)
  const { addToast } = useToast()

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true); setError(null)
      try {
        const result = await getTutorCandidates({ page: 1, limit: PAGE_SIZE })
        if (alive) { setCandidates(result.candidates); setTotal(result.total) }
      } catch (err) {
        if (alive) setError(apiErrorText(err))
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const subjects = useMemo(() => {
    const unique = new Set<string>()
    candidates.forEach(c => { c.subjectsTaught?.forEach(s => unique.add(s)) })
    return ['All', ...Array.from(unique).sort()]
  }, [candidates])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return candidates.filter(c => {
      const cSubjects = c.subjectsTaught ?? []
      const matchSearch  = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || cSubjects.some(s => s.toLowerCase().includes(q))
      const matchSubject = subject === 'All' || cSubjects.includes(subject)
      const matchRating  = !minRating || Number(c.avgRating ?? 0) >= minRating
      const matchRate    = !maxRate || Number(c.hourlyRate ?? 0) <= maxRate
      return matchSearch && matchSubject && matchRating && matchRate
    }).sort((a, b) => {
      switch (sortBy) {
        case 'rating':     return Number(b.avgRating ?? 0) - Number(a.avgRating ?? 0)
        case 'price_asc':  return Number(a.hourlyRate ?? 0) - Number(b.hourlyRate ?? 0)
        case 'price_desc': return Number(b.hourlyRate ?? 0) - Number(a.hourlyRate ?? 0)
        default:           return (b.score ?? 0) - (a.score ?? 0)
      }
    })
  }, [candidates, search, subject, minRating, maxRate, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, subject, minRating, maxRate, sortBy])

  const hasFilters = minRating > 0 || maxRate > 0 || sortBy !== 'score'

  // The single strongest pick, spotlighted so its primary action never hides below the fold.
  const showFeatured = !loading && !hasFilters && search === '' && subject === 'All' && filtered.length > 2
  const featured = showFeatured ? filtered[0] : null
  // On page one the featured tutor is lifted out of the grid to avoid a duplicate.
  const gridItems = featured && safePage === 1
    ? paginated.filter(p => p.tutorId !== featured.tutorId)
    : paginated

  const toggleLike = (id: string) => setLiked(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  return (
    <div className="space-y-7 py-3">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-caps" style={{ color: 'var(--accent)' }}>Your matches</span>
          <h1 className="text-display text-4xl mt-1.5" style={{ color: 'var(--text-primary)' }}>
            Find your tutor
          </h1>
          <p className="mt-2 text-sm max-w-md" style={{ color: 'var(--text-secondary)' }}>
            {loading
              ? 'Ranking tutors against your learning profile…'
              : total > candidates.length
                ? `${filtered.length} of ${candidates.length} loaded match your filters · ${total} eligible in total`
                : `${filtered.length} of ${total} tutors ranked for how well they fit you`}
          </p>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)', border: '1px solid var(--accent-coral-bg)' }}>
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

      {/* ── Featured recommendation — top pick, primary action above the fold ── */}
      {featured && (() => {
        const color = accentFor(featured.tutorId)
        const matchPct = Math.round((featured.score ?? 0) * 100)
        const strength = matchStrength(featured.score ?? 0)
        const reasons = matchReasons(featured)
        const isEligible = featured.isEligible !== false
        const fSubjects = [...new Set(featured.subjectsTaught ?? [])] as string[]
        return (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative overflow-hidden rounded-3xl"
            style={{ background: 'linear-gradient(150deg, #12241D 0%, #0C1A15 55%, #0A1410 100%)', boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Ambient glows + grain to match the hero language */}
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(201,162,75,0.20), transparent 65%)', filter: 'blur(20px)' }} />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(47,122,99,0.28), transparent 65%)', filter: 'blur(20px)' }} />
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(230,200,126,0.35), transparent)' }} />

            <div className="relative z-10 flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
              {/* Identity */}
              <div className="flex items-start gap-4 md:min-w-0 md:flex-1">
                <button
                  onClick={() => setProfileTarget(featured)}
                  className="relative flex-shrink-0 cursor-pointer transition-transform hover:scale-105"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold md:h-[72px] md:w-[72px]"
                    style={{ background: 'rgba(242,237,227,0.08)', color: '#F4F0E8', border: '1px solid rgba(242,237,227,0.16)' }}>
                    {featured.firstName?.[0]}{featured.lastName?.[0]}
                  </div>
                  {featured.isVerified && (
                    <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5" style={{ color: '#C0D89A', background: '#12241D', borderRadius: 999 }} fill="currentColor" />
                  )}
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: '#E6C87E' }} />
                    <span className="label-caps" style={{ color: '#D9B868' }}>Recommended for you</span>
                  </div>
                  <button onClick={() => setProfileTarget(featured)} className="mt-1.5 block text-left cursor-pointer">
                    <h2 className="text-display text-2xl md:text-[1.75rem]" style={{ color: '#F4F0E8' }}>
                      {featured.firstName} {featured.lastName}
                    </h2>
                  </button>
                  <div className="mt-1.5 flex items-center gap-2 text-xs" style={{ color: '#AEB6AA' }}>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" fill="#E6C87E" style={{ color: '#E6C87E' }} />
                      <span className="font-semibold" style={{ color: '#F4F0E8' }}>{Number(featured.avgRating ?? 0).toFixed(1)}</span>
                      {featured.ratingCount ? <span>({featured.ratingCount})</span> : null}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      <span className="font-semibold tabular-nums" style={{ color: '#F4F0E8' }}>₦{Number(featured.hourlyRate ?? 0).toLocaleString()}</span>/hr
                    </span>
                  </div>
                  {/* Why recommended */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {reasons.map(r => (
                      <span key={r} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{ background: 'rgba(242,237,227,0.07)', color: '#EDE7DA', border: '1px solid rgba(242,237,227,0.12)' }}>
                        <CheckCircle2 className="h-3 w-3" style={{ color: '#C0D89A' }} /> {r}
                      </span>
                    ))}
                    {fSubjects.slice(0, 2).map(s => (
                      <span key={s} className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Score + actions */}
              <div className="flex flex-shrink-0 items-center gap-5 md:flex-col md:items-stretch md:gap-4">
                <div className="flex items-center gap-3 md:justify-center">
                  <MatchRing pct={matchPct} accent={strength.accent} size={64} stroke={5} onDark />
                  <div className="md:hidden">
                    <p className="text-sm font-bold" style={{ color: '#F4F0E8' }}>{strength.label}</p>
                    <p className="text-xs" style={{ color: '#AEB6AA' }}>fit for your profile</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:w-52">
                  <div className="relative group/btn">
                    <button
                      onClick={() => setBookTarget(featured)}
                      disabled={!isEligible}
                      className="rounded-pill inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-bold transition-all cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: '#F4F0E8', color: '#12241D', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                    >
                      <BookOpen className="h-4 w-4" /> Book Session
                    </button>
                    {!isEligible && (
                      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-semibold opacity-0 group-hover/btn:opacity-100 transition-opacity"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)', zIndex: 10 }}>
                        {featured.reason || 'Tutor is currently full'}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMessageTarget(featured)}
                      className="rounded-pill inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]"
                      style={{ background: 'rgba(242,237,227,0.08)', color: '#F4F0E8', border: '1px solid rgba(242,237,227,0.16)' }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message
                    </button>
                    <button
                      onClick={() => setProfileTarget(featured)}
                      className="rounded-pill inline-flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]"
                      style={{ background: 'rgba(242,237,227,0.08)', color: '#F4F0E8', border: '1px solid rgba(242,237,227,0.16)' }}
                    >
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )
      })()}

      {/* ── Section label for the full list ── */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {featured ? 'More tutors for you' : 'Tutors'}
          </h2>
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>
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
            {gridItems.map((person, index) => {
              const color = accentFor(person.tutorId)
              const id = person.tutorId
              const isLiked = liked.has(id)
              const isEligible = person.isEligible !== false
              const personSubjects = [...new Set(person.subjectsTaught ?? [])] as string[]
              const matchPct = Math.round((person.score ?? 0) * 100)
              const strength = matchStrength(person.score ?? 0)

              return (
                <motion.div
                  key={id}
                  className="relative rounded-3xl flex flex-col overflow-hidden group"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: (index % 6) * 0.06, duration: 0.4, ease: EASE }}
                  whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
                >
                  {/* Soft corner accent wash — depth without a slop gradient strip */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: `var(--accent-${color}-bg)`, filter: 'blur(36px)' }}
                  />

                  <div className="relative flex flex-col flex-1 p-5 space-y-3.5">
                    {/* Header row — avatar, name, match ring */}
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => setProfileTarget(person)}
                        className="relative flex-shrink-0 transition-transform hover:scale-105 cursor-pointer"
                      >
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold"
                          style={{
                            background: `var(--accent-${color}-bg)`,
                            color: `var(--accent-${color}-fg)`,
                            boxShadow: 'inset 0 0 0 1px var(--border)',
                          }}
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

                      <div className="min-w-0 flex-1 pt-0.5">
                        <button
                          onClick={() => setProfileTarget(person)}
                          className="text-left cursor-pointer"
                        >
                          <p className="truncate text-[15px] font-bold hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                            {person.firstName} {person.lastName}
                          </p>
                        </button>
                        <div className="mt-1">
                          <StarRating rating={person.avgRating} count={person.ratingCount} size="sm" />
                        </div>
                      </div>

                      {/* Match ring — the recommendation signal, top-right */}
                      <MatchRing pct={matchPct} accent={strength.accent} size={48} />
                    </div>

                    {/* Bio */}
                    <p className="line-clamp-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {person.bio ?? 'No bio provided yet.'}
                    </p>

                    {/* Subject tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {personSubjects.slice(0, 3).map((s, i) => (
                        <Badge key={`${s}-${i}`} color={color} size="sm">{s}</Badge>
                      ))}
                      {personSubjects.length > 3 && (
                        <span className="self-center text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>+{personSubjects.length - 3} more</span>
                      )}
                    </div>

                    {/* Match + rate row */}
                    <div
                      className="flex items-center justify-between gap-2 py-3 mt-auto"
                      style={{ borderTop: '1px solid var(--border)' }}
                    >
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{ background: `var(--accent-${strength.accent}-bg)`, color: `var(--accent-${strength.accent}-fg)` }}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {strength.label}
                      </span>
                      <span className="font-bold text-base tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        ₦{Number(person.hourlyRate ?? 0).toLocaleString()}
                        <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>/hr</span>
                      </span>
                    </div>

                    {/* CTA row — Book Session is the anchor, kept inside the fold */}
                    <div className="flex gap-2">
                      <div className="flex-1 relative group/btn">
                        <Button
                          size="md"
                          className="w-full"
                          onClick={() => setBookTarget(person)}
                          disabled={!isEligible}
                        >
                          <BookOpen className="w-4 h-4" />
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
                      <Button
                        variant="secondary"
                        size="md"
                        aria-label={`Message ${person.firstName}`}
                        className="flex-shrink-0 !px-3"
                        onClick={() => setMessageTarget(person)}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <button
                        onClick={() => toggleLike(id)}
                        aria-label={isLiked ? 'Remove from saved' : 'Save tutor'}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all hover:scale-105 cursor-pointer"
                        style={{ color: isLiked ? 'var(--accent-coral-fg)' : 'var(--text-muted)', background: isLiked ? 'var(--accent-coral-bg)' : 'var(--surface-2)', border: '1px solid var(--border)' }}
                      >
                        <Heart className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} />
                      </button>
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
          tutorId={bookTarget.tutorId}
          tutorName={`${bookTarget.firstName} ${bookTarget.lastName}`}
          subjects={bookTarget.subjectsTaught}
        />
      )}
      {messageTarget && (
        <MessageModal
          isOpen
          onClose={() => setMessageTarget(null)}
          otherUserId={messageTarget.tutorId}
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
