'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Dropdown } from './Dropdown'
import { bookSession, type BookSessionPayload } from '@/lib/api/sessions'
import { getTutorSlots } from '@/lib/api/notifications'
import { selectTutor } from '@/lib/api/users'
import { Calendar, Clock, Plus, Trash2, AlertCircle } from 'lucide-react'

interface TimeSlot {
  date: string
  hour: string
  min: string
}

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

function todayString() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function generateTimeOptions() {
  const times: { value: string; label: string }[] = []
  for (let h = 6; h <= 22; h++) {
    for (const m of ['00', '15', '30', '45']) {
      const label = `${String(h).padStart(2, '0')}:${m}`
      times.push({ value: `${h}:${m}`, label })
    }
  }
  return times
}
const TIME_OPTIONS = generateTimeOptions()

export function BookSessionModal({
  isOpen, onClose, onSuccess, onError,
  tutorId, tutorName, subject: defaultSubject, subjects, tutorSubjects, studentId,
}: BookSessionModalProps) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const visibleSubjects = useMemo(() => {
    if (!subjects || subjects.length === 0) return subjects
    if (!tutorSubjects || tutorSubjects.length === 0) return subjects
    return subjects.filter(s =>
      tutorSubjects.some(t => t.toLowerCase() === s.toLowerCase()),
    )
  }, [subjects, tutorSubjects])

  const noCompatibleSubjects = !!tutorSubjects && (!visibleSubjects || visibleSubjects.length === 0)

  const [subject, setSubject] = useState(defaultSubject ?? subjects?.[0] ?? 'General Tutoring')
  const [slots, setSlots] = useState<TimeSlot[]>([
    { date: tomorrow.toISOString().slice(0, 10), hour: '15', min: '00' },
  ])
  const [duration, setDuration] = useState('60')
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<{startAt: string; endAt: string}[]>([])

  // Fetch occupied slots for the earliest selected date
  useEffect(() => {
    if (!isOpen || !tutorId || slots.length === 0) return
    setSlotsLoading(true)
    const from = new Date(slots[0].date)
    from.setHours(0, 0, 0, 0)
    const to = new Date(slots[0].date)
    to.setHours(23, 59, 59, 999)

    getTutorSlots(tutorId, from.toISOString(), to.toISOString())
      .then(res => setBookedSlots(res.bookedSlots))
      .catch(() => {})
      .finally(() => setSlotsLoading(false))
  }, [isOpen, tutorId, slots])

  function isTimeOccupied(date: string, hour: string, min: string) {
    const checkTime = new Date(`${date}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:00`)
    const checkEnd = new Date(checkTime.getTime() + parseInt(duration) * 60000)
    return bookedSlots.some(slot => {
      const s = new Date(slot.startAt)
      const e = new Date(slot.endAt)
      return checkTime < e && checkEnd > s
    })
  }

  function isTimeInPast(date: string, hour: string, min: string) {
    return new Date(`${date}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:00`) <= new Date()
  }

  function addSlot() {
    setSlots(prev => [
      ...prev,
      { date: prev[prev.length - 1].date, hour: '15', min: '00' },
    ])
  }

  function removeSlot(idx: number) {
    setSlots(prev => prev.filter((_, i) => i !== idx))
  }

  function updateSlot(idx: number, field: keyof TimeSlot, val: string) {
    setSlots(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)))
  }

  async function handleBook() {
    setLoading(true)
    try {
      const results = []
      for (const slot of slots) {
        const startAt = new Date(`${slot.date}T${slot.hour.padStart(2, '0')}:${slot.min.padStart(2, '0')}:00`)
        const endAt = new Date(startAt.getTime() + parseInt(duration) * 60000)

        if (startAt <= new Date()) {
          onError(`Start time must be in the future (${slot.date})`)
          setLoading(false)
          return
        }

        if (isTimeOccupied(slot.date, slot.hour, slot.min)) {
          onError(`The selected time on ${slot.date} is occupied`)
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
        results.push(session)
      }
      onSuccess(results)
      onClose()
    } catch (err: any) {
      onError(err?.response?.data?.message ?? 'Could not book session.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (visibleSubjects && visibleSubjects.length > 0) {
      setSubject(s => (visibleSubjects.includes(s) ? s : visibleSubjects[0]))
    }
  }, [visibleSubjects])

  const durations = [
    { value: '30', label: '30 min' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
  ]

  const hhmmOptions = TIME_OPTIONS.map(t => ({
    ...t,
    disabled: (s: TimeSlot) => isTimeInPast(s.date, t.value.split(':')[0], t.value.split(':')[1]) || isTimeOccupied(s.date, t.value.split(':')[0], t.value.split(':')[1]),
  }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Book with ${tutorName}`} size="md">
      <div className="space-y-5">
        {noCompatibleSubjects && (
          <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
            You don&apos;t teach any of this student&apos;s requested subjects.
          </div>
        )}

        {visibleSubjects && visibleSubjects.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Subject</p>
            <div className="flex flex-wrap gap-1.5">
              {visibleSubjects.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                  style={{
                    background: subject === s ? 'var(--primary)' : 'var(--surface-2)',
                    color: subject === s ? 'var(--primary-fg)' : 'var(--text-secondary)',
                    borderColor: subject === s ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <Dropdown
          label="Duration"
          value={duration}
          onChange={setDuration}
          options={durations}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              <Clock className="w-3 h-3 inline mr-1" />Time Slots ({slots.length})
            </p>
            <button
              type="button"
              onClick={addSlot}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
            >
              <Plus className="w-3 h-3" /> Add Day
            </button>
          </div>

          {slots.map((slot, idx) => (
            <div key={idx} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    value={slot.date}
                    onChange={(e) => updateSlot(idx, 'date', e.target.value)}
                    min={todayString()}
                    className="flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border)',
                    }}
                  />
                </div>

                <Dropdown
                  value={`${slot.hour}:${slot.min}`}
                  onChange={(val) => {
                    const [h, m] = val.split(':')
                    updateSlot(idx, 'hour', h)
                    updateSlot(idx, 'min', m)
                  }}
                  options={TIME_OPTIONS.map(t => ({
                    value: t.value,
                    label: `${t.label}${isTimeInPast(slot.date, t.value.split(':')[0], t.value.split(':')[1]) ? ' (past)' : ''}${isTimeOccupied(slot.date, t.value.split(':')[0], t.value.split(':')[1]) ? ' (booked)' : ''}`,
                  }))}
                  placeholder="HH:MM"
                />
              </div>

              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSlot(idx)}
                  className="p-2 rounded-lg transition-all cursor-pointer flex-shrink-0 mt-1"
                  style={{ color: 'var(--accent-coral-fg)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-coral-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="md" className="flex-1" onClick={handleBook} loading={loading} disabled={noCompatibleSubjects}>
            {loading ? 'Booking...' : `Request ${slots.length > 1 ? `${slots.length} Sessions` : 'Session'}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
