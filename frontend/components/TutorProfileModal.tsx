'use client'

import { useEffect, useRef, useState } from 'react'
import { X, BookOpen, MapPin, Award, CheckCircle2, Send, ThumbsUp, Clock } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { StarRating } from '@/components/StarRating'
import { submitFeedback } from '@/lib/api/users'
import { getMySessions } from '@/lib/api/sessions'
import type { TutorCandidate } from '@/lib/api/users'
import { useAuthStore } from '@/lib/store/authStore'
import { useToast } from '@/lib/toast-context'

interface TutorProfileModalProps {
  tutor: TutorCandidate
  onClose: () => void
  onBook?: (tutor: TutorCandidate) => void
  onMessage?: (tutor: TutorCandidate) => void
}

export function TutorProfileModal({ tutor, onClose, onBook, onMessage }: TutorProfileModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore(s => s.user)
  const { addToast } = useToast()
  const [userRating, setUserRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [canRate, setCanRate] = useState(false)
  const [checkingSessions, setCheckingSessions] = useState(true)

  useEffect(() => {
    if (user?.role !== 'student' || !tutor.userId) {
      setCheckingSessions(false)
      return
    }
    getMySessions().then(sessions => {
      const hasCompleted = sessions.some(s => s.tutorId === tutor.userId && s.status === 'completed')
      setCanRate(hasCompleted)
    }).catch(() => {}).finally(() => setCheckingSessions(false))
  }, [user, tutor.userId])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  async function handleSubmitRating() {
    if (userRating < 1 || userRating > 5) return
    setSubmitting(true)
    try {
      const sessions = await getMySessions()
      const completedSession = sessions.find(s => s.tutorId === tutor.userId && s.status === 'completed')
      if (!completedSession) {
        addToast('Complete a session before rating this tutor.', 'error')
        return
      }
      await submitFeedback(completedSession.id, { rating: userRating })
      setSubmitted(true)
      addToast('Rating submitted!', 'success')
    } catch (err: any) {
      addToast(err?.response?.data?.message ?? 'Could not submit rating.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl animate-scale-in"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: 'linear-gradient(90deg, var(--accent-lavender-fg), var(--accent-sky-fg), var(--accent-mint-fg))' }}
        />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 pt-8">
          <div className="mb-6 flex items-start gap-4">
            <div
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-xl font-bold"
              style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}
            >
              {`${tutor.firstName?.[0] ?? ''}${tutor.lastName?.[0] ?? ''}`}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {tutor.firstName} {tutor.lastName}
                </h2>
                {tutor.isVerified && <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-mint-fg)' }} />}
              </div>
              <div className="mt-1">
                <StarRating rating={tutor.avgRating} count={tutor.ratingCount} size="sm" />
              </div>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            {tutor.bio && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tutor.bio}</p>
            )}

            <div className="flex flex-wrap gap-4">
              {tutor.subjectsTaught?.length > 0 && (
                <div className="flex-1 min-w-[140px]">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    <BookOpen className="mr-1 inline h-3 w-3" /> Subjects
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tutor.subjectsTaught.slice(0, 4).map((s, i) => (
                      <span key={`${s}-${i}`} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}>{s}</span>
                    ))}
                    {tutor.subjectsTaught.length > 4 && (
                      <span className="rounded-lg px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'var(--accent-sky-bg)', color: 'var(--accent-sky-fg)' }}>+{tutor.subjectsTaught.length - 4}</span>
                    )}
                  </div>
                </div>
              )}

              {tutor.region && (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    <MapPin className="mr-1 inline h-3 w-3" /> Location
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tutor.region}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-6 rounded-xl p-4" style={{ background: 'var(--surface-2)' }}>
              {tutor.experienceYears > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Experience</p>
                  <p className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    <Award className="h-3.5 w-3.5" style={{ color: 'var(--accent-sun-fg)' }} />
                    {tutor.experienceYears} years
                  </p>
                </div>
              )}
              {tutor.hourlyRate && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rate</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--accent-mint-fg)' }}>
                    ₦{Number(tutor.hourlyRate).toLocaleString()}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/hr</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {user?.role === 'student' && !submitted && (
            <div className="mb-6 rounded-xl p-4" style={{ background: 'var(--surface-2)' }}>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                <ThumbsUp className="mr-1 inline h-3.5 w-3.5" /> Rate this tutor
              </p>
              {checkingSessions ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Checking eligibility...</span>
                </div>
              ) : canRate ? (
                <div className="flex items-center gap-3">
                  <StarRating interactive size="lg" onRate={setUserRating} />
                  <Button size="sm" onClick={handleSubmitRating} disabled={userRating < 1 || submitting}>
                    {submitting ? 'Submitting...' : <><Send className="h-3 w-3" /> Submit</>}
                  </Button>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Clock className="h-3.5 w-3.5" />
                  Complete a session to rate this tutor
                </p>
              )}
            </div>
          )}

          {submitted && (
            <div className="mb-6 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--accent-mint-bg)' }}>
              <ThumbsUp className="h-4 w-4" style={{ color: 'var(--accent-mint-fg)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--accent-mint-fg)' }}>You rated this tutor {userRating}/5</span>
            </div>
          )}

          <div className="flex gap-3">
            {onBook && (
              <Button size="md" className="flex-1" onClick={() => onBook(tutor)} disabled={tutor.isEligible === false}>
                Book Session
              </Button>
            )}
            {onMessage && (
              <Button variant="secondary" size="md" className="flex-1" onClick={() => onMessage(tutor)}>
                Send Message
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
