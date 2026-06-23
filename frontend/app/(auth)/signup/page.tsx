'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { BookOpen, ArrowRight, Users, GraduationCap } from 'lucide-react'
import { signup } from '@/lib/api/auth'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    role: 'student' as 'student' | 'tutor', agreeTerms: false,
  })
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

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
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Sign up failed. Please try again.'
      setErrors({ email: Array.isArray(msg) ? msg.join(', ') : msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Ambient blobs */}
      <div aria-hidden className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="ambient-blob blob-primary w-96 h-96 -top-32 -left-32 opacity-70" />
        <div className="ambient-blob blob-accent  w-80 h-80 bottom-0 -right-20 opacity-50" />
      </div>

      <div className="w-full max-w-md space-y-7">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer w-fit mx-auto">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-heading text-xl font-bold text-text-primary">Tutorly</span>
        </Link>

        {/* Heading */}
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">Create your account</h1>
          <p className="text-text-secondary mt-2 text-sm">Start your learning journey today — it&apos;s free</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'student', label: 'I&apos;m a Student', Icon: GraduationCap },
            { value: 'tutor',   label: 'I&apos;m a Tutor',   Icon: Users },
          ] as const).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormData(p => ({ ...p, role: value }))}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150"
              style={{
                background:   formData.role === value ? 'var(--primary-subtle)' : 'var(--surface)',
                borderColor:  formData.role === value ? 'var(--primary)'        : 'var(--border)',
                color:        formData.role === value ? 'var(--primary)'        : 'var(--text-secondary)',
              }}
            >
              <Icon className="w-5 h-5" strokeWidth={2} />
              <span className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: label }} />
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="surface-card p-7 space-y-4" noValidate>
          <Input
            label="Full Name"
            name="fullName"
            type="text"
            placeholder="John Doe"
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
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            helper="Minimum 8 characters"
          />
          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
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
        </form>

        {/* Footer */}
        <div className="text-center space-y-3">
          <p className="text-sm text-text-secondary">
            Already have an account?{' '}
            <Link href="/signin" className="font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>
              Sign in
            </Link>
          </p>
          <Link href="/" className="block text-sm cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
