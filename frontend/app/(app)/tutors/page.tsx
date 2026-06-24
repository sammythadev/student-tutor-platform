'use client'

import { useAuthStore } from '@/lib/store/authStore'
import { FindTutors } from './FindTutors'
import { StudentList } from './StudentList'

export default function TutorsPage() {
  const isTutor = useAuthStore(s => s.user?.role === 'tutor')
  
  if (isTutor) {
    return <StudentList />
  }

  return <FindTutors />
}

