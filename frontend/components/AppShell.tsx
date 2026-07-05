'use client'

import { ReactNode, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconButton } from '@/components/Button'
import {
  BookOpen, X,
  Home, BookMarked, Users, Calendar, User, Settings, LogOut,
  Bell, Mail, Search, Moon, Sun, Monitor, ChevronLeft, ChevronRight,
  LayoutDashboard, MessageSquare, MoreHorizontal,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { logout } from '@/lib/api/auth'
import { NotificationsPanel } from '@/components/NotificationsPanel'
import { getUnreadCount } from '@/lib/api/notifications'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

/* ─── Types ───────────────────────────────────────────────── */
interface AppShellProps {
  children: ReactNode
  currentPage: string
  userRole?: 'student' | 'tutor' | 'admin' | 'unassigned'
}

/* ─── Nav definitions ─────────────────────────────────────── */
// First 4 = bottom bar core items, rest go in sidebar (mobile accessible via hamburger)
const NAV_ITEMS = {
  student: [
    { id: 'dashboard', label: 'Home',     icon: Home,           href: '/dashboard' },
    { id: 'tutors',    label: 'Tutors',   icon: Users,          href: '/tutors'    },
    { id: 'schedules', label: 'Sessions', icon: Calendar,       href: '/schedules' },
    { id: 'messages',  label: 'Messages', icon: MessageSquare,  href: '/messages'  },
    // overflow (shown in More drawer on mobile)
    { id: 'feed',      label: 'Feed',     icon: BookMarked,     href: '/feed'      },
    { id: 'profile',   label: 'Profile',  icon: User,           href: '/profile'   },
  ],
  tutor: [
    { id: 'dashboard', label: 'Home',      icon: LayoutDashboard, href: '/dashboard' },
    { id: 'schedules', label: 'Schedule',  icon: Calendar,        href: '/schedules' },
    { id: 'tutors',    label: 'Students',  icon: Users,           href: '/tutors'    },
    { id: 'messages',  label: 'Messages',  icon: MessageSquare,   href: '/messages'  },
    // overflow
    { id: 'feed',      label: 'Feed',      icon: BookMarked,      href: '/feed'      },
    { id: 'profile',   label: 'Profile',   icon: User,            href: '/profile'   },
  ],
  admin: [
    { id: 'dashboard', label: 'Home',    icon: Home,       href: '/dashboard' },
    { id: 'feed',      label: 'Feed',    icon: BookMarked, href: '/feed'      },
    { id: 'admin',     label: 'Admin',   icon: Users,      href: '/admin'     },
    { id: 'profile',   label: 'Profile', icon: User,       href: '/profile'   },
  ],
}

const ACCENT_COLORS = [
  { bg: 'var(--accent-lavender-bg)', fg: 'var(--accent-lavender-fg)' },
  { bg: 'var(--accent-sky-bg)',      fg: 'var(--accent-sky-fg)' },
  { bg: 'var(--accent-mint-bg)',     fg: 'var(--accent-mint-fg)' },
  { bg: 'var(--accent-sun-bg)',      fg: 'var(--accent-sun-fg)' },
  { bg: 'var(--accent-coral-bg)',    fg: 'var(--accent-coral-fg)' },
]

type ThemeMode = 'dark' | 'light' | 'system'

function applyTheme(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark-mode', isDark)
  document.documentElement.classList.toggle('light-mode', !isDark)
}

/* ─── Spring configs ──────────────────────────────────────── */
const SPRING_NAV  = { type: 'spring', stiffness: 480, damping: 36, mass: 0.8 }
const SPRING_PAGE = { type: 'spring', stiffness: 340, damping: 32, mass: 1 }
const SPRING_DRAWER = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }

/* ═══════════════════════════════════════════════════════════
   PAGE TRANSITION WRAPPER — wraps children per-route
═══════════════════════════════════════════════════════════ */
function PageTransition({ children, pageKey }: { children: ReactNode; pageKey: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
        transition={SPRING_PAGE}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP SHELL
═══════════════════════════════════════════════════════════ */
export function AppShell({ children, currentPage, userRole = 'student' }: AppShellProps) {
  const [sidebarOpen,       setSidebarOpen]       = useState(false)
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false)
  const [themeMode,         setThemeMode]         = useState<ThemeMode>('system')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [moreOpen,          setMoreOpen]          = useState(false)
  const [unreadCount,       setUnreadCount]       = useState(0)

  const { user, initials, fullName } = useAuthStore()
  const pathname = usePathname()

  /* Notification polling */
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    const poll = () => getUnreadCount().then(setUnreadCount).catch(() => {})
    poll()
    interval = setInterval(poll, notificationsOpen ? 10_000 : 60_000)
    return () => clearInterval(interval)
  }, [notificationsOpen])

  /* Theme init */
  useEffect(() => {
    const saved = localStorage.getItem('tutorly-theme') as ThemeMode | null
    const mode: ThemeMode = (saved === 'dark' || saved === 'light' || saved === 'system') ? saved : 'system'
    setThemeMode(mode)
    applyTheme(mode)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onMqChange = () => {
      const current = localStorage.getItem('tutorly-theme') as ThemeMode | null
      if (!current || current === 'system') applyTheme('system')
    }
    mq.addEventListener('change', onMqChange)
    return () => mq.removeEventListener('change', onMqChange)
  }, [])

  /* Close mobile overlays on route change */
  useEffect(() => {
    setSidebarOpen(false)
    setMoreOpen(false)
  }, [pathname])

  const cycleTheme = () => {
    const next: ThemeMode = themeMode === 'system' ? 'dark' : themeMode === 'dark' ? 'light' : 'system'
    setThemeMode(next)
    localStorage.setItem('tutorly-theme', next)
    applyTheme(next)
  }

  const ThemeIcon = themeMode === 'dark' ? Moon : themeMode === 'light' ? Sun : Monitor
  const themeLabel = themeMode === 'dark' ? 'Dark mode' : themeMode === 'light' ? 'Light mode' : 'System theme'

  const allNavItems = (NAV_ITEMS as any)[userRole] ?? NAV_ITEMS.student
  // Core items (bottom bar) = first 4; rest in More modal
  const coreItems     = allNavItems.slice(0, 4)
  const overflowItems = allNavItems.slice(4)
  const sidebarWidth  = sidebarCollapsed ? 72 : 256

  return (
    <div className="flex bg-canvas" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* ═══════════════════════════════════════════════════
          DESKTOP SIDEBAR — unchanged, fixed
      ═══════════════════════════════════════════════════ */}
      <aside
        className="app-sidebar fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out"
        style={{
          width: sidebarWidth,
          background: 'var(--sidebar)',
          borderRight: '1px solid var(--border)',
          boxShadow: sidebarOpen ? '4px 0 40px rgba(0,0,0,0.45)' : 'none',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Logo */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between px-4">
          {!sidebarCollapsed ? (
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
                <BookOpen className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-heading font-bold text-base truncate" style={{ color: 'var(--text-primary)' }}>tutorly</span>
            </Link>
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto flex-shrink-0" style={{ background: 'var(--primary)' }}>
              <BookOpen className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex absolute -right-3 top-14 w-6 h-6 rounded-full items-center justify-center cursor-pointer transition-all duration-150 hover:scale-110 z-50"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-3 h-3 text-text-secondary" />
            : <ChevronLeft  className="w-3 h-3 text-text-secondary" />
          }
        </button>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5">
          {!sidebarCollapsed && (
            <p className="label-caps px-3 mb-3 mt-1" style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Main</p>
          )}
          {allNavItems.map((item: any, idx: number) => {
            const isActive = currentPage === item.id
            const Icon = item.icon
            const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length]
            return (
              <Link
                key={item.id}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer group relative ${sidebarCollapsed ? 'justify-center' : ''}`}
                style={isActive ? { background: accent.bg, color: accent.fg } : { color: 'var(--text-secondary)' }}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ background: accent.fg }} />}
                <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                {!sidebarCollapsed && <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>}
                {!isActive && <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'var(--primary-subtle)' }} />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-2.5 space-y-1 flex-shrink-0 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={cycleTheme}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-medium group relative ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <ThemeIcon className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:rotate-12" strokeWidth={2} />
            {!sidebarCollapsed && <span>{themeLabel}</span>}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'var(--primary-subtle)' }} />
          </button>

          <Link href="/settings" onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group relative ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{ color: currentPage === 'settings' ? 'var(--primary)' : 'var(--text-secondary)' }}>
            <Settings className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            {!sidebarCollapsed && <span className="text-sm font-medium">Settings</span>}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'var(--primary-subtle)' }} />
          </Link>

          {!sidebarCollapsed ? (
            <div className="p-3 rounded-xl flex items-center gap-2.5" style={{ background: 'var(--primary-subtle)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div suppressHydrationWarning className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
                {initials()}
              </div>
              <div className="flex-1 min-w-0">
                <p suppressHydrationWarning className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{fullName() || 'Guest User'}</p>
                <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{user?.role || userRole}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div suppressHydrationWarning className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
                {initials()}
              </div>
            </div>
          )}

          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-medium group relative ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            {!sidebarCollapsed && <span>Sign out</span>}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'rgba(239,68,68,0.08)' }} />
          </button>
        </div>
      </aside>

      {/* Desktop spacer */}
      <div className="hidden md:block flex-shrink-0 transition-all duration-300" style={{ width: sidebarWidth }} />

      {/* ═══════════════════════════════════════════════════
          MAIN COLUMN
      ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── TOP NAVBAR ── */}
        <header
          className="flex-shrink-0 sticky top-0 z-30 px-2 md:px-4 pt-3 pb-2"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
        >
          <div style={{ padding: 1, borderRadius: 9999, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(16,185,129,0.08), transparent)' }}>
            <div
              className="w-full px-3 md:px-5 h-12 flex items-center justify-between gap-3"
              style={{ borderRadius: 9998, background: 'var(--surface-glass)', backdropFilter: 'var(--blur-panel)', WebkitBackdropFilter: 'var(--blur-panel)' }}
            >
              {/* Left — tutorly icon + breadcrumb */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Link
                  href="/"
                  className="pressable flex items-center gap-1.5 md:hidden flex-shrink-0 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                    <BookOpen className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>tutorly</span>
                </Link>
                <Link href="/" className="hidden sm:inline text-xs font-medium tracking-wider uppercase hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>tutorly</Link>
                <ChevronRight className="hidden sm:block w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} strokeWidth={2.5} />
                <span className="hidden sm:inline text-sm font-semibold capitalize truncate" style={{ color: 'var(--text-primary)' }}>{currentPage}</span>
              </div>

              {/* Center — page name (mobile) */}
              <span className="md:hidden text-sm font-semibold capitalize truncate max-w-[30vw] text-center flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                {currentPage}
              </span>

              {/* Center — search (desktop) */}
              <div className="hidden md:flex flex-1 max-w-xs lg:max-w-sm justify-center">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
                  <input
                    type="text"
                    placeholder="Search tutors, sessions..."
                    className="w-full h-8 pl-8 pr-3 rounded-lg text-xs outline-none transition-all"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid transparent' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--surface)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--surface-2)' }}
                  />
                </div>
              </div>

              {/* Right — actions */}
              <div className="flex items-center gap-0.5 flex-1 justify-end">
                <IconButton icon={<Search className="w-4 h-4" strokeWidth={2} />} label="Search" className="md:hidden" />
                <Link href="/messages">
                  <IconButton icon={<Mail className="w-4 h-4" strokeWidth={2} />} label="Messages" />
                </Link>
                <Link
                  href="/notifications"
                  onClick={e => { e.preventDefault(); setNotificationsOpen(true) }}
                  className="relative w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer transition-all"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Bell className="w-4 h-4" strokeWidth={2} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] font-bold text-white"
                      style={{ background: 'var(--accent-coral-fg)', boxShadow: '0 0 0 2px var(--surface-glass)' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          } as any}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
            <PageTransition pageKey={currentPage}>
              {children}
            </PageTransition>
          </div>
        </main>

        {/* ── MOBILE BOTTOM NAV — glass, inline, not floating ── */}
        <nav
          className="md:hidden flex-shrink-0"
          style={{
            background: 'var(--surface-glass)',
            backdropFilter: 'var(--blur-panel)',
            WebkitBackdropFilter: 'var(--blur-panel)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {coreItems.map((item: any) => {
              const isActive = currentPage === item.id
              const Icon = item.icon
              const hasNotif = item.id === 'messages' && unreadCount > 0
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 cursor-pointer"
                >
                  <div className="relative">
                    <Icon
                      className="w-5 h-5"
                      strokeWidth={isActive ? 2.5 : 1.8}
                      style={{ color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }}
                    />
                    {hasNotif && (
                      <span
                        className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-[14px] rounded-full text-[8px] font-bold text-white"
                        style={{ background: 'var(--accent-coral-fg)' }}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold leading-none" style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {item.label}
                  </span>
                </Link>
              )
            })}

            {/* More button */}
            {overflowItems.length > 0 && (
              <button
                onClick={() => setMoreOpen(true)}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 cursor-pointer"
              >
                <MoreHorizontal
                  className="w-5 h-5"
                  strokeWidth={1.8}
                  style={{ color: moreOpen ? 'var(--primary)' : 'var(--text-secondary)' }}
                />
                <span className="text-[10px] font-semibold leading-none" style={{ color: moreOpen ? 'var(--primary)' : 'var(--text-muted)' }}>
                  More
                </span>
              </button>
            )}
          </div>
        </nav>

        {/* ── MOBILE "MORE" SLIDE-UP GLASS DRAWER ── */}
        <AnimatePresence>
          {moreOpen && (
            <>
              <motion.div
                className="md:hidden fixed inset-0 z-50"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => setMoreOpen(false)}
              />
              <motion.div
                className="md:hidden fixed bottom-0 inset-x-0 z-50 rounded-t-3xl overflow-hidden"
                style={{
                  background: 'rgba(10,10,20,0.82)',
                  backdropFilter: 'blur(32px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderBottom: 'none',
                  boxShadow: '0 -8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={SPRING_DRAWER}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
                </div>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3 pt-1">
                  <p className="font-heading text-sm font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>More</p>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} strokeWidth={2} />
                  </button>
                </div>
                {/* Overflow items */}
                <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                  {overflowItems.map((item: any, idx: number) => {
                    const isActive = currentPage === item.id
                    const Icon = item.icon
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.88, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ ...SPRING_NAV, delay: idx * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className="flex flex-col items-center gap-2 rounded-2xl p-4 cursor-pointer transition-all"
                          style={{
                            background: isActive ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${isActive ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          }}
                        >
                          <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8}
                            style={{ color: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.55)' }} />
                          <span className="text-[11px] font-semibold"
                            style={{ color: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.55)' }}>
                            {item.label}
                          </span>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
                {/* Divider */}
                <div className="mx-5 mb-4" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                {/* Footer options */}
                <div className="px-4 pb-5 space-y-1">
                  <Link
                    href="/settings"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors"
                    style={{ color: 'rgba(255,255,255,0.65)' }}
                    onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background='')}
                  >
                    <Settings className="w-4 h-4" strokeWidth={1.8} />
                    <span className="text-sm font-medium">Settings</span>
                  </Link>
                  <button
                    onClick={cycleTheme}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors"
                    style={{ color: 'rgba(255,255,255,0.65)' }}
                    onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background='')}
                  >
                    <ThemeIcon className="w-4 h-4" strokeWidth={1.8} />
                    <span className="text-sm font-medium">{themeLabel}</span>
                  </button>
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors"
                    style={{ color: 'rgba(239,68,68,0.75)' }}
                    onMouseEnter={e => (e.currentTarget.style.background='rgba(239,68,68,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background='')}
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.8} />
                    <span className="text-sm font-medium">Sign out</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: overlay backdrop when sidebar open */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 md:hidden z-30"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <NotificationsPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onRead={() => setUnreadCount(0)}
      />
    </div>
  )
}
