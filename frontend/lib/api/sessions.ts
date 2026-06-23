import api from '@/lib/axios'

export interface BookSessionPayload {
  tutorId: string
  subject: string
  startAt: string
  endAt: string
  meetingUrl?: string
  notes?: string
}

export async function getMySessions() {
  const { data } = await api.get('/sessions/me')
  return data as SessionItem[]
}

export async function bookSession(payload: BookSessionPayload) {
  const { data } = await api.post('/sessions', payload)
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
  subject: string
  startAt: string
  endAt: string
  status: 'upcoming' | 'starting-soon' | 'completed' | 'cancelled'
  meetingUrl: string | null
  notes: string | null
  tutorName?: string
  tutorAvatarUrl?: string | null
  studentName?: string
  studentAvatarUrl?: string | null
  createdAt: string
}
