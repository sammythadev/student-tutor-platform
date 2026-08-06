'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Eye,
  EyeOff,
  Lightbulb,
  Wallet,
} from 'lucide-react'
import { login } from '@/lib/api/auth'
import { toApiError, apiErrorText } from '@/lib/api/errors'
import { stagger } from '@/lib/ui'

const EASE = [0.16, 1, 0.3, 1] as const

/** The four criteria the matching engine actually reads. Subject is a hard
 *  filter, the rest are weighted — that distinction is worth being honest about. */
const MATCH_CRITERIA = [
  {
    id: 'subject',
    icon: BookOpen,
    label: 'Required subject',
    detail: 'A hard filter. Tutors who do not teach it never appear in your list.',
  },
  {
    id: 'availability',
    icon: CalendarClock,
    label: 'Availability overlap',
    detail: 'Scored on how much of your free time a tutor can genuinely cover.',
  },
  {
    id: 'style',
    icon: Lightbulb,
    label: 'Learning style',
    detail: 'Visual, auditory or hands-on, weighed against how the tutor teaches.',
  },
  {
    id: 'budget',
    icon: Wallet,
    label: 'Budget and experience',
    detail: 'Balanced so affordability never quietly costs you a qualified tutor.',
  },
] as const

export default function SigninPage() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    if (formError) setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!formData.email)    newErrors.email    = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setLoading(true)
    setFormError('')
    try {
      const session = await login({ email: formData.email, password: formData.password })
      const role = session.user?.role
      if (role === 'tutor')  router.push('/tutor-dashboard')
      else if (role === 'admin') router.push('/admin')
      else router.push('/dashboard')
    } catch (err) {
      const { kind, message } = toApiError(err)
      if (kind === 'unauthorized') {
        setFormError('Those details did not match an account. Check your email and password.')
      } else if (kind === 'network' || kind === 'server') {
        setFormError(apiErrorText(err))
      } else {
        setFormError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const fade = (index: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay: stagger(index), ease: EASE },
        }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">

      {/* ─── Form column ─── */}
      <main className="relative flex flex-col overflow-hidden px-5 py-10 sm:px-10 md:px-14 lg:py-14">
        {/* Mobile-only ambient wash */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 lg:hidden">
          <div className="ambient-blob blob-primary h-72 w-72 -top-20 -right-16 opacity-70" />
          <div className="ambient-blob blob-accent h-64 w-64 bottom-0 -left-20 opacity-50" />
        </div>
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5 rounded-md cursor-pointer"
          aria-label="Tutorly home"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'var(--primary)' }}
          >
            <BookOpen className="h-[18px] w-[18px]" strokeWidth={2.25} style={{ color: 'var(--primary-fg)' }} />
          </span>
          <span className="font-heading text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Tutorly
          </span>
        </Link>

        <div className="flex flex-1 items-center py-10 lg:py-14">
          <div className="w-full max-w-[26rem]">

            <motion.div {...fade(0)}>
              <p className="label-caps" style={{ color: 'var(--text-muted)' }}>Sign in</p>
              <h1
                className="text-display mt-2 text-3xl sm:text-[2rem]"
                style={{ color: 'var(--text-primary)' }}
              >
                Welcome back
              </h1>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Sign in to see your matches, sessions and messages.
              </p>
            </motion.div>

            <motion.form
              {...fade(1)}
              onSubmit={handleSubmit}
              noValidate
              className="mt-7 space-y-5"
            >
              <Input
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />

              <div className="space-y-2">
                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="flex h-5 w-5 items-center justify-center rounded cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword
                        ? <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                        : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                    </button>
                  }
                />
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="h-4 w-4 rounded cursor-pointer"
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Keep me signed in
                    </span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="rounded text-xs font-semibold transition-colors cursor-pointer hover:underline"
                    style={{ color: 'var(--primary)' }}
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl px-3.5 py-3"
                  style={{ background: 'var(--accent-coral-bg)' }}
                >
                  <AlertCircle
                    className="mt-px h-4 w-4 shrink-0"
                    strokeWidth={2}
                    style={{ color: 'var(--accent-coral-fg)' }}
                  />
                  <p
                    className="text-xs font-medium leading-relaxed"
                    style={{ color: 'var(--accent-coral-fg)' }}
                  >
                    {formError}
                  </p>
                </div>
              )}

              <Button
                size="lg"
                type="submit"
                loading={loading}
                className="w-full active:scale-[0.98]"
              >
                Sign in
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Button>
            </motion.form>

            <motion.div {...fade(2)} className="mt-7 space-y-4">
              <div className="h-px w-full" style={{ background: 'var(--border)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                New to Tutorly?{' '}
                <Link
                  href="/signup"
                  className="rounded font-semibold cursor-pointer hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Create an account
                </Link>
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded text-xs font-medium transition-colors cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                Back to home
              </Link>
            </motion.div>
          </div>
        </div>
      </main>

      {/* ─── Brand hero — desktop only ─── */}
      <aside
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-14 lg:py-14"
        style={{ background: '#0B1712' }}
      >
        {/* Photographic base — warm, scholarly, expensive */}
        <Image
          src="/signin-hero.jpg"
          alt=""
          aria-hidden
          fill
          priority
          sizes="(min-width: 1024px) 45vw, 0px"
          className="pointer-events-none select-none object-cover"
          style={{ objectPosition: '50% 42%' }}
        />
        {/* Pine scrim — brand tint + legibility. Darkest at the copy edge. */}
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(11,23,18,0.94) 0%, rgba(11,23,18,0.86) 42%, rgba(9,19,16,0.66) 100%)' }} />
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(9,19,16,0.72) 0%, transparent 62%)' }} />
        {/* Atmospheric glows layered over the photo */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-[26rem] w-[26rem] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(201,162,75,0.22), transparent 65%)', filter: 'blur(20px)' }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 h-[30rem] w-[30rem] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(47,122,99,0.30), transparent 65%)', filter: 'blur(20px)' }} />
        {/* Grain */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        {/* Brass hairline down the seam between the two columns */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-px"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(230,200,126,0.4), transparent)' }} />

        <div className="relative max-w-[27rem]">
          <p className="label-caps" style={{ color: '#D9B868' }}>
            Student–tutor matching
          </p>
          <h2 className="text-display mt-3 text-[2.4rem]" style={{ color: '#F4F0E8' }}>
            Matched by an algorithm, not a waiting list
          </h2>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: '#C6CCC2' }}>
            Every recommendation is produced by a scored assignment engine and can
            be traced back to the four criteria below — built for Nigerian
            secondary schools.
          </p>

          <ul className="relative mt-9 space-y-6">
            <span
              aria-hidden
              className="absolute left-[19px] top-5 bottom-5 w-px"
              style={{ background: 'rgba(242,237,227,0.14)' }}
            />
            {MATCH_CRITERIA.map(({ id, icon: Icon, label, detail }) => (
              <li key={id} className="relative flex gap-4">
                <span
                  className="flex h-[39px] w-[39px] shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'rgba(15,28,23,0.55)',
                    border: '1px solid rgba(242,237,227,0.14)',
                    color: '#D9B868',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </span>
                <div className="pt-1">
                  <p className="text-sm font-semibold" style={{ color: '#F4F0E8' }}>
                    {label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: '#AEB4AA' }}>
                    {detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
