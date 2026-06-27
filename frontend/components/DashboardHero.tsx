'use client'

import Link from 'next/link'
import { Button } from './Button'
import { Sparkles, GraduationCap, Globe } from 'lucide-react'

interface DashboardHeroProps {
  title: string
  subtitle: string
  actionLabel: string
  actionHref: string
  accent?: 'primary' | 'accent'
}

const shapes = [
  { id: 1, size: 32, top: '15%', left: '8%', duration: 6, delay: 0, shape: 'circle' },
  { id: 2, size: 24, top: '65%', left: '85%', duration: 8, delay: 1, shape: 'square' },
  { id: 3, size: 18, top: '25%', left: '78%', duration: 5, delay: 2, shape: 'triangle' },
  { id: 4, size: 28, top: '70%', left: '12%', duration: 7, delay: 0.5, shape: 'circle' },
  { id: 5, size: 16, top: '40%', left: '92%', duration: 9, delay: 1.5, shape: 'plus' },
  { id: 6, size: 22, top: '80%', left: '40%', duration: 6.5, delay: 3, shape: 'square' },
  { id: 7, size: 14, top: '10%', left: '55%', duration: 5.5, delay: 0.8, shape: 'circle' },
  { id: 8, size: 26, top: '50%', left: '5%', duration: 7.5, delay: 2.5, shape: 'triangle' },
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
.hero-shape-circle {
  border-radius: 50%;
}
.hero-shape-triangle {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  border-radius: 0;
}
.hero-shape-plus {
  clip-path: polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%);
  border-radius: 2px;
}
`

export function DashboardHero({
  title, subtitle, actionLabel, actionHref, accent = 'primary',
}: DashboardHeroProps) {

  const isPrimary = accent === 'primary'

  return (
    <>
      <style>{styles}</style>
      <div
        className="relative overflow-hidden rounded-2xl p-7 shadow-sm min-h-[200px]"
        style={{
          background: isPrimary
            ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)'
            : 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
        }}
      >
        {/* Animated floating shapes */}
        {shapes.map((s) => (
          <div
            key={s.id}
            className={`hero-shape ${s.shape === 'circle' ? 'hero-shape-circle' : ''} ${s.shape === 'triangle' ? 'hero-shape-triangle' : ''} ${s.shape === 'plus' ? 'hero-shape-plus' : ''}`}
            style={{
              width: s.size,
              height: s.size,
              top: s.top,
              left: s.left,
              background: s.shape === 'square' ? 'transparent' : 'rgba(255,255,255,0.6)',
              border: s.shape === 'square' ? '2px solid rgba(255,255,255,0.35)' : undefined,
              animation: `hero-float ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}

        {/* World map dot pattern — subtle continent-like clusters */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
            backgroundPosition: '12px 12px, 40px 80px, 120px 60px, 200px 30px, 300px 100px, 80px 140px, 180px 160px, 280px 120px',
          }}
        />

        {/* Decorative blobs */}
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isPrimary ? (
                <GraduationCap className="w-4 h-4 text-white/70" />
              ) : (
                <Globe className="w-4 h-4 text-white/70" />
              )}
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                {isPrimary ? 'Student Dashboard' : 'Tutor Dashboard'}
              </p>
            </div>
            <h1 className="font-heading text-3xl font-bold text-white">{title}</h1>
            <p className="mt-1.5 text-sm text-white/80 max-w-xl">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href={actionHref}>
              <Button
                variant="secondary"
                className="!bg-white/20 !text-white !border-white/20 hover:!bg-white/30"
              >
                {actionLabel}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
