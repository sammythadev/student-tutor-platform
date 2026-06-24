'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Input, Select } from '@/components/Input'
import { logout } from '@/lib/api/auth'
import { getMe, updateMe, type UpdateMePayload } from '@/lib/api/users'
import { useAuthStore } from '@/lib/store/authStore'
import { Bell, Lock, LogOut, Palette, User, Book } from 'lucide-react'

const notificationRows: Array<{ key: keyof NonNullable<UpdateMePayload['notificationPrefs']>; label: string; desc: string }> = [
  { key: 'sessionReminders', label: 'Session Reminders', desc: 'Get notified before sessions' },
  { key: 'newMessages', label: 'New Messages', desc: 'Notify me when tutors or students send messages' },
  { key: 'sessionUpdates', label: 'Session Updates', desc: 'Updates on session status changes' },
  { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Promotional offers and news' },
  { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Summary of your learning progress' },
]

export default function SettingsPage() {
  const authUser = useAuthStore(s => s.user)
  const studentProfile = useAuthStore(s => s.studentProfile)
  const tutorProfile = useAuthStore(s => s.tutorProfile)
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  
  // Base User State
  const [formData, setFormData] = useState({
    firstName: authUser?.firstName ?? '',
    lastName: authUser?.lastName ?? '',
    email: authUser?.email ?? '',
    region: authUser?.region ?? '',
    timezone: authUser?.timezone ?? 'Africa/Lagos',
    language: authUser?.language ?? 'English',
    theme: authUser?.theme ?? 'dark',
    accentColor: authUser?.accentColor ?? 'lavender',
    notificationPrefs: authUser?.notificationPrefs ?? {
      sessionReminders: true,
      newMessages: true,
      sessionUpdates: true,
      marketingEmails: false,
      weeklyReports: true,
    },
  })

  // Student State
  const [studentFormData, setStudentFormData] = useState({
    bio: studentProfile?.bio ?? '',
    learningGoals: studentProfile?.learningGoals ?? '',
    budget: studentProfile?.budget ?? '',
    subjects: studentProfile?.subjects?.join(', ') ?? '',
  })

  // Tutor State
  const [tutorFormData, setTutorFormData] = useState({
    bio: tutorProfile?.bio ?? '',
    hourlyRate: tutorProfile?.hourlyRate ?? '',
    subjectsTaught: tutorProfile?.subjectsTaught?.join(', ') ?? '',
  })

  useEffect(() => {
    getMe().then(data => {
      const user = data.user
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email ?? '',
        region: user.region ?? '',
        timezone: user.timezone ?? 'Africa/Lagos',
        language: user.language ?? 'English',
        theme: user.theme ?? 'dark',
        accentColor: user.accentColor ?? 'lavender',
        notificationPrefs: user.notificationPrefs ?? prev.notificationPrefs,
      }))
      if (data.studentProfile) {
        setStudentFormData({
          bio: data.studentProfile.bio ?? '',
          learningGoals: data.studentProfile.learningGoals ?? '',
          budget: data.studentProfile.budget ?? '',
          subjects: data.studentProfile.subjects?.join(', ') ?? '',
        })
      }
      if (data.tutorProfile) {
        setTutorFormData({
          bio: data.tutorProfile.bio ?? '',
          hourlyRate: data.tutorProfile.hourlyRate ?? '',
          subjectsTaught: data.tutorProfile.subjectsTaught?.join(', ') ?? '',
        })
      }
    }).catch(() => undefined)
  }, [])

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    ...(authUser?.role === 'student' ? [{ id: 'student-prefs', label: 'Student Preferences', icon: Book }] : []),
    ...(authUser?.role === 'tutor' ? [{ id: 'tutor-prefs', label: 'Tutor Preferences', icon: Book }] : []),
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      if (activeTab === 'profile' || activeTab === 'notifications' || activeTab === 'appearance') {
        await updateMe({
          firstName: formData.firstName,
          lastName: formData.lastName,
          region: formData.region,
          timezone: formData.timezone,
          language: formData.language,
          theme: formData.theme,
          accentColor: formData.accentColor,
          notificationPrefs: formData.notificationPrefs,
        })
      } else if (activeTab === 'student-prefs') {
        const { updateStudentPreferences } = await import('@/lib/api/users')
        await updateStudentPreferences({
          bio: studentFormData.bio,
          learningGoals: studentFormData.learningGoals,
          budget: studentFormData.budget ? Number(studentFormData.budget) : undefined,
          subjects: studentFormData.subjects.split(',').map(s => s.trim()).filter(Boolean),
        })
      } else if (activeTab === 'tutor-prefs') {
        const { updateTutorPreferences } = await import('@/lib/api/users')
        await updateTutorPreferences({
          bio: tutorFormData.bio,
          subjectsTaught: tutorFormData.subjectsTaught.split(',').map(s => s.trim()).filter(Boolean),
        })
      }
      setMessage('Settings saved.')
    } catch (err: any) {
      setMessage(err?.response?.data?.message ?? 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 py-3">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your account and preferences</p>
      </div>

      {message && <div className="surface-card p-4 text-sm text-text-secondary">{message}</div>}

      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="md:w-56 flex-shrink-0 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold" style={isActive ? { background: 'var(--primary-subtle)', color: 'var(--primary)' } : { color: 'var(--text-secondary)' }}>
                <Icon className="h-5 w-5" /> {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === 'profile' && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-6 font-heading text-xl font-bold text-text-primary">Profile Information</h2>
              <div className="max-w-xl space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="First Name" name="firstName" value={formData.firstName} onChange={event => setFormData(prev => ({ ...prev, firstName: event.target.value }))} />
                  <Input label="Last Name" name="lastName" value={formData.lastName} onChange={event => setFormData(prev => ({ ...prev, lastName: event.target.value }))} />
                </div>
                <Input label="Email Address" name="email" value={formData.email} type="email" disabled />
                <Input label="Region" name="region" value={formData.region} onChange={event => setFormData(prev => ({ ...prev, region: event.target.value }))} />
                <Select label="Timezone" name="timezone" value={formData.timezone} onChange={event => setFormData(prev => ({ ...prev, timezone: event.target.value }))} options={[
                  { value: 'Africa/Lagos', label: 'Africa/Lagos' },
                  { value: 'UTC', label: 'UTC' },
                  { value: 'America/New_York', label: 'America/New_York' },
                  { value: 'America/Chicago', label: 'America/Chicago' },
                ]} />
                <Select label="Language" name="language" value={formData.language} onChange={event => setFormData(prev => ({ ...prev, language: event.target.value }))} options={[
                  { value: 'English', label: 'English' },
                  { value: 'Spanish', label: 'Spanish' },
                  { value: 'French', label: 'French' },
                ]} />
                <Button onClick={save} loading={saving}>Save Changes</Button>
              </div>
            </Card>
          )}

          {activeTab === 'student-prefs' && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-6 font-heading text-xl font-bold text-text-primary">Student Preferences</h2>
              <div className="max-w-xl space-y-5">
                <Input label="Subjects (comma separated)" name="subjects" value={studentFormData.subjects} onChange={event => setStudentFormData(prev => ({ ...prev, subjects: event.target.value }))} />
                <Input label="Bio" name="bio" value={studentFormData.bio} onChange={event => setStudentFormData(prev => ({ ...prev, bio: event.target.value }))} />
                <Input label="Learning Goals" name="learningGoals" value={studentFormData.learningGoals} onChange={event => setStudentFormData(prev => ({ ...prev, learningGoals: event.target.value }))} />
                <Input label="Budget ($)" type="number" name="budget" value={studentFormData.budget} onChange={event => setStudentFormData(prev => ({ ...prev, budget: event.target.value }))} />
                <Button onClick={save} loading={saving}>Save Student Preferences</Button>
              </div>
            </Card>
          )}

          {activeTab === 'tutor-prefs' && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-6 font-heading text-xl font-bold text-text-primary">Tutor Preferences</h2>
              <div className="max-w-xl space-y-5">
                <Input label="Subjects Taught (comma separated)" name="subjectsTaught" value={tutorFormData.subjectsTaught} onChange={event => setTutorFormData(prev => ({ ...prev, subjectsTaught: event.target.value }))} />
                <Input label="Bio" name="bio" value={tutorFormData.bio} onChange={event => setTutorFormData(prev => ({ ...prev, bio: event.target.value }))} />
                <Input label="Hourly Rate ($) - Updating not supported via this form yet" name="hourlyRate" value={tutorFormData.hourlyRate} disabled />
                <Button onClick={save} loading={saving}>Save Tutor Preferences</Button>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-6 font-heading text-xl font-bold text-text-primary">Notification Preferences</h2>
              <div className="space-y-3">
                {notificationRows.map(item => (
                  <label key={item.key} className="flex cursor-pointer items-center justify-between rounded-xl bg-surface-2 p-4">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                      <p className="mt-1 text-xs text-text-secondary">{item.desc}</p>
                    </div>
                    <input type="checkbox" checked={!!formData.notificationPrefs?.[item.key]} onChange={event => setFormData(prev => ({ ...prev, notificationPrefs: { ...prev.notificationPrefs, [item.key]: event.target.checked } }))} className="h-5 w-5" style={{ accentColor: 'var(--primary)' }} />
                  </label>
                ))}
                <Button onClick={save} loading={saving}>Save Notifications</Button>
              </div>
            </Card>
          )}

          {activeTab === 'privacy' && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-6 font-heading text-xl font-bold text-text-primary">Privacy & Security</h2>
              <p className="text-sm text-text-secondary">Password and two-factor authentication endpoints are not implemented yet.</p>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card className="p-6 md:p-8">
              <h2 className="mb-6 font-heading text-xl font-bold text-text-primary">Appearance</h2>
              <div className="space-y-6">
                <Select label="Theme" name="theme" value={formData.theme} onChange={event => setFormData(prev => ({ ...prev, theme: event.target.value }))} options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'auto', label: 'Auto' },
                ]} />
                <Select label="Accent Color" name="accentColor" value={formData.accentColor} onChange={event => setFormData(prev => ({ ...prev, accentColor: event.target.value }))} options={[
                  { value: 'lavender', label: 'Lavender' },
                  { value: 'sky', label: 'Sky' },
                  { value: 'mint', label: 'Mint' },
                  { value: 'sun', label: 'Sun' },
                  { value: 'coral', label: 'Coral' },
                ]} />
                <Button onClick={save} loading={saving}>Save Appearance</Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
        <Button variant="secondary" onClick={logout}><LogOut className="h-4 w-4" /> Sign Out</Button>
      </div>
    </div>
  )
}
