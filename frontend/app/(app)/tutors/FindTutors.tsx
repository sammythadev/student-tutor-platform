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
import { ActiveFilters, type ActiveFilter } from '@/components/catalog/active-filters'
import { CatalogFilterBar, SORT_OPTIONS, type SortKey } from '@/components/catalog/catalog-filters'
import { CatalogCard } from '@/components/catalog/catalog-card'
import { SearchInput } from '@/components/ui/search-input'
import { BookSessionModal } from '@/components/BookSessionModal'
import { MessageModal } from '@/components/MessageModal'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { candidatePercent, type MatchDistribution } from '@/lib/api/match-explanation'
import { MatchDistributionDialog } from '@/components/match/match-distribution-dialog'
import { apiErrorText } from '@/lib/api/errors'
import { AlertCircle, CalendarDaysIcon, Search } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { Pagination } from '@/components/Pagination'
import { TutorProfileModal } from '@/components/TutorProfileModal'

const PER_PAGE = 12
const PAGE_SIZE = 50
const RATE_MAX = 20000

function SkeletonCard() {
  return (
    <div className="catalog-card flex h-full flex-col motion-reduce:animate-none">
      <div className="flex animate-pulse items-start gap-3 p-4 pb-3">
        <div className="size-12 shrink-0 rounded-full bg-muted" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-28 rounded bg-muted" />
        </div>
      </div>
      <div className="animate-pulse space-y-2 px-4">
        <div className="h-3 w-4/5 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
      </div>
      <div className="mt-auto flex animate-pulse flex-col gap-3 border-t p-4">
        <div className="h-5 w-24 rounded bg-muted" />
        <div className="flex flex-col gap-2">
          <div className="h-11 w-full rounded-md bg-muted" />
          <div className="h-11 w-full rounded-md bg-muted" />
        </div>
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
  const [distribution, setDistribution] = useState<MatchDistribution | undefined>(undefined)
  const { addToast } = useToast()

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true); setError(null)
      try {
        const result = await getTutorCandidates({ page: 1, limit: PAGE_SIZE })
        if (alive) {
          setCandidates(result.candidates)
          setTotal(result.total)
          // Describes the whole ranked pool, so it stays valid while filters hide rows.
          setDistribution(result.distribution)
        }
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

  // One removable term per active filter, so a collapsed rail group is never the
  // only place a value is visible.
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const terms: ActiveFilter[] = []
    if (search) terms.push({ id: 'search', label: `“${search}”`, onRemove: () => { setSearch(''); setPage(1) } })
    if (subject !== 'All') terms.push({ id: 'subject', label: subject, onRemove: () => { setSubject('All'); setPage(1) } })
    if (minRating > 0) terms.push({ id: 'rating', label: `${minRating}★ and up`, onRemove: () => { setMinRating(0); setPage(1) } })
    if (maxRate > 0) terms.push({ id: 'price', label: `Up to ₦${maxRate.toLocaleString()}/hr`, onRemove: () => { setMaxRate(0); setPage(1) } })
    if (sortBy !== 'score') {
      const label = SORT_OPTIONS.find(option => option.key === sortBy)?.label ?? sortBy
      terms.push({ id: 'sort', label, onRemove: () => { setSortBy('score'); setPage(1) } })
    }
    return terms
  }, [search, subject, minRating, maxRate, sortBy])


  const toggleLike = (id: string) => setLiked(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  function clearFilters() {
    setSearch(''); setSubject('All'); setMinRating(0); setMaxRate(0); setSortBy('score'); setPage(1)
  }

  return (
    <div className="space-y-4 py-1 md:space-y-5 md:py-3">
      <PageHero
        title="Find your tutor"
        description="Ranked by how well each tutor matches the subjects, budget and schedule on your profile."
        tone="tutors"
        actions={[
          {
            label: "My schedule",
            href: "/schedules",
            variant: "outline",
            icon: CalendarDaysIcon,
          },
        ]}
      />

      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 leading-relaxed">{error}</span>
          <Button variant="outline" className="h-11" onClick={() => { setLoading(true); setLoadAttempt(attempt => attempt + 1) }} disabled={loading}>Retry</Button>
        </div>
      )}

      {/* One command surface. Search and the four filters were two separate
          full-width bands, which measured 423px of chrome above the first tutor on
          a phone. Sharing one bordered panel makes them read as a single tool. */}
      <div className="rounded-xl border bg-card p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <SearchInput
            label="Search tutors or subjects"
            placeholder="Search by tutor name or subject"
            value={search}
            onChange={event => { setSearch(event.target.value); setPage(1) }}
            onClear={() => { setSearch(''); setPage(1) }}
            containerClassName="md:w-64 md:shrink-0"
          />
          <CatalogFilterBar
            surface={false}
            className="md:flex-1"
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
          />
        </div>
      </div>

      <section aria-label="Tutor results" aria-busy={loading} className="space-y-3">
        {/* The count is the heading rather than a footnote. It is the first thing
            wanted after narrowing, and the only confirmation the filters took. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 aria-live="polite" className="text-lg font-semibold">
              {loading
                ? 'Finding tutors…'
                : `${filtered.length} ${filtered.length === 1 ? 'tutor' : 'tutors'}${total > candidates.length ? ` of ${total} eligible` : ''}`}
            </h2>
            {!loading && (
              <p className="text-sm text-muted-foreground">
                Sorted by {(SORT_OPTIONS.find(option => option.key === sortBy)?.label ?? 'Best match').toLowerCase()}.
              </p>
            )}
          </div>
          {!loading && <MatchDistributionDialog distribution={distribution} />}
        </div>

        <ActiveFilters filters={activeFilters} onClearAll={clearFilters} />

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
                  {candidates.length === 0
                    ? 'Tutors who fit your learning profile will appear here. Check back for new matches.'
                    : 'Try removing the rating or hourly rate limit.'}
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
                  /* Experience and region: the two facts a chooser weighs beside
                     price, and both were already on the payload going unused. */
                  tagline: [
                    person.experienceYears
                      ? `${person.experienceYears} ${person.experienceYears === 1 ? 'year' : 'years'} teaching`
                      : null,
                    person.region,
                  ].filter(Boolean).join(' · ') || undefined,
                  rating: person.avgRating,
                  ratingCount: person.ratingCount,
                  subjects: [...new Set(person.subjectsTaught ?? [])] as string[],
                  bio: person.bio ?? undefined,
                  price: person.hourlyRate != null ? `₦${Number(person.hourlyRate).toLocaleString()}` : undefined,
                  priceSuffix: '/hr',
                  matchPct: candidatePercent(person.rankPercentage, person.score),
                  verified: person.isVerified,
                  disabled: person.isEligible === false,
                  disabledReason: person.reason ?? undefined,
                  explanation: person.explanation,
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
      </section>

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
