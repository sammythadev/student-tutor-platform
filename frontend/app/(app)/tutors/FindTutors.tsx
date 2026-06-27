'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/Badge'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { BookSessionModal } from '@/components/BookSessionModal'
import { MessageModal } from '@/components/MessageModal'
import { getTutorCandidates, type TutorCandidate } from '@/lib/api/users'
import { CheckCircle2, Heart, Search, SlidersHorizontal, Star, AlertCircle, MessageSquare, Users } from 'lucide-react'
import { useToast } from '@/lib/toast-context'

const ACCENTS = ['lavender', 'sky', 'mint', 'sun', 'coral', 'tangerine'] as const

export function FindTutors() {
  const [candidates, setCandidates] = useState<TutorCandidate[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All Subjects')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookTarget, setBookTarget] = useState<TutorCandidate | null>(null)
  const [messageTarget, setMessageTarget] = useState<TutorCandidate | null>(null)
  const { addToast } = useToast()

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

  return (
    <div className="space-y-8 py-3">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-text-primary">Find Tutors</h1>
        <p className="mt-1 text-sm text-text-secondary">Browse {filtered.length} matched tutors</p>
      </div>

      {error && <div className="surface-card p-4 text-sm text-accent-coral-fg">{error}</div>}

      <div className="surface-card p-4 space-y-3 md:space-y-0 md:flex md:flex-row md:items-center md:gap-3">
        <div className="relative min-w-[220px] flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search tutors or subjects..."
            className="h-10 w-full rounded-lg border bg-surface-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-primary"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0 scrollbar-thin">
          {subjects.map(option => (
            <button
              key={option}
              onClick={() => setSubject(option)}
              className="shrink-0 rounded-lg border px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
              style={{
                background: subject === option ? 'var(--primary)' : 'var(--surface-2)',
                color: subject === option ? 'var(--primary-fg)' : 'var(--text-secondary)',
                borderColor: 'var(--border)',
              }}
            >
              {option}
            </button>
          ))}
          <button className="shrink-0 flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold text-text-secondary" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="surface-card h-64 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((person, index) => {
            const color = ACCENTS[index % ACCENTS.length]
            const id = person.userId
            const isLiked = liked.has(id)
            const isEligible = person.isEligible !== false;
            const personSubjects = [...new Set(person.subjectsTaught ?? [])] as string[]
            
            return (
              <Card key={id} className="flex flex-col p-3 md:p-5">
                <div className="mb-3 md:mb-4 flex items-start justify-between gap-2 md:gap-3">
                  <div className="flex min-w-0 items-start gap-2 md:gap-3">
                    <div className="flex h-9 w-9 md:h-12 md:w-12 flex-shrink-0 items-center justify-center rounded-lg md:rounded-xl text-xs md:text-sm font-bold" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}>
                      {`${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs md:text-sm font-semibold text-text-primary">
                        {person.firstName} {person.lastName}
                        {person.isVerified && <CheckCircle2 className="ml-0.5 md:ml-1 inline h-3 w-3 md:h-3.5 md:w-3.5 text-accent-mint-fg" />}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-current text-accent-sun-fg" />
                          <span className="text-[10px] md:text-xs font-semibold text-text-primary">{person.avgRating ?? 'New'}</span>
                          <span className="text-[10px] md:text-xs text-text-muted">({person.ratingCount ?? 0})</span>
                        </div>
                        {person.capacity != null && (
                          <div className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-text-secondary">
                            <Users className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            <span>{person.assignedCount ?? 0}/{person.capacity}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setLiked(prev => {
                      const next = new Set(prev)
                      next.has(id) ? next.delete(id) : next.add(id)
                      return next
                    })}
                    className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg flex-shrink-0"
                    style={{ color: isLiked ? 'var(--accent-coral-fg)' : 'var(--text-muted)', background: isLiked ? 'var(--accent-coral-bg)' : 'transparent' }}
                  >
                    <Heart className="h-3 w-3 md:h-4 md:w-4" fill={isLiked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <p className="mb-3 md:mb-4 line-clamp-2 md:line-clamp-3 text-[11px] md:text-xs leading-relaxed text-text-secondary">{person.bio ?? 'No bio yet.'}</p>

                <div className="mb-3 md:mb-4 flex flex-wrap gap-1">
                  {personSubjects.slice(0, 2).map((item, idx) => <Badge key={`${item}-${idx}`} color={color as any} size="sm">{item}</Badge>)}
                </div>

                <div className="mb-3 md:mb-4 flex items-center justify-between border-y py-2 md:py-3" style={{ borderColor: 'var(--border)' }}>
                  <span className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs text-accent-mint-fg"><CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5" /> {Math.round((person.score ?? 0) * 100)}% match</span>
                  <span className="font-bold text-xs md:text-sm text-text-primary">
                    {`₦${Number(person.hourlyRate ?? 0).toLocaleString()}`}
                    <span className="text-[10px] md:text-xs font-normal text-text-muted">/hr</span>
                  </span>
                </div>

                <div className="mt-auto flex gap-1.5 md:gap-2 relative group">
                  <Button variant="secondary" size="sm" className="flex-1 !text-[11px] md:!text-xs" onClick={() => setMessageTarget(person)}>
                    <MessageSquare className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  </Button>
                  <Button size="sm" className="flex-1 !text-[11px] md:!text-xs" onClick={() => setBookTarget(person)} disabled={!isEligible}>
                    Book
                  </Button>
                  {!isEligible && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {person.reason || 'Tutor is currently full'}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {bookTarget && (
        <BookSessionModal
          isOpen={!!bookTarget}
          onClose={() => setBookTarget(null)}
          onSuccess={(session) => {
            addToast(`Session request sent to ${bookTarget.firstName}!`, 'success')
            setBookTarget(null)
          }}
          onError={(msg) => addToast(msg, 'error')}
          tutorId={bookTarget.userId}
          tutorName={`${bookTarget.firstName} ${bookTarget.lastName}`}
          subjects={bookTarget.subjectsTaught}
        />
      )}

      {messageTarget && (
        <MessageModal
          isOpen={!!messageTarget}
          onClose={() => setMessageTarget(null)}
          otherUserId={messageTarget.userId}
          otherUserName={`${messageTarget.firstName} ${messageTarget.lastName}`}
          otherUserVerified={messageTarget.isVerified}
        />
      )}
    </div>
  )
}
