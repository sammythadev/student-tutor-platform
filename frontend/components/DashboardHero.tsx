'use client'

import Link from 'next/link'
import { Button } from './Button'
import { Sparkles, GraduationCap, Globe, Calendar, Flame } from 'lucide-react'

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
  stats?: HeroStat[]
  actions?: HeroAction[]
  accent?: 'primary' | 'accent'
}

const shapes = [
  { id: 1, size: 44, top: '12%', left: '6%', duration: 7, delay: 0, shape: 'circle' },
  { id: 2, size: 36, top: '60%', left: '88%', duration: 9, delay: 1, shape: 'square' },
  { id: 3, size: 28, top: '22%', left: '76%', duration: 6, delay: 2, shape: 'triangle' },
  { id: 4, size: 40, top: '72%', left: '10%', duration: 8, delay: 0.5, shape: 'circle' },
  { id: 5, size: 24, top: '38%', left: '94%', duration: 10, delay: 1.5, shape: 'plus' },
  { id: 6, size: 34, top: '82%', left: '38%', duration: 7.5, delay: 3, shape: 'square' },
  { id: 7, size: 22, top: '8%', left: '52%', duration: 6.5, delay: 0.8, shape: 'circle' },
  { id: 8, size: 38, top: '48%', left: '3%', duration: 8.5, delay: 2.5, shape: 'triangle' },
  { id: 9, size: 30, top: '88%', left: '68%', duration: 7, delay: 1.2, shape: 'diamond' },
  { id: 10, size: 20, top: '30%', left: '45%', duration: 9, delay: 3.5, shape: 'plus' },
  { id: 11, size: 48, top: '18%', left: '88%', duration: 6, delay: 0.3, shape: 'circle' },
  { id: 12, size: 26, top: '55%', left: '68%', duration: 8, delay: 2.2, shape: 'diamond' },
]

const styles = `
@keyframes hero-float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-12px) rotate(3deg); }
  50% { transform: translateY(6px) rotate(-2deg); }
  75% { transform: translateY(-4px) rotate(1deg); }
}
.hero-shape {
  position: absolute;
  border-radius: 6px;
  opacity: 0.15;
  will-change: transform;
  pointer-events: none;
}
.hero-shape-circle { border-radius: 50%; }
.hero-shape-triangle { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); border-radius: 0; }
.hero-shape-plus {
  clip-path: polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%);
  border-radius: 2px;
}
.hero-shape-diamond {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  border-radius: 2px;
}
@keyframes stat-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
`

export function DashboardHero({
  title, stats, actions, accent = 'primary',
}: DashboardHeroProps) {

  const isPrimary = accent === 'primary'

  return (
    <>
      <style>{styles}</style>
      <div
        className="relative overflow-hidden rounded-2xl p-5 md:p-7 shadow-sm"
        style={{
          background: isPrimary
            ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)'
            : 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
        }}
      >
        {shapes.map((s) => (
          <div
            key={s.id}
            className={`hero-shape ${s.shape === 'circle' ? 'hero-shape-circle' : ''} ${s.shape === 'triangle' ? 'hero-shape-triangle' : ''} ${s.shape === 'plus' ? 'hero-shape-plus' : ''} ${s.shape === 'diamond' ? 'hero-shape-diamond' : ''}`}
            style={{
              width: s.size, height: s.size, top: s.top, left: s.left,
              background: s.shape === 'square' ? 'transparent' : 'rgba(255,255,255,0.6)',
              border: s.shape === 'square' ? '2px solid rgba(255,255,255,0.35)' : undefined,
              animation: `hero-float ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}

        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }} />

        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isPrimary ? <GraduationCap className="w-4 h-4 text-white/70" /> : <Globe className="w-4 h-4 text-white/70" />}
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                {isPrimary ? 'Student Dashboard' : 'Tutor Dashboard'}
              </p>
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-white leading-tight">{title}</h1>

            {/* Stats as pills */}
            {stats && stats.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {stats.map((stat, i) => (
                  <div
                    key={stat.label}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-white/90 text-xs font-semibold backdrop-blur-sm"
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      animation: `stat-in 0.3s ease-out ${i * 0.1}s both`,
                    }}
                  >
                    <stat.icon className="w-3.5 h-3.5" />
                    <span>{stat.value}</span>
                    <span className="text-white/50">·</span>
                    <span className="text-white/70">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {actions && actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 shrink-0 mt-2 md:mt-0">
              {actions.map((action, i) => (
                <Link key={i} href={action.href}>
                  <Button
                    variant="secondary"
                    className={`!text-xs md:!text-sm ${action.variant === 'primary' ? '!bg-white !text-indigo-600 !border-white hover:!bg-white/90' : '!bg-white/20 !text-white !border-white/20 hover:!bg-white/30'}`}
                  >
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
