'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/Badge'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { getMySessions, type SessionItem } from '@/lib/api/sessions'
import { getMe, updateMe, updateStudentPreferences, updateTutorPreferences } from '@/lib/api/users'
import { useAuthStore } from '@/lib/store/authStore'
import { BookOpen, Calendar, Edit2, MapPin, MessageCircle, Save, Target, X, Award, Clock, Users, Star, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { StarRating } from '@/components/StarRating'

export default function ProfilePage() {
  const storeUser = useAuthStore(s => s.user)
  const storeStudent = useAuthStore(s => s.studentProfile)
  const storeTutor = useAuthStore(s => s.tutorProfile)
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  const [form, setForm] = useState({
    firstName: '', lastName: '', bio: '', learningGoals: '', region: '', subjects: '', gradeLevel: '',
    experienceYears: '', hourlyRate: '',
  })

  useEffect(() => {
    getMe().then(data => {
      setProfile(data)
      setFormFromProfile(data)
    }).catch(() => undefined)
    getMySessions().then(setSessions).catch(() => undefined)
  }, [])

  function setFormFromProfile(data: any) {
    const u = data?.user ?? storeUser
    const s = data?.studentProfile ?? storeStudent
    const t = data?.tutorProfile ?? storeTutor
    setForm({
      firstName: u?.firstName ?? '', lastName: u?.lastName ?? '',
      bio: s?.bio ?? t?.bio ?? '',
      learningGoals: s?.learningGoals ?? '',
      region: u?.region ?? '',
      subjects: (s?.subjects ?? t?.subjectsTaught ?? []).join(', '),
      gradeLevel: s?.gradeLevel ?? '',
      experienceYears: t?.experienceYears?.toString() ?? '',
      hourlyRate: t?.hourlyRate?.toString() ?? '',
    })
  }

  const user = profile?.user ?? storeUser
  const student = profile?.studentProfile ?? storeStudent
  const tutor = profile?.tutorProfile ?? storeTutor
  const role = user?.role ?? 'student'
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
  const completed = sessions.filter(s => s.status === 'completed')
  const upcoming = sessions.filter(s => s.status !== 'completed' && s.status !== 'cancelled')

  const currentPeople = useMemo(() => {
    const names = new Map<string, { name: string; subject: string }>()
    sessions.forEach(session => {
      if (role === 'tutor') names.set(session.studentId, { name: session.studentName ?? 'Student', subject: session.subject })
      else names.set(session.tutorId, { name: session.tutorName ?? 'Tutor', subject: session.subject })
    })
    return Array.from(names.values()).slice(0, 5)
  }, [sessions, role])

  const subjects = role === 'tutor'
    ? (tutor?.subjectsTaught ?? [])
    : student?.subjects?.length ? student.subjects : [student?.requiredSubject].filter(Boolean)

  async function handleSave() {
    setSaving(true)
    try {
      const subjectsArr = form.subjects.split(',').map(s => s.trim()).filter(Boolean)
      const userPayload: any = {}
      if (form.firstName !== (user?.firstName ?? '')) userPayload.firstName = form.firstName
      if (form.lastName !== (user?.lastName ?? '')) userPayload.lastName = form.lastName
      if (form.region !== (user?.region ?? '')) userPayload.region = form.region
      if (Object.keys(userPayload).length > 0) await updateMe(userPayload)

      if (role === 'student') {
        await updateStudentPreferences({
          bio: form.bio || undefined,
          learningGoals: form.learningGoals || undefined,
          subjects: subjectsArr,
          gradeLevel: form.gradeLevel || undefined,
        })
      } else {
        await updateTutorPreferences({
          bio: form.bio || undefined,
          subjectsTaught: subjectsArr,
          experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
          hourlyRate: form.hourlyRate || undefined,
        })
      }

      const fresh = await getMe()
      setProfile(fresh)
      addToast('Profile updated!', 'success')
      setIsEditing(false)
    } catch (err: any) {
      addToast(err?.response?.data?.message ?? 'Could not update profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setFormFromProfile(profile)
    setIsEditing(false)
  }

  return (
    <div className="space-y-6 py-3">
      {/* Hero card */}
      <Card className="relative overflow-hidden p-8">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)', border: '4px solid var(--border)' }}>
            <span className="font-heading text-3xl font-bold">{initials}</span>
          </div>
          <div className="flex-1">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                {isEditing ? (
                  <div className="flex flex-wrap gap-3">
                    <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      className="rounded-xl border px-4 py-2.5 font-heading text-2xl font-bold outline-none focus:border-primary"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)', maxWidth: 200 }} placeholder="First name" />
                    <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      className="rounded-xl border px-4 py-2.5 font-heading text-2xl font-bold outline-none focus:border-primary"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)', maxWidth: 200 }} placeholder="Last name" />
                  </div>
                ) : (
                  <h1 className="font-heading text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {user?.firstName} {user?.lastName}
                  </h1>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <Badge color={role === 'tutor' ? 'mint' : 'lavender'} size="sm">{role}</Badge>
                  {student?.gradeLevel && <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Grade {student.gradeLevel}</span>}
                  {tutor?.avgRating && <StarRating rating={tutor.avgRating} count={tutor.ratingCount} size="sm" />}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {isEditing ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={handleCancel} disabled={saving}>
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : <><Save className="h-3.5 w-3.5" /> Save</>}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm"><MessageCircle className="h-3.5 w-3.5" /> Message</Button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="mb-6 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Bio</label>
                  <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3}
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {role === 'student' && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Learning Goals</label>
                        <textarea value={form.learningGoals} onChange={e => setForm(f => ({ ...f, learningGoals: e.target.value }))} rows={2}
                          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Grade Level</label>
                        <input value={form.gradeLevel} onChange={e => setForm(f => ({ ...f, gradeLevel: e.target.value }))}
                          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
                      </div>
                    </>
                  )}
                  {role === 'tutor' && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Experience (years)</label>
                        <input type="number" min="0" value={form.experienceYears} onChange={e => setForm(f => ({ ...f, experienceYears: e.target.value }))}
                          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Hourly Rate (₦)</label>
                        <input type="text" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Region</label>
                    <input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                      className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Subjects (comma-separated)</label>
                  <input value={form.subjects} onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))}
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
                </div>
              </div>
            ) : (
              <>
                <p className="mb-6 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {student?.bio ?? tutor?.bio ?? 'No profile bio added yet.'}
                </p>
                <div className="flex flex-wrap gap-8">
                  {[
                    { label: 'Sessions', value: String(sessions.length), icon: Calendar },
                    { label: role === 'tutor' ? 'Students' : 'Upcoming', value: String(role === 'tutor' ? currentPeople.length : upcoming.length), icon: Users },
                    { label: 'Completed', value: String(completed.length), icon: CheckCircle2 },
                  ].map(stat => {
                    const Icon = stat.icon
                    return (
                      <div key={stat.label} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--surface-2)' }}>
                        <Icon className="h-4 w-4" style={{ color: 'var(--accent-lavender-fg)' }} />
                        <div>
                          <p className="font-heading text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {!isEditing && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* About + Sessions — bento 2-col span */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="p-6">
              <h2 className="mb-5 font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>About</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4 rounded-xl p-4" style={{ background: 'var(--surface-2)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}>
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Goal</p>
                      <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{student?.learningGoals ?? 'Not set'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 rounded-xl p-4" style={{ background: 'var(--surface-2)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}>
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{role === 'tutor' ? 'Subjects Taught' : 'Subjects'}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">{subjects.map((s: string) => <Badge key={s} color="lavender" size="sm">{s}</Badge>)}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 rounded-xl p-4 md:col-span-2" style={{ background: 'var(--surface-2)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Location</p>
                      <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{user?.region ?? 'No region set'} · {user?.timezone ?? 'UTC'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-5 font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Recent Sessions</h2>
              <div className="space-y-3">
                {sessions.slice(0, 5).map(session => (
                  <div key={session.id} className="flex items-center gap-4 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold" style={{ background: 'var(--accent-sky-bg)', color: 'var(--accent-sky-fg)' }}>
                      {(role === 'tutor' ? session.studentName : session.tutorName)?.split(' ').map(p => p[0]).join('').slice(0, 2) ?? 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{role === 'tutor' ? session.studentName : session.tutorName}</p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{session.subject} · {new Date(session.startAt).toLocaleDateString()}</p>
                    </div>
                    <Badge color={session.status === 'completed' ? 'mint' : 'sky'} size="sm">{session.status}</Badge>
                  </div>
                ))}
                {sessions.length === 0 && <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>No sessions yet.</p>}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="mb-5 font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{role === 'tutor' ? 'Students' : 'Current Tutors'}</h2>
              <div className="space-y-4">
                {currentPeople.map(person => (
                  <div key={`${person.name}-${person.subject}`} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold" style={{ background: 'var(--accent-mint-bg)', color: 'var(--accent-mint-fg)' }}>
                      {person.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{person.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{person.subject}</p>
                    </div>
                  </div>
                ))}
                {currentPeople.length === 0 && <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>No active matches yet.</p>}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-5 font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Activity</h2>
              <div className="space-y-3">
                {[{ icon: Calendar, label: `${upcoming.length} upcoming sessions`, color: 'accent-lavender-fg' },
                  { icon: Star, label: `${completed.length} completed sessions`, color: 'accent-sun-fg' },
                  { icon: Award, label: `${sessions.length} total sessions`, color: 'accent-mint-fg' },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
                      <Icon className="h-4 w-4" style={{ color: `var(--${item.color})` }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
