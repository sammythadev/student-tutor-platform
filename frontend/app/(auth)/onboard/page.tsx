'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input, Select, Textarea } from '@/components/Input'
import { Badge } from '@/components/Badge'
import { BookOpen, ArrowRight, Check } from 'lucide-react'
import { onboard } from '@/lib/api/auth'

type OnboardingStep = 'role' | 'student' | 'tutor'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>('role')
  const [role, setRole] = useState<'student' | 'tutor' | null>(null)
  const [loading, setLoading] = useState(false)

  // Student form state
  const [studentForm, setStudentForm] = useState({
    gradeLevel: '',
    subjects: [] as string[],
    customSubject: '',
    budget: '',
    examTypes: '',
    learningStylePreference: '',
    deliveryPreference: '',
    formatPreference: '',
    languages: [] as string[],
    region: '',
    timezone: '',
    bio: '',
  })

  // Tutor form state
  const [tutorForm, setTutorForm] = useState({
    expertise: [] as string[],
    yearsExperience: '',
    hourlyRate: '',
    teachingStyle: '',
    deliveryStyle: '',
    formatStyle: '',
    languages: [] as string[],
    capacity: '5',
    bio: '',
    timezone: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const subjects = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'History',
    'Computer Science',
    'Economics',
    'Art',
    'Sports',
  ]

  const languages = ['English', 'Yoruba', 'Hausa', 'Igbo', 'French', 'Arabic']

  const handleSelectRole = (selectedRole: 'student' | 'tutor') => {
    setRole(selectedRole)
    setStep(selectedRole === 'student' ? 'student' : 'tutor')
  }

  const handleStudentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setStudentForm(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleTutorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setTutorForm(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const toggleSubject = (subject: string) => {
    setStudentForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }))
  }

  const toggleLanguage = (form: 'student' | 'tutor', lang: string) => {
    if (form === 'student') {
      setStudentForm(prev => ({
        ...prev,
        languages: prev.languages.includes(lang)
          ? prev.languages.filter(l => l !== lang)
          : [...prev.languages, lang],
      }))
    } else {
      setTutorForm(prev => ({
        ...prev,
        languages: prev.languages.includes(lang)
          ? prev.languages.filter(l => l !== lang)
          : [...prev.languages, lang],
      }))
    }
  }

  function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
        style={{
          border: selected ? '2px solid var(--primary)' : '1px solid var(--border)',
          background: selected ? 'var(--primary-subtle)' : 'var(--surface-glass)',
          color: selected ? 'var(--primary)' : 'var(--text-secondary)',
        }}
      >
        {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        {label}
      </button>
    )
  }

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!studentForm.gradeLevel) newErrors.gradeLevel = 'Grade level is required'
    if (studentForm.subjects.length === 0) newErrors.subjects = 'Select at least one subject'
    if (!studentForm.learningStylePreference) newErrors.learningStylePreference = 'Learning style is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const allSubjects = [...studentForm.subjects]
      if (studentForm.customSubject.trim()) {
        allSubjects.push(studentForm.customSubject.trim())
      }

      const defaultAvailability = [
        {
          start: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(24 + (7 * 24), 0, 0, 0)).toISOString(),
        }
      ]

      await onboard('student', {
        subjects: allSubjects,
        gradeLevel: Number(studentForm.gradeLevel),
        examType: studentForm.examTypes || 'waec',
        budget: studentForm.budget ? Number(studentForm.budget) : undefined,
        requestedAvailability: defaultAvailability,
        learningStylePreference: studentForm.learningStylePreference,
        deliveryPreference: studentForm.deliveryPreference || undefined,
        formatPreference: studentForm.formatPreference || undefined,
        languages: studentForm.languages.length > 0 ? studentForm.languages : ['English'],
        region: studentForm.region || undefined,
        timezone: studentForm.timezone || 'Africa/Lagos',
        bio: studentForm.bio || undefined,
      })
      router.push('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Onboarding failed. Please try again.'
      setErrors({ subjects: Array.isArray(msg) ? msg.join(', ') : msg })
    } finally {
      setLoading(false)
    }
  }

  const handleTutorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (tutorForm.expertise.length === 0) newErrors.expertise = 'Select at least one subject'
    if (!tutorForm.yearsExperience) newErrors.yearsExperience = 'Years of experience is required'
    if (!tutorForm.hourlyRate) newErrors.hourlyRate = 'Hourly rate is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const defaultAvailability = [
        {
          start: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(24 + (30 * 24), 0, 0, 0)).toISOString(),
        }
      ]

      await onboard('tutor', {
        subjectsTaught: tutorForm.expertise,
        gradeLevelsSupported: [9, 10, 11, 12],
        examTypesSupported: ['waec', 'neco', 'jamb'],
        availability: defaultAvailability,
        hourlyRate: Number(tutorForm.hourlyRate),
        bio: tutorForm.bio || undefined,
        timezone: tutorForm.timezone || 'Africa/Lagos',
        experienceYears: Number(tutorForm.yearsExperience.split('-')[0]) || 1,
        languages: tutorForm.languages.length > 0 ? tutorForm.languages : ['English'],
        capacity: Number(tutorForm.capacity) || 5,
        teachingStyle: (tutorForm.teachingStyle as any) || 'interactive',
        deliveryStyle: (tutorForm.deliveryStyle as any) || 'online',
        formatStyle: (tutorForm.formatStyle as any) || 'one-on-one',
      })
      router.push('/tutor-dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Onboarding failed. Please try again.'
      setErrors({ expertise: Array.isArray(msg) ? msg.join(', ') : msg })
    } finally {
      setLoading(false)
    }
  }

  if (step === 'role') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
        {/* Background blobs */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20" style={{
            background: 'rgba(231, 224, 255, 0.4)',
            filter: 'blur(120px)',
          }}></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15" style={{
            background: 'rgba(217, 242, 228, 0.35)',
            filter: 'blur(120px)',
          }}></div>
        </div>

        <div className="w-full max-w-2xl space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-ink-900 rounded-lg flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-ink-900">Let&apos;s get started</h1>
            <p className="text-center text-ink-600 text-base">
              What brings you to Tutorly today?
            </p>
          </div>

          {/* Role Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Student Card */}
            <button
              onClick={() => handleSelectRole('student')}
              className="glass-card p-8 text-center hover:shadow-[var(--shadow-hover)] hover:scale-[1.02] transition-all duration-180 group"
            >
              <div className="w-16 h-16 bg-accent-lavender-bg rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">📚</span>
              </div>
              <h3 className="text-xl font-semibold text-ink-900 mb-2">I&apos;m a Student</h3>
              <p className="text-ink-600 text-sm mb-6">
                Find tutors and improve your skills
              </p>
              <div className="flex items-center justify-center gap-2 text-accent-lavender-fg font-medium text-sm">
                Continue
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </div>
            </button>

            {/* Tutor Card */}
            <button
              onClick={() => handleSelectRole('tutor')}
              className="glass-card p-8 text-center hover:shadow-[var(--shadow-hover)] hover:scale-[1.02] transition-all duration-180 group"
            >
              <div className="w-16 h-16 bg-accent-mint-bg rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="text-2xl">👨‍🏫</span>
              </div>
              <h3 className="text-xl font-semibold text-ink-900 mb-2">I&apos;m a Tutor</h3>
              <p className="text-ink-600 text-sm mb-6">
                Teach and connect with learners
              </p>
              <div className="flex items-center justify-center gap-2 text-accent-mint-fg font-medium text-sm">
                Continue
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center">
            <Link href="/" className="text-sm text-ink-400 hover:text-ink-600 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'student' && role === 'student') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
        {/* Background blobs */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20" style={{
            background: 'rgba(231, 224, 255, 0.4)',
            filter: 'blur(120px)',
          }}></div>
        </div>

        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-3xl font-bold text-ink-900">Tell us about yourself</h1>
            <p className="text-center text-ink-600 text-base">
              Help us find the perfect tutors for you
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleStudentSubmit} className="glass-card p-8 space-y-6">
            <Select
              label="Exam Type"
              name="examTypes"
              value={studentForm.examTypes}
              onChange={handleStudentChange}
              options={[
                { value: 'waec', label: 'WAEC' },
                { value: 'neco', label: 'NECO' },
                { value: 'jamb', label: 'JAMB' },
              ]}
              placeholder="Select exam"
            />

            <Textarea
              label="Short Bio"
              name="bio"
              rows={3}
              placeholder="What are you working toward?"
              value={studentForm.bio}
              onChange={handleStudentChange}
            />

            <Select
              label="Current Grade Level"
              name="gradeLevel"
              value={studentForm.gradeLevel}
              onChange={handleStudentChange}
              error={errors.gradeLevel}
              options={[
                { value: '9', label: 'Grade 9' },
                { value: '10', label: 'Grade 10' },
                { value: '11', label: 'Grade 11' },
                { value: '12', label: 'Grade 12' },
                { value: 'college', label: 'College' },
              ]}
              placeholder="Select your grade"
            />

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-ink-600">
                What subjects do you need help with?
              </label>
              <div className="flex flex-wrap gap-2">
                {subjects.map(subject => (
                  <Chip
                    key={subject}
                    label={subject}
                    selected={studentForm.subjects.includes(subject)}
                    onClick={() => toggleSubject(subject)}
                  />
                ))}
              </div>
              
              <div className="pt-2">
                <Input
                  label="Other Subject"
                  name="customSubject"
                  type="text"
                  placeholder="E.g., Further Mathematics"
                  value={studentForm.customSubject}
                  onChange={handleStudentChange}
                />
              </div>

              {errors.subjects && <p className="text-xs text-accent-coral-fg font-medium">{errors.subjects}</p>}
            </div>

            <Input
              label="Monthly Budget (₦)"
              name="budget"
              type="number"
              placeholder="150"
              value={studentForm.budget}
              onChange={handleStudentChange}
            />

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-ink-600">
                What languages do you prefer?
              </label>
              <div className="flex flex-wrap gap-2">
                {languages.map(lang => (
                  <Chip
                    key={lang}
                    label={lang}
                    selected={studentForm.languages.includes(lang)}
                    onClick={() => toggleLanguage('student', lang)}
                  />
                ))}
              </div>
            </div>

            <Select
              label="How do you learn best?"
              name="learningStylePreference"
              value={studentForm.learningStylePreference}
              onChange={handleStudentChange}
              error={errors.learningStylePreference}
              options={[
                { value: 'visual', label: 'Visual (diagrams, videos)' },
                { value: 'auditory', label: 'Auditory (discussions, lectures)' },
                { value: 'kinesthetic', label: 'Kinesthetic (hands-on practice)' },
                { value: 'mixed', label: 'Mixed approach' },
              ]}
              placeholder="Select your style"
            />

            <Select
              label="Delivery Preference"
              name="deliveryPreference"
              value={studentForm.deliveryPreference}
              onChange={handleStudentChange}
              options={[
                { value: 'online', label: 'Online' },
                { value: 'in-person', label: 'In Person' },
              ]}
              placeholder="How should sessions happen?"
            />

            <Select
              label="Format Preference"
              name="formatPreference"
              value={studentForm.formatPreference}
              onChange={handleStudentChange}
              options={[
                { value: 'one-on-one', label: 'One-on-One' },
                { value: 'group', label: 'Group' },
              ]}
              placeholder="Preferred session format"
            />

            <Select
              label="Preferred Timezone"
              name="timezone"
              value={studentForm.timezone}
              onChange={handleStudentChange}
              options={[
                { value: 'Africa/Lagos', label: 'Africa/Lagos' },
                { value: 'UTC', label: 'UTC' },
                { value: 'America/New_York', label: 'America/New_York' },
                { value: 'America/Chicago', label: 'America/Chicago' },
                { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
              ]}
              placeholder="Select timezone"
            />

            <Input
              label="Region"
              name="region"
              type="text"
              placeholder="E.g., Lagos, Abuja"
              value={studentForm.region}
              onChange={handleStudentChange}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep('role')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="flex-1"
              >
                Complete Setup
                {!loading && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (step === 'tutor' && role === 'tutor') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
        {/* Background blobs */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20" style={{
            background: 'rgba(231, 224, 255, 0.4)',
            filter: 'blur(120px)',
          }}></div>
        </div>

        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-3xl font-bold text-ink-900">Build your tutor profile</h1>
            <p className="text-center text-ink-600 text-base">
              Let students know about your expertise
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleTutorSubmit} className="glass-card p-8 space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-ink-600">
                What subjects do you teach?
              </label>
              <div className="flex flex-wrap gap-2">
                {subjects.map(subject => (
                  <Chip
                    key={subject}
                    label={subject}
                    selected={tutorForm.expertise.includes(subject)}
                    onClick={() => {
                      setTutorForm(prev => ({
                        ...prev,
                        expertise: prev.expertise.includes(subject)
                          ? prev.expertise.filter(s => s !== subject)
                          : [...prev.expertise, subject],
                      }))
                    }}
                  />
                ))}
              </div>
              {errors.expertise && <p className="text-xs text-accent-coral-fg font-medium">{errors.expertise}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-ink-600">
                What languages do you teach in?
              </label>
              <div className="flex flex-wrap gap-2">
                {languages.map(lang => (
                  <Chip
                    key={lang}
                    label={lang}
                    selected={tutorForm.languages.includes(lang)}
                    onClick={() => toggleLanguage('tutor', lang)}
                  />
                ))}
              </div>
            </div>

            <Select
              label="Years of Teaching Experience"
              name="yearsExperience"
              value={tutorForm.yearsExperience}
              onChange={handleTutorChange}
              error={errors.yearsExperience}
              options={[
                { value: '1', label: 'Less than 1 year' },
                { value: '2-5', label: '2-5 years' },
                { value: '5-10', label: '5-10 years' },
                { value: '10+', label: '10+ years' },
              ]}
              placeholder="Select experience"
            />

            <Input
              label="Hourly Rate (₦)"
              name="hourlyRate"
              type="number"
              placeholder="25"
              value={tutorForm.hourlyRate}
              onChange={handleTutorChange}
              error={errors.hourlyRate}
            />

            <Input
              label="Student Capacity"
              name="capacity"
              type="number"
              min={1}
              placeholder="5"
              value={tutorForm.capacity}
              onChange={handleTutorChange}
              helper="Maximum number of students you can take at once"
            />

            <Select
              label="Teaching Style"
              name="teachingStyle"
              value={tutorForm.teachingStyle}
              onChange={handleTutorChange}
              options={[
                { value: 'interactive', label: 'Interactive (discussion-based)' },
                { value: 'lecture', label: 'Lecture (structured delivery)' },
              ]}
              placeholder="Select teaching style"
            />

            <Select
              label="Delivery Style"
              name="deliveryStyle"
              value={tutorForm.deliveryStyle}
              onChange={handleTutorChange}
              options={[
                { value: 'online', label: 'Online' },
                { value: 'in-person', label: 'In Person' },
              ]}
              placeholder="How do you teach?"
            />

            <Select
              label="Format Style"
              name="formatStyle"
              value={tutorForm.formatStyle}
              onChange={handleTutorChange}
              options={[
                { value: 'one-on-one', label: 'One-on-One' },
                { value: 'group', label: 'Group' },
              ]}
              placeholder="Preferred session format"
            />

            <Textarea
              label="About You"
              name="bio"
              rows={4}
              placeholder="Tell students about your teaching style and experience..."
              value={tutorForm.bio}
              onChange={handleTutorChange}
            />

            <Select
              label="Preferred Timezone"
              name="timezone"
              value={tutorForm.timezone}
              onChange={handleTutorChange}
              options={[
                { value: 'Africa/Lagos', label: 'Africa/Lagos' },
                { value: 'UTC', label: 'UTC' },
                { value: 'America/New_York', label: 'America/New_York' },
                { value: 'America/Chicago', label: 'America/Chicago' },
                { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
              ]}
              placeholder="Select timezone"
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep('role')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="flex-1"
              >
                Complete Setup
                {!loading && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return null
}
