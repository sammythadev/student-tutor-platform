'use client'

import { AppShell } from '@/components/AppShell'
import { usePathname } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Extract page name from pathname
  // Returns the nav item id — AppShell compares currentPage === item.id
  const getPageId = (path: string): string => {
    const segments = path.split('/')
    return segments[segments.length - 1] || 'dashboard'
  }

  const getUserRole = (path: string): 'student' | 'tutor' | 'admin' => {
    if (path.includes('tutor-dashboard') || path.includes('students')) return 'tutor'
    if (path.includes('admin')) return 'admin'
    return 'student'
  }

  const currentPage = getPageId(pathname)
  const userRole    = getUserRole(pathname)

  return (
    <AppShell currentPage={currentPage} userRole={userRole}>
      {children}
    </AppShell>
  )
}
