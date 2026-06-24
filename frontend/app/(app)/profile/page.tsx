'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/Badge'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { getMySessions, type SessionItem } from '@/lib/api/sessions'
import { getMe } from '@/lib/api/users'
import { useAuthStore } from '@/lib/store/authStore'
import { BookOpen, Calendar, Edit2, MapPin, MessageCircle, Star, Target } from 'lucide-react'

export default function ProfilePage() {
  const storeUser = useAuthStore(s => s.user)
  const storeStudent = useAuthStore(s => s.studentProfile)
  const storeTutor = useAuthStore(s => s.tutorProfile)
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<SessionItem[]>([])

  useEffect(() => {
    getMe().then(setProfile).catch(() => undefined)
    getMySessions().then(setSessions).catch(() => undefined)
  }, [])

  const user = profile?.user ?? storeUser
  const student = profile?.studentProfile ?? storeStudent
  const tutor = profile?.tutorProfile ?? storeTutor
  const role = user?.role ?? 'student'
  const subjects = role === 'tutor'
    ? tutor?.subjectsTaught ?? []
    : student?.subjects?.length ? student.subjects : [student?.requiredSubject].filter(Boolean)
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
  const completed = sessions.filter(session => session.status === 'completed')
  const upcoming = sessions.filter(session => session.status !== 'completed' && session.status !== 'cancelled')
  const currentPeople = useMemo(() => {
    const names = new Map<string, { name: string; subject: string }>()
    sessions.forEach(session => {
      if (role === 'tutor') names.set(session.studentId, { name: session.studentName ?? 'Student', subject: session.subject })
      else names.set(session.tutorId, { name: session.tutorName ?? 'Tutor', subject: session.subject })
    })
    return Array.from(names.values()).slice(0, 5)
  }, [sessions, role])

  return (
    <div className="space-y-8 py-3">
      <Card className="relative overflow-hidden p-8">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full border-4 border-surface bg-accent-lavender-bg font-heading text-3xl font-bold text-accent-lavender-fg">
            {initials}
          </div>
          <div className="flex-1">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="font-heading text-3xl font-bold tracking-tight text-text-primary">{user?.firstName} {user?.lastName}</h1>
                <div className="mt-2 flex items-center gap-2">
                  <Badge color={role === 'tutor' ? 'mint' : 'lavender'} size="sm">{role}</Badge>
                  {student?.gradeLevel && <span className="text-sm font-semibold text-text-secondary">Grade {student.gradeLevel}</span>}
                  {tutor?.avgRating && <span className="text-sm font-semibold text-text-secondary">{(Number(tutor.avgRating) * 5).toFixed(1)}/5</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm"><Edit2 className="h-3.5 w-3.5" /> Edit Profile</Button>
                <Button size="sm"><MessageCircle className="h-3.5 w-3.5" /> Message</Button>
              </div>
            </div>

            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-text-secondary">
              {student?.bio ?? tutor?.bio ?? 'No profile bio has been added yet.'}
            </p>

            <div className="flex flex-wrap items-center gap-8">
              {[
                { label: 'Sessions', value: String(sessions.length) },
                { label: role === 'tutor' ? 'Students' : 'Upcoming', value: String(role === 'tutor' ? currentPeople.length : upcoming.length) },
                { label: role === 'tutor' ? 'Completed' : 'Hours Learned', value: role === 'tutor' ? String(completed.length) : String(student?.totalHoursLearned ?? 0) },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="font-heading text-2xl font-bold text-text-primary">{stat.value}</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-5 font-heading text-xl font-bold text-text-primary">About</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Target className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Goal</p>
                  <p className="text-sm font-medium text-text-primary">{student?.learningGoals ?? 'No learning goal set.'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-4 w-4 text-accent-mint-fg" />
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">{role === 'tutor' ? 'Subjects Taught' : 'Subjects'}</p>
                  <div className="flex flex-wrap gap-2">{subjects.map((subject: string) => <Badge key={subject} color="lavender" size="sm">{subject}</Badge>)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-accent-coral-fg" />
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Location</p>
                  <p className="text-sm font-medium text-text-primary">{user?.region ?? 'No region set'} · {user?.timezone ?? 'UTC'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-5 font-heading text-xl font-bold text-text-primary">Recent Sessions</h2>
            <div className="space-y-3">
              {sessions.slice(0, 5).map(session => (
                <div key={session.id} className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-sky-bg text-xs font-bold text-accent-sky-fg">
                      {(role === 'tutor' ? session.studentName : session.tutorName)?.split(' ').map(part => part[0]).join('').slice(0, 2) ?? 'S'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{role === 'tutor' ? session.studentName : session.tutorName}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">{session.subject} · {new Date(session.startAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge color={session.status === 'completed' ? 'mint' : 'sky'} size="sm">{session.status}</Badge>
                </div>
              ))}
              {sessions.length === 0 && <p className="text-sm text-text-secondary">No sessions yet.</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-5 font-heading text-lg font-bold text-text-primary">{role === 'tutor' ? 'Students' : 'Current Tutors'}</h2>
            <div className="space-y-4">
              {currentPeople.map(person => (
                <div key={`${person.name}-${person.subject}`} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-mint-bg text-xs font-bold text-accent-mint-fg">{person.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{person.name}</p>
                    <p className="text-xs text-text-secondary">{person.subject}</p>
                  </div>
                </div>
              ))}
              {currentPeople.length === 0 && <p className="text-sm text-text-secondary">No active matches yet.</p>}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-5 font-heading text-lg font-bold text-text-primary">Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 rounded-xl bg-surface-2 p-3"><Calendar className="h-4 w-4 text-accent-lavender-fg" /><span className="text-xs font-semibold text-text-primary">{upcoming.length} upcoming sessions</span></div>
              <div className="flex items-center gap-2.5 rounded-xl bg-surface-2 p-3"><Star className="h-4 w-4 text-accent-sun-fg" /><span className="text-xs font-semibold text-text-primary">{completed.length} completed sessions</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
