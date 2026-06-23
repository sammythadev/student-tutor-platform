import api from '@/lib/axios'
import { useAuthStore } from '@/lib/store/authStore'

export async function getMe() {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Not authenticated')
  const { data } = await api.get(`/users/${user.id}`)
  return data
}

export async function updateMe(payload: UpdateMePayload) {
  const { data } = await api.patch('/users/me', payload)
  useAuthStore.getState().updateUser(data.user)
  return data
}

export async function updateStudentPreferences(payload: Record<string, any>) {
  const { data } = await api.patch('/users/me/student-preferences', payload)
  useAuthStore.getState().updateStudentProfile(data.studentProfile)
  return data
}

export async function updateTutorPreferences(payload: Record<string, any>) {
  const { data } = await api.patch('/users/me/tutor-preferences', payload)
  useAuthStore.getState().updateTutorProfile(data.tutorProfile)
  return data
}

export async function getTutorCandidates(params?: { page?: number; limit?: number }) {
  const { data } = await api.get('/matchmaking/candidates', { params })
  return data as TutorCandidatePage
}

export async function selectTutor(tutorId: string) {
  const { data } = await api.post('/matchmaking/select', { tutorId })
  return data
}

export interface UpdateMePayload {
  firstName?: string
  lastName?: string
  region?: string
  avatarUrl?: string
  timezone?: string
  language?: string
  theme?: string
  accentColor?: string
  notificationPrefs?: {
    sessionReminders?: boolean
    newMessages?: boolean
    sessionUpdates?: boolean
    marketingEmails?: boolean
    weeklyReports?: boolean
  }
}

export interface TutorCandidate {
  userId: string
  score: number
  subjectsTaught: string[]
  experienceYears: number
  avgRating: string | null
  ratingCount: number
  hourlyRate: string
  bio: string | null
  firstName: string
  lastName: string
  avatarUrl: string | null
  region: string | null
}

export interface TutorCandidatePage {
  candidates: TutorCandidate[]
  total: number
  page: number
  limit: number
}
