import api from '@/lib/axios'
import { useAuthStore } from '@/lib/store/authStore'

export interface LoginPayload { email: string; password: string }
export interface SignupPayload { email: string; password: string; firstName: string; lastName: string; role: 'student' | 'tutor' | 'unassigned' }

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
