'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import { bookSession, type BookSessionPayload } from '@/lib/api/sessions'
import { selectTutor } from '@/lib/api/users'
import { Calendar, Clock } from 'lucide-react'

interface BookSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (session: any) => void
  onError: (msg: string) => void
  tutorId: string
  tutorName: string
  subject?: string
  subjects?: string[]
  tutorSubjects?: string[]
  studentId?: string
}

export function BookSessionModal({
  isOpen, onClose, onSuccess, onError,
  tutorId, tutorName, subject: defaultSubject, subjects, tutorSubjects, studentId,
}: BookSessionModalProps) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(15, 0, 0, 0)
  const endDefault = new Date(tomorrow)
  endDefault.setHours(endDefault.getHours() + 1)

  const visibleSubjects = useMemo(() => {
    if (!subjects || subjects.length === 0) return subjects
    if (!tutorSubjects || tutorSubjects.length === 0) return subjects
    return subjects.filter(s =>
      tutorSubjects.some(t => t.toLowerCase() === s.toLowerCase()),
    )
  }, [subjects, tutorSubjects])

  const noCompatibleSubjects = !!tutorSubjects && (!visibleSubjects || visibleSubjects.length === 0)

  const [subject, setSubject] = useState(defaultSubject ?? subjects?.[0] ?? 'General Tutoring')
  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 10))
  const [startHour, setStartHour] = useState('15')
  const [startMin, setStartMin] = useState('00')
  const [duration, setDuration] = useState('60')
  const [loading, setLoading] = useState(false)

  // Reset subject to first visible option when the available subjects change
  useEffect(() => {
    if (visibleSubjects && visibleSubjects.length > 0) {
      setSubject(s => (visibleSubjects.includes(s) ? s : visibleSubjects[0]))
    }
  }, [visibleSubjects])

  async function handleBook() {
    setLoading(true)
    try {
      const startAt = new Date(`${date}T${startHour.padStart(2, '0')}:${startMin.padStart(2, '0')}:00`)
      const endAt = new Date(startAt.getTime() + parseInt(duration) * 60000)

      if (startAt <= new Date()) {
        onError('Start time must be in the future')
        setLoading(false)
        return
      }

      const payload: BookSessionPayload = {
        tutorId,
        subject,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      }
      if (studentId) payload.studentId = studentId

      if (!studentId) {
        await selectTutor(tutorId)
      }
      const session = await bookSession(payload)
      onSuccess(session)
      onClose()
    } catch (err: any) {
      onError(err?.response?.data?.message ?? 'Could not book session.')
    } finally {
      setLoading(false)
    }
  }

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 8))
  const durations = [
    { value: '30', label: '30 min' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Book with ${tutorName}`} size="sm">
      <div className="space-y-4">
        {noCompatibleSubjects && (
          <div className="rounded-lg bg-accent-coral-bg p-3 text-xs text-accent-coral-fg">
            You don't teach any of this student's requested subjects.
          </div>
        )}

        {visibleSubjects && visibleSubjects.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Subject</p>
            <div className="flex flex-wrap gap-1.5">
              {visibleSubjects.map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: subject === s ? 'var(--primary)' : 'var(--surface-2)',
                    color: subject === s ? 'var(--primary-fg)' : 'var(--text-secondary)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
              <Clock className="w-3 h-3 inline mr-1" />Start Time
            </p>
            <div className="flex gap-1">
              <select
                value={startHour}
                onChange={e => setStartHour(e.target.value)}
                className="flex-1 rounded-lg border bg-surface-2 px-2 py-2 text-xs text-text-primary outline-none"
                style={{ borderColor: 'var(--border)' }}
              >
                {hours.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
              <select
                value={startMin}
                onChange={e => setStartMin(e.target.value)}
                className="flex-1 rounded-lg border bg-surface-2 px-2 py-2 text-xs text-text-primary outline-none"
                style={{ borderColor: 'var(--border)' }}
              >
                <option value="00">:00</option>
                <option value="30">:30</option>
              </select>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />Duration
            </p>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full rounded-lg border bg-surface-2 px-2 py-2 text-xs text-text-primary outline-none"
              style={{ borderColor: 'var(--border)' }}
            >
              {durations.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="md" className="flex-1" onClick={handleBook} loading={loading} disabled={noCompatibleSubjects}>
            {loading ? 'Booking...' : 'Request Session'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
