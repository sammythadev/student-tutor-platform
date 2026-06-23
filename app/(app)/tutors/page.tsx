'use client'

import { useState } from 'react'
import { Card } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Star, Heart, Clock, Search, SlidersHorizontal, CheckCircle2 } from 'lucide-react'

const ACCENT_VARS: Record<string, { bg: string; fg: string }> = {
  lavender:   { bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)' },
  sky:        { bg: 'var(--accent-sky-bg)',       fg: 'var(--accent-sky-fg)'       },
  mint:       { bg: 'var(--accent-mint-bg)',       fg: 'var(--accent-mint-fg)'      },
  sun:        { bg: 'var(--accent-sun-bg)',        fg: 'var(--accent-sun-fg)'       },
  coral:      { bg: 'var(--accent-coral-bg)',      fg: 'var(--accent-coral-fg)'     },
  tangerine:  { bg: 'var(--accent-tangerine-bg)', fg: 'var(--accent-tangerine-fg)' },
}

const TUTORS = [
  { id: 1, name: 'Dr. Sarah Chen',    rating: 4.9, students: 120, subjects: ['Mathematics', 'Physics', 'Calculus'],       rate: 45, availability: 'Available now',       desc: 'Experienced math tutor with 8+ years. Specializes in calculus and exam prep.',     color: 'lavender' },
  { id: 2, name: 'Prof. James Wilson',rating: 4.8, students: 95,  subjects: ['Physics', 'Chemistry', 'SAT Prep'],         rate: 50, availability: 'Available in 2h',      desc: 'PhD in Physics. Passionate about making complex concepts easy to understand.',    color: 'sky'      },
  { id: 3, name: 'Ms. Emily Brown',   rating: 4.7, students: 85,  subjects: ['English', 'Literature', 'Essay Writing'],   rate: 40, availability: 'Available now',       desc: 'Literature expert with a focus on critical thinking and essay composition.',     color: 'sun'      },
  { id: 4, name: 'Alex Johnson',      rating: 4.9, students: 110, subjects: ['Computer Science', 'Programming', 'Web Dev'],rate: 55, availability: 'Available now',       desc: 'Software engineer turned tutor. Teaching coding with real-world examples.',     color: 'mint'     },
  { id: 5, name: 'Lisa Patel',        rating: 4.8, students: 100, subjects: ['Biology', 'Chemistry', 'AP Exam'],          rate: 48, availability: 'Available tomorrow',   desc: 'Pharmacist and educator. Excellent at breaking down difficult science topics.', color: 'coral'    },
  { id: 6, name: 'Marco Rossi',       rating: 4.7, students: 75,  subjects: ['Spanish', 'French', 'Italian'],             rate: 42, availability: 'Available now',       desc: 'Native Italian speaker. Conversational fluency is my specialty.',               color: 'tangerine'},
]

export default function TutorsPage() {
  const [liked,  setLiked]  = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  const toggleLike = (id: number) => {
    setLiked(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const filtered = TUTORS.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subjects.some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-8 py-3">

      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">Find Tutors</h1>
        <p className="text-text-secondary mt-1 text-sm">Browse {TUTORS.length} vetted tutors across all subjects</p>
      </div>

      {/* Filter bar */}
      <div className="surface-card p-4 flex flex-col md:flex-row items-start md:items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tutors or subjects..."
            style={{
              width: '100%', height: '40px', paddingLeft: '36px', paddingRight: '14px',
              borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--text-primary)',
              fontSize: '14px', outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-subtle)' }}
            onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>
        {['All Subjects', 'Mathematics', 'Physics', 'Chemistry', 'English', 'Languages'].map((opt, i) => (
          <button
            key={opt}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150"
            style={{
              background: i === 0 ? 'var(--primary)' : 'var(--surface-2)',
              color:      i === 0 ? 'var(--primary-fg)' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={e => { if (i > 0) { e.currentTarget.style.background = 'var(--primary-subtle)'; e.currentTarget.style.color = 'var(--primary)' } }}
            onMouseLeave={e => { if (i > 0) { e.currentTarget.style.background = 'var(--surface-2)';       e.currentTarget.style.color = 'var(--text-secondary)' } }}
          >
            {opt}
          </button>
        ))}
        <button
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ml-auto"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-subtle)'; e.currentTarget.style.color = 'var(--primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)';       e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
        </button>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tutor) => {
          const { bg, fg } = ACCENT_VARS[tutor.color]
          const isLiked    = liked.has(tutor.id)
          const isNow      = tutor.availability === 'Available now'

          return (
            <Card key={tutor.id} className="p-5 flex flex-col">

              {/* Avatar + Like */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm"
                    style={{ background: bg, color: fg }}
                  >
                    {tutor.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary text-sm truncate">{tutor.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star className="w-3.5 h-3.5 fill-current" style={{ color: 'var(--accent-sun-fg)' }} />
                      <span className="text-xs font-semibold text-text-primary">{tutor.rating}</span>
                      <span className="text-xs text-text-muted">({tutor.students}+)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleLike(tutor.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150 flex-shrink-0"
                  style={{
                    color: isLiked ? 'var(--accent-coral-fg)' : 'var(--text-muted)',
                    background: isLiked ? 'var(--accent-coral-bg)' : 'transparent',
                  }}
                >
                  <Heart className="w-4 h-4" strokeWidth={2} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-text-secondary mb-4 leading-relaxed line-clamp-2">{tutor.desc}</p>

              {/* Subject tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tutor.subjects.slice(0, 2).map(s => (
                  <Badge key={s} color={tutor.color as any} size="sm">{s}</Badge>
                ))}
                {tutor.subjects.length > 2 && (
                  <Badge color={tutor.color as any} size="sm">+{tutor.subjects.length - 2}</Badge>
                )}
              </div>

              {/* Meta */}
              <div
                className="py-3 mb-4 flex items-center justify-between"
                style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: isNow ? 'var(--accent)' : 'var(--text-muted)' }} strokeWidth={2} />
                  <span className="text-xs" style={{ color: isNow ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {tutor.availability}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-text-primary">${tutor.rate}</span>
                  <span className="text-xs text-text-muted">/hr</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <Button variant="secondary" size="md" className="flex-1">View Profile</Button>
                <Button size="md" className="flex-1">Book Session</Button>
              </div>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-secondary">No tutors found for &quot;{search}&quot;</p>
          <button onClick={() => setSearch('')} className="mt-3 text-sm font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>
            Clear search
          </button>
        </div>
      )}
    </div>
  )
}
