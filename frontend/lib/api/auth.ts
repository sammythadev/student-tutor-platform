import api from '@/lib/axios'
import { useAuthStore } from '@/lib/store/authStore'

export interface LoginPayload { email: string; password: string }
export interface SignupPayload { email: string; password: string; firstName: string; lastName: string; role: 'student' | 'tutor' | 'unassigned' }

// Style unions mirror the backend enums (@core/enums). Keep in sync with
// TeachingStyle / DeliveryMode / FormatPreference on the API side.
export type TeachingStyle = 'interactive' | 'lecture'
export type DeliveryMode = 'online' | 'in-person'
export type FormatPreference = 'one-on-one' | 'group'

export interface AvailabilitySlot { start: string; end: string }

export interface StudentOnboardPayload {
  subjects: string[]
  gradeLevel: number
  examType: string
  requestedAvailability: AvailabilitySlot[]
  budget?: number
  learningStylePreference?: string
  deliveryPreference?: DeliveryMode
  formatPreference?: FormatPreference
  languages?: string[]
  region?: string
  timezone?: string
  bio?: string
  learningGoals?: string
  subjectSpecialization?: string
}

export interface TutorOnboardPayload {
  subjectsTaught: string[]
  gradeLevelsSupported?: number[]
  examTypesSupported?: string[]
  availability: AvailabilitySlot[]
  hourlyRate: number
  bio?: string
  timezone?: string
  experienceYears?: number
  languages?: string[]
  teachingStyle?: TeachingStyle
  deliveryStyle?: DeliveryMode
  formatStyle?: FormatPreference
  capacity?: number
}

function mapSession(data: any) {
  return {
    accessToken: data.accessToken as string,
    refreshToken: data.refreshToken as string,
    user: data.user.user,
    studentProfile: data.user.studentProfile,
    tutorProfile: data.user.tutorProfile,
  }
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post('/auth/login', payload)
  const session = mapSession(data)
  useAuthStore.getState().setSession(session)
  return session
}

export async function signup(payload: SignupPayload) {
  const { data } = await api.post('/auth/signup', payload)
  const session = mapSession(data)
  useAuthStore.getState().setSession(session)
  return session
}

export async function onboard(role: 'student', profilePayload: StudentOnboardPayload): Promise<ReturnType<typeof mapSession>>
export async function onboard(role: 'tutor', profilePayload: TutorOnboardPayload): Promise<ReturnType<typeof mapSession>>
export async function onboard(
  role: 'student' | 'tutor',
  profilePayload: StudentOnboardPayload | TutorOnboardPayload,
) {
  const { data } = await api.post('/auth/onboard', { role, [`${role}Profile`]: profilePayload })
  const session = mapSession(data)
  useAuthStore.getState().setSession(session)
  return session
}

export async function verifyToken() {
  const { data } = await api.get('/auth/verify')
  return data
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    // Ignore error, we want to clear the session locally regardless
  }
  useAuthStore.getState().clearSession()
  if (typeof window !== 'undefined') window.location.href = '/signin'
}
