import api from '@/lib/axios'

export interface BookSessionPayload {
  tutorId: string
  subject: string
  startAt: string
  endAt: string
  meetingUrl?: string
  notes?: string
  studentId?: string
}

export async function getMySessions() {
  const { data } = await api.get('/sessions/me')
  return data as SessionItem[]
}

export async function bookSession(payload: BookSessionPayload) {
  const { data } = await api.post('/sessions', payload)
  return data as SessionItem
}

export async function acceptSession(id: string) {
  const { data } = await api.patch(`/sessions/${id}/accept`)
  return data as SessionItem
}

export async function declineSession(id: string) {
  const { data } = await api.patch(`/sessions/${id}/decline`)
  return data as SessionItem
}

export async function updateSessionStatus(id: string, status: 'completed' | 'cancelled' | 'upcoming' | 'starting-soon') {
  const { data } = await api.patch(`/sessions/${id}/status`, { status })
  return data as SessionItem
}

export interface SessionItem {
  id: string
  studentId: string
  tutorId: string
  initiatorId?: string | null
  subject: string
  startAt: string
  endAt: string
  status: 'pending' | 'upcoming' | 'starting-soon' | 'completed' | 'cancelled'
  meetingUrl: string | null
  notes: string | null
  tutorName?: string
  tutorAvatarUrl?: string | null
  tutorIsVerified?: boolean
  studentName?: string
  studentAvatarUrl?: string | null
  createdAt: string
}
