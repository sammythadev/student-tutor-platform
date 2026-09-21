'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { AlertCircle, Search, X } from 'lucide-react'
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
  const [candidates, setCandidates] = useState<TutorCandidate[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All')
  const [minRating, setMinRating] = useState(0)
  const [maxRate, setMaxRate] = useState(0)
  const [sortBy, setSortBy] = useState<SortKey>('score')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
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
  }, [loadAttempt])

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


  const hasFilters = search !== '' || minRating > 0 || maxRate > 0 || sortBy !== 'score' || subject !== 'All'


  const toggleLike = (id: string) => setLiked(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  function clearFilters() {
    setSearch(''); setSubject('All'); setMinRating(0); setMaxRate(0); setSortBy('score'); setPage(1)
  }

  return (
    <div className="space-y-4 py-1 md:space-y-6 md:py-3">
      <PageHero
        title="Find your tutor"
        description="Tutors ranked for your learning profile."
      />

      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 leading-relaxed">{error}</span>
          <Button variant="outline" className="h-11" onClick={() => { setLoading(true); setLoadAttempt(attempt => attempt + 1) }} disabled={loading}>Retry</Button>
        </div>
      )}

      {/* Search row */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search tutors or subjects…"
          aria-label="Search tutors or subjects"
          className="h-11 w-full rounded-lg border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setPage(1) }}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>


      {/* Catalog layout: rail + grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <CatalogFilters
          subjects={subjects}
          selectedSubject={subject}
          onSubject={value => { setSubject(value); if (value !== subject) setPage(1) }}
          minRating={minRating}
          onMinRating={value => { setMinRating(value); if (value !== minRating) setPage(1) }}
          maxRate={maxRate}
          onMaxRate={value => { setMaxRate(value); if (value !== maxRate) setPage(1) }}
          rateMax={RATE_MAX}
          sortBy={sortBy}
          onSortBy={value => { setSortBy(value); if (value !== sortBy) setPage(1) }}
          hasFilters={hasFilters}
          onReset={clearFilters}
        />

        <div className="min-w-0 space-y-5">
          {/* Result count + active filter chips */}
          {!loading && !error && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {filtered.length} of {candidates.length} loaded tutors match your filters
                {total > candidates.length && ` · ${total} eligible in total`}
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
            <div className="catalog-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? null : filtered.length === 0 ? (
            <CardContent className="rounded-lg border bg-background p-8">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Search aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>{candidates.length === 0 ? 'No tutors available right now' : 'No tutors match your filters'}</EmptyTitle>
                  <EmptyDescription className="text-sm">
                    {candidates.length === 0 ? 'Tutors who fit your learning profile will appear here. Check back for new matches.' : 'Try widening your rating or price range.'}
                  </EmptyDescription>
                </EmptyHeader>
                {hasFilters && (
                  <EmptyContent>
                    <Button variant="outline" className="h-11" onClick={clearFilters}>Clear all filters</Button>
                  </EmptyContent>
                )}
              </Empty>
            </CardContent>
          ) : (
            <div className="catalog-grid">
              {paginated.map((person) => (
                <CatalogCard
                  key={person.tutorId}
                  data={{
                    id: person.tutorId,
                    name: `${person.firstName} ${person.lastName}`,
                    rating: person.avgRating,
                    ratingCount: person.ratingCount,
                    subjects: [...new Set(person.subjectsTaught ?? [])] as string[],
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
