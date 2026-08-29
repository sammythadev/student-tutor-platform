'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { logout } from '@/lib/api/auth'
import type { DeliveryMode, FormatPreference, LearningPace, TeachingStyle } from '@/lib/api/auth'
import { getMe, updateMe, updateStudentPreferences, updateTutorPreferences, type UpdateMePayload } from '@/lib/api/users'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import { Bell, Book, Lock, LogOut, Palette, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const notificationRows: Array<{ key: keyof NonNullable<UpdateMePayload['notificationPrefs']>; label: string; desc: string }> = [
  { key: 'sessionReminders', label: 'Session Reminders', desc: 'Get notified before sessions' },
  { key: 'newMessages', label: 'New Messages', desc: 'Notify me when tutors or students send messages' },
  { key: 'sessionUpdates', label: 'Session Updates', desc: 'Updates on session status changes' },
  { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Promotional offers and news' },
  { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Summary of your learning progress' },
]

function SelectField({
  label, value, onChange, options, placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex h-9 w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {placeholder && !value && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}

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
    theme: authUser?.theme ?? 'light',
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
    learningStylePreference: studentProfile?.learningStylePreference ?? '',
    learningPace: studentProfile?.learningPace ?? '',
    deliveryPreference: studentProfile?.deliveryPreference ?? '',
    formatPreference: studentProfile?.formatPreference ?? '',
    languages: studentProfile?.languages?.join(', ') ?? '',
  })

  // Tutor State
  const [tutorFormData, setTutorFormData] = useState({
    bio: tutorProfile?.bio ?? '',
    hourlyRate: tutorProfile?.hourlyRate ?? '',
    subjectsTaught: tutorProfile?.subjectsTaught?.join(', ') ?? '',
    teachingStyle: tutorProfile?.teachingStyle ?? '',
    teachingPace: tutorProfile?.teachingPace ?? '',
    deliveryStyle: tutorProfile?.deliveryStyle ?? '',
    formatStyle: tutorProfile?.formatStyle ?? '',
    languages: tutorProfile?.languages?.join(', ') ?? '',
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
        theme: user.theme ?? 'light',
        accentColor: user.accentColor ?? 'lavender',
        notificationPrefs: user.notificationPrefs ?? prev.notificationPrefs,
      }))
      if (data.studentProfile) {
        setStudentFormData({
          bio: data.studentProfile.bio ?? '',
          learningGoals: data.studentProfile.learningGoals ?? '',
          budget: data.studentProfile.budget ?? '',
          subjects: data.studentProfile.subjects?.join(', ') ?? '',
          learningStylePreference: data.studentProfile.learningStylePreference ?? '',
          learningPace: data.studentProfile.learningPace ?? '',
          deliveryPreference: data.studentProfile.deliveryPreference ?? '',
          formatPreference: data.studentProfile.formatPreference ?? '',
          languages: data.studentProfile.languages?.join(', ') ?? '',
        })
      }
      if (data.tutorProfile) {
        setTutorFormData({
          bio: data.tutorProfile.bio ?? '',
          hourlyRate: data.tutorProfile.hourlyRate ?? '',
          subjectsTaught: data.tutorProfile.subjectsTaught?.join(', ') ?? '',
          teachingStyle: data.tutorProfile.teachingStyle ?? '',
          teachingPace: data.tutorProfile.teachingPace ?? '',
          deliveryStyle: data.tutorProfile.deliveryStyle ?? '',
          formatStyle: data.tutorProfile.formatStyle ?? '',
          languages: data.tutorProfile.languages?.join(', ') ?? '',
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
          learningStylePreference: studentFormData.learningStylePreference || undefined,
          learningPace: (studentFormData.learningPace || undefined) as LearningPace | undefined,
          deliveryPreference: (studentFormData.deliveryPreference || undefined) as DeliveryMode | undefined,
          formatPreference: (studentFormData.formatPreference || undefined) as FormatPreference | undefined,
          languages: studentFormData.languages.trim()
            ? studentFormData.languages.split(',').map(s => s.trim()).filter(Boolean)
            : undefined,
        })
      } else if (activeTab === 'tutor-prefs') {
        const { updateTutorPreferences } = await import('@/lib/api/users')
        await updateTutorPreferences({
          bio: tutorFormData.bio,
          subjectsTaught: tutorFormData.subjectsTaught.split(',').map(s => s.trim()).filter(Boolean),
          teachingStyle: (tutorFormData.teachingStyle || undefined) as TeachingStyle | undefined,
          teachingPace: (tutorFormData.teachingPace || undefined) as LearningPace | undefined,
          deliveryStyle: (tutorFormData.deliveryStyle || undefined) as DeliveryMode | undefined,
          formatStyle: (tutorFormData.formatStyle || undefined) as FormatPreference | undefined,
          languages: tutorFormData.languages.trim()
            ? tutorFormData.languages.split(',').map(s => s.trim()).filter(Boolean)
            : undefined,
        })
      }
      setMessage('Settings saved.')
    } catch (err) {
      setMessage(apiErrorText(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 py-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {message && (
        <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">{message}</div>
      )}

      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="flex-shrink-0 space-y-1 md:w-56">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-semibold transition-colors',
                  isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-4" /> {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === 'profile' && (
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Profile Information</CardTitle>
                <CardDescription>Your basic account details.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xl space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" name="firstName" value={formData.firstName} onChange={event => setFormData(prev => ({ ...prev, firstName: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" value={formData.lastName} onChange={event => setFormData(prev => ({ ...prev, lastName: event.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" name="email" value={formData.email} type="email" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Input id="region" name="region" value={formData.region} onChange={event => setFormData(prev => ({ ...prev, region: event.target.value }))} />
                  </div>
                  <SelectField label="Timezone" value={formData.timezone} onChange={value => setFormData(prev => ({ ...prev, timezone: value }))} options={[
                    { value: 'Africa/Lagos', label: 'Africa/Lagos' },
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'America/New_York' },
                    { value: 'America/Chicago', label: 'America/Chicago' },
                  ]} />
                  <SelectField label="Language" value={formData.language} onChange={value => setFormData(prev => ({ ...prev, language: value }))} options={[
                    { value: 'English', label: 'English' },
                    { value: 'Spanish', label: 'Spanish' },
                    { value: 'French', label: 'French' },
                  ]} />
                  <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'student-prefs' && (
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Student Preferences</CardTitle>
                <CardDescription>What the matching engine uses.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xl space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="subjects">Subjects (comma separated)</Label>
                    <Input id="subjects" name="subjects" value={studentFormData.subjects} onChange={event => setStudentFormData(prev => ({ ...prev, subjects: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="languages">Languages (comma separated)</Label>
                    <Input id="languages" name="languages" value={studentFormData.languages} onChange={event => setStudentFormData(prev => ({ ...prev, languages: event.target.value }))} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField label="Learning style" value={studentFormData.learningStylePreference} onChange={value => setStudentFormData(prev => ({ ...prev, learningStylePreference: value }))} placeholder="Select style" options={[
                      { value: 'visual', label: 'Visual (diagrams, videos)' },
                      { value: 'auditory', label: 'Auditory (discussion, lectures)' },
                      { value: 'kinesthetic', label: 'Kinesthetic (hands-on practice)' },
                    ]} />
                    <SelectField label="Learning pace" value={studentFormData.learningPace} onChange={value => setStudentFormData(prev => ({ ...prev, learningPace: value }))} placeholder="Select pace" options={[
                      { value: 'fast', label: 'Fast (move quickly)' },
                      { value: 'moderate', label: 'Moderate (balanced)' },
                      { value: 'steady', label: 'Steady (take my time)' },
                    ]} />
                    <SelectField label="Delivery" value={studentFormData.deliveryPreference} onChange={value => setStudentFormData(prev => ({ ...prev, deliveryPreference: value }))} placeholder="Online or in person?" options={[
                      { value: 'online', label: 'Online' },
                      { value: 'in-person', label: 'In person' },
                    ]} />
                    <SelectField label="Format" value={studentFormData.formatPreference} onChange={value => setStudentFormData(prev => ({ ...prev, formatPreference: value }))} placeholder="Session format" options={[
                      { value: 'one-on-one', label: 'One-on-one' },
                      { value: 'group', label: 'Group' },
                    ]} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input id="bio" name="bio" value={studentFormData.bio} onChange={event => setStudentFormData(prev => ({ ...prev, bio: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="learningGoals">Learning Goals</Label>
                    <Input id="learningGoals" name="learningGoals" value={studentFormData.learningGoals} onChange={event => setStudentFormData(prev => ({ ...prev, learningGoals: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget (₦)</Label>
                    <Input id="budget" name="budget" type="number" value={studentFormData.budget} onChange={event => setStudentFormData(prev => ({ ...prev, budget: event.target.value }))} />
                  </div>
                  <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Student Preferences'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'tutor-prefs' && (
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Tutor Preferences</CardTitle>
                <CardDescription>How students find you.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xl space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="subjectsTaught">Subjects Taught (comma separated)</Label>
                    <Input id="subjectsTaught" name="subjectsTaught" value={tutorFormData.subjectsTaught} onChange={event => setTutorFormData(prev => ({ ...prev, subjectsTaught: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tLanguages">Languages (comma separated)</Label>
                    <Input id="tLanguages" name="languages" value={tutorFormData.languages} onChange={event => setTutorFormData(prev => ({ ...prev, languages: event.target.value }))} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField label="Teaching style" value={tutorFormData.teachingStyle} onChange={value => setTutorFormData(prev => ({ ...prev, teachingStyle: value }))} placeholder="Select style" options={[
                      { value: 'interactive', label: 'Interactive (discussion-based)' },
                      { value: 'lecture', label: 'Lecture (structured delivery)' },
                    ]} />
                    <SelectField label="Teaching pace" value={tutorFormData.teachingPace} onChange={value => setTutorFormData(prev => ({ ...prev, teachingPace: value }))} placeholder="Select pace" options={[
                      { value: 'fast', label: 'Fast (move quickly)' },
                      { value: 'moderate', label: 'Moderate (balanced)' },
                      { value: 'steady', label: 'Steady (thorough, unrushed)' },
                    ]} />
                    <SelectField label="Delivery" value={tutorFormData.deliveryStyle} onChange={value => setTutorFormData(prev => ({ ...prev, deliveryStyle: value }))} placeholder="How do you teach?" options={[
                      { value: 'online', label: 'Online' },
                      { value: 'in-person', label: 'In person' },
                    ]} />
                    <SelectField label="Format" value={tutorFormData.formatStyle} onChange={value => setTutorFormData(prev => ({ ...prev, formatStyle: value }))} placeholder="Session format" options={[
                      { value: 'one-on-one', label: 'One-on-one' },
                      { value: 'group', label: 'Group' },
                    ]} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tBio">Bio</Label>
                    <Input id="tBio" name="bio" value={tutorFormData.bio} onChange={event => setTutorFormData(prev => ({ ...prev, bio: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate (₦) - Updating not supported via this form yet</Label>
                    <Input id="hourlyRate" name="hourlyRate" value={tutorFormData.hourlyRate} disabled />
                  </div>
                  <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Tutor Preferences'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
                <CardDescription>Choose what you want to hear about.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notificationRows.map(item => (
                    <div key={item.key} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notificationPrefs?.[item.key]}
                        onCheckedChange={checked => setFormData(prev => ({
                          ...prev,
                          notificationPrefs: { ...prev.notificationPrefs, [item.key]: checked },
                        }))}
                        aria-label={item.label}
                      />
                    </div>
                  ))}
                  <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Notifications'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'privacy' && (
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Privacy & Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Password and two-factor authentication endpoints are not implemented yet.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <SelectField label="Theme" value={formData.theme} onChange={value => setFormData(prev => ({ ...prev, theme: value }))} options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'auto', label: 'Auto' },
                  ]} />
                  <SelectField label="Accent Color" value={formData.accentColor} onChange={value => setFormData(prev => ({ ...prev, accentColor: value }))} options={[
                    { value: 'lavender', label: 'Lavender' },
                    { value: 'sky', label: 'Sky' },
                    { value: 'mint', label: 'Mint' },
                    { value: 'sun', label: 'Sun' },
                    { value: 'coral', label: 'Coral' },
                  ]} />
                  <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Appearance'}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="border-t pt-6">
        <Button variant="outline" onClick={logout}><LogOut className="size-4" /> Sign Out</Button>
      </div>
    </div>
  )
}
