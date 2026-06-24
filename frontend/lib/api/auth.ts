import api from '@/lib/axios'
import { useAuthStore } from '@/lib/store/authStore'

export interface LoginPayload { email: string; password: string }
export interface SignupPayload { email: string; password: string; firstName: string; lastName: string; role: 'student' | 'tutor' }

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

export async function onboard(role: 'student' | 'tutor', profilePayload: any) {
  const { data } = await api.post('/auth/onboard', { role, [`${role}Profile`]: profilePayload })
  useAuthStore.getState().updateUser(data.user)
  useAuthStore.getState().updateStudentProfile(data.studentProfile)
  useAuthStore.getState().updateTutorProfile(data.tutorProfile)
  return data
}

export async function verifyToken() {
  const { data } = await api.get('/auth/verify')
  return data
}

export function logout() {
  useAuthStore.getState().clearSession()
  if (typeof window !== 'undefined') window.location.href = '/signin'
}
