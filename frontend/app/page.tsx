'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Star, CheckCircle2, Search, SlidersHorizontal,
  BookOpen, CalendarCheck, GraduationCap, TrendingUp, Users,
  ChevronRight, Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)
import Aurora from '@/components/Aurora'
import TextType from '@/components/TextType'
import ScrollReveal from '@/components/ScrollReveal'
import { CinematicFooter } from '@/components/ui/motion-footer'
import ShinyText from '@/components/ShinyText'

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('tutorly-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = saved ? saved === 'dark' : prefersDark
    setIsDark(dark)
    document.documentElement.classList.toggle('dark-mode', dark)
    document.documentElement.classList.toggle('light-mode', !dark)
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark-mode', next)
    document.documentElement.classList.toggle('light-mode', !next)
    localStorage.setItem('tutorly-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="pressable w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-primary-subtle transition-colors duration-200 cursor-pointer"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

function SectionReveal({ children, className = '', stagger = false }: { children: React.ReactNode; className?: string; stagger?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (stagger) {
      const childEls = el.children
      if (childEls.length > 0) {
        gsap.fromTo(
          childEls,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom-=15%',
              toggleActions: 'play none none none',
            },
          }
        )
        return () => { ScrollTrigger.getAll().forEach(t => t.kill()) }
      }
    }

    gsap.fromTo(
      el,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom-=15%',
          toggleActions: 'play none none none',
        },
      }
    )

    return () => { ScrollTrigger.getAll().forEach(t => t.kill()) }
  }, [stagger])

  return <div ref={ref} className={className}>{children}</div>
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas relative overflow-x-hidden">

      <div className="absolute inset-0 -z-10" style={{ width: '100vw', height: '100vh', position: 'fixed', mixBlendMode: 'var(--aurora-blend)' as any, opacity: 'var(--aurora-opacity)' }}>
        <Aurora
          colorStops={['#6366F1', '#10B981', '#6366F1']}
          amplitude={1}
          blend={0.5}
        />
      </div>

      {/* ─── Glassmorphic Navigation ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 pt-4">
        <nav className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-6 py-2.5 rounded-pill" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          <Link href="/" className="pressable flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <BookOpen className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight font-heading text-text-primary">Tutorly</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['How it works', 'Tutors', 'Pricing', 'Resources'].map((link) => (
              <a
                key={link}
                href="#"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-150 cursor-pointer relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:rounded-full after:bg-primary after:transition-all after:duration-200 hover:after:w-full"
              >
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/signin" className="hidden sm:block pressable text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary text-sm px-5 py-2.5 pressable">
              Get started
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">

        {/* ─── HERO ─── */}
        <section className="pt-40 pb-24 px-4 md:px-8">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

            <div className="space-y-7">
              <div className="animate-fade-up-sm delay-1" style={{ animationFillMode: 'both' }}>
                <div className="stat-badge w-fit pressable">
                  <Sparkles className="w-3 h-3" />
                  Trusted by 15,000+ students worldwide
                </div>
              </div>

              <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tighter text-text-primary animate-fade-up-sm delay-2" style={{ animationFillMode: 'both' }}>
                The right tutor{' '}
                <span
                  className="gradient-text-animate"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent), var(--primary))',
                  }}
                >
                  changes everything.
                </span>
              </h1>

              <p className="text-lg md:text-xl leading-relaxed animate-fade-up-sm delay-3" style={{ animationFillMode: 'both' }}>
                <ShinyText
                  text="Powered by a fairness-first matching algorithm that connects you with tutors based on learning style, goals, and real compatibility — not just availability."
                  color="var(--text-secondary)"
                  shineColor="var(--text-primary)"
                  speed={1.5}
                  spread={200}
                  yoyo={true}
                  direction="left"
                />
              </p>

              <div className="text-lg md:text-xl text-text-primary font-medium animate-fade-up-sm delay-3 flex items-center gap-2 flex-wrap" style={{ animationFillMode: 'both' }}>
                <span>Find someone who</span>
                <TextType
                  text={["gets your learning style", "matches your schedule", "pushes your growth", "makes it click"]}
                  typingSpeed={50}
                  deletingSpeed={25}
                  pauseDuration={2000}
                  showCursor={true}
                  cursorCharacter="|"
                  variableSpeed={{min: 30, max: 70}}
                  className="gradient-text-animate inline-block"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent), var(--primary))',
                    backgroundSize: '200% 200%',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2 animate-fade-up-sm delay-4" style={{ animationFillMode: 'both' }}>
                <Link href="/signup" className="btn-primary text-base px-8 py-4 group pressable cursor-pointer">
                  Book a trial session
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {['bg-accent-lavender-bg', 'bg-accent-sky-bg', 'bg-accent-mint-bg', 'bg-accent-sun-bg'].map((c, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full border-2 border-canvas ${c} flex items-center justify-center hover:z-10 hover:scale-110 transition-transform duration-200`}>
                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">4.9</span> average tutor rating
                  </p>
                </div>
              </div>
            </div>

            {/* Hero visual — calendar card with 3D tilt entrance */}
            <div className="perspective-container relative h-[520px] hidden lg:block">
              <div className="tilted-card absolute inset-0 surface-card overflow-hidden animate-tilt-enter" style={{ padding: 0, animationFillMode: 'both' }}>
                <div className="flex justify-between items-center px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                      <BookOpen className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-heading font-bold text-base text-text-primary">Weekly Schedule</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['‹', '›'] as const).map((ch, i) => (
                      <button key={i} className="pressable w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-sm font-bold" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(5, 1fr)', overflow: 'hidden' }}>
                  <div style={{ height: 52, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }} />
                  {[{d:'Mon',n:23,t:true},{d:'Tue',n:24,t:false},{d:'Wed',n:25,t:false},{d:'Thu',n:26,t:false},{d:'Fri',n:27,t:false}].map(({d,n,t}) => (
                    <div key={d} style={{ height:52, background:'var(--surface-2)', borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3 }}>
                      <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color: t ? 'var(--primary)' : 'var(--text-muted)' }}>{d}</span>
                      <div style={{ width:24,height:24,borderRadius:'50%',background: t ? 'var(--primary)' : 'transparent',color: t ? '#fff' : 'var(--text-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,boxShadow: t ? '0 2px 8px rgba(99,102,241,0.35)' : 'none' }}>{n}</div>
                    </div>
                  ))}
                  {[
                    {h:'9 AM', evs:[{c:0,s:'Calculus IV',tu:'Dr. Aris',bc:'#818CF8',bg:'var(--accent-lavender-bg)',fg:'var(--accent-lavender-fg)'},{c:2,s:'Macroeconomics',tu:'Prof. Han',bc:'#38BDF8',bg:'var(--accent-sky-bg)',fg:'var(--accent-sky-fg)'}]},
                    {h:'11 AM',evs:[{c:1,s:'Art History',tu:'Ms. Blake',bc:'#FCD34D',bg:'var(--accent-sun-bg)',fg:'var(--accent-sun-fg)'},{c:3,s:'Bio Ethics',tu:'Dr. Osei',bc:'#34D399',bg:'var(--accent-mint-bg)',fg:'var(--accent-mint-fg)'}]},
                    {h:'1 PM', evs:[{c:0,s:'Psych 101',tu:'Dr. Lima',bc:'#FCA5A5',bg:'var(--accent-coral-bg)',fg:'var(--accent-coral-fg)'},{c:4,s:'Quantum Phys',tu:'Prof. Yun',bc:'#818CF8',bg:'var(--accent-lavender-bg)',fg:'var(--accent-lavender-fg)'}]},
                    {h:'3 PM', evs:[{c:2,s:'Linear Algebra',tu:'Dr. Aris',bc:'#FDBA74',bg:'var(--accent-tangerine-bg)',fg:'var(--accent-tangerine-fg)'},{c:4,s:'Spanish B2',tu:'Ms. Vega',bc:'#34D399',bg:'var(--accent-mint-bg)',fg:'var(--accent-mint-fg)'}]},
                    {h:'5 PM', evs:[{c:1,s:'Essay Writing',tu:'Ms. Brown',bc:'#FCD34D',bg:'var(--accent-sun-bg)',fg:'var(--accent-sun-fg)'}]},
                  ].map((row,ri) => (
                    <React.Fragment key={ri}>
                      <div style={{height:56,borderBottom:'1px solid var(--border)',borderRight:'1px solid var(--border)',background:'var(--surface-2)',display:'flex',alignItems:'flex-start',justifyContent:'flex-end',paddingRight:6,paddingTop:5}}>
                        <span style={{fontSize:9,fontWeight:700,color:'var(--text-muted)'}}>{row.h}</span>
                      </div>
                      {[0,1,2,3,4].map(col => {
                        const ev = row.evs.find((e: any) => e.c === col)
                        return (
                          <div key={col} style={{height:56,borderBottom:'1px solid var(--border)',borderLeft:'1px solid var(--border)',background:col%2===0?'var(--surface)':'var(--canvas)',position:'relative'}}>
                            {ev && <div className="hover-lift" style={{position:'absolute',inset:3,background:ev.bg,borderLeft:`3px solid ${ev.bc}`,borderRadius:8,overflow:'hidden',padding:'4px 6px'}}>
                              <div style={{color:ev.fg,fontSize:10,fontWeight:700,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{ev.s}</div>
                              <div style={{color:ev.fg,fontSize:9,opacity:0.7,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',marginTop:1}}>{ev.tu}</div>
                            </div>}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>

                <div style={{padding:'10px 20px',borderTop:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:'var(--accent)',boxShadow:'0 0 6px var(--accent)',animation:'pulse-breathe 2s ease-in-out infinite'}} />
                    <span style={{fontSize:12,color:'var(--text-secondary)'}}>3 sessions today</span>
                  </div>
                  <span className="pressable" style={{fontSize:12,fontWeight:600,color:'var(--primary)',cursor:'pointer'}}>View full week →</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── STATS BAND ─── */}
        <SectionReveal className="py-12 px-4 md:px-8 relative">
          <div className="max-w-7xl mx-auto">
            <div
              className="rounded-2xl py-10 px-8 md:px-16 grid grid-cols-2 md:grid-cols-4 gap-8 animate-gradient"
              style={{ background: 'linear-gradient(135deg, var(--primary), #4338CA, #6366F1, #4338CA)' }}
            >
              {[
                { value: '98%', label: 'Success Rate' },
                { value: '15k+', label: 'Active Students' },
                { value: '4.9/5', label: 'Tutor Rating' },
                { value: '24/7', label: 'Support Access' },
              ].map((stat, i) => (
                <div key={i} className={`text-center ${i > 0 ? 'border-l border-white/15' : ''}`}>
                  <p className="text-4xl font-bold text-white font-heading tracking-tight mb-1">{stat.value}</p>
                  <p className="label-caps text-white/60 text-[11px]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>

        {/* ─── HOW IT WORKS ─── */}
        <SectionReveal stagger className="py-28 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className="stat-badge w-fit mx-auto mb-4 pressable">The Process</div>
              <ScrollReveal as="h2" className="font-heading text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
                Three steps to mastery
              </ScrollReveal>
              <p className="text-text-secondary mt-4 max-w-lg mx-auto leading-relaxed">
                From searching for the right tutor to achieving your goals — we make it seamless.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Search,
                  step: '01',
                  title: 'Find your expert',
                  desc: 'Browse our curated list of Ivy League tutors and industry professionals, all vetted for excellence.',
                  color: 'var(--accent-lavender-bg)',
                  iconColor: 'var(--accent-lavender-fg)',
                },
                {
                  icon: CalendarCheck,
                  step: '02',
                  title: 'Schedule a session',
                  desc: 'Book a time that fits your schedule using seamless calendar integration. No back-and-forth emails.',
                  color: 'var(--accent-mint-bg)',
                  iconColor: 'var(--accent-mint-fg)',
                },
                {
                  icon: GraduationCap,
                  step: '03',
                  title: 'Achieve your goals',
                  desc: 'Interactive lessons, shared whiteboards, and recorded sessions help you learn faster and smarter.',
                  color: 'var(--accent-sun-bg)',
                  iconColor: 'var(--accent-sun-fg)',
                },
              ].map(({ icon: Icon, step, title, desc, color, iconColor }) => (
                <div key={step} className="surface-card p-8 space-y-5 card-interactive cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: color }}>
                      <Icon className="w-6 h-6" style={{ color: iconColor }} strokeWidth={2} />
                    </div>
                    <span className="font-heading text-5xl font-bold opacity-10 text-text-primary">{step}</span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-text-primary">{title}</h3>
                  <p className="text-text-secondary leading-relaxed text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>

        {/* ─── FOR STUDENTS ─── */}
        <section className="py-24 px-4 md:px-8" style={{ background: 'var(--surface)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <SectionReveal className="space-y-7">
                <div className="stat-badge w-fit pressable">For Students</div>
                <ScrollReveal as="h2" className="font-heading text-4xl md:text-5xl font-bold text-text-primary leading-tight tracking-tight">
                  Master any subject with personalized paths.
                </ScrollReveal>
                <ul className="space-y-5">
                  {[
                    'Custom curriculum design tailored to your goals',
                    'Resource library with 50k+ study materials',
                    'HD virtual classroom environment with recordings',
                  ].map((item) => (
                    <li key={item} className="flex gap-4 items-start">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} strokeWidth={2} />
                      <p className="text-text-primary font-medium leading-snug">{item}</p>
                    </li>
                  ))}
                </ul>
                <Link href="/tutors" className="btn-primary w-fit text-sm pressable cursor-pointer">
                  Browse tutors
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </SectionReveal>

              <SectionReveal stagger className="surface-card p-6 space-y-4 card-interactive">
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 h-11 rounded-xl flex items-center px-4 gap-3"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  >
                    <Search className="w-4 h-4 text-text-muted flex-shrink-0" strokeWidth={2} />
                    <span className="text-sm text-text-muted">Search Calculus tutors...</span>
                  </div>
                  <button className="pressable w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity" style={{ background: 'var(--primary)' }}>
                    <SlidersHorizontal className="w-4 h-4 text-white" strokeWidth={2} />
                  </button>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'Prof. Julian S.', sub: 'Mathematics • MIT Alumni', rate: '₦8,500/hr', available: true },
                    { name: 'Sarah Jenkins', sub: 'Linguistics • Oxford', rate: '₦6,000/hr', available: false },
                    { name: 'Dr. Priya Nair', sub: 'Computer Science • Stanford', rate: '₦9,500/hr', available: true },
                  ].map((tutor) => (
                    <div
                      key={tutor.name}
                      className={`p-4 rounded-xl flex gap-4 items-center cursor-pointer card-interactive-sm ${!tutor.available ? 'opacity-55' : ''}`}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    >
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--accent-lavender-bg)' }}>
                        <Users className="w-5 h-5" style={{ color: 'var(--accent-lavender-fg)' }} strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-text-primary">{tutor.name}</p>
                        <p className="text-xs text-text-secondary mt-0.5">{tutor.sub}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-sm text-text-primary">{tutor.rate}</p>
                        <p className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5`}
                          style={{ color: tutor.available ? 'var(--accent)' : 'var(--text-muted)' }}
                        >
                          {tutor.available ? 'Available Now' : 'Busy'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ─── FOR TUTORS ─── */}
        <section className="py-24 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <SectionReveal className="surface-card p-6 space-y-5 order-2 md:order-1 card-interactive">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl text-white animate-gradient" style={{ background: 'linear-gradient(135deg, var(--primary), #4338CA, var(--primary))' }}>
                    <p className="label-caps text-white/60 mb-2">Daily Revenue</p>
                    <p className="font-heading text-3xl font-bold">₦42,000</p>
                    <p className="flex items-center gap-1 text-xs text-white/70 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      +12% vs yesterday
                    </p>
                  </div>
                  <div className="p-5 rounded-xl" style={{ background: 'var(--accent-mint-bg)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="label-caps mb-2" style={{ color: 'var(--accent-mint-fg)', opacity: 0.7 }}>Student Growth</p>
                    <p className="font-heading text-3xl font-bold" style={{ color: 'var(--accent-mint-fg)' }}>+12%</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--accent-mint-fg)', opacity: 0.7 }}>This month</p>
                  </div>
                </div>

                <div
                  className="h-40 w-full rounded-xl flex items-end gap-2 px-5 pb-4"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  {[40, 60, 50, 80, 70, 90, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md transition-all duration-500 hover:opacity-80" style={{
                      height: `${h}%`,
                      background: i === 5
                        ? 'var(--primary)'
                        : 'var(--primary-subtle)',
                      transition: 'height 1s var(--ease-out), opacity 200ms ease',
                    }} />
                  ))}
                </div>
                <p className="text-center label-caps text-text-muted">Weekly Earnings Analytics</p>
              </SectionReveal>

              <SectionReveal className="space-y-7 order-1 md:order-2">
                <div className="stat-badge w-fit pressable">For Tutors</div>
                <ScrollReveal as="h2" className="font-heading text-4xl md:text-5xl font-bold text-text-primary leading-tight tracking-tight">
                  Focus on teaching. We handle the rest.
                </ScrollReveal>
                <ul className="space-y-5">
                  {[
                    'Automated billing, invoicing, and scheduling',
                    'Access to a global student marketplace',
                    'Professional profile with branding tools',
                  ].map((item) => (
                    <li key={item} className="flex gap-4 items-start">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} strokeWidth={2} />
                      <p className="text-text-primary font-medium leading-snug">{item}</p>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="btn-secondary w-fit text-sm pressable cursor-pointer">
                  Become a tutor
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="py-24 px-4 md:px-8" style={{ background: 'var(--surface)' }}>
          <div className="max-w-7xl mx-auto">
            <SectionReveal className="text-center mb-16">
              <div className="stat-badge w-fit mx-auto mb-4 pressable">Student Stories</div>
              <ScrollReveal as="h2" className="font-heading text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
                Real results, real students
              </ScrollReveal>
            </SectionReveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: "My GPA went from a 2.8 to a 3.7 in one semester. Dr. Chen is incredible at breaking down complex calculus.",
                  name: 'Marcus T.',
                  role: 'Engineering student, USC',
                  rating: 5,
                  color: 'var(--accent-lavender-bg)',
                },
                {
                  quote: "I passed my IELTS with band 8.0 after just 6 sessions with Sarah. The structured approach made all the difference.",
                  name: 'Amara K.',
                  role: 'Graduate applicant',
                  rating: 5,
                  color: 'var(--accent-sky-bg)',
                },
                {
                  quote: "Scheduling is frictionless, lessons are recorded, and the quality of tutors is far above anything I've tried before.",
                  name: 'Liam O.',
                  role: 'High school senior',
                  rating: 5,
                  color: 'var(--accent-mint-bg)',
                },
              ].map((t, i) => (
                <div key={i} className="surface-card p-6 space-y-5 card-interactive">
                  <div className="flex gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-current" style={{ color: 'var(--accent-sun-fg)' }} />
                    ))}
                  </div>
                  <p className="text-text-primary leading-relaxed text-sm">"{t.quote}"</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: t.color }}>
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                      <p className="text-xs text-text-secondary">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <CinematicFooter />
    </div>
  )
}
