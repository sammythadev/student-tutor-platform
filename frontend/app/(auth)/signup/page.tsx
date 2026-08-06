'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { BookOpen, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { signup } from '@/lib/api/auth'
import { apiErrorText } from '@/lib/api/errors'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    role: 'unassigned' as 'student' | 'tutor' | 'unassigned', agreeTerms: false,
  })
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!formData.fullName) newErrors.fullName = 'Name is required'
    if (!formData.email)    newErrors.email    = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match'
    if (!formData.agreeTerms) newErrors.agreeTerms = 'You must accept the terms'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setLoading(true)
    try {
      const parts = formData.fullName.trim().split(' ')
      const firstName = parts[0] ?? ''
      const lastName  = parts.slice(1).join(' ') || firstName
      await signup({ email: formData.email, password: formData.password, firstName, lastName, role: formData.role })
      router.push('/onboard')
    } catch (err) {
      const msg = apiErrorText(err)
      setErrors({ email: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">

      {/* ── Hero band — pushes the form down ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #10201A 0%, #0B1712 60%, #091310 100%)' }}
      >
        {/* Atmospheric glows */}
        <div aria-hidden className="pointer-events-none absolute -top-24 right-[10%] h-[24rem] w-[24rem] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(201,162,75,0.20), transparent 65%)', filter: 'blur(20px)' }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(47,122,99,0.28), transparent 65%)', filter: 'blur(20px)' }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{ backgroundImage: 'radial-gradient(rgba(242,237,227,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

        {/* Top nav */}
        <div className="relative mx-auto flex max-w-5xl items-center justify-between px-5 pt-6 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer w-fit">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,162,75,0.16)', border: '1px solid rgba(201,162,75,0.3)' }}>
              <BookOpen className="w-5 h-5" strokeWidth={2.25} style={{ color: '#E6C87E' }} />
            </div>
            <span className="font-heading text-xl font-bold" style={{ color: '#F4F0E8' }}>Tutorly</span>
          </Link>
          <Link href="/signin" className="text-sm font-semibold cursor-pointer hover:underline" style={{ color: '#AEB6AA' }}>
            Sign in
          </Link>
        </div>

        {/* Hero copy */}
        <div className="relative mx-auto max-w-5xl px-5 pt-14 pb-28 text-center sm:px-8 sm:pt-20 sm:pb-32">
          <p className="label-caps" style={{ color: '#D9B868' }}>Create your account</p>
          <h1 className="text-display mx-auto mt-3 max-w-2xl text-4xl sm:text-5xl" style={{ color: '#F4F0E8' }}>
            Learn with a tutor who actually fits how you study
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed sm:text-base" style={{ color: '#AEB6AA' }}>
            Tell us your subject, availability and budget. A scored matching engine
            does the rest — no endless scrolling through profiles.
          </p>

          {/* Trust strip */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex -space-x-2.5">
              {[
                { i: 'AO', c: 'lavender' },
                { i: 'BE', c: 'sun' },
                { i: 'CN', c: 'sky' },
                { i: 'DU', c: 'coral' },
              ].map(a => (
                <span
                  key={a.i}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold ring-2"
                  style={{ background: `var(--accent-${a.c}-bg)`, color: `var(--accent-${a.c}-fg)`, boxShadow: '0 0 0 2px #0B1712' }}
                >
                  {a.i}
                </span>
              ))}
            </div>
            <p className="text-xs sm:text-sm" style={{ color: '#9AA398' }}>
              <span className="font-semibold" style={{ color: '#F4F0E8' }}>2,400+ students</span> matched this term
            </p>
          </div>
        </div>
      </div>

      {/* ── Form — pulled up to overlap the hero for depth ── */}
      <div className="relative z-10 mx-auto -mt-20 mb-16 w-full max-w-md px-4">
        <form onSubmit={handleSubmit} className="surface-card p-7 space-y-4 shadow-lg" noValidate style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="mb-1">
            <h2 className="font-heading text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Your details</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>It&apos;s free — you&apos;ll pick a role next.</p>
          </div>
          <Input
            label="Full Name"
            name="fullName"
            type="text"
            placeholder="Ada Obi"
            value={formData.fullName}
            onChange={handleChange}
            error={errors.fullName}
          />
          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
          />
          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            helper="Minimum 8 characters"
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center justify-center w-5 h-5 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            }
          />
          <Input
            label="Confirm Password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="flex items-center justify-center w-5 h-5 cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            }
          />

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
              className="mt-0.5 w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: 'var(--primary)' }}
            />
            <span className="text-xs text-text-secondary leading-relaxed">
              I agree to the{' '}
              <a href="#" className="font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>Privacy Policy</a>
            </span>
          </label>
          {errors.agreeTerms && (
            <p className="text-xs font-semibold" style={{ color: 'var(--accent-coral-fg)' }}>{errors.agreeTerms}</p>
          )}

          <Button size="lg" type="submit" loading={loading} className="w-full">
            {!loading && 'Create Account'}
            {!loading && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
          </Button>

          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/signin" className="font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>
              Sign in
            </Link>
          </p>
        </form>

        <Link href="/" className="mt-5 block text-center text-sm cursor-pointer" style={{ color: 'var(--text-muted)' }}>
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
