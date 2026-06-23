'use client'

import { useState } from 'react'
import { Card } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Input, Select } from '@/components/Input'
import { Bell, Lock, User, Palette, LogOut, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState({
    fullName: 'John Doe',
    email: 'john@example.com',
    timezone: 'EST',
    language: 'English',
  })

  const tabs = [
    { id: 'profile',       label: 'Profile',            icon: User },
    { id: 'notifications', label: 'Notifications',      icon: Bell },
    { id: 'privacy',       label: 'Privacy & Security', icon: Lock },
    { id: 'appearance',    label: 'Appearance',         icon: Palette },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-8 py-3">

      {/* Page Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">Settings</h1>
        <p className="text-text-secondary mt-1 text-sm">Manage your account and preferences</p>
      </div>

      {/* Layout */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* Sidebar Navigation */}
        <div className="md:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left"
                  style={isActive
                    ? { background: 'var(--primary-subtle)', color: 'var(--primary)' }
                    : { background: 'transparent', color: 'var(--text-secondary)' }
                  }
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-sm ${isActive ? 'font-bold' : 'font-semibold'}`}>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <Card className="p-6 md:p-8">
                <h2 className="font-heading text-xl font-bold text-text-primary mb-6">Profile Information</h2>
                <div className="space-y-5 max-w-xl">
                  <Input  label="Full Name"     name="fullName" value={formData.fullName} onChange={handleChange} />
                  <Input  label="Email Address" name="email"    value={formData.email}    onChange={handleChange} type="email" />
                  <Select label="Timezone"      name="timezone" value={formData.timezone} onChange={handleChange}
                    options={[
                      { value: 'UTC', label: 'UTC' },
                      { value: 'EST', label: 'EST' },
                      { value: 'CST', label: 'CST' },
                      { value: 'MST', label: 'MST' },
                      { value: 'PST', label: 'PST' },
                    ]}
                  />
                  <Select label="Language"      name="language" value={formData.language} onChange={handleChange}
                    options={[
                      { value: 'English', label: 'English' },
                      { value: 'Spanish', label: 'Spanish' },
                      { value: 'French',  label: 'French'  },
                      { value: 'German',  label: 'German'  },
                    ]}
                  />
                  <div className="flex gap-3 pt-4">
                    <Button>Save Changes</Button>
                    <Button variant="secondary">Cancel</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Card className="p-6 md:p-8">
                <h2 className="font-heading text-xl font-bold text-text-primary mb-6">Notification Preferences</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Session Reminders', desc: 'Get notified 24 hours before sessions', enabled: true  },
                    { label: 'New Messages',      desc: 'Notify me when tutors send messages',   enabled: true  },
                    { label: 'Session Updates',   desc: 'Updates on session status changes',     enabled: true  },
                    { label: 'Marketing Emails',  desc: 'Promotional offers and news',           enabled: false },
                    { label: 'Weekly Reports',    desc: 'Summary of your learning progress',     enabled: true  },
                  ].map((item, i) => (
                    <label key={i} className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors group" style={{ background: 'var(--surface-2)' }}>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                        <p className="text-xs text-text-secondary mt-1">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        readOnly
                        className="w-5 h-5 rounded cursor-pointer transition-transform group-hover:scale-110"
                        style={{ accentColor: 'var(--primary)' }}
                      />
                    </label>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Privacy & Security Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <Card className="p-6 md:p-8">
                <h2 className="font-heading text-xl font-bold text-text-primary mb-6">Privacy & Security</h2>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl cursor-pointer transition-colors group hover:bg-surface-2" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">Change Password</p>
                        <p className="text-xs text-text-secondary mt-1">Update your password regularly for security</p>
                      </div>
                      <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Two-Factor Authentication</p>
                        <p className="text-xs text-text-secondary mt-1">Add extra security to your account</p>
                      </div>
                      <label className="cursor-pointer">
                        <input type="checkbox" checked={false} readOnly className="w-5 h-5 rounded cursor-pointer hover:scale-110 transition-transform" style={{ accentColor: 'var(--primary)' }} />
                      </label>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                    <p className="text-sm font-semibold text-text-primary mb-1">Blocked Users</p>
                    <p className="text-xs text-text-secondary">You have blocked 0 users</p>
                  </div>

                  <div className="p-4 rounded-xl" style={{ background: 'var(--accent-coral-bg)', border: '1px solid var(--accent-coral-fg)30' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--accent-coral-fg)' }}>Delete Account</p>
                    <p className="text-xs mt-1 mb-4" style={{ color: 'var(--accent-coral-fg)', opacity: 0.8 }}>Permanently delete your account and all data</p>
                    <Button variant="destructive" size="sm">Delete Account</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <Card className="p-6 md:p-8">
                <h2 className="font-heading text-xl font-bold text-text-primary mb-6">Appearance</h2>
                <div className="space-y-6">

                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-3">Theme</p>
                    <div className="grid grid-cols-3 gap-3">
                      {['Light', 'Dark', 'Auto'].map((theme, i) => (
                        <button
                          key={theme}
                          className="p-4 rounded-xl border-2 text-center transition-all cursor-pointer"
                          style={{
                            background: 'var(--surface-2)',
                            borderColor: i === 1 ? 'var(--primary)' : 'var(--border)',
                          }}
                          onMouseEnter={e => { if (i !== 1) e.currentTarget.style.borderColor = 'var(--primary-subtle)' }}
                          onMouseLeave={e => { if (i !== 1) e.currentTarget.style.borderColor = 'var(--border)' }}
                        >
                          <p className="text-sm font-semibold" style={{ color: i === 1 ? 'var(--primary)' : 'var(--text-primary)' }}>{theme}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-3">Accent Color</p>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { color: 'var(--accent-lavender-fg)', name: 'Lavender' },
                        { color: 'var(--accent-sky-fg)',      name: 'Sky' },
                        { color: 'var(--accent-mint-fg)',     name: 'Mint' },
                        { color: 'var(--accent-sun-fg)',      name: 'Sun' },
                        { color: 'var(--accent-coral-fg)',    name: 'Coral' },
                      ].map((item, i) => (
                        <button
                          key={i}
                          className="w-12 h-12 rounded-full cursor-pointer transition-transform hover:scale-110"
                          style={{
                            background: item.color,
                            boxShadow: i === 0 ? `0 0 0 4px var(--canvas), 0 0 0 6px ${item.color}` : 'none'
                          }}
                          title={item.name}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* Sign Out */}
      <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <Button variant="secondary" className="hover:!bg-accent-coral-bg hover:!text-accent-coral-fg hover:!border-accent-coral-fg">
          <LogOut className="w-4 h-4" strokeWidth={2} />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
