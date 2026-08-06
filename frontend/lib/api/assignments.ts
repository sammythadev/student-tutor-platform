import api from '@/lib/axios'
import type { Assignment, AssignmentStatus } from './users'

export async function getMyAssignments(params?: { page?: number; limit?: number }) {
  const { data } = await api.get<AssignmentPage>('/matchmaking/assignments/me', { params })
  return data
}

/** Returns the caller's current match, or null when they have none. */
export async function getCurrentAssignment(): Promise<Assignment | null> {
  const { data } = await api.get<AssignmentPage>('/matchmaking/assignments/me', {
    params: { page: 1, limit: 50 },
  })
  return data.data.find((a) => a.status === 'active' || a.status === 'waitlisted') ?? null
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: 'completed' | 'cancelled',
) {
  const { data } = await api.patch<Assignment>(`/matchmaking/assignments/${assignmentId}/status`, {
    status,
  })
  return data
}

export interface AssignmentPage {
  page: number
  limit: number
  total: number
  data: Assignment[]
}

export const ASSIGNMENT_LABEL: Record<AssignmentStatus, string> = {
  active: 'Matched',
  waitlisted: 'On waitlist',
  completed: 'Completed',
  cancelled: 'Ended',
}

export const ASSIGNMENT_ACCENT: Record<AssignmentStatus, 'mint' | 'sun' | 'sky' | 'coral'> = {
  active: 'mint',
  waitlisted: 'sun',
  completed: 'sky',
  cancelled: 'coral',
}

export type { Assignment, AssignmentStatus }
