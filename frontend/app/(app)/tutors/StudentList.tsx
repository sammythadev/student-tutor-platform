'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
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
import { FilterChip } from '@/components/catalog/filter-chip'
import { CatalogCard } from '@/components/catalog/catalog-card'
import { BookSessionModal } from '@/components/BookSessionModal'
import { MessageModal } from '@/components/MessageModal'
import { getStudentCandidates, type StudentCandidate } from '@/lib/api/users'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import { AlertCircle, Calendar, MessageSquare, Search, X } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { Pagination } from '@/components/Pagination'
import { cn } from '@/lib/utils'

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
  const reduce = useReducedMotion()
  const user = useAuthStore(s => s.user)
  const tutorProfile = useAuthStore(s => s.tutorProfile)
  const [candidates, setCandidates] = useState<StudentCandidate[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
  }, [])

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
  useEffect(() => { setPage(1) }, [search, subject])

  const showFeatured = !loading && search === '' && subject === 'All' && filtered.length > 2
  const featured = showFeatured ? filtered[0] : null
  const gridItems = featured && safePage === 1
    ? paginated.filter(p => p.studentId !== featured.studentId)
    : paginated

  const toggleLike = (id: string) => setLiked(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  function clearFilters() { setSearch(''); setSubject('All') }

  return (
    <div className="space-y-6 py-3">
      <PageHero
        title="Find students"
        description={loading ? 'Matching students to your expertise…' : `${filtered.length} students looking for a tutor like you`}
      />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400" role="alert"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1 leading-relaxed">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="cursor-pointer rounded-md p-1 hover:bg-rose-500/10"><X className="size-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search row */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search students or subjects…"
          aria-label="Search students"
          className="h-11 w-full rounded-lg border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        )}
      </div>

      {/* Subject filter chips */}
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {subjects.map(option => (
            <FilterChip key={option} active={subject === option} onClick={() => setSubject(option)}>
              {option === 'All' ? 'All subjects' : option}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Featured */}
      {featured && (() => {
        const matchPct = Math.round((featured.score ?? 0) * 100)
        const isEligible = featured.isEligible !== false
        return (
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="catalog-card overflow-hidden"
          >
            <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-lg text-xl font-semibold bg-primary/10 text-primary">
                  {featured.firstName?.[0]}{featured.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Top match for you</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{featured.firstName} {featured.lastName}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Grade {featured.gradeLevel} · needs {featured.requiredSubject}
                    {featured.budget != null && ` · budget ₦${Number(featured.budget).toLocaleString()}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 md:flex-col md:items-stretch md:gap-3">
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {matchPct}% match
                </span>
                <div className="flex flex-col gap-2 md:w-48">
                  <Button onClick={() => setBookTarget(featured)} disabled={!isEligible}><CalendarIcon /> Reach Out</Button>
                  <Button variant="outline" onClick={() => setMessageTarget(featured)}><MessageSquareIcon /> Message</Button>
                </div>
              </div>
            </div>
          </motion.section>
        )
      })()}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <CardContent className="rounded-lg border bg-background p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Search aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>No students match your filters</EmptyTitle>
              <EmptyDescription className="text-xs">Try a different subject.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent><Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button></EmptyContent>
          </Empty>
        </CardContent>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {gridItems.map((person) => {
              const personSubjects = [...new Set([...(person.subjects ?? []), person.requiredSubject].filter(Boolean))] as string[]
              return (
                <CatalogCard
                  key={person.studentId}
                  data={{
                    id: person.studentId,
                    name: `${person.firstName} ${person.lastName}`,
                    tagline: `Grade ${person.gradeLevel} · ${person.region ?? 'Remote'}`,
                    subjects: personSubjects.slice(0, 4),
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

function CalendarIcon() { return <Calendar className="size-4" /> }
function MessageSquareIcon() { return <MessageSquare className="size-4" /> }