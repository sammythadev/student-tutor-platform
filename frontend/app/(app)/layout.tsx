'use client'

import { AppShell } from '@/components/AppShell'
import { useAuthStore } from '@/lib/store/authStore'
import { usePathname } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const userRole = useAuthStore(s => {
    const role = s.user?.role
    if (role === 'tutor') return 'tutor'
    if (role === 'admin') return 'admin'
    return 'student'
  })

  // Map the current URL path to the nav item id used in AppShell
  const getPageId = (path: string): string => {
    const segment = path.split('/').filter(Boolean).pop() ?? 'dashboard'
    // Normalise tutor-dashboard → dashboard so the nav item highlights correctly
    if (segment === 'tutor-dashboard') return 'dashboard'
    return segment
  }

  const currentPage = getPageId(pathname)

  return (
    <AppShell currentPage={currentPage} userRole={userRole}>
      {children}
    </AppShell>
  )
}
