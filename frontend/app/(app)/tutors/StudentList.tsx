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
import { SubjectFilter } from '@/components/catalog/subject-filter'
import { CatalogCard } from '@/components/catalog/catalog-card'
import { BookSessionModal } from '@/components/BookSessionModal'
import { MessageModal } from '@/components/MessageModal'
import { getStudentCandidates, type StudentCandidate } from '@/lib/api/users'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import { AlertCircle, Search, X } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { Pagination } from '@/components/Pagination'

const PER_PAGE = 12

function SkeletonCard() {
  return (
    <div className="catalog-card min-h-48 animate-pulse">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="size-14 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2 px-4 pb-4 pt-3">
        <div className="h-5 w-20 rounded bg-muted" />
        <div className="ml-auto h-9 w-24 rounded-md bg-muted" />
      </div>
    </div>
  )
}

export function StudentList() {
  const user = useAuthStore(s => s.user)
  const tutorProfile = useAuthStore(s => s.tutorProfile)
  const [candidates, setCandidates] = useState<StudentCandidate[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [bookTarget, setBookTarget] = useState<StudentCandidate | null>(null)
  const [messageTarget, setMessageTarget] = useState<StudentCandidate | null>(null)
  const [page, setPage] = useState(1)
  const { addToast } = useToast()

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true); setError(null)
      try {
        const result = await getStudentCandidates({ page: 1, limit: 50 })
        if (alive) setCandidates(result.candidates)
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
    candidates.forEach(c => {
      c.subjects?.forEach((s: string) => unique.add(s))
      if (c.requiredSubject) unique.add(c.requiredSubject)
    })
    return ['All', ...Array.from(unique).sort()]
  }, [candidates])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return candidates.filter(c => {
      const cSubjects = [...(c.subjects ?? []), c.requiredSubject].filter(Boolean)
      const matchSearch  = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || cSubjects.some((s: string) => s.toLowerCase().includes(q))
      const matchSubject = subject === 'All' || cSubjects.includes(subject)
      return matchSearch && matchSubject
    }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }, [candidates, search, subject])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)


  const toggleLike = (id: string) => setLiked(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  function clearFilters() { setSearch(''); setSubject('All'); setPage(1) }

  return (
    <div className="space-y-4 py-1 md:space-y-6 md:py-3">
      <PageHero
        title="Find students"
        description="Students matched to your expertise."
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
          placeholder="Search students or subjects…"
          aria-label="Search students"
          className="h-11 w-full rounded-lg border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {search && (
          <button type="button" onClick={() => { setSearch(''); setPage(1) }} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        )}
      </div>

      {/* Subject filter — chips on desktop, dropdown on mobile */}
      <SubjectFilter
        subjects={subjects}
        value={subject}
        onChange={value => { setSubject(value); if (value !== subject) setPage(1) }}
        allLabel="All subjects"
      />


      {!loading && !error && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {candidates.length} loaded students match your filters
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="catalog-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? null : filtered.length === 0 ? (
        <CardContent className="rounded-lg border bg-background p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Search aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>{candidates.length === 0 ? 'No students available right now' : 'No students match your filters'}</EmptyTitle>
              <EmptyDescription className="text-sm">{candidates.length === 0 ? 'Students matched to your expertise will appear here. Check back for new matches.' : 'Try a different subject.'}</EmptyDescription>
            </EmptyHeader>
            {(search !== '' || subject !== 'All') && (
              <EmptyContent><Button variant="outline" className="h-11" onClick={clearFilters}>Clear all filters</Button></EmptyContent>
            )}
          </Empty>
        </CardContent>
      ) : (
        <>
          <div className="catalog-grid">
            {paginated.map((person) => {
              const personSubjects = [...new Set([...(person.subjects ?? []), person.requiredSubject].filter(Boolean))] as string[]
              return (
                <CatalogCard
                  key={person.studentId}
                  data={{
                    id: person.studentId,
                    name: `${person.firstName} ${person.lastName}`,
                    tagline: `Grade ${person.gradeLevel} · ${person.region ?? 'Remote'}`,
                    subjects: personSubjects,
                    price: person.budget != null ? `₦${Number(person.budget).toLocaleString()}` : undefined,
                    priceSuffix: '/mo',
                    matchPct: Math.round((person.score ?? 0) * 100),
                    disabled: person.isEligible === false,
                    disabledReason: person.reason ?? undefined,
                  }}
                  actions={[
                    { kind: 'book', label: 'Reach Out', onClick: () => setBookTarget(person) },
                    { kind: 'message', onClick: () => setMessageTarget(person) },
                  ]}
                  liked={liked.has(person.studentId)}
                  onToggleLike={() => toggleLike(person.studentId)}
                />
              )
            })}
          </div>
          <Pagination page={safePage} total={filtered.length} limit={PER_PAGE} onPageChange={setPage} />
        </>
      )}

      {bookTarget && (
        <BookSessionModal
          isOpen onClose={() => setBookTarget(null)}
          onSuccess={() => { addToast(`Session request sent to ${bookTarget.firstName}!`, 'success'); setBookTarget(null) }}
          onError={msg => addToast(msg, 'error')}
          tutorId={user?.id ?? ''}
          tutorName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`}
          subjects={bookTarget.subjects}
          tutorSubjects={tutorProfile?.subjectsTaught}
          studentId={bookTarget.studentId}
        />
      )}
      {messageTarget && (
        <MessageModal isOpen onClose={() => setMessageTarget(null)}
          otherUserId={messageTarget.studentId}
          otherUserName={`${messageTarget.firstName} ${messageTarget.lastName}`}
        />
      )}
    </div>
  )
}
