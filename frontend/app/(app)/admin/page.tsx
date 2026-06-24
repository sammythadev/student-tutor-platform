'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/Badge'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { getAdminMetrics, type AdminMetrics } from '@/lib/api/dashboard'
import { AlertCircle, CheckCircle2, ChevronRight, MoreHorizontal, TrendingUp, Users, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminMetrics()
      .then(setMetrics)
      .catch((err: any) => setError(err?.response?.data?.message ?? 'Could not load admin metrics.'))
  }, [])

  const cards = [
    { label: 'Total Users', value: metrics?.totalUsers?.toLocaleString() ?? '-', icon: Users, color: 'lavender', trend: 'Live', isUp: true },
    { label: 'Active Sessions', value: metrics?.activeSessions?.toLocaleString() ?? '-', icon: Zap, color: 'mint', trend: 'Live', isUp: true },
    { label: 'Avg Rating', value: metrics?.avgRating ? `${metrics.avgRating}/5` : 'N/A', icon: TrendingUp, color: 'sky', trend: 'Live', isUp: true },
    { label: 'Open Issues', value: metrics?.openIssues?.toLocaleString() ?? '0', icon: AlertCircle, color: 'coral', trend: 'Live', isUp: false },
  ]

  return (
    <div className="space-y-8 py-3">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-text-primary">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">Platform overview and management tools</p>
      </div>

      {error && <div className="surface-card p-4 text-sm text-accent-coral-fg">{error}</div>}

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {cards.map(metric => {
          const Icon = metric.icon
          return (
            <Card key={metric.label} hover className="p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `var(--accent-${metric.color}-bg)`, color: `var(--accent-${metric.color}-fg)` }}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-heading text-3xl font-bold text-text-primary">{metric.value}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-text-secondary">{metric.label}</p>
                <p className="text-xs font-bold" style={{ color: metric.isUp ? 'var(--accent-mint-fg)' : 'var(--text-muted)' }}>{metric.trend}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-text-primary">Recent Users</h2>
            <Button variant="secondary" size="sm">View All</Button>
          </div>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['Name', 'Role', 'Status', 'Joined', ''].map(header => <th key={header} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Live user list endpoint pending', role: 'Admin', status: 'active', joined: 'N/A' },
                  ].map(user => (
                    <tr key={user.name} className="border-b hover:bg-surface-2" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-5 py-3.5"><p className="font-semibold text-text-primary">{user.name}</p></td>
                      <td className="px-5 py-3.5"><Badge color="lavender" size="sm">{user.role}</Badge></td>
                      <td className="px-5 py-3.5"><span className="flex items-center gap-1.5 font-semibold text-accent-mint-fg"><CheckCircle2 className="h-3.5 w-3.5" />{user.status}</span></td>
                      <td className="px-5 py-3.5 text-text-secondary">{user.joined}</td>
                      <td className="px-5 py-3.5 text-right"><MoreHorizontal className="inline h-4 w-4 text-text-muted" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-text-primary">Quick Actions</h2>
          {['View Reports', 'Manage Tutors', 'View Analytics', 'System Settings'].map((label, index) => {
            const color = ['lavender', 'sky', 'mint', 'sun'][index]
            return (
              <Card key={label} hover className="flex cursor-pointer items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `var(--accent-${color}-bg)`, color: `var(--accent-${color}-fg)` }}><Zap className="h-4 w-4" /></div>
                  <span className="text-sm font-semibold text-text-primary">{label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
