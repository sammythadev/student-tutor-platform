'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { BookOpen, ArrowRight, GraduationCap, CheckCircle2 } from 'lucide-react'
import { login } from '@/lib/api/auth'

export default function SigninPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false })
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
    if (!formData.email)    newErrors.email    = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setLoading(true)
    try {
      const session = await login({ email: formData.email, password: formData.password })
      const role = session.user?.role
      if (role === 'tutor')  router.push('/tutor-dashboard')
      else if (role === 'admin') router.push('/admin')
      else router.push('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Invalid credentials. Please try again.'
      setErrors({ password: Array.isArray(msg) ? msg.join(', ') : msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex">

      {/* ─── Left panel — decorative (desktop) ─── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, var(--surface) 0%, var(--canvas) 100%)' }}
      >
        {/* Ambient blobs */}
        <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="ambient-blob w-96 h-96 -top-24 -left-24"
            style={{ background: 'var(--blob-primary)', opacity: 0.6 }}
          />
          <div
            className="ambient-blob w-80 h-80 bottom-0 right-0"
            style={{ background: 'var(--blob-accent)', opacity: 0.5 }}
          />
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 relative z-10 cursor-pointer w-fit">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-heading text-xl font-bold text-text-primary">Tutorly</span>
        </Link>

        {/* Value props */}
        <div className="space-y-8 relative z-10">
          <div>
            <h2 className="font-heading text-4xl font-bold text-text-primary tracking-tight leading-tight mb-4">
              Learn from the world&apos;s best tutors.
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Join 15,000+ students already accelerating their learning journey.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              'Matched with top-tier, verified educators',
              'Flexible scheduling around your calendar',
              'HD virtual sessions with recordings',
              '98% student satisfaction rate',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: 'var(--accent)' }}
                  strokeWidth={2}
                />
                <span className="text-sm text-text-primary font-medium">{item}</span>
              </li>
            ))}
          </ul>

          {/* Social proof avatars */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {['lavender', 'sky', 'mint', 'sun'].map((c, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                  style={{
                    background: `var(--accent-${c}-bg)`,
                    color: `var(--accent-${c}-fg)`,
                    borderColor: 'var(--canvas)',
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">15,000+</span> students learning today
            </p>
          </div>
        </div>

        {/* GraduationCap icon watermark */}
        <div aria-hidden className="absolute bottom-12 right-12 opacity-5">
          <GraduationCap className="w-48 h-48 text-text-primary" strokeWidth={0.5} />
        </div>
      </div>

      {/* ─── Right panel — form ─── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 md:px-10">
        {/* Mobile background blobs */}
        <div aria-hidden className="fixed inset-0 pointer-events-none -z-10 lg:hidden overflow-hidden">
          <div className="ambient-blob blob-primary w-80 h-80 -top-20 -left-20 opacity-60" />
          <div className="ambient-blob blob-accent  w-72 h-72 bottom-0 -right-20 opacity-50" />
        </div>

        <div className="w-full max-w-md space-y-7">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer lg:hidden w-fit">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-xl font-bold text-text-primary">Tutorly</span>
          </Link>

          {/* Heading */}
          <div>
            <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">
              Welcome back
            </h1>
            <p className="text-text-secondary mt-2 text-sm">
              Sign in to continue your learning journey
            </p>
          </div>

          {/* Form card */}
          <form
            onSubmit={handleSubmit}
            className="surface-card p-7 space-y-5"
            noValidate
          >
            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <div className="space-y-1.5">
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
              />
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold transition-colors cursor-pointer"
                  style={{ color: 'var(--primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 rounded cursor-pointer accent-primary"
                style={{ accentColor: 'var(--primary)' }}
              />
              <span className="text-sm text-text-secondary">Remember me for 30 days</span>
            </label>

            <Button size="lg" type="submit" loading={loading} className="w-full">
              {!loading && 'Sign in'}
              {!loading && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <p className="text-xs text-text-muted">or</p>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Footer links */}
          <div className="text-center space-y-3">
            <p className="text-sm text-text-secondary">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-semibold transition-colors cursor-pointer"
                style={{ color: 'var(--primary)' }}
              >
                Create one free
              </Link>
            </p>
            <Link
              href="/"
              className="block text-sm transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
