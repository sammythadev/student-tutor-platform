'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/Button'
import { Input, Select, Textarea } from '@/components/Input'
import { Button as UiButton } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  BookOpen,
  GraduationCap,
  Presentation,
  Compass,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  Headphones,
  Hand,
  Layers,
  Video,
  MapPin,
  User,
  Users,
  MessagesSquare,
  Wallet,
  Minus,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { onboard, type TeachingStyle, type DeliveryMode, type FormatPreference, type LearningPace } from '@/lib/api/auth'
import { apiErrorText } from '@/lib/api/errors'
import { OptionCard } from '@/components/onboard/OptionCard'
import { RangeSlider } from '@/components/onboard/RangeSlider'
import { SteppedSlider } from '@/components/onboard/SteppedSlider'
import { Stepper } from '@/components/onboard/Stepper'
import { OnboardSummary, type SummaryItem } from '@/components/onboard/OnboardSummary'

type Role = 'student' | 'tutor'

interface Stage {
  title: string
  blurb: string
  icon: LucideIcon
}

const STUDENT_STAGES: Stage[] = [
  { title: 'Your level', blurb: 'Your grade and exam board.', icon: GraduationCap },
  { title: 'Subjects', blurb: 'What you need help with.', icon: BookOpen },
  { title: 'Learning style', blurb: 'What helps you pick things up.', icon: Compass },
  { title: 'Sessions', blurb: 'Online or in person, alone or in a group.', icon: Video },
  { title: 'Budget', blurb: 'A monthly range, and a bio if you want one.', icon: Wallet },
]

const TUTOR_STAGES: Stage[] = [
  { title: 'Subjects', blurb: 'What you are qualified to teach.', icon: GraduationCap },
  { title: 'Experience', blurb: 'Years teaching, your rate, and how many students you take.', icon: SlidersHorizontal },
  { title: 'Teaching style', blurb: 'Discussion-led or structured.', icon: Presentation },
  { title: 'Sessions', blurb: 'Online or in person, and the languages you teach in.', icon: Video },
  { title: 'About you', blurb: 'A short bio for your profile.', icon: Wallet },
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

const TIMEZONES = [
  { value: 'Africa/Lagos', label: 'Africa/Lagos' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Chicago', label: 'America/Chicago' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
]

const PACE_OPTIONS = [
  { value: 'steady', label: 'Steady', hint: 'Unrushed and thorough. Room for questions.' },
  { value: 'moderate', label: 'Moderate', hint: 'Steady progress every session.' },
  { value: 'fast', label: 'Fast', hint: 'Exam prep and revision, moving quickly.' },
]

const GRADES = [
  { value: '9', label: 'Grade 9' },
  { value: '10', label: 'Grade 10' },
  { value: '11', label: 'Grade 11' },
  { value: '12', label: 'Grade 12' },
  { value: 'college', label: 'College' },
]

const EXAMS = [
  { value: 'waec', label: 'WAEC' },
  { value: 'neco', label: 'NECO' },
  { value: 'jamb', label: 'JAMB' },
]

const LEARNING_STYLES: { value: string; label: string; blurb: string; icon: LucideIcon }[] = [
  { value: 'visual', label: 'Visual', blurb: 'Diagrams and video', icon: Eye },
  { value: 'auditory', label: 'Auditory', blurb: 'Talking it through', icon: Headphones },
  { value: 'kinesthetic', label: 'Hands on', blurb: 'Practice and past papers', icon: Hand },
  { value: 'mixed', label: 'Mixed', blurb: 'A mix of all three', icon: Layers },
]

const TEACHING_STYLES: { value: string; label: string; blurb: string; icon: LucideIcon }[] = [
  { value: 'interactive', label: 'Interactive', blurb: 'The student leads', icon: MessagesSquare },
  { value: 'lecture', label: 'Lecture', blurb: 'You set the structure', icon: Presentation },
]

const DELIVERY_OPTIONS: { value: string; label: string; blurb: string; icon: LucideIcon }[] = [
  { value: 'online', label: 'Online', blurb: 'Video call', icon: Video },
  { value: 'in-person', label: 'In person', blurb: 'Face to face', icon: MapPin },
]

const FORMAT_OPTIONS: { value: string; label: string; blurb: string; icon: LucideIcon }[] = [
  { value: 'one-on-one', label: 'One on one', blurb: 'One student at a time', icon: User },
  { value: 'group', label: 'Group', blurb: 'Several students at once', icon: Users },
]

const naira = (v: number) => (v === 0 ? 'Any' : `₦${v.toLocaleString()}`)

export default function OnboardingPage() {
  const router = useRouter()
  const reduce = useReducedMotion()

  const [screen, setScreen] = useState<'role' | 'form'>('role')
  const [role, setRole] = useState<Role | null>(null)
  const [stage, setStage] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showAllSubjects, setShowAllSubjects] = useState(false)
  const [showCustomSubject, setShowCustomSubject] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (screen === 'form') headingRef.current?.focus()
  }, [screen, stage])

  useEffect(() => {
    if (Object.keys(errors).length > 0) errorRef.current?.focus()
  }, [errors])

  const [studentForm, setStudentForm] = useState({
    gradeLevel: '',
    subjects: [] as string[],
    customSubject: '',
    budget: '',
    examTypes: '',
    learningStylePreference: '',
    learningPace: 'moderate',
    deliveryPreference: '',
    formatPreference: '',
    languages: [] as string[],
    region: '',
    timezone: '',
    bio: '',
  })

  const [tutorForm, setTutorForm] = useState({
    expertise: [] as string[],
    customExpertise: '',
    yearsExperience: '',
    hourlyRate: '',
    teachingStyle: '',
    teachingPace: 'moderate',
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
    setShowAllSubjects(false)
    setShowCustomSubject(false)
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

  const validateStage = (i: number): Record<string, string> => {
    const e: Record<string, string> = {}
    if (role === 'student') {
      if (i === 0 && !studentForm.gradeLevel) e.gradeLevel = 'Pick your grade level to continue'
      if (i === 1 && studentForm.subjects.length === 0) e.subjects = 'Select at least one subject'
      if (i === 2 && !studentForm.learningStylePreference) e.learningStylePreference = 'Pick how you learn best'
      if (i === 4 && studentForm.budget !== '') {
        const budget = Number(studentForm.budget)
        if (!Number.isInteger(budget) || budget < 0 || budget > 100000) {
          e.budget = 'Enter a monthly amount between ₦0 and ₦100,000'
        }
      }
    } else {
      if (i === 0 && tutorForm.expertise.length === 0) e.expertise = 'Select at least one subject'
      if (i === 1) {
        const years = Number(tutorForm.yearsExperience)
        const rate = Number(tutorForm.hourlyRate)
        if (tutorForm.yearsExperience === '' || !Number.isInteger(years) || years < 0 || years > 100) {
          e.yearsExperience = 'Enter whole years of experience between 0 and 100'
        }
        if (tutorForm.hourlyRate === '' || !Number.isFinite(rate) || rate < 1) {
          e.hourlyRate = 'Enter an hourly rate of at least ₦1'
        }
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
        budget: Number(studentForm.budget) > 0 ? Number(studentForm.budget) : undefined,
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
      setComplete(true)
      router.push('/dashboard')
    } catch (err) {
      setComplete(false)
      setErrors({ submit: apiErrorText(err) })
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
        subjectsTaught: tutorForm.customExpertise.trim()
          ? [...tutorForm.expertise, tutorForm.customExpertise.trim()]
          : tutorForm.expertise,
        gradeLevelsSupported: [9, 10, 11, 12],
        examTypesSupported: ['waec', 'neco', 'jamb'],
        availability: defaultAvailability,
        hourlyRate: Number(tutorForm.hourlyRate),
        bio: tutorForm.bio || undefined,
        timezone: tutorForm.timezone || 'Africa/Lagos',
        experienceYears: Number(tutorForm.yearsExperience),
        languages: tutorForm.languages.length > 0 ? tutorForm.languages : ['English'],
        capacity: Number(tutorForm.capacity) || 5,
        teachingStyle: (tutorForm.teachingStyle || undefined) as TeachingStyle | undefined,
        teachingPace: (tutorForm.teachingPace || undefined) as LearningPace | undefined,
        deliveryStyle: (tutorForm.deliveryStyle || undefined) as DeliveryMode | undefined,
        formatStyle: (tutorForm.formatStyle || undefined) as FormatPreference | undefined,
      })
      setComplete(true)
      router.push('/tutor-dashboard')
    } catch (err) {
      setComplete(false)
      setErrors({ submit: apiErrorText(err) })
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

  if (complete) {
    return (
      <div className="min-h-[100dvh] bg-canvas px-4 flex items-center justify-center">
        <motion.div role="status" initial={reduce ? false : { opacity: 0, transform: 'translateY(8px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center">
          <Check aria-hidden="true" className="mx-auto size-8 text-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Your profile is ready</h1>
          <p className="text-sm text-muted-foreground">Opening your dashboard…</p>
          <Link className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline underline-offset-4" href={role === 'tutor' ? '/tutor-dashboard' : '/dashboard'}>Go to dashboard</Link>
        </motion.div>
      </div>
    )
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
      <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-canvas flex items-center justify-center px-3 py-12 sm:px-4">

        <div className="w-full min-w-0 max-w-2xl space-y-8 sm:space-y-10">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--primary)' }}
            >
              <BookOpen className="w-6 h-6" style={{ color: 'var(--primary-fg)' }} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-ink-900 text-center">Let&apos;s get started</h1>
            <p className="text-center text-ink-600 text-base max-w-md">
              Choose how you will use Tutorly. Five short steps, about a minute.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {roleCards.map(({ role: r, icon: Icon, title, blurb, tint, fg }, i) => (
              <motion.button
                key={r}
                initial={reduce ? false : { opacity: 0, transform: 'translateY(8px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                whileTap={reduce ? undefined : { transform: 'scale(0.98)' }}
                transition={{ duration: 0.2, delay: reduce ? 0 : i * 0.05, ease: [0.23, 1, 0.32, 1] }}
                onClick={() => handleSelectRole(r)}
                className="glass-card w-full min-w-0 p-6 text-left card-interactive hover:shadow-[var(--shadow-md)] group sm:p-7"
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
              </motion.button>
            ))}
          </div>

          <div className="text-center">
            <Link href="/" className="text-sm text-ink-400 hover:text-ink-600 transition-colors">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ─────────────── Staged form ─────────────── */
  const active = stages[stage]
  const ActiveIcon = active.icon
  const summaryItems: SummaryItem[] = role === 'student'
    ? [
        { label: 'Level', value: GRADES.find(g => g.value === studentForm.gradeLevel)?.label ?? null },
        { label: 'Subjects', value: studentForm.subjects.length > 0 ? `${studentForm.subjects.length} picked` : null },
        { label: 'Style', value: LEARNING_STYLES.find(s => s.value === studentForm.learningStylePreference)?.label ?? null },
        { label: 'Pace', value: PACE_OPTIONS.find(p => p.value === studentForm.learningPace)?.label ?? null },
        {
          label: 'Budget',
          value: studentForm.budget ? naira(Number(studentForm.budget)) : null,
        },
      ]
    : [
        {
          label: 'Subjects',
          value:
            tutorForm.expertise.length + (tutorForm.customExpertise.trim() ? 1 : 0) > 0
              ? `${tutorForm.expertise.length + (tutorForm.customExpertise.trim() ? 1 : 0)} picked`
              : null,
        },
        {
          label: 'Rate',
          value: tutorForm.hourlyRate ? `${naira(Number(tutorForm.hourlyRate))}/hr` : null,
        },
        {
          label: 'Experience',
          value: tutorForm.yearsExperience ? `${tutorForm.yearsExperience} yrs` : null,
        },
        { label: 'Style', value: TEACHING_STYLES.find(s => s.value === tutorForm.teachingStyle)?.label ?? null },
        { label: 'Capacity', value: tutorForm.capacity ? `${tutorForm.capacity} students` : null },
      ]

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-canvas px-3 py-8 sm:px-4 sm:py-12">

      <div className="w-full min-w-0 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-900">
            {role === 'student' ? 'Set up your learner profile' : 'Set up your tutor profile'}
          </h1>
          <p className="text-ink-600 text-sm sm:text-base max-w-md">
            One question at a time. Change anything later in settings.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <OnboardSummary
            items={summaryItems}
            heading={role === 'student' ? 'Your learner preview' : 'Your tutor preview'}
          />

          <div className="min-w-0 space-y-6">
            <Stepper steps={stages} current={stage} disabled={loading} onStepChange={(next) => {
              if (next >= stage || loading) return
              setErrors({})
              setDirection(-1)
              setStage(next)
            }} />

            <form onSubmit={handleAdvance} className="glass-card w-full min-w-0 max-w-full p-5 sm:p-8">
              <div className="flex min-w-0 items-start gap-3.5 mb-6">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
                >
                  <ActiveIcon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-foreground leading-tight outline-none">{active.title}</h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{active.blurb}</p>
                </div>
              </div>

              {Object.keys(errors).length > 0 && (
                <div ref={errorRef} tabIndex={-1} className="mb-6 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{Object.values(errors).join('. ')}</AlertDescription>
                  </Alert>
                </div>
              )}
              <fieldset disabled={loading} className="min-w-0 space-y-6">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={`${role}-${stage}`}
                    custom={direction}
                    initial={reduce ? false : { opacity: 0, transform: `translateX(${direction * 8}px)` }}
                    animate={{ opacity: 1, transform: 'translateX(0px)' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
                    className="w-full min-w-0 space-y-6"
                  >
                    {role === 'student' ? renderStudentStage() : renderTutorStage()}
                  </motion.div>
                </AnimatePresence>
              </fieldset>

              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-border pt-6 mt-8">
                <div className="min-w-0 flex-1">
                  <Button type="button" variant="secondary" onClick={handleBack} disabled={loading} className="w-full">
                    <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                    Back
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <Button type="submit" disabled={loading} aria-busy={loading} className="w-full min-h-11">
                    {loading ? 'Saving profile…' : isLastStage ? 'Complete setup' : 'Continue'}
                    {!loading && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
                  </Button>
                </div>
              </div>
              {!isLastStage && (
                <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  Your answers stay here while you move between steps.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )

  /* ─────────────── Stage renderers ─────────────── */

  function renderStudentStage() {
    if (stage === 0) {
      return (
        <>
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Current grade level <span style={{ color: 'var(--accent-coral-fg)' }}>*</span>
            </legend>
            <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Grade level">
              {GRADES.map(g => (
                <Chip
                  key={g.value}
                  label={g.label}
                  selected={studentForm.gradeLevel === g.value}
                  onClick={() => setStudentForm(prev => ({ ...prev, gradeLevel: g.value }))}
                />
              ))}
            </div>
            {errors.gradeLevel && (
              <p className="mt-2 text-xs font-medium" style={{ color: 'var(--accent-coral-fg)' }}>{errors.gradeLevel}</p>
            )}
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Exam board
            </legend>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Pick the one closest to you. Tutors filter by this.
            </p>
            <div className="mt-2.5 grid min-w-0 grid-cols-3 gap-2 sm:gap-2.5">
              {EXAMS.map(ex => (
                <OptionCard
                  key={ex.value}
                  title={ex.label}
                  compact
                  selected={studentForm.examTypes === ex.value}
                  onClick={() => setStudentForm(prev => ({ ...prev, examTypes: ex.value }))}
                />
              ))}
            </div>
          </fieldset>
        </>
      )
    }

    if (stage === 1) {
      const visible = showAllSubjects ? SUBJECTS : SUBJECTS.slice(0, 6)
      return (
        <>
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Subjects you need help with <span style={{ color: 'var(--accent-coral-fg)' }}>*</span>
            </legend>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Start with 1 or 2. You can add more later.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {visible.map(subject => (
                <Chip
                  key={subject}
                  label={subject}
                  selected={studentForm.subjects.includes(subject)}
                  onClick={() => toggleSubject(subject)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAllSubjects(v => !v)}
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              style={{ color: 'var(--primary)' }}
            >
              {showAllSubjects ? 'Show fewer' : `Show all ${SUBJECTS.length} subjects`}
              <ChevronDown className={`size-3.5 transition-transform ${showAllSubjects ? 'rotate-180' : ''}`} />
            </button>
            {errors.subjects && (
              <p className="mt-2 text-xs font-medium" style={{ color: 'var(--accent-coral-fg)' }}>{errors.subjects}</p>
            )}
          </fieldset>

          <Collapsible open={showCustomSubject} onOpenChange={setShowCustomSubject} className="min-w-0">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                style={{ color: 'var(--primary)' }}
              >
                {showCustomSubject ? 'Hide other subject' : 'Add another subject'}
                <ChevronDown className={`size-3.5 transition-transform ${showCustomSubject ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2.5">
              <Input
                label="Other subject"
                name="customSubject"
                type="text"
                placeholder="E.g. Further Mathematics"
                value={studentForm.customSubject}
                onChange={handleStudentChange}
                aria-label="Other subject"
              />
            </CollapsibleContent>
          </Collapsible>
        </>
      )
    }

    if (stage === 2) {
      return (
        <>
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              How do you learn best? <span style={{ color: 'var(--accent-coral-fg)' }}>*</span>
            </legend>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LEARNING_STYLES.map(s => (
                <OptionCard
                  key={s.value}
                  title={s.label}
                  blurb={s.blurb}
                  icon={s.icon}
                  selected={studentForm.learningStylePreference === s.value}
                  onClick={() => setStudentForm(prev => ({ ...prev, learningStylePreference: s.value }))}
                />
              ))}
            </div>
            {errors.learningStylePreference && (
              <p className="mt-2 text-xs font-medium" style={{ color: 'var(--accent-coral-fg)' }}>{errors.learningStylePreference}</p>
            )}
          </fieldset>

          <SteppedSlider
            label="Learning pace"
            options={PACE_OPTIONS}
            value={studentForm.learningPace || 'moderate'}
            onChange={(v) => setStudentForm(prev => ({ ...prev, learningPace: v }))}
          />
        </>
      )
    }

    if (stage === 3) {
      return (
        <>
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              How should sessions run?
            </legend>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DELIVERY_OPTIONS.map(o => (
                <OptionCard
                  key={o.value}
                  title={o.label}
                  blurb={o.blurb}
                  icon={o.icon}
                  selected={studentForm.deliveryPreference === o.value}
                  onClick={() => setStudentForm(prev => ({ ...prev, deliveryPreference: o.value }))}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Session format
            </legend>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FORMAT_OPTIONS.map(o => (
                <OptionCard
                  key={o.value}
                  title={o.label}
                  blurb={o.blurb}
                  icon={o.icon}
                  selected={studentForm.formatPreference === o.value}
                  onClick={() => setStudentForm(prev => ({ ...prev, formatPreference: o.value }))}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Preferred languages
            </legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <Chip
                  key={lang}
                  label={lang}
                  selected={studentForm.languages.includes(lang)}
                  onClick={() => toggleLanguage('student', lang)}
                />
              ))}
            </div>
          </fieldset>
        </>
      )
    }

    const budgetNum = Number(studentForm.budget || 0)
    return (
      <>
        <Input
          label="Monthly budget amount (₦)"
          name="budget"
          type="number"
          inputMode="numeric"
          min={0}
          max={100000}
          step={1}
          placeholder="No budget limit"
          value={studentForm.budget}
          onChange={handleStudentChange}
          error={errors.budget}
          aria-invalid={Boolean(errors.budget)}
          helper="Enter up to ₦100,000 per month, or use the slider. Leave blank or enter 0 for no limit."
        />
        <RangeSlider
          label="Adjust monthly budget"
          min={0}
          max={100000}
          step={1000}
          value={Number.isFinite(budgetNum) ? Math.min(100000, Math.max(0, budgetNum)) : 0}
          onChange={(v) => setStudentForm(prev => ({ ...prev, budget: v === 0 ? '' : String(v) }))}
          format={naira}
          hint="per month"
        />

        <Input
          label="Region"
          name="region"
          type="text"
          placeholder="E.g. Lagos"
          value={studentForm.region}
          onChange={handleStudentChange}
          helper="Only needed for in-person"
        />

        <Textarea
          label="Short bio (optional)"
          name="bio"
          rows={3}
          placeholder="What are you working toward?"
          value={studentForm.bio}
          onChange={handleStudentChange}
          helper="One sentence is enough"
        />

        <Collapsible className="min-w-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              style={{ color: 'var(--text-muted)' }}
            >
              Advanced: timezone
              <ChevronDown className="size-3.5" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2.5 max-w-full sm:max-w-sm">
            <Select
              label="Preferred timezone"
              name="timezone"
              value={studentForm.timezone}
              onChange={handleStudentChange}
              options={TIMEZONES}
              placeholder="Africa/Lagos"
            />
          </CollapsibleContent>
        </Collapsible>
      </>
    )
  }

  function renderTutorStage() {
    if (stage === 0) {
      const visible = showAllSubjects ? SUBJECTS : SUBJECTS.slice(0, 6)
      return (
        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Subjects you teach <span style={{ color: 'var(--accent-coral-fg)' }}>*</span>
          </legend>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Start with your strongest 1 or 2.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {visible.map(subject => (
              <Chip
                key={subject}
                label={subject}
                selected={tutorForm.expertise.includes(subject)}
                onClick={() => toggleExpertise(subject)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAllSubjects(v => !v)}
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            style={{ color: 'var(--primary)' }}
          >
            {showAllSubjects ? 'Show fewer' : `Show all ${SUBJECTS.length} subjects`}
            <ChevronDown className={`size-3.5 transition-transform ${showAllSubjects ? 'rotate-180' : ''}`} />
          </button>
          {errors.expertise && (
            <p className="mt-2 text-xs font-medium" style={{ color: 'var(--accent-coral-fg)' }}>{errors.expertise}</p>
          )}

          <Collapsible open={showCustomSubject} onOpenChange={setShowCustomSubject} className="mt-3 min-w-0">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                style={{ color: 'var(--primary)' }}
              >
                {showCustomSubject ? 'Hide other subject' : 'Add another subject you teach'}
                <ChevronDown className={`size-3.5 transition-transform ${showCustomSubject ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2.5">
              <Input
                label="Other subject"
                name="customExpertise"
                type="text"
                placeholder="E.g. Further Mathematics"
                value={tutorForm.customExpertise}
                onChange={handleTutorChange}
                aria-label="Other subject you teach"
              />
            </CollapsibleContent>
          </Collapsible>
        </fieldset>
      )
    }

    if (stage === 1) {
      const capacityNum = Number(tutorForm.capacity || 5)
      return (
        <>
          <Input
            label="Years of experience"
            name="yearsExperience"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            placeholder="E.g. 3"
            value={tutorForm.yearsExperience}
            onChange={handleTutorChange}
            error={errors.yearsExperience}
            aria-invalid={Boolean(errors.yearsExperience)}
            helper="Enter 0 if you are just starting."
          />
          <Input
            label="Hourly rate (₦)"
            name="hourlyRate"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            placeholder="E.g. 5000"
            value={tutorForm.hourlyRate}
            onChange={handleTutorChange}
            error={errors.hourlyRate}
            aria-invalid={Boolean(errors.hourlyRate)}
            helper="Your price for a one-hour session, in naira."
          />

          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Student capacity
            </legend>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Max students you will take at once.
            </p>
            <div className="mt-2.5 inline-flex max-w-full flex-wrap items-center gap-3 rounded-xl border px-2 py-1.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              <button
                type="button"
                onClick={() => setTutorForm(prev => ({ ...prev, capacity: String(Math.max(1, (Number(prev.capacity) || 1) - 1)) }))}
                aria-label="Decrease capacity"
                className="flex size-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
              >
                <Minus className="size-4" strokeWidth={2} />
              </button>
              <span className="min-w-16 text-center text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }} aria-live="polite">
                {capacityNum}
              </span>
              <button
                type="button"
                onClick={() => setTutorForm(prev => ({ ...prev, capacity: String(Math.min(50, (Number(prev.capacity) || 0) + 1)) }))}
                aria-label="Increase capacity"
                className="flex size-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
              >
                <Plus className="size-4" strokeWidth={2} />
              </button>
            </div>
          </fieldset>
        </>
      )
    }

    if (stage === 2) {
      return (
        <>
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Teaching style
            </legend>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TEACHING_STYLES.map(s => (
                <OptionCard
                  key={s.value}
                  title={s.label}
                  blurb={s.blurb}
                  icon={s.icon}
                  selected={tutorForm.teachingStyle === s.value}
                  onClick={() => setTutorForm(prev => ({ ...prev, teachingStyle: s.value }))}
                />
              ))}
            </div>
          </fieldset>

          <SteppedSlider
            label="Teaching pace"
            options={PACE_OPTIONS}
            value={tutorForm.teachingPace || 'moderate'}
            onChange={(v) => setTutorForm(prev => ({ ...prev, teachingPace: v }))}
          />
        </>
      )
    }

    if (stage === 3) {
      return (
        <>
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              How do you teach?
            </legend>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DELIVERY_OPTIONS.map(o => (
                <OptionCard
                  key={o.value}
                  title={o.label}
                  blurb={o.blurb}
                  icon={o.icon}
                  selected={tutorForm.deliveryStyle === o.value}
                  onClick={() => setTutorForm(prev => ({ ...prev, deliveryStyle: o.value }))}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Session format
            </legend>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FORMAT_OPTIONS.map(o => (
                <OptionCard
                  key={o.value}
                  title={o.label}
                  blurb={o.blurb}
                  icon={o.icon}
                  selected={tutorForm.formatStyle === o.value}
                  onClick={() => setTutorForm(prev => ({ ...prev, formatStyle: o.value }))}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Languages you teach in
            </legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <Chip
                  key={lang}
                  label={lang}
                  selected={tutorForm.languages.includes(lang)}
                  onClick={() => toggleLanguage('tutor', lang)}
                />
              ))}
            </div>
          </fieldset>
        </>
      )
    }

    return (
      <>
        <Textarea
          label="About you (optional)"
          name="bio"
          rows={4}
          placeholder="Your teaching style and experience in one or two sentences..."
          value={tutorForm.bio}
          onChange={handleTutorChange}
          helper="A short bio gets more trial bookings"
        />

        <Collapsible className="min-w-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              style={{ color: 'var(--text-muted)' }}
            >
              Advanced: timezone
              <ChevronDown className="size-3.5" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2.5 max-w-full sm:max-w-sm">
            <Select
              label="Preferred timezone"
              name="timezone"
              value={tutorForm.timezone}
              onChange={handleTutorChange}
              options={TIMEZONES}
              placeholder="Africa/Lagos"
            />
          </CollapsibleContent>
        </Collapsible>
      </>
    )
  }

}

  /* Shared outside the page so selecting an option preserves keyboard focus. */
  function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
    return (
      <UiButton
        type="button"
        variant="outline"
        onClick={onClick}
        aria-pressed={selected}
        className="flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{
          border: selected ? '1px solid var(--primary)' : '1px solid var(--border-strong)',
          background: selected ? 'var(--primary-subtle)' : 'var(--surface-2)',
          color: selected ? 'var(--primary)' : 'var(--text-secondary)',
        }}
      >
        <Check aria-hidden="true" className={`w-3.5 h-3.5 ${selected ? 'opacity-100' : 'opacity-0'}`} strokeWidth={2} />
        {label}
      </UiButton>
    )
  }
