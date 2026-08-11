'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/Button'
import { Input, Select, Textarea } from '@/components/Input'
import {
  BookOpen,
  GraduationCap,
  Presentation,
  Compass,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { onboard, type TeachingStyle, type DeliveryMode, type FormatPreference, type LearningPace } from '@/lib/api/auth'
import { apiErrorText } from '@/lib/api/errors'

type Role = 'student' | 'tutor'
type Screen = 'role' | 'form'

interface Stage {
  title: string
  blurb: string
  icon: LucideIcon
}

const STUDENT_STAGES: Stage[] = [
  { title: 'Your studies', blurb: 'Your level and the subjects you want help with.', icon: GraduationCap },
  { title: 'How you learn', blurb: 'The way you like sessions to run — we match tutors to it.', icon: Compass },
  { title: 'Final details', blurb: 'A few optional extras to sharpen your matches.', icon: SlidersHorizontal },
]

const TUTOR_STAGES: Stage[] = [
  { title: 'Your expertise', blurb: 'What you teach and how experienced you are.', icon: GraduationCap },
  { title: 'How you teach', blurb: 'Your approach — we match students who suit it.', icon: Presentation },
  { title: 'Final details', blurb: 'A few optional extras students like to see.', icon: SlidersHorizontal },
]

const SUBJECTS = [
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

const LANGUAGES = ['English', 'Yoruba', 'Hausa', 'Igbo', 'French', 'Arabic']

export default function OnboardingPage() {
  const router = useRouter()
  const reduce = useReducedMotion()

  const [screen, setScreen] = useState<Screen>('role')
  const [role, setRole] = useState<Role | null>(null)
  const [stage, setStage] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Student form state
  const [studentForm, setStudentForm] = useState({
    gradeLevel: '',
    subjects: [] as string[],
    customSubject: '',
    budget: '',
    examTypes: '',
    learningStylePreference: '',
    learningPace: '',
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
    teachingPace: '',
    deliveryStyle: '',
    formatStyle: '',
    languages: [] as string[],
    capacity: '5',
    bio: '',
    timezone: '',
  })

  const stages = role === 'tutor' ? TUTOR_STAGES : STUDENT_STAGES
  const isLastStage = stage === stages.length - 1

  const handleSelectRole = (selectedRole: Role) => {
    setRole(selectedRole)
    setStage(0)
    setDirection(1)
    setErrors({})
    setScreen('form')
  }

  const handleStudentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setStudentForm(prev => ({ ...prev, [name]: value }))
  }

  const handleTutorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setTutorForm(prev => ({ ...prev, [name]: value }))
  }

  const toggleSubject = (subject: string) => {
    setStudentForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }))
  }

  const toggleExpertise = (subject: string) => {
    setTutorForm(prev => ({
      ...prev,
      expertise: prev.expertise.includes(subject)
        ? prev.expertise.filter(s => s !== subject)
        : [...prev.expertise, subject],
    }))
  }

  const toggleLanguage = (form: Role, lang: string) => {
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

  // Per-stage validation — only the required fields for the stage the user is leaving.
  const validateStage = (i: number): Record<string, string> => {
    const e: Record<string, string> = {}
    if (role === 'student') {
      if (i === 0) {
        if (!studentForm.gradeLevel) e.gradeLevel = 'Grade level is required'
        if (studentForm.subjects.length === 0) e.subjects = 'Select at least one subject'
      }
      if (i === 1) {
        if (!studentForm.learningStylePreference) e.learningStylePreference = 'Learning style is required'
      }
    } else {
      if (i === 0) {
        if (tutorForm.expertise.length === 0) e.expertise = 'Select at least one subject'
        if (!tutorForm.yearsExperience) e.yearsExperience = 'Years of experience is required'
        if (!tutorForm.hourlyRate) e.hourlyRate = 'Hourly rate is required'
      }
    }
    return e
  }

  const submitStudent = async () => {
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
        },
      ]

      await onboard('student', {
        subjects: allSubjects,
        gradeLevel: Number(studentForm.gradeLevel),
        examType: studentForm.examTypes || 'waec',
        budget: studentForm.budget ? Number(studentForm.budget) : undefined,
        requestedAvailability: defaultAvailability,
        learningStylePreference: studentForm.learningStylePreference,
        learningPace: (studentForm.learningPace || undefined) as LearningPace | undefined,
        deliveryPreference: (studentForm.deliveryPreference || undefined) as DeliveryMode | undefined,
        formatPreference: (studentForm.formatPreference || undefined) as FormatPreference | undefined,
        languages: studentForm.languages.length > 0 ? studentForm.languages : ['English'],
        region: studentForm.region || undefined,
        timezone: studentForm.timezone || 'Africa/Lagos',
        bio: studentForm.bio || undefined,
      })
      router.push('/dashboard')
    } catch (err) {
      setErrors({ submit: apiErrorText(err) })
    } finally {
      setLoading(false)
    }
  }

  const submitTutor = async () => {
    setLoading(true)
    try {
      const defaultAvailability = [
        {
          start: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(24 + (30 * 24), 0, 0, 0)).toISOString(),
        },
      ]

      await onboard('tutor', {
        subjectsTaught: tutorForm.expertise,
        gradeLevelsSupported: [9, 10, 11, 12],
        examTypesSupported: ['waec', 'neco', 'jamb'],
        availability: defaultAvailability,
        hourlyRate: Number(tutorForm.hourlyRate),
        bio: tutorForm.bio || undefined,
        timezone: tutorForm.timezone || 'Africa/Lagos',
        experienceYears: Number(tutorForm.yearsExperience) || 1,
        languages: tutorForm.languages.length > 0 ? tutorForm.languages : ['English'],
        capacity: Number(tutorForm.capacity) || 5,
        teachingStyle: (tutorForm.teachingStyle || undefined) as TeachingStyle | undefined,
        teachingPace: (tutorForm.teachingPace || undefined) as LearningPace | undefined,
        deliveryStyle: (tutorForm.deliveryStyle || undefined) as DeliveryMode | undefined,
        formatStyle: (tutorForm.formatStyle || undefined) as FormatPreference | undefined,
      })
      router.push('/tutor-dashboard')
    } catch (err) {
      setErrors({ submit: apiErrorText(err) })
    } finally {
      setLoading(false)
    }
  }

  const handleAdvance = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    const stageErrors = validateStage(stage)
    if (Object.keys(stageErrors).length > 0) {
      setErrors(stageErrors)
      return
    }
    setErrors({})

    if (!isLastStage) {
      setDirection(1)
      setStage(s => s + 1)
      return
    }

    if (role === 'student') submitStudent()
    else submitTutor()
  }

  const handleBack = () => {
    if (loading) return
    setErrors({})
    if (stage === 0) {
      setScreen('role')
      setRole(null)
      return
    }
    setDirection(-1)
    setStage(s => s - 1)
  }

  /* ─────────────── Role selection ─────────────── */
  if (screen === 'role') {
    const roleCards: { role: Role; icon: LucideIcon; title: string; blurb: string; tint: string; fg: string }[] = [
      {
        role: 'student',
        icon: GraduationCap,
        title: "I'm a student",
        blurb: 'Find tutors matched to how you learn.',
        tint: 'var(--accent-lavender-bg)',
        fg: 'var(--accent-lavender-fg)',
      },
      {
        role: 'tutor',
        icon: Presentation,
        title: "I'm a tutor",
        blurb: 'Reach students who suit how you teach.',
        tint: 'var(--accent-mint-bg)',
        fg: 'var(--accent-mint-fg)',
      },
    ]

    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="ambient-blob blob-primary absolute top-0 left-0 w-96 h-96" />
          <div className="ambient-blob blob-accent absolute bottom-0 right-0 w-96 h-96" />
        </div>

        <div className="w-full max-w-2xl space-y-10">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--primary)' }}
            >
              <BookOpen className="w-6 h-6" style={{ color: 'var(--primary-fg)' }} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-ink-900 text-center">Let&apos;s get started</h1>
            <p className="text-center text-ink-600 text-base max-w-md">
              Choose how you&apos;ll use Tutorly. It takes about a minute, split into three short steps.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {roleCards.map(({ role: r, icon: Icon, title, blurb, tint, fg }) => (
              <button
                key={r}
                onClick={() => handleSelectRole(r)}
                className="glass-card p-7 text-left card-interactive hover:shadow-[var(--shadow-hover)] transition-all group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-105"
                  style={{ background: tint, color: fg }}
                >
                  <Icon className="w-7 h-7" strokeWidth={1.75} />
                </div>
                <h3 className="text-xl font-semibold text-ink-900 mb-1.5">{title}</h3>
                <p className="text-ink-600 text-sm mb-6">{blurb}</p>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: fg }}>
                  Continue
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </div>
              </button>
            ))}
          </div>

          <div className="text-center">
            <Link href="/" className="text-sm text-ink-400 hover:text-ink-600 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ─────────────── Staged form ─────────────── */
  const active = stages[stage]
  const ActiveIcon = active.icon

  return (
    <div className="min-h-screen bg-canvas px-4 py-12">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="ambient-blob blob-primary absolute top-0 left-0 w-96 h-96" />
      </div>

      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <h1 className="text-3xl font-bold text-ink-900">
            {role === 'student' ? 'Set up your learner profile' : 'Set up your tutor profile'}
          </h1>
          <p className="text-ink-600 text-base max-w-md">
            Grouped into three quick steps — you can change any of this later in settings.
          </p>
        </div>

        {/* Stepper */}
        <nav aria-label="Progress" className="glass-card px-5 py-4">
          <ol className="flex items-center">
            {stages.map((s, i) => {
              const done = i < stage
              const current = i === stage
              return (
                <li key={s.title} className={`flex items-center ${i < stages.length - 1 ? 'flex-1' : ''}`}>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className="flex items-center justify-center rounded-full text-sm font-semibold shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        background: done ? 'var(--primary)' : current ? 'var(--primary-subtle)' : 'var(--surface-2)',
                        color: done ? 'var(--primary-fg)' : current ? 'var(--primary)' : 'var(--text-muted)',
                        border: current ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                        transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
                      }}
                    >
                      {done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
                    </span>
                    <span
                      className="text-sm font-semibold whitespace-nowrap hidden sm:inline"
                      style={{ color: current || done ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    >
                      {s.title}
                    </span>
                  </div>
                  {i < stages.length - 1 && (
                    <span
                      className="mx-3 h-px flex-1 min-w-[16px]"
                      style={{ background: done ? 'var(--primary)' : 'var(--border)', transition: 'background 200ms ease' }}
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Form card — the stage transition is the one authored motion moment */}
        <form onSubmit={handleAdvance} className="glass-card p-6 sm:p-8">
          <div className="flex items-start gap-3.5 mb-6">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
            >
              <ActiveIcon className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-xs font-semibold sm:hidden mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Step {stage + 1} of {stages.length}
              </div>
              <h2 className="text-lg font-semibold text-ink-900 leading-tight">{active.title}</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{active.blurb}</p>
            </div>
          </div>

          {/* overflow-x-clip contains the horizontal slide without trapping the
              Dropdown popups (overflow-y stays visible, unlike overflow-hidden). */}
          <div className="overflow-x-clip">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`${role}-${stage}`}
                custom={direction}
                initial={reduce ? false : { opacity: 0, x: direction * 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -28 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {role === 'student' ? renderStudentStage() : renderTutorStage()}
              </motion.div>
            </AnimatePresence>
          </div>

          {errors.submit && (
            <p className="mt-6 text-sm font-medium text-center" style={{ color: 'var(--accent-coral-fg)' }}>
              {errors.submit}
            </p>
          )}

          <div className="flex gap-3 pt-8">
            <Button type="button" variant="secondary" onClick={handleBack} disabled={loading} className="flex-1">
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
              Back
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {isLastStage ? 'Complete setup' : 'Continue'}
              {!loading && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  /* ─────────────── Stage renderers ─────────────── */

  function renderStudentStage() {
    if (stage === 0) {
      return (
        <>
          <div className="grid sm:grid-cols-2 gap-5">
            <Select
              label="Current grade level"
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
              helper="Matches tutors to your academic level"
            />
            <Select
              label="Exam board"
              name="examTypes"
              value={studentForm.examTypes}
              onChange={handleStudentChange}
              options={[
                { value: 'waec', label: 'WAEC' },
                { value: 'neco', label: 'NECO' },
                { value: 'jamb', label: 'JAMB' },
              ]}
              placeholder="Select exam"
              helper="Finds tutors who specialise in your board"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Subjects you need help with <span style={{ color: 'var(--accent-coral-fg)' }}>*</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
                >
                  Pick all that apply
                </span>
              </label>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Tutors specialise by subject — pick what you actually need.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(subject => (
                <Chip
                  key={subject}
                  label={subject}
                  selected={studentForm.subjects.includes(subject)}
                  onClick={() => toggleSubject(subject)}
                />
              ))}
            </div>
            <div className="pt-1">
              <Input
                label="Other subject"
                name="customSubject"
                type="text"
                placeholder="E.g. Further Mathematics"
                value={studentForm.customSubject}
                onChange={handleStudentChange}
              />
            </div>
            {errors.subjects && (
              <p className="text-xs font-medium" style={{ color: 'var(--accent-coral-fg)' }}>{errors.subjects}</p>
            )}
          </div>
        </>
      )
    }

    if (stage === 1) {
      return (
        <>
          <div className="grid sm:grid-cols-2 gap-5">
            <Select
              label="How do you learn best?"
              name="learningStylePreference"
              value={studentForm.learningStylePreference}
              onChange={handleStudentChange}
              error={errors.learningStylePreference}
              options={[
                { value: 'visual', label: 'Visual (diagrams, videos)' },
                { value: 'auditory', label: 'Auditory (discussion, lectures)' },
                { value: 'kinesthetic', label: 'Kinesthetic (hands-on practice)' },
                { value: 'mixed', label: 'Mixed approach' },
              ]}
              placeholder="Select your style"
              helper="We match tutors who teach the way you learn"
            />
            <Select
              label="How fast do you like to learn?"
              name="learningPace"
              value={studentForm.learningPace}
              onChange={handleStudentChange}
              options={[
                { value: 'fast', label: 'Fast (move quickly)' },
                { value: 'moderate', label: 'Moderate (balanced)' },
                { value: 'steady', label: 'Steady (take my time)' },
              ]}
              placeholder="Select your pace"
              helper="We pace tutoring to suit you"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Select
              label="Delivery"
              name="deliveryPreference"
              value={studentForm.deliveryPreference}
              onChange={handleStudentChange}
              options={[
                { value: 'online', label: 'Online' },
                { value: 'in-person', label: 'In person' },
              ]}
              placeholder="Online or in person?"
              helper="Determines which tutors appear"
            />
            <Select
              label="Format"
              name="formatPreference"
              value={studentForm.formatPreference}
              onChange={handleStudentChange}
              options={[
                { value: 'one-on-one', label: 'One-on-one' },
                { value: 'group', label: 'Group' },
              ]}
              placeholder="Session format"
              helper="One-on-one is focused; groups cost less"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Preferred languages
              </label>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Learning in your preferred language makes it click faster.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <Chip
                  key={lang}
                  label={lang}
                  selected={studentForm.languages.includes(lang)}
                  onClick={() => toggleLanguage('student', lang)}
                />
              ))}
            </div>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="grid sm:grid-cols-2 gap-5">
          <Input
            label="Monthly budget (₦)"
            name="budget"
            type="number"
            placeholder="150"
            value={studentForm.budget}
            onChange={handleStudentChange}
            helper="Filters tutors within your range"
          />
          <Select
            label="Preferred timezone"
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
            helper="Aligns availability with your tutors"
          />
        </div>

        <Input
          label="Region"
          name="region"
          type="text"
          placeholder="E.g. Lagos, Abuja"
          value={studentForm.region}
          onChange={handleStudentChange}
          helper="Used for in-person tutoring matches"
        />

        <Textarea
          label="Short bio"
          name="bio"
          rows={3}
          placeholder="What are you working toward?"
          value={studentForm.bio}
          onChange={handleStudentChange}
          helper="Tutors read this to tailor their approach"
        />
      </>
    )
  }

  function renderTutorStage() {
    if (stage === 0) {
      return (
        <>
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Subjects you teach <span style={{ color: 'var(--accent-coral-fg)' }}>*</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
                >
                  Pick all that apply
                </span>
              </label>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Students search by subject — tap every subject you can teach.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(subject => (
                <Chip
                  key={subject}
                  label={subject}
                  selected={tutorForm.expertise.includes(subject)}
                  onClick={() => toggleExpertise(subject)}
                />
              ))}
            </div>
            {errors.expertise && (
              <p className="text-xs font-medium" style={{ color: 'var(--accent-coral-fg)' }}>{errors.expertise}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Select
              label="Years of experience"
              name="yearsExperience"
              value={tutorForm.yearsExperience}
              onChange={handleTutorChange}
              error={errors.yearsExperience}
              options={[
                { value: '1', label: 'Less than 1 year' },
                { value: '2', label: '2–5 years' },
                { value: '5', label: '5–10 years' },
                { value: '10', label: '10+ years' },
              ]}
              placeholder="Select experience"
              helper="Students filter by experience"
            />
            <Input
              label="Hourly rate (₦)"
              name="hourlyRate"
              type="number"
              placeholder="25"
              value={tutorForm.hourlyRate}
              onChange={handleTutorChange}
              error={errors.hourlyRate}
              helper="Sets your rate clearly, up front"
            />
          </div>
        </>
      )
    }

    if (stage === 1) {
      return (
        <>
          <div className="grid sm:grid-cols-2 gap-5">
            <Select
              label="Teaching style"
              name="teachingStyle"
              value={tutorForm.teachingStyle}
              onChange={handleTutorChange}
              options={[
                { value: 'interactive', label: 'Interactive (discussion-based)' },
                { value: 'lecture', label: 'Lecture (structured delivery)' },
              ]}
              placeholder="Select style"
              helper="Matched to how students learn"
            />
            <Select
              label="Teaching pace"
              name="teachingPace"
              value={tutorForm.teachingPace}
              onChange={handleTutorChange}
              options={[
                { value: 'fast', label: 'Fast (move quickly)' },
                { value: 'moderate', label: 'Moderate (balanced)' },
                { value: 'steady', label: 'Steady (thorough, unrushed)' },
              ]}
              placeholder="Select pace"
              helper="Matched to students who prefer it"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Select
              label="Delivery"
              name="deliveryStyle"
              value={tutorForm.deliveryStyle}
              onChange={handleTutorChange}
              options={[
                { value: 'online', label: 'Online' },
                { value: 'in-person', label: 'In person' },
              ]}
              placeholder="How do you teach?"
              helper="Defines who sees you in search"
            />
            <Select
              label="Format"
              name="formatStyle"
              value={tutorForm.formatStyle}
              onChange={handleTutorChange}
              options={[
                { value: 'one-on-one', label: 'One-on-one' },
                { value: 'group', label: 'Group' },
              ]}
              placeholder="Session format"
              helper="One-on-one is premium; groups scale"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Input
              label="Student capacity"
              name="capacity"
              type="number"
              min={1}
              placeholder="5"
              value={tutorForm.capacity}
              onChange={handleTutorChange}
              helper="Max students you'll take at once"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Languages you teach in
              </label>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Being multilingual widens your student pool.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <Chip
                  key={lang}
                  label={lang}
                  selected={tutorForm.languages.includes(lang)}
                  onClick={() => toggleLanguage('tutor', lang)}
                />
              ))}
            </div>
          </div>
        </>
      )
    }

    return (
      <>
        <Select
          label="Preferred timezone"
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
          helper="Essential for accurate availability and scheduling"
        />

        <Textarea
          label="About you"
          name="bio"
          rows={4}
          placeholder="Tell students about your teaching style and experience..."
          value={tutorForm.bio}
          onChange={handleTutorChange}
          helper="A strong bio is the #1 reason students book a trial"
        />
      </>
    )
  }

  /* ─────────────── Local components ─────────────── */

  function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all pressable"
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
}
