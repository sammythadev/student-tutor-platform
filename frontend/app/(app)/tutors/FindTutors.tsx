'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { PageHero } from '@/components/catalog/page-hero'
import { CatalogFilters, type SortKey } from '@/components/catalog/catalog-filters'
import { CatalogCard } from '@/components/catalog/catalog-card'
import { BookSessionModal } from '@/components/BookSessionModal'
import { MessageModal } from '@/components/MessageModal'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { apiErrorText } from '@/lib/api/errors'
import { matchStrength } from '@/lib/ui'
import { AlertCircle, BookOpen, CheckCircle2, MessageSquare, Search, Sparkles, Star, Wallet, X } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { Pagination } from '@/components/Pagination'
import { TutorProfileModal } from '@/components/TutorProfileModal'

const PER_PAGE = 12
const PAGE_SIZE = 50
const RATE_MAX = 20000

function SkeletonCard() {
  return (
    <div className="catalog-card min-h-56 animate-pulse">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="size-14 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-2 px-4 pb-2">
        <div className="h-2.5 w-full rounded bg-muted" />
        <div className="h-2.5 w-4/5 rounded bg-muted" />
      </div>
      <div className="mt-auto flex items-center gap-2 px-4 pb-4 pt-3">
        <div className="h-5 w-16 rounded bg-muted" />
        <div className="ml-auto h-9 w-24 rounded-md bg-muted" />
      </div>
    </div>
  )
}

export function FindTutors() {
  const reduce = useReducedMotion()
  const [candidates, setCandidates] = useState<TutorCandidate[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All')
  const [minRating, setMinRating] = useState(0)
  const [maxRate, setMaxRate] = useState(0)
  const [sortBy, setSortBy] = useState<SortKey>('score')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookTarget, setBookTarget] = useState<TutorCandidate | null>(null)
  const [messageTarget, setMessageTarget] = useState<TutorCandidate | null>(null)
  const [profileTarget, setProfileTarget] = useState<TutorCandidate | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
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

  const showFeatured = !loading && !hasFilters && search === '' && subject === 'All' && filtered.length > 2
  const featured = showFeatured ? filtered[0] : null
  const gridItems = featured && safePage === 1
    ? paginated.filter(p => p.tutorId !== featured.tutorId)
    : paginated

  const toggleLike = (id: string) => setLiked(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  function clearFilters() {
    setSearch(''); setSubject('All'); setMinRating(0); setMaxRate(0); setSortBy('score')
  }

  return (
    <div className="space-y-6 py-3">
      <PageHero
        title="Find your tutor"
        description={loading
          ? 'Ranking tutors against your learning profile…'
          : total > candidates.length
            ? `${filtered.length} of ${candidates.length} loaded match your filters · ${total} eligible in total`
            : `${filtered.length} of ${total} tutors ranked for how well they fit you`}
      />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400"
            role="alert"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1 leading-relaxed">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="cursor-pointer rounded-md p-1 hover:bg-rose-500/10">
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search row */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tutors or subjects…"
          aria-label="Search tutors or subjects"
          className="h-11 w-full rounded-lg border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Featured recommendation */}
      {featured && (() => {
        const matchPct = Math.round((featured.score ?? 0) * 100)
        const strength = matchStrength(featured.score ?? 0)
        const isEligible = featured.isEligible !== false
        const fSubjects = [...new Set(featured.subjectsTaught ?? [])] as string[]
        return (
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="catalog-card overflow-hidden"
          >
            <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-lg text-xl font-semibold bg-primary/10 text-primary">
                  {featured.firstName?.[0]}{featured.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Top match for you
                    </span>
                  </div>
                  <button type="button" onClick={() => setProfileTarget(featured)} className="mt-1 block cursor-pointer text-left">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      {featured.firstName} {featured.lastName}
                    </h2>
                  </button>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 fill-amber-500 text-amber-500" />
                      <span className="font-semibold text-foreground">{Number(featured.avgRating ?? 0).toFixed(1)}</span>
                      {featured.ratingCount ? <span>({featured.ratingCount})</span> : null}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="size-3.5" />
                      <span className="font-semibold tabular-nums text-foreground">₦{Number(featured.hourlyRate ?? 0).toLocaleString()}</span>/hr
                    </span>
                    {featured.isVerified && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {fSubjects.slice(0, 3).map(s => (
                      <span key={s} className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 md:flex-col md:items-stretch md:gap-3">
                <div className="flex items-center gap-2 md:justify-center">
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {strength.label} · {matchPct}%
                  </span>
                </div>
                <div className="flex flex-col gap-2 md:w-48">
                  <Button onClick={() => setBookTarget(featured)} disabled={!isEligible}>
                    <BookOpen className="size-4" /> Book Session
                  </Button>
                  <Button variant="outline" onClick={() => setMessageTarget(featured)}>
                    <MessageSquare className="size-4" /> Message
                  </Button>
                </div>
              </div>
            </div>
          </motion.section>
        )
      })()}

      {/* Catalog layout: rail + grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <CatalogFilters
          subjects={subjects}
          selectedSubject={subject}
          onSubject={setSubject}
          minRating={minRating}
          onMinRating={setMinRating}
          maxRate={maxRate}
          onMaxRate={setMaxRate}
          rateMax={RATE_MAX}
          sortBy={sortBy}
          onSortBy={setSortBy}
          hasFilters={hasFilters}
          onReset={clearFilters}
        />

        <div className="min-w-0 space-y-5">
          {/* Result count + active filter chips */}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                {filtered.length === 1 ? 'tutor matches' : 'tutors match'} your filters
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="catalog-filter-chip"
                >
                  <X className="size-3" aria-hidden="true" /> Clear all
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <CardContent className="rounded-lg border bg-background p-8">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Search aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No tutors match your filters</EmptyTitle>
                  <EmptyDescription className="text-xs">
                    Try widening your rating or price range.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button>
                </EmptyContent>
              </Empty>
            </CardContent>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {gridItems.map((person) => (
                <CatalogCard
                  key={person.tutorId}
                  data={{
                    id: person.tutorId,
                    name: `${person.firstName} ${person.lastName}`,
                    rating: person.avgRating,
                    ratingCount: person.ratingCount,
                    subjects: [...new Set(person.subjectsTaught ?? [])].slice(0, 4) as string[],
                    bio: person.bio ?? undefined,
                    price: person.hourlyRate != null ? `₦${Number(person.hourlyRate).toLocaleString()}` : undefined,
                    priceSuffix: '/hr',
                    matchPct: Math.round((person.score ?? 0) * 100),
                    verified: person.isVerified,
                    disabled: person.isEligible === false,
                    disabledReason: person.reason ?? undefined,
                  }}
                  actions={[
                    { kind: 'book', onClick: () => setBookTarget(person) },
                    { kind: 'message', onClick: () => setMessageTarget(person) },
                    { kind: 'view', onClick: () => setProfileTarget(person) },
                  ]}
                  liked={liked.has(person.tutorId)}
                  onToggleLike={() => toggleLike(person.tutorId)}
                />
              ))}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <Pagination page={safePage} total={filtered.length} limit={PER_PAGE} onPageChange={setPage} />
          )}
        </div>
      </div>

      {/* Modals */}
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
