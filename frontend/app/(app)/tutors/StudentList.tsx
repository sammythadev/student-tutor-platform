'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Badge } from '@/components/Badge'
import { BookSessionModal } from '@/components/BookSessionModal'
import { MessageModal } from '@/components/MessageModal'
import { getStudentCandidates, type StudentCandidate } from '@/lib/api/users'
import { apiErrorText } from '@/lib/api/errors'
import { accentFor, matchStrength, formatNaira } from '@/lib/ui'
import { useAuthStore } from '@/lib/store/authStore'
import {
  Heart, Search, MessageSquare, Calendar, CheckCircle2, Sparkles, X, AlertCircle,
  GraduationCap, Wallet, MapPin, ArrowRight,
} from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { Pagination } from '@/components/Pagination'
import { MatchRing } from '@/components/MatchRing'

const PER_PAGE = 12
const EASE = [0.16, 1, 0.3, 1] as const

// ─── Why this learner surfaced — the "why recommended" layer ───
function studentReasons(s: StudentCandidate): string[] {
  const reasons: string[] = []
  if (s.requiredSubject) reasons.push(`Needs ${s.requiredSubject}`)
  if (s.gradeLevel) reasons.push(`Grade ${s.gradeLevel}`)
  if (s.budget !== null && s.budget !== undefined) reasons.push(`Budget ${formatNaira(s.budget)}`)
  return reasons.slice(0, 3)
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 w-24 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
          <div className="h-3 w-16 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        </div>
        <div className="h-12 w-12 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-full rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
        <div className="h-2.5 w-3/4 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
      </div>
      <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
      <div className="h-px w-full" style={{ background: 'var(--border)' }} />
      <div className="h-11 w-full rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
    </div>
  )
}

export function StudentList() {
  const user = useAuthStore(s => s.user)
  const tutorProfile = useAuthStore(s => s.tutorProfile)
  const [candidates, setCandidates]   = useState<StudentCandidate[]>([])
  const [liked, setLiked]             = useState<Set<string>>(new Set())
  const [search, setSearch]           = useState('')
  const [subject, setSubject]         = useState('All')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [bookTarget, setBookTarget]   = useState<StudentCandidate | null>(null)
  const [messageTarget, setMessageTarget] = useState<StudentCandidate | null>(null)
  const [page, setPage]               = useState(1)
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
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, subject])

  // Strongest candidate spotlighted so the primary action sits above the fold.
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

  return (
    <div className="space-y-7 py-3">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-caps" style={{ color: 'var(--accent)' }}>Learners for you</span>
          <h1 className="text-display text-4xl mt-1.5" style={{ color: 'var(--text-primary)' }}>
            Find students
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {loading ? 'Matching students to your expertise…' : `${filtered.length} students looking for a tutor like you`}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)', border: '1px solid var(--accent-coral-bg)' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── Search + subject chips ── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students or subjects…"
            className="h-12 w-full rounded-2xl pl-11 pr-4 text-sm outline-none transition-all"
            style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-thin">
          {subjects.map(option => (
            <button
              key={option}
              onClick={() => setSubject(option)}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
              style={{
                background: subject === option ? 'var(--primary)' : 'var(--surface)',
                color: subject === option ? 'var(--primary-fg)' : 'var(--text-secondary)',
                border: `1px solid ${subject === option ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* ── Featured recommendation — top learner, primary action above the fold ── */}
      {featured && (() => {
        const color = accentFor(featured.studentId)
        const matchPct = Math.round((featured.score ?? 0) * 100)
        const strength = matchStrength(featured.score ?? 0)
        const reasons = studentReasons(featured)
        const isEligible = featured.isEligible !== false
        const fSubjects = [...new Set([...(featured.subjects ?? []), featured.requiredSubject].filter(Boolean))] as string[]
        return (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative overflow-hidden rounded-3xl"
            style={{ background: 'linear-gradient(150deg, #241C0C 0%, #1A1408 55%, #14100A 100%)', boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Ambient glows + grain to match the hero language */}
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(201,162,75,0.24), transparent 65%)', filter: 'blur(20px)' }} />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(47,122,99,0.22), transparent 65%)', filter: 'blur(20px)' }} />
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(230,200,126,0.35), transparent)' }} />

            <div className="relative z-10 flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
              {/* Identity */}
              <div className="flex items-start gap-4 md:min-w-0 md:flex-1">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-xl font-bold md:h-[72px] md:w-[72px]"
                  style={{ background: 'rgba(242,237,227,0.08)', color: '#F4F0E8', border: '1px solid rgba(242,237,227,0.16)' }}>
                  {featured.firstName?.[0]}{featured.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: '#E6C87E' }} />
                    <span className="label-caps" style={{ color: '#D9B868' }}>Top match for you</span>
                  </div>
                  <h2 className="text-display mt-1.5 text-2xl md:text-[1.75rem]" style={{ color: '#F4F0E8' }}>
                    {featured.firstName} {featured.lastName}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: '#AEB6AA' }}>
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span className="font-semibold" style={{ color: '#F4F0E8' }}>Grade {featured.gradeLevel}</span>
                    </span>
                    {featured.region && (
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{featured.region}</span>
                    )}
                    {featured.budget !== null && featured.budget !== undefined && (
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5" />
                        <span className="font-semibold tabular-nums" style={{ color: '#F4F0E8' }}>{formatNaira(featured.budget)}</span>/mo
                      </span>
                    )}
                  </div>
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
                  <MatchRing pct={matchPct} accent={strength.accent} size={64} stroke={5} />
                  <div className="md:hidden">
                    <p className="text-sm font-bold" style={{ color: '#F4F0E8' }}>{strength.label}</p>
                    <p className="text-xs" style={{ color: '#AEB6AA' }}>fit for your subjects</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:w-52">
                  <div className="relative group/btn">
                    <button
                      onClick={() => setBookTarget(featured)}
                      disabled={!isEligible}
                      className="rounded-pill inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-bold transition-all cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: '#F4F0E8', color: '#241C0C', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                    >
                      <Calendar className="h-4 w-4" /> Reach Out
                    </button>
                    {!isEligible && (
                      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-semibold opacity-0 group-hover/btn:opacity-100 transition-opacity"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)', zIndex: 10 }}>
                        {featured.reason || 'Not eligible right now'}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setMessageTarget(featured)}
                    className="rounded-pill inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]"
                    style={{ background: 'rgba(242,237,227,0.08)', color: '#F4F0E8', border: '1px solid rgba(242,237,227,0.16)' }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Message
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        )
      })()}

      {/* ── Section label ── */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {featured ? 'More students for you' : 'Students'}
          </h2>
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>
      )}

      {/* ── Student grid ── */}
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
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No students match your filters</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Try adjusting your search or subject filter</p>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gridItems.map((person, index) => {
              const color = accentFor(person.studentId)
              const id = person.studentId
              const isLiked = liked.has(id)
              const isEligible = person.isEligible !== false
              const personSubjects = [...new Set([...(person.subjects ?? []), person.requiredSubject].filter(Boolean))] as string[]
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
                  {/* Soft corner accent wash */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: `var(--accent-${color}-bg)`, filter: 'blur(36px)' }}
                  />

                  <div className="relative flex flex-col flex-1 p-5 space-y-3.5">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-base font-bold"
                        style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)`, boxShadow: 'inset 0 0 0 1px var(--border)' }}
                      >
                        {person.firstName?.[0]}{person.lastName?.[0]}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="truncate text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                          {person.firstName} {person.lastName}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {person.gradeLevel ? `Grade ${person.gradeLevel}` : 'Student'} · {person.region ?? 'Remote'}
                        </p>
                      </div>
                      {/* Match ring — recommendation signal */}
                      <MatchRing pct={matchPct} accent={strength.accent} size={48} />
                    </div>

                    {/* Needs — the fields the matcher actually keys on */}
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      Grade {person.gradeLevel} · needs <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{person.requiredSubject}</span>
                      {person.budget !== null && ` · budget ${formatNaira(person.budget)}`}
                    </p>

                    {/* Subjects */}
                    <div className="flex flex-wrap gap-1.5">
                      {personSubjects.slice(0, 3).map((s: string, i: number) => (
                        <Badge key={`${s}-${i}`} color={color} size="sm">{s}</Badge>
                      ))}
                    </div>

                    {/* Not eligible warning */}
                    {!isEligible && (
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{person.reason}</span>
                      </div>
                    )}

                    {/* Match + budget */}
                    <div className="flex items-center justify-between gap-2 py-3 mt-auto" style={{ borderTop: '1px solid var(--border)' }}>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{ background: `var(--accent-${strength.accent}-bg)`, color: `var(--accent-${strength.accent}-fg)` }}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {strength.label}
                      </span>
                      {person.budget && (
                        <span className="font-bold text-base tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          ₦{Number(person.budget).toLocaleString()}
                          <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>/mo</span>
                        </span>
                      )}
                    </div>

                    {/* CTAs — Reach Out is the anchor, kept inside the fold */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBookTarget(person)}
                        disabled={!isEligible}
                        className="rounded-pill inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                      >
                        <Calendar className="h-4 w-4" /> Reach Out
                      </button>
                      <button
                        onClick={() => setMessageTarget(person)}
                        aria-label={`Message ${person.firstName}`}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all hover:scale-105 cursor-pointer"
                        style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleLike(id)}
                        aria-label={isLiked ? 'Remove from saved' : 'Save student'}
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
          tutorId={user?.id ?? ''}
          tutorName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`}
          subjects={bookTarget.subjects}
          tutorSubjects={tutorProfile?.subjectsTaught}
          studentId={bookTarget.studentId}
        />
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
