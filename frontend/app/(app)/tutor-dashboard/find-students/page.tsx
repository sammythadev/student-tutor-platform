'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { MessageModal } from '@/components/MessageModal'
import { getStudentCandidates, type StudentCandidate } from '@/lib/api/users'
import { apiErrorText } from '@/lib/api/errors'
import { accentBg, accentFg, accentFor, formatNaira, initials, matchStrength, stagger } from '@/lib/ui'
import { AlertCircle, MessageSquare, Search, Sparkles, X } from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1] as const

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 animate-pulse rounded-xl" style={{ background: 'var(--surface-2)' }} />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-24 animate-pulse rounded-full" style={{ background: 'var(--surface-2)' }} />
            <div className="h-3 w-16 animate-pulse rounded-full" style={{ background: 'var(--surface-2)' }} />
          </div>
        </div>
        <div className="h-6 w-24 animate-pulse rounded-full" style={{ background: 'var(--surface-2)' }} />
        <div className="h-px w-full" style={{ background: 'var(--border)' }} />
        <div className="h-9 w-full animate-pulse rounded-full" style={{ background: 'var(--surface-2)' }} />
      </div>
    </div>
  )
}

export default function FindStudentsPage() {
  const [students, setStudents] = useState<StudentCandidate[]>([])
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageTarget, setMessageTarget] = useState<StudentCandidate | null>(null)
  const reduce = useReducedMotion()

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
    })
  }, [students, search, subject])

  return (
    <div className="space-y-6 py-3">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Matchmaking
        </p>
        <h1
          className="font-heading mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ color: 'var(--text-primary)' }}
        >
          Students Matched to You
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {loading
            ? 'Scoring candidates…'
            : `${filtered.length} student${filtered.length === 1 ? '' : 's'} ranked by match score against your subjects, grade levels and availability.`}
        </p>
      </header>

      {error && (
        <div
          className="flex items-start gap-3 rounded-2xl p-4 text-sm"
          style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="flex-1 leading-relaxed">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search students or subjects"
            aria-label="Search matched students"
            className="h-12 w-full rounded-xl pl-11 pr-11 text-sm outline-none"
            style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {subjects.length > 1 && (
          <div className="scrollbar-thin -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
            {subjects.map(option => {
              const isActive = subject === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSubject(option)}
                  aria-pressed={isActive}
                  className="shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    background: isActive ? 'var(--primary)' : 'var(--surface)',
                    color: isActive ? 'var(--primary-fg)' : 'var(--text-secondary)',
                    border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  {option}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`candidate-skeleton-${i}`} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
          >
            <Search className="h-6 w-6" />
          </div>
          <p className="font-heading font-semibold" style={{ color: 'var(--text-primary)' }}>
            {students.length === 0 ? 'No candidates right now' : 'No students match your filters'}
          </p>
          <p className="max-w-[34ch] text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {students.length === 0
              ? 'Students are matched to you by subject and grade level. Check back once more students join.'
              : 'Try a different subject or clear your search.'}
          </p>
          {students.length > 0 && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSubject('All') }}
              className="cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ color: 'var(--primary)' }}
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((student, index) => {
            const identity = accentFor(student.studentId)
            const strength = matchStrength(student.score)
            const eligible = student.isEligible !== false
            const name = `${student.firstName} ${student.lastName}`

            return (
              <motion.article
                key={student.studentId}
                className="flex flex-col rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-rest)' }}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.35, delay: stagger(index), ease: EASE }}
              >
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
                      style={{ background: accentBg(identity), color: accentFg(identity) }}
                    >
                      {initials(student.firstName, student.lastName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</p>
                      <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                        Grade {student.gradeLevel}{student.region ? ` · ${student.region}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge color="lavender" size="sm">{student.requiredSubject}</Badge>
                    {student.subjects
                      .filter(item => item !== student.requiredSubject)
                      .slice(0, 2)
                      .map(item => <Badge key={item} color="sky" size="sm">{item}</Badge>)}
                  </div>

                  {!eligible && student.reason && (
                    <div
                      className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs leading-relaxed"
                      style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span>{student.reason}</span>
                    </div>
                  )}

                  <div
                    className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: accentBg(strength.accent), color: accentFg(strength.accent) }}
                    >
                      <Sparkles className="h-3 w-3" />
                      {strength.label} · {Math.round(student.score * 100)}%
                    </span>
                    {student.budget !== null && (
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatNaira(student.budget)}
                        <span className="ml-1 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mo</span>
                      </span>
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={!eligible}
                    onClick={() => setMessageTarget(student)}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Message
                  </Button>
                </div>
              </motion.article>
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
