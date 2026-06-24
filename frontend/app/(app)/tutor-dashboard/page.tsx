'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * The /tutor-dashboard route has been consolidated into /dashboard.
 * The dashboard page now renders the correct view based on user role.
 * This redirect ensures any old links or bookmarks continue to work.
 */
export default function TutorDashboardRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])
  return null
}
