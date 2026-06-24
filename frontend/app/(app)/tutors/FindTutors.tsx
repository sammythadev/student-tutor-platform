'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/Badge'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { bookSession } from '@/lib/api/sessions'
import { getTutorCandidates, selectTutor, type TutorCandidate } from '@/lib/api/users'
import { CheckCircle2, Heart, Search, SlidersHorizontal, Star, AlertCircle } from 'lucide-react'

const ACCENTS = ['lavender', 'sky', 'mint', 'sun', 'coral', 'tangerine'] as const

function nextSessionWindow() {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  start.setHours(15, 0, 0, 0)
  const end = new Date(start)
  end.setHours(start.getHours() + 1)
  return { startAt: start.toISOString(), endAt: end.toISOString() }
}

export function FindTutors() {
  const [candidates, setCandidates] = useState<TutorCandidate[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All Subjects')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const page = await getTutorCandidates({ page: 1, limit: 24 })
        if (alive) setCandidates(page.candidates)
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
    candidates.forEach(c => {
      c.subjectsTaught?.forEach((item: string) => unique.add(item))
    })
    return ['All Subjects', ...Array.from(unique).sort()]
  }, [candidates])

  const filtered = candidates.filter(c => {
    const q = search.toLowerCase()
    const cSubjects = c.subjectsTaught ?? []
    const matchesSearch = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || cSubjects.some((item: string) => item.toLowerCase().includes(q))
    const matchesSubject = subject === 'All Subjects' || cSubjects.includes(subject)
    return matchesSearch && matchesSubject
  })

  async function handleBook(tutor: TutorCandidate) {
    setError(null)
    try {
      await selectTutor(tutor.userId)
      await bookSession({
        tutorId: tutor.userId,
        subject: tutor.subjectsTaught?.[0] ?? 'General Tutoring',
        ...nextSessionWindow(),
      })
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not book this tutor.')
    }
  }

  return (
    <div className="space-y-8 py-3">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-text-primary">Find Tutors</h1>
        <p className="mt-1 text-sm text-text-secondary">Browse {filtered.length} matched tutors</p>
      </div>

      {error && <div className="surface-card p-4 text-sm text-accent-coral-fg">{error}</div>}

      <div className="surface-card flex flex-col flex-wrap items-start gap-3 p-4 md:flex-row md:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search tutors or subjects..."
            className="h-10 w-full rounded-lg border bg-surface-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-primary"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>
        {subjects.map(option => (
          <button
            key={option}
            onClick={() => setSubject(option)}
            className="rounded-lg border px-3.5 py-2 text-xs font-semibold"
            style={{
              background: subject === option ? 'var(--primary)' : 'var(--surface-2)',
              color: subject === option ? 'var(--primary-fg)' : 'var(--text-secondary)',
              borderColor: 'var(--border)',
            }}
          >
            {option}
          </button>
        ))}
        <button className="ml-auto flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold text-text-secondary" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </button>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="surface-card h-64 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((person, index) => {
            const color = ACCENTS[index % ACCENTS.length]
            const id = person.userId
            const isLiked = liked.has(id)
            const isEligible = person.isEligible !== false;
            const personSubjects = person.subjectsTaught ?? []
            
            return (
              <Card key={id} className="flex flex-col p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>
                      {`${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{person.firstName} {person.lastName}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 fill-current text-accent-sun-fg" />
                        <span className="text-xs font-semibold text-text-primary">{person.avgRating ?? 'New'}</span>
                        <span className="text-xs text-text-muted">({person.ratingCount ?? 0})</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setLiked(prev => {
                      const next = new Set(prev)
                      next.has(id) ? next.delete(id) : next.add(id)
                      return next
                    })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ color: isLiked ? 'var(--accent-coral-fg)' : 'var(--text-muted)', background: isLiked ? 'var(--accent-coral-bg)' : 'transparent' }}
                  >
                    <Heart className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {!isEligible && (
                  <div className="mb-4 p-2 rounded-md bg-accent-coral-bg text-accent-coral-fg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Ineligible: {person.reason}</span>
                  </div>
                )}

                <p className="mb-4 line-clamp-3 text-xs leading-relaxed text-text-secondary">{person.bio ?? 'No bio yet.'}</p>

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {personSubjects.slice(0, 3).map((item: string) => <Badge key={item} color={color as any} size="sm">{item}</Badge>)}
                </div>

                <div className="mb-4 flex items-center justify-between border-y py-3" style={{ borderColor: 'var(--border)' }}>
                  <span className="flex items-center gap-1.5 text-xs text-accent-mint-fg"><CheckCircle2 className="h-3.5 w-3.5" /> Ranked match {Math.round((person.score ?? 0) * 100)}%</span>
                  <span className="font-bold text-text-primary">
                    {`₦${Number(person.hourlyRate ?? 0).toLocaleString()}`}
                    <span className="text-xs font-normal text-text-muted">/hr</span>
                  </span>
                </div>

                <div className="mt-auto flex gap-2">
                  <Button variant="secondary" size="md" className="flex-1">View Profile</Button>
                  <Button size="md" className="flex-1" onClick={() => handleBook(person)} disabled={!isEligible}>Book Session</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
