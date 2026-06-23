'use client'

import { Card } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Star, MessageCircle, Edit2, Calendar, MapPin, Target, BookOpen } from 'lucide-react'

export default function ProfilePage() {
  return (
    <div className="space-y-8 py-3">

      {/* Profile Header */}
      <Card className="p-8 relative overflow-hidden">
        {/* Ambient background blob */}
        <div
          className="absolute top-0 right-0 w-96 h-96 bg-primary opacity-[0.03] rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"
        />

        <div className="flex flex-col md:flex-row gap-6 md:items-start relative z-10">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-full flex-shrink-0 flex items-center justify-center font-heading font-bold text-3xl"
            style={{
              background: 'linear-gradient(135deg, var(--accent-lavender-bg) 0%, var(--accent-sky-bg) 100%)',
              color: 'var(--accent-lavender-fg)',
              border: '4px solid var(--surface)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            JD
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">John Doe</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge color="lavender" size="sm">Student</Badge>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Grade 11</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm">
                  <Edit2 className="w-3.5 h-3.5" strokeWidth={2} />
                  Edit Profile
                </Button>
                <Button size="sm">
                  <MessageCircle className="w-3.5 h-3.5" strokeWidth={2} />
                  Message
                </Button>
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-6 leading-relaxed max-w-2xl">
              Passionate learner focused on mathematics and physics. Working towards college entrance exams. 
              Always eager to explore new problem-solving techniques.
            </p>

            {/* Quick Stats */}
            <div className="flex items-center gap-8">
              {[
                { label: 'Sessions', value: '12' },
                { label: 'Active Tutors', value: '3' },
                { label: 'Hours Learned', value: '24' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="font-heading text-2xl font-bold text-text-primary">{stat.value}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* About */}
          <Card className="p-6">
            <h2 className="font-heading text-xl font-bold text-text-primary mb-5">About</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Target className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent)' }} strokeWidth={2} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Goal</p>
                  <p className="text-sm font-medium text-text-primary">Improve grades in Mathematics and Physics for college entrance</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent-mint-fg)' }} strokeWidth={2} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Learning Style</p>
                  <p className="text-sm font-medium text-text-primary">Visual learner with hands-on approach preference</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent-coral-fg)' }} strokeWidth={2} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Location</p>
                  <p className="text-sm font-medium text-text-primary">New York, USA • EST Timezone</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Subjects & Expertise */}
          <Card className="p-6">
            <h2 className="font-heading text-xl font-bold text-text-primary mb-5">Studying With</h2>
            <div className="space-y-3">
              {[
                { name: 'Mathematics', tutors: 2, color: 'lavender' },
                { name: 'Physics',     tutors: 1, color: 'sky' },
                { name: 'Chemistry',   tutors: 0, color: 'coral' },
              ].map((subject, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 rounded-xl transition-colors cursor-pointer"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div className="flex items-center gap-3">
                    <Badge color={subject.color as any} size="sm">{subject.name}</Badge>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {subject.tutors > 0 ? `${subject.tutors} tutor${subject.tutors !== 1 ? 's' : ''}` : 'Not started'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Sessions */}
          <Card className="p-6">
            <h2 className="font-heading text-xl font-bold text-text-primary mb-5">Recent Sessions</h2>
            <div className="space-y-3">
              {[
                { tutor: 'Dr. Sarah Chen',     subject: 'Mathematics', date: 'Dec 15, 2024', rating: 5, color: 'lavender' },
                { tutor: 'Prof. James Wilson', subject: 'Physics',     date: 'Dec 14, 2024', rating: 4, color: 'sky'      },
                { tutor: 'Dr. Sarah Chen',     subject: 'Mathematics', date: 'Dec 12, 2024', rating: 5, color: 'lavender' },
              ].map((session, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl gap-3" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs"
                      style={{ background: `var(--accent-${session.color}-bg)`, color: `var(--accent-${session.color}-fg)` }}
                    >
                      {session.tutor.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{session.tutor}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{session.subject} • {session.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-13 sm:ml-0">
                    {[...Array(5)].map((_, j) => (
                      <Star
                        key={j}
                        className="w-3.5 h-3.5"
                        style={{ color: j < session.rating ? 'var(--accent-sun-fg)' : 'var(--border)' }}
                        fill={j < session.rating ? 'currentColor' : 'none'}
                        strokeWidth={j < session.rating ? 0 : 2}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Current Tutors */}
          <Card className="p-6">
            <h2 className="font-heading text-lg font-bold text-text-primary mb-5">Current Tutors</h2>
            <div className="space-y-4">
              {[
                { name: 'Dr. Sarah Chen',     subject: 'Mathematics', color: 'lavender' },
                { name: 'Prof. James Wilson', subject: 'Physics',     color: 'sky' },
              ].map((tutor, i) => (
                <div key={i} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-transform group-hover:scale-105"
                    style={{ background: `var(--accent-${tutor.color}-bg)`, color: `var(--accent-${tutor.color}-fg)` }}
                  >
                    {tutor.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate transition-colors group-hover:text-primary">
                      {tutor.name}
                    </p>
                    <p className="text-xs text-text-secondary">{tutor.subject}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Achievements */}
          <Card className="p-6">
            <h2 className="font-heading text-lg font-bold text-text-primary mb-5">Achievements</h2>
            <div className="space-y-4">
              {[
                { icon: '🎯', title: 'Consistent Learner', desc: '10+ sessions' },
                { icon: '⭐', title: 'Top Rated',          desc: '4.9/5 avg rating' },
                { icon: '🚀', title: 'Quick Learner',      desc: '30% progress' },
              ].map((achieve, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-lg bg-surface-2 border">
                    {achieve.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{achieve.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{achieve.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Availability */}
          <Card className="p-6">
            <h2 className="font-heading text-lg font-bold text-text-primary mb-4">Preferred Time</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-lavender-fg)' }} strokeWidth={2} />
                <span className="text-xs font-semibold text-text-primary">After school (3 PM - 8 PM)</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-sky-fg)' }} strokeWidth={2} />
                <span className="text-xs font-semibold text-text-primary">Weekends anytime</span>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
