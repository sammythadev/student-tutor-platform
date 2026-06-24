'use client'

import { useAuthStore } from '@/lib/store/authStore'
import { StudentDashboard } from './StudentDashboard'
import { TutorDashboard } from './TutorDashboard'

export default function DashboardPage() {
  const isTutor = useAuthStore(s => s.user?.role === 'tutor')
  
  if (isTutor) {
    return <TutorDashboard />
  }

  return <StudentDashboard />
}

