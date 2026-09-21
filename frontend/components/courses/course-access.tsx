'use client'

import { Fragment, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'

function AccessNotice({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-3 py-6">
      <h1 className="text-2xl font-semibold wrap-anywhere">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm underline">Dashboard</Link>
    </div>
  )
}

/**
 * Hydration gate for course routes: renders the boundary shell until the
 * persisted auth store has rehydrated, then keys children by user id so an
 * account switch can never leak the previous account's data.
 *
 * `tutorOnly` and `studentOnly` gate the surfaces that belong to one side of the
 * author/learner relationship (student progress tracking vs. the tutor tracker).
 * A wrong-role visitor gets an explanation rather than a skeleton that never
 * resolves.
 */
export function CourseAccess({
  children,
  tutorOnly = false,
  studentOnly = false,
}: {
  children: ReactNode
  tutorOnly?: boolean
  studentOnly?: boolean
}) {
  const user = useAuthStore(state => state.user)
  const token = useAuthStore(state => state.accessToken)
  // Persist rehydrates synchronously from localStorage during store creation,
  // so the client snapshot is stable; subscribe() re-checks on later writes.
  const hydrated = useSyncExternalStore(
    useAuthStore.subscribe,
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  )

  if (!hydrated || !user || !token) {
    return <div className="space-y-4 py-6" aria-label="Loading courses"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 w-full" /></div>
  }
  if (user.role !== 'student' && user.role !== 'tutor' && user.role !== 'admin') {
    return <AccessNotice title="Courses are available to students, tutors and admins" />
  }
  if (tutorOnly && user.role === 'student') {
    return (
      <AccessNotice
        title="Student progress lives in a tutor account"
        description="Sign in as a tutor or admin to track the students you set courses for."
      />
    )
  }
  if (studentOnly && user.role !== 'student') {
    return (
      <AccessNotice
        title="My tutors is a student view"
        description="Sign in as a student to see the tutors who set your courses and how you are following them."
      />
    )
  }
  return <Fragment key={user.id}>{children}</Fragment>
}
