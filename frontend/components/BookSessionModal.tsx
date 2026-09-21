'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Dropdown } from './Dropdown'
import {
  bookSession,
  requestSessionSeries,
  type BookSessionPayload,
  type SessionItem,
  type SessionRecurrence,
  type SessionSeriesPayload,
} from '@/lib/api/sessions'
import { getTutorSlots } from '@/lib/api/notifications'
import { selectTutor } from '@/lib/api/users'
import { apiErrorText } from '@/lib/api/errors'
import {
  WEEKDAY_LABELS,
  buildOccurrences,
  describeSchedule,
  hasStudiedBefore,
  requestLabel,
  seriesEndsOn,
  toOccurrencePayload,
} from '@/lib/session-schedule'
import { Calendar, Clock, Plus, Repeat, Trash2 } from 'lucide-react'

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
  /**
   * The pair's existing sessions, when the caller already has them. Used only to phrase
   * the request: a tutor who has taught this student gets "Request new session".
   */
  previousSessions?: SessionItem[]
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
  previousSessions,
}: BookSessionModalProps) {
  const returning = useMemo(
    () => hasStudiedBefore(previousSessions ?? [], { tutorId, studentId }),
    [previousSessions, tutorId, studentId],
  )
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
  const [mode, setMode] = useState<'days' | 'repeat'>('days')
  const [recurrence, setRecurrence] = useState<SessionRecurrence>('weekdays')
  const [weekdays, setWeekdays] = useState<number[]>([
    tomorrow.getDay() === 0 ? 1 : tomorrow.getDay(),
  ])
  const [weeks, setWeeks] = useState('4')
  const [startDate, setStartDate] = useState(tomorrow.toISOString().slice(0, 10))
  const [timeOfDay, setTimeOfDay] = useState('15:00')
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

  const durationMinutes = parseInt(duration, 10)
  const schedule = useMemo(
    () => ({
      startDate,
      recurrence,
      weekdays: recurrence === 'daily' ? [] : weekdays,
      weeks: Number(weeks),
      timeOfDay,
      durationMinutes,
    }),
    [startDate, recurrence, weekdays, weeks, timeOfDay, durationMinutes],
  )
  // Regenerated whenever the pattern changes, so the preview count is never a guess.
  const occurrences = useMemo(() => buildOccurrences(schedule), [schedule])

  function toggleWeekday(day: number) {
    setWeekdays(prev =>
      prev.includes(day) ? prev.filter(value => value !== day) : [...prev, day].sort((a, b) => a - b),
    )
  }

  /**
   * Requests the block. One series row and one real session per occurrence, so every
   * later action — accept, propose another time, decline, complete — still works a day
   * at a time, and the counterparty answers the whole block in one tap if they want.
   */
  async function handleSeries() {
    if (recurrence !== 'daily' && weekdays.length === 0) {
      onError('Choose at least one day for the repeating request')
      return
    }
    if (occurrences.length === 0) {
      onError('That schedule has no upcoming sessions — pick a later start date')
      return
    }

    setLoading(true)
    try {
      if (!studentId) await selectTutor(tutorId)
      const payload: SessionSeriesPayload = {
        tutorId,
        subject,
        recurrence,
        timeOfDay,
        durationMinutes,
        startsOn: startDate,
        endsOn: seriesEndsOn(schedule),
        weeks: Number(weeks),
        occurrences: toOccurrencePayload(occurrences, durationMinutes),
      }
      if (recurrence !== 'daily') payload.weekdays = [...weekdays].sort((a, b) => a - b)
      if (studentId) payload.studentId = studentId

      const result = await requestSessionSeries(payload)
      onSuccess(result.sessions)
      onClose()
    } catch (err) {
      onError(apiErrorText(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleBook() {
    if (mode === 'repeat') return handleSeries()

    const now = new Date()
    const requested = slots.map((slot) => ({
      slot,
      startAt: new Date(`${slot.date}T${slot.hour.padStart(2, '0')}:${slot.min.padStart(2, '0')}:00`),
    }))

    const past = requested.find(({ startAt }) => startAt <= now)
    if (past) {
      onError(`Start time must be in the future (${past.slot.date})`)
      return
    }

    const taken = requested.find(({ slot }) => isTimeOccupied(slot.date, slot.hour, slot.min))
    if (taken) {
      onError(`The selected time on ${taken.slot.date} is occupied`)
      return
    }

    setLoading(true)
    try {
      // A student may hold only one assignment (Algorithm.md §6.1), so this runs
      // once for the whole booking — calling it per slot would fail on slot two
      // with sessions already committed.
      if (!studentId) {
        await selectTutor(tutorId)
      }

      const results = []
      for (const { slot, startAt } of requested) {
        const payload: BookSessionPayload = {
          tutorId,
          subject,
          startAt: startAt.toISOString(),
          endAt: new Date(startAt.getTime() + parseInt(duration) * 60000).toISOString(),
        }
        if (studentId) payload.studentId = studentId
        results.push(await bookSession(payload))
      }
      onSuccess(results)
      onClose()
    } catch (err) {
      onError(apiErrorText(err))
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={returning ? `Request a new session with ${tutorName}` : `Request a session with ${tutorName}`}
      size="md"
    >
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

        {/* One-off days and a repeating block are different asks, so the choice is made
            before the schedule, not after it. */}
        <div className="flex gap-1.5 rounded-lg p-1" style={{ background: 'var(--surface-2)' }}>
          {([
            { value: 'days', label: 'Specific days' },
            { value: 'repeat', label: 'Repeats' },
          ] as const).map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              aria-pressed={mode === option.value}
              className="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: mode === option.value ? 'var(--surface)' : 'transparent',
                color: mode === option.value ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === option.value ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {option.value === 'repeat' ? (
                <span className="inline-flex items-center gap-1">
                  <Repeat className="w-3 h-3" /> {option.label}
                </span>
              ) : (
                option.label
              )}
            </button>
          ))}
        </div>

        {mode === 'repeat' && (
          <div className="space-y-3 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
            <div className="flex flex-wrap gap-1.5">
              {([
                { value: 'daily', label: 'Every day' },
                { value: 'weekdays', label: 'Weekdays' },
                { value: 'weekly', label: 'Weekly' },
              ] as const).map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRecurrence(option.value)}
                  aria-pressed={recurrence === option.value}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                  style={{
                    background: recurrence === option.value ? 'var(--primary)' : 'var(--surface)',
                    color: recurrence === option.value ? 'var(--primary-fg)' : 'var(--text-secondary)',
                    borderColor: recurrence === option.value ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {recurrence !== 'daily' && (
              <div className="flex flex-wrap gap-1">
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    aria-pressed={weekdays.includes(day)}
                    className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                    style={{
                      background: weekdays.includes(day) ? 'var(--primary-subtle)' : 'var(--surface)',
                      color: weekdays.includes(day) ? 'var(--primary)' : 'var(--text-muted)',
                      borderColor: weekdays.includes(day) ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex-1">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Starts
                </span>
                <input
                  type="date"
                  value={startDate}
                  min={todayString()}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                  style={{ background: 'var(--surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                />
              </label>

              <label className="flex-1">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  At
                </span>
                <Dropdown
                  value={timeOfDay}
                  onChange={setTimeOfDay}
                  options={TIME_OPTIONS.map(t => ({ value: t.value, label: t.label }))}
                  placeholder="HH:MM"
                />
              </label>

              <label className="sm:w-28">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  For
                </span>
                <Dropdown
                  value={weeks}
                  onChange={setWeeks}
                  options={Array.from({ length: 12 }, (_, index) => ({
                    value: String(index + 1),
                    label: `${index + 1} week${index === 0 ? '' : 's'}`,
                  }))}
                />
              </label>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {describeSchedule(schedule, occurrences.length)}.
              {occurrences.length > 0 && (
                <> First on {occurrences[0].toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, last on {occurrences[occurrences.length - 1].toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}.</>
              )}
            </p>
          </div>
        )}

        <div className={mode === 'repeat' ? 'hidden' : 'space-y-3'}>
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
            {loading
              ? 'Requesting...'
              : mode === 'repeat'
                ? `Request ${occurrences.length} recurring session${occurrences.length === 1 ? '' : 's'}`
                : requestLabel(returning, slots.length)}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
