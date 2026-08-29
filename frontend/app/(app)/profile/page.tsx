'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DashboardCard } from '@/components/dashboard-card'
import { getMySessions, type SessionItem } from '@/lib/api/sessions'
import { getMe, updateMe, updateStudentPreferences, updateTutorPreferences, type UpdateMePayload } from '@/lib/api/users'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore, type UserProfile, type StudentProfile, type TutorProfile } from '@/lib/store/authStore'
import { accentFor, initials, type Accent } from '@/lib/ui'
import { BookOpen, Calendar, Edit2, MapPin, MessageCircle, Save, Target, X, Award, Clock, Users, Star, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { StarRating } from '@/components/StarRating'
import { cn } from '@/lib/utils'

interface ProfileResponse {
  user?: UserProfile | null
  studentProfile?: StudentProfile | null
  tutorProfile?: TutorProfile | null
}

const IDENTITY_BG: Record<Accent, string> = {
  lavender: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  mint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sun: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  coral: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  tangerine: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
}

const STATUS_DOT: Record<SessionItem['status'], string> = {
  pending: 'bg-amber-500',
  upcoming: 'bg-sky-500',
  'starting-soon': 'bg-emerald-500',
  completed: 'bg-violet-500',
  cancelled: 'bg-rose-500',
}

export default function ProfilePage() {
  const storeUser = useAuthStore(s => s.user)
  const storeStudent = useAuthStore(s => s.studentProfile)
  const storeTutor = useAuthStore(s => s.tutorProfile)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
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

  function setFormFromProfile(data: ProfileResponse) {
    const u = data?.user ?? storeUser
    const s = data?.studentProfile ?? storeStudent
    const t = data?.tutorProfile ?? storeTutor
    setForm({
      firstName: u?.firstName ?? '', lastName: u?.lastName ?? '',
      bio: s?.bio ?? t?.bio ?? '',
      learningGoals: s?.learningGoals ?? '',
      region: u?.region ?? '',
      subjects: (s?.subjects ?? t?.subjectsTaught ?? []).join(', '),
      gradeLevel: s?.gradeLevel?.toString() ?? '',
      experienceYears: t?.experienceYears?.toString() ?? '',
      hourlyRate: t?.hourlyRate?.toString() ?? '',
    })
  }

  const user = profile?.user ?? storeUser
  const student = profile?.studentProfile ?? storeStudent
  const tutor = profile?.tutorProfile ?? storeTutor
  const role = user?.role ?? 'student'
  const userInitials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
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

  const subjects: string[] = role === 'tutor'
    ? (tutor?.subjectsTaught ?? [])
    : student?.subjects?.length ? student.subjects : (student?.requiredSubject ? [student.requiredSubject] : [])

  async function handleSave() {
    setSaving(true)
    try {
      const subjectsArr = form.subjects.split(',').map(s => s.trim()).filter(Boolean)
      const userPayload: UpdateMePayload = {}
      if (form.firstName !== (user?.firstName ?? '')) userPayload.firstName = form.firstName
      if (form.lastName !== (user?.lastName ?? '')) userPayload.lastName = form.lastName
      if (form.region !== (user?.region ?? '')) userPayload.region = form.region
      if (Object.keys(userPayload).length > 0) await updateMe(userPayload)

      if (role === 'student') {
        await updateStudentPreferences({
          bio: form.bio || undefined,
          learningGoals: form.learningGoals || undefined,
          subjects: subjectsArr,
          gradeLevel: form.gradeLevel ? Number(form.gradeLevel) : undefined,
        })
      } else {
        await updateTutorPreferences({
          bio: form.bio || undefined,
          subjectsTaught: subjectsArr,
          experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
          hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
        })
      }

      const fresh = await getMe()
      setProfile(fresh)
      addToast('Profile updated', 'success')
      setIsEditing(false)
    } catch (err) {
      addToast(apiErrorText(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setFormFromProfile(profile ?? {})
    setIsEditing(false)
  }

  return (
    <div className="space-y-6 py-3">
      {/* Hero card */}
      <DashboardCard className="gap-0">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-start md:p-8">
          <div className={cn('flex size-24 shrink-0 items-center justify-center rounded-full text-3xl font-semibold', IDENTITY_BG[accentFor(user?.id ?? '')])}>
            {userInitials}
          </div>
          <div className="flex-1">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                {isEditing ? (
                  <div className="flex flex-wrap gap-3">
                    <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      className="text-2xl font-semibold" style={{ maxWidth: 200 }} placeholder="First name" />
                    <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      className="text-2xl font-semibold" style={{ maxWidth: 200 }} placeholder="Last name" />
                  </div>
                ) : (
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {user?.firstName} {user?.lastName}
                  </h1>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">{role}</Badge>
                  {student?.gradeLevel && <span className="text-sm font-semibold text-muted-foreground">Grade {student.gradeLevel}</span>}
                  {tutor?.avgRating && <StarRating rating={tutor.avgRating} count={tutor.ratingCount} size="sm" scale="0-1" />}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                      <X className="size-3.5" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : <><Save className="size-3.5" /> Save</>}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit2 className="size-3.5" /> Edit
                    </Button>
                    <Button size="sm"><MessageCircle className="size-3.5" /> Message</Button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="mb-6 space-y-4">
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {role === 'student' && (
                    <>
                      <div className="space-y-2">
                        <Label>Learning Goals</Label>
                        <Textarea value={form.learningGoals} onChange={e => setForm(f => ({ ...f, learningGoals: e.target.value }))} rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Grade Level</Label>
                        <Input value={form.gradeLevel} onChange={e => setForm(f => ({ ...f, gradeLevel: e.target.value }))} />
                      </div>
                    </>
                  )}
                  {role === 'tutor' && (
                    <>
                      <div className="space-y-2">
                        <Label>Experience (years)</Label>
                        <Input type="number" min="0" value={form.experienceYears} onChange={e => setForm(f => ({ ...f, experienceYears: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Hourly Rate (₦)</Label>
                        <Input type="text" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subjects (comma-separated)</Label>
                  <Input value={form.subjects} onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))} />
                </div>
              </div>
            ) : (
              <>
                <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {student?.bio ?? tutor?.bio ?? 'No profile bio added yet.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'Sessions', value: String(sessions.length), icon: Calendar },
                    { label: role === 'tutor' ? 'Students' : 'Upcoming', value: String(role === 'tutor' ? currentPeople.length : upcoming.length), icon: Users },
                    { label: 'Completed', value: String(completed.length), icon: CheckCircle2 },
                  ].map(stat => {
                    const Icon = stat.icon
                    return (
                      <div key={stat.label} className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
                        <Icon className="size-4 text-violet-500/70" />
                        <div>
                          <p className="text-xl font-semibold text-foreground">{stat.value}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </DashboardCard>

      {!isEditing && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* About + Sessions — bento 2-col span */}
          <div className="space-y-6 lg:col-span-2">
            <DashboardCard className="gap-0">
              <CardHeader className="border-b">
                <CardTitle className="text-base">About</CardTitle>
                <CardDescription>Profile details used by the matching engine.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-4 rounded-lg bg-muted p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <Target className="size-4" />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Goal</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{student?.learningGoals ?? 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 rounded-lg bg-muted p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <BookOpen className="size-4" />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{role === 'tutor' ? 'Subjects Taught' : 'Subjects'}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {subjects.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 rounded-lg bg-muted p-4 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <MapPin className="size-4" />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{user?.region ?? 'No region set'} · {user?.timezone ?? 'UTC'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </DashboardCard>

            <DashboardCard className="gap-0">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Recent Sessions</CardTitle>
                <CardDescription>Latest bookings and outcomes.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions.slice(0, 5).map(session => {
                    const status = session.status
                    const otherName = role === 'tutor' ? session.studentName : session.tutorName
                    return (
                      <div key={session.id} className="flex items-center gap-4 rounded-lg border p-4">
                        <span className={cn('flex size-10 items-center justify-center rounded-lg text-xs font-semibold', IDENTITY_BG[accentFor(session.id)])}>
                          {initials(...(otherName ?? 'S').split(' '))}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{otherName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{session.subject} · {new Date(session.startAt).toLocaleDateString()}</p>
                        </div>
                        <Badge variant="secondary" className="gap-1.5">
                          <span className={cn('size-1.5 rounded-full', STATUS_DOT[status])} />
                          {status}
                        </Badge>
                      </div>
                    )
                  })}
                  {sessions.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">No sessions yet.</p>
                  )}
                </div>
              </CardContent>
            </DashboardCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <DashboardCard className="gap-0">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{role === 'tutor' ? 'Students' : 'Current Tutors'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentPeople.map(person => (
                    <div key={`${person.name}-${person.subject}`} className="flex items-center gap-3">
                      <span className={cn('flex size-10 items-center justify-center rounded-xl text-xs font-semibold', IDENTITY_BG[accentFor(person.name)])}>
                        {initials(...person.name.split(' '))}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
                        <p className="text-xs text-muted-foreground">{person.subject}</p>
                      </div>
                    </div>
                  ))}
                  {currentPeople.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">No active matches yet.</p>
                  )}
                </div>
              </CardContent>
            </DashboardCard>

            <DashboardCard className="gap-0">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ icon: Calendar, label: `${upcoming.length} upcoming sessions`, tint: 'text-sky-500/70' },
                    { icon: Star, label: `${completed.length} completed sessions`, tint: 'text-amber-500/70' },
                    { icon: Award, label: `${sessions.length} total sessions`, tint: 'text-emerald-500/70' },
                  ].map((item, i) => {
                    const Icon = item.icon
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Icon className={cn('size-4', item.tint)} />
                        <span className="text-xs font-semibold text-foreground">{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </DashboardCard>
          </div>
        </div>
      )}
    </div>
  )
}
