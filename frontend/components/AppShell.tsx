'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { IconButton } from '@/components/Button'
import {
  BookOpen, Menu, X,
  Home, BookMarked, Users, Calendar, User, Settings, LogOut,
  Bell, Mail, Search, Moon, Sun, ChevronLeft, ChevronRight, LayoutDashboard, MessageSquare,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { logout } from '@/lib/api/auth'
import { NotificationsPanel } from '@/components/NotificationsPanel'
import { getUnreadCount } from '@/lib/api/notifications'

interface AppShellProps {
  children: ReactNode
  currentPage: string
  userRole?: 'student' | 'tutor' | 'admin' | 'unassigned'
}

const NAV_ITEMS = {
  student: [
    { id: 'dashboard', label: 'Overview',    icon: Home,           href: '/dashboard' },
    { id: 'feed',      label: 'Feed',        icon: BookMarked,     href: '/feed' },
    { id: 'tutors',    label: 'Find Tutors', icon: Users,          href: '/tutors' },
    { id: 'schedules', label: 'Sessions',    icon: Calendar,       href: '/schedules' },
    { id: 'messages',  label: 'Messages',    icon: MessageSquare,  href: '/messages' },
    { id: 'profile',   label: 'Profile',     icon: User,           href: '/profile' },
  ],
  tutor: [
    { id: 'dashboard', label: 'Dashboard',   icon: LayoutDashboard, href: '/dashboard' },
    { id: 'feed',      label: 'Feed',        icon: BookMarked,      href: '/feed'      },
    { id: 'schedules', label: 'Availability', icon: Calendar,       href: '/schedules' },
    { id: 'tutors',    label: 'Students',    icon: Users,           href: '/tutors'    },
    { id: 'messages',  label: 'Messages',    icon: MessageSquare,   href: '/messages'  },
    { id: 'profile',   label: 'Profile',     icon: User,            href: '/profile'   },
  ],
  admin: [
    { id: 'dashboard', label: 'Overview', icon: Home,       href: '/dashboard' },
    { id: 'feed',      label: 'Feed',     icon: BookMarked, href: '/feed' },
    { id: 'admin',     label: 'Admin',    icon: Users,      href: '/admin' },
    { id: 'profile',   label: 'Profile',  icon: User,       href: '/profile' },
  ],
}

const ACCENT_COLORS = [
  { bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)' },
  { bg: 'var(--accent-sky-bg)',      fg: 'var(--accent-sky-fg)' },
  { bg: 'var(--accent-mint-bg)',     fg: 'var(--accent-mint-fg)' },
  { bg: 'var(--accent-sun-bg)',      fg: 'var(--accent-sun-fg)' },
  { bg: 'var(--accent-coral-bg)',    fg: 'var(--accent-coral-fg)' },
]

export function AppShell({ children, currentPage, userRole = 'student' }: AppShellProps) {
  const [sidebarOpen,       setSidebarOpen]       = useState(false)
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false)
  const [isDark,            setIsDark]            = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadCount,       setUnreadCount]       = useState(0)

  const { user, initials, fullName } = useAuthStore()

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    const poll = () => getUnreadCount().then(setUnreadCount).catch(() => {})
    poll()
    interval = setInterval(poll, notificationsOpen ? 10_000 : 60_000)
    return () => clearInterval(interval)
  }, [notificationsOpen])

  useEffect(() => {
    const saved = localStorage.getItem('tutorly-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = saved ? saved === 'dark' : prefersDark
    setIsDark(dark)
    document.documentElement.classList.toggle('dark-mode',  dark)
    document.documentElement.classList.toggle('light-mode', !dark)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark-mode',  next)
    document.documentElement.classList.toggle('light-mode', !next)
    localStorage.setItem('tutorly-theme', next ? 'dark' : 'light')
  }

  const navItems = NAV_ITEMS[userRole]

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">

      {/* ─── SIDEBAR ─── */}
      <aside
        className={`
          fixed md:relative z-40 inset-y-0 left-0
          ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
          md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          transition-all duration-300 ease-in-out
          flex flex-col
          md:m-3 md:h-[calc(100vh-1.5rem)] h-dvh
          rounded-none md:rounded-2xl
          sidebar-surface
        `}
      >
        {/* Logo area + mobile close button */}
        <div className="p-4 flex items-center justify-between h-16 flex-shrink-0">
          {!sidebarCollapsed && (
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
                <BookOpen className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-heading font-bold text-base text-text-primary truncate">tutorly</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto flex-shrink-0" style={{ background: 'var(--primary)' }}>
              <BookOpen className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          )}

          {/* X close button — visible only on mobile when sidebar is open */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex absolute -right-3 top-14 w-6 h-6 rounded-full items-center justify-center cursor-pointer transition-all duration-150 hover:scale-110"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-3 h-3 text-text-secondary" />
            : <ChevronLeft  className="w-3 h-3 text-text-secondary" />
          }
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5">
          {!sidebarCollapsed && (
            <p className="label-caps text-text-muted px-3 mb-3 mt-1">Main</p>
          )}

          {navItems.map((item, idx) => {
            const isActive = currentPage === item.id
            const Icon     = item.icon
            const accent   = ACCENT_COLORS[idx % ACCENT_COLORS.length]

            return (
              <Link
                key={item.id}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
                style={isActive ? {
                  background: accent.bg,
                  color: accent.fg,
                } : {
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--primary-subtle)'
                    e.currentTarget.style.color      = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = ''
                    e.currentTarget.style.color      = 'var(--text-secondary)'
                  }
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                {!sidebarCollapsed && (
                  <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'} transition-none`}>
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-2.5 space-y-1 flex-shrink-0 border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Theme toggle — moved from top navbar */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 text-sm font-medium ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-subtle)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {isDark ? <Sun className="w-4 h-4 flex-shrink-0" strokeWidth={2} /> : <Moon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />}
            {!sidebarCollapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          <Link
            href="/settings"
            title={sidebarCollapsed ? 'Settings' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{ color: currentPage === 'settings' ? 'var(--primary)' : 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-subtle)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
          >
            <Settings className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            {!sidebarCollapsed && <span className="text-sm font-medium">Settings</span>}
          </Link>

          {!sidebarCollapsed ? (
            <div
              className="p-3 rounded-xl flex items-center gap-2.5"
              style={{ background: 'var(--primary-subtle)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <div
                suppressHydrationWarning
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}
              >
                {initials()}
              </div>
              <div className="flex-1 min-w-0">
                <p suppressHydrationWarning className="text-xs font-semibold text-text-primary truncate">{fullName() || 'Guest User'}</p>
                <p className="text-xs text-text-muted capitalize">{user?.role || userRole}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                suppressHydrationWarning
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}
              >
                {initials()}
              </div>
            </div>
          )}

          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 text-sm font-medium ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
              e.currentTarget.style.color      = 'var(--accent-coral-fg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = ''
              e.currentTarget.style.color      = 'var(--text-muted)'
            }}
            title={sidebarCollapsed ? 'Sign out' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ─── TOP NAVBAR — redesigned edu SaaS ─── */}
        <header className="flex-shrink-0 px-4 pt-4 pb-0">
          <div
            className="w-full px-4 py-2.5 flex items-center justify-between rounded-xl"
            style={{
              background: 'var(--surface-glass)',
              backdropFilter: 'var(--blur-panel)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {/* Left — hamburger + current page label */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-subtle)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <Menu className="w-5 h-5" strokeWidth={2} />
              </button>
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                <span className="text-text-muted text-xs">tutorly</span>
                <span className="text-border text-xs">/</span>
                <span className="font-semibold capitalize text-sm">{currentPage}</span>
              </div>
            </div>

            {/* Right — search, messages, bell */}
            <div className="flex items-center gap-0.5">
              {/* Search icon button */}
              <IconButton
                icon={<Search className="w-4 h-4" strokeWidth={2} />}
                label="Search"
              />

              {/* Messages link */}
              <Link href="/messages">
                <IconButton
                  icon={<Mail className="w-4 h-4" strokeWidth={2} />}
                  label="Messages"
                />
              </Link>

              {/* Bell with unread badge — opens panel, also links to /notifications on right-click / middle-click */}
              <Link
                href="/notifications"
                onClick={(e) => { e.preventDefault(); setNotificationsOpen(true) }}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-150"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
              >
                <Bell className="w-4 h-4" strokeWidth={2} />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white"
                    style={{ background: 'var(--accent-coral-fg)', boxShadow: '0 0 0 2px var(--surface-glass)' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 md:hidden z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <NotificationsPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onRead={() => setUnreadCount(0)}
      />
    </div>
  )
}
