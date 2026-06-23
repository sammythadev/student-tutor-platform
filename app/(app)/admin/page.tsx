'use client'

import { Card } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Users, Zap, AlertCircle, TrendingUp, MoreHorizontal, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <div className="space-y-8 py-3">

      {/* Page Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">Admin Dashboard</h1>
        <p className="text-text-secondary mt-1 text-sm">Platform overview and management tools</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Users',     value: '2,345', icon: Users,       color: 'lavender', trend: '+12%', isUp: true  },
          { label: 'Active Sessions', value: '156',   icon: Zap,         color: 'mint',     trend: '+8%',  isUp: true  },
          { label: 'Avg Rating',      value: '4.8/5', icon: TrendingUp,  color: 'sky',      trend: '+0.2', isUp: true  },
          { label: 'Open Issues',     value: '3',     icon: AlertCircle, color: 'coral',    trend: '-2',   isUp: false },
        ].map((metric, i) => {
          const Icon = metric.icon
          return (
            <Card key={i} hover className="p-5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `var(--accent-${metric.color}-bg)`, color: `var(--accent-${metric.color}-fg)` }}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <p className="font-heading text-3xl font-bold text-text-primary">{metric.value}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{metric.label}</p>
                <p className="text-xs font-bold" style={{ color: metric.isUp ? 'var(--accent-mint-fg)' : 'var(--text-muted)' }}>{metric.trend}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent Users */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-text-primary">Recent Users</h2>
            <Button variant="secondary" size="sm">View All</Button>
          </div>
          
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Role</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Joined</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}></th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: 'var(--border)' }}>
                  {[
                    { name: 'John Doe',           role: 'Student', status: 'active',   joined: 'Dec 15' },
                    { name: 'Dr. Sarah Chen',     role: 'Tutor',   status: 'active',   joined: 'Dec 14' },
                    { name: 'Prof. James Wilson', role: 'Tutor',   status: 'active',   joined: 'Dec 13' },
                    { name: 'Emily Brown',        role: 'Student', status: 'active',   joined: 'Dec 12' },
                    { name: 'Alex Johnson',       role: 'Tutor',   status: 'inactive', joined: 'Dec 10' },
                  ].map((user, i) => (
                    <tr key={i} className="group transition-colors hover:bg-surface-2" style={{ background: 'transparent' }}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-text-primary">{user.name}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge color={user.role === 'Tutor' ? 'mint' : 'lavender'} size="sm">{user.role}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold flex items-center gap-1.5" style={{ color: user.status === 'active' ? 'var(--accent-mint-fg)' : 'var(--text-muted)' }}>
                          {user.status === 'active' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span className="capitalize">{user.status}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span style={{ color: 'var(--text-secondary)' }}>{user.joined}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-text-primary">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: 'View Reports',    color: 'lavender' },
              { label: 'Manage Tutors',   color: 'sky' },
              { label: 'View Analytics',  color: 'mint' },
              { label: 'System Settings', color: 'sun' },
            ].map((action, i) => (
              <Card key={i} hover className="p-4 flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `var(--accent-${action.color}-bg)`, color: `var(--accent-${action.color}-fg)` }}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{action.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: 'var(--text-muted)' }} />
              </Card>
            ))}
          </div>

          <Card className="p-5 mt-6 border-2 border-accent-coral-bg/50">
            <h3 className="font-heading text-base font-bold text-text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--accent-coral-fg)' }} /> System Alerts
            </h3>
            <div className="space-y-3">
              {[
                { msg: 'Server performance above 95%',  isGood: true },
                { msg: '2 support tickets pending',     isGood: false },
                { msg: 'Weekly backup completed',       isGood: true },
              ].map((alert, i) => (
                <div key={i} className="flex flex-col gap-1 py-1">
                  <span className="text-xs font-semibold" style={{ color: alert.isGood ? 'var(--accent-mint-fg)' : 'var(--accent-sun-fg)' }}>
                    {alert.isGood ? '✓ SUCCESS' : '! WARNING'}
                  </span>
                  <span className="text-sm text-text-primary">{alert.msg}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}
