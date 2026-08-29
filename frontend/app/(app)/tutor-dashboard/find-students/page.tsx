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
import { MessageModal } from '@/components/MessageModal'
import { getStudentCandidates, type StudentCandidate } from '@/lib/api/users'
import { apiErrorText } from '@/lib/api/errors'
import { AlertCircle, MessageSquare, Search, X } from 'lucide-react'

function SkeletonCard() {
  return (
    <div className="catalog-card min-h-48 animate-pulse">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="size-12 rounded-lg bg-muted" />
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

export default function FindStudentsPage() {
  const reduce = useReducedMotion()
  const [students, setStudents] = useState<StudentCandidate[]>([])
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageTarget, setMessageTarget] = useState<StudentCandidate | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const page = await getStudentCandidates({ page: 1, limit: 24 })
        if (alive) setStudents(page.candidates)
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
    students.forEach(student => { if (student.requiredSubject) unique.add(student.requiredSubject) })
    return ['All', ...Array.from(unique).sort()]
  }, [students])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter(student => {
      const matchesSearch = !q
        || `${student.firstName} ${student.lastName}`.toLowerCase().includes(q)
        || student.requiredSubject.toLowerCase().includes(q)
        || student.subjects.some(item => item.toLowerCase().includes(q))
      const matchesSubject = subject === 'All' || student.requiredSubject === subject
      return matchesSearch && matchesSubject
    }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }, [students, search, subject])

  function clearFilters() { setSearch(''); setSubject('All') }

  return (
    <div className="space-y-6 py-3">
      <PageHero
        title="Students matched to you"
        description={loading
          ? 'Scoring candidates…'
          : `${filtered.length} student${filtered.length === 1 ? '' : 's'} ranked by match score against your subjects, grade levels and availability.`}
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

      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search students or subjects"
          aria-label="Search matched students"
          className="h-11 w-full rounded-lg border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        )}
      </div>

      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {subjects.map(option => (
            <FilterChip key={option} active={subject === option} onClick={() => setSubject(option)}>
              {option === 'All' ? 'All subjects' : option}
            </FilterChip>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`candidate-skeleton-${i}`} />)}
        </div>
      ) : filtered.length === 0 ? (
        <CardContent className="rounded-lg border bg-background p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Search aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>{students.length === 0 ? 'No candidates right now' : 'No students match your filters'}</EmptyTitle>
              <EmptyDescription className="text-xs">
                {students.length === 0
                  ? 'Students are matched to you by subject and grade level. Check back once more students join.'
                  : 'Try a different subject.'}
              </EmptyDescription>
            </EmptyHeader>
            {students.length > 0 && (
              <EmptyContent><Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button></EmptyContent>
            )}
          </Empty>
        </CardContent>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((student) => {
            const personSubjects = [...new Set([...(student.subjects ?? []), student.requiredSubject].filter(Boolean))] as string[]
            return (
              <CatalogCard
                key={student.studentId}
                data={{
                  id: student.studentId,
                  name: `${student.firstName} ${student.lastName}`,
                  tagline: `Grade ${student.gradeLevel} · ${student.region ?? 'Remote'}`,
                  subjects: personSubjects.slice(0, 4),
                  price: student.budget != null ? `₦${Number(student.budget).toLocaleString()}` : undefined,
                  priceSuffix: '/mo',
                  matchPct: Math.round((student.score ?? 0) * 100),
                  disabled: student.isEligible === false,
                  disabledReason: student.reason ?? undefined,
                }}
                actions={[
                  { kind: 'message', onClick: () => setMessageTarget(student) },
                ]}
              />
            )
          })}
        </div>
      )}

      {messageTarget && (
        <MessageModal
          isOpen
          onClose={() => setMessageTarget(null)}
          otherUserId={messageTarget.studentId}
          otherUserName={`${messageTarget.firstName} ${messageTarget.lastName}`}
        />
      )}
    </div>
  )
}
