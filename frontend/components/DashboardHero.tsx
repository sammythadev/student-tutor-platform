'use client'

import Link from 'next/link'
import { Calendar } from 'lucide-react'

interface HeroStat {
  icon: typeof Calendar
  label: string
  value: string
}

interface HeroAction {
  label: string
  href: string
  variant?: 'primary' | 'secondary'
}

interface DashboardHeroProps {
  title: string
  eyebrow?: string
  stats?: HeroStat[]
  actions?: HeroAction[]
  accent?: 'primary' | 'accent'
}

const styles = `
@keyframes hero-stat-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

/** Deep, editorial hero band. Two toneable backgrounds — pine (primary) and
 *  a warmer brass-lit pine (accent) — both built to read as expensive in either
 *  colour scheme, with the ambient glows and dot-grid rather than floating shapes. */
export function DashboardHero({
  title, eyebrow, stats, actions, accent = 'primary',
}: DashboardHeroProps) {
  const isPrimary = accent === 'primary'
  const background = isPrimary
    ? 'linear-gradient(150deg, #12241D 0%, #0C1A15 55%, #0A1410 100%)'
    : 'linear-gradient(150deg, #241C0C 0%, #1A1408 55%, #14100A 100%)'
  const label = eyebrow ?? (isPrimary ? 'Student dashboard' : 'Tutor dashboard')

  return (
    <>
      <style>{styles}</style>
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-7 md:px-9 md:py-9"
        style={{ background, boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Ambient glows */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(201,162,75,0.22), transparent 65%)', filter: 'blur(20px)' }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(47,122,99,0.30), transparent 65%)', filter: 'blur(20px)' }} />
        {/* Dot-grid texture */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{ backgroundImage: 'radial-gradient(rgba(242,237,227,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        {/* Grain */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        {/* Hairline top edge for a crafted, printed feel */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(230,200,126,0.35), transparent)' }} />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="label-caps" style={{ color: '#D9B868' }}>{label}</p>
            <h1 className="text-display mt-2.5 text-[1.9rem] leading-[1.05] md:text-4xl" style={{ color: '#F4F0E8' }}>
              {title}
            </h1>

            {stats && stats.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2.5">
                {stats.map((stat, i) => (
                  <div
                    key={stat.label}
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold"
                    style={{
                      background: 'rgba(242,237,227,0.06)',
                      border: '1px solid rgba(242,237,227,0.12)',
                      backdropFilter: 'blur(8px)',
                      color: '#EDE7DA',
                      animation: `hero-stat-in 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`,
                    }}
                  >
                    <stat.icon className="h-3.5 w-3.5" style={{ color: '#D9B868' }} strokeWidth={2} />
                    <span className="tabular-nums" style={{ color: '#F4F0E8' }}>{stat.value}</span>
                    <span style={{ color: '#8A9187' }}>{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {actions && actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              {actions.map((action, i) => {
                const primary = action.variant === 'primary'
                return (
                  <Link
                    key={i}
                    href={action.href}
                    className="rounded-pill inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer active:scale-[0.98]"
                    style={primary
                      ? { background: '#F4F0E8', color: '#12241D', boxShadow: '0 8px 24px rgba(0,0,0,0.28)' }
                      : { background: 'rgba(242,237,227,0.08)', color: '#F4F0E8', border: '1px solid rgba(242,237,227,0.16)', backdropFilter: 'blur(8px)' }}
                  >
                    {action.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
