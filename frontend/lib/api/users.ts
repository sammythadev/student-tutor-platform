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

export async function getTutorCandidates(params?: { page?: number; limit?: number; search?: string; subject?: string }) {
  const { data } = await api.get('/matchmaking/candidates', { params })
  const rawCandidates = data.candidates ?? data.data ?? []
  return {
    candidates: rawCandidates.map((candidate: any) => ({
      ...candidate,
      userId: candidate.userId ?? candidate.tutorId,
      tutorId: candidate.tutorId ?? candidate.userId,
      ratingCount: candidate.ratingCount ?? 0,
      hourlyRate: candidate.hourlyRate ?? '0',
      bio: candidate.bio ?? null,
      avatarUrl: candidate.avatarUrl ?? null,
    })),
    total: data.total ?? rawCandidates.length,
    page: data.page ?? params?.page ?? 1,
    limit: data.limit ?? params?.limit ?? 5,
  } as TutorCandidatePage
}

export async function getStudentCandidates(params?: { page?: number; limit?: number }) {
  const { data } = await api.get('/matchmaking/candidates/students', { params })
  const rawCandidates = data.data ?? []
  return {
    candidates: rawCandidates.map((candidate: any) => ({
      ...candidate,
    })),
    total: data.total ?? rawCandidates.length,
    page: data.page ?? params?.page ?? 1,
    limit: data.limit ?? params?.limit ?? 5,
  }
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
  tutorId?: string
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
  isEligible?: boolean
  reason?: string
}

export interface TutorCandidatePage {
  candidates: TutorCandidate[]
  total: number
  page: number
  limit: number
}
