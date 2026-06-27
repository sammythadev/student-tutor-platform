import api from '@/lib/axios'

export interface NotificationItem {
  id: string
  userId: string
  type: 'session_request' | 'session_upcoming' | 'session_passed' | 'session_cancelled' | 'session_accepted' | 'session_proposed' | 'general'
  title: string
  message: string
  isRead: number
  relatedId: string | null
  createdAt: string
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const { data } = await api.get('/notifications')
  return Array.isArray(data) ? data : []
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get('/notifications/unread-count')
  return data?.count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all')
}

export async function getTutorSlots(
  tutorId: string,
  from?: string,
  to?: string,
): Promise<{
  availableSlots: { start: string; end: string }[]
  bookedSlots: { id: string; startAt: string; endAt: string; subject?: string; isOwn: boolean; occupied: boolean; status?: string }[]
  isFullyBooked: boolean
}> {
  const params: Record<string, string> = {}
  if (from) params.from = from
  if (to) params.to = to
  const { data } = await api.get(`/schedules/tutors/${tutorId}/slots`, { params })
  return data
}
