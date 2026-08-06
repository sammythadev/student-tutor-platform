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

export async function updateStudentPreferences(payload: StudentPreferencesPayload) {
  const { data } = await api.patch('/users/me/student-preferences', payload)
  useAuthStore.getState().updateStudentProfile(data.studentProfile)
  return data
}

export async function updateTutorPreferences(payload: TutorPreferencesPayload) {
  const { data } = await api.patch('/users/me/tutor-preferences', payload)
  useAuthStore.getState().updateTutorProfile(data.tutorProfile)
  return data
}

export async function getTutorCandidates(params?: CandidateQuery): Promise<TutorCandidatePage> {
  const { data } = await api.get<CandidatePageResponse<TutorCandidate>>('/matchmaking/candidates', {
    params,
  })
  return {
    candidates: data.data,
    total: data.total,
    page: data.page,
    limit: data.limit,
  }
}

export async function getStudentCandidates(params?: CandidateQuery): Promise<StudentCandidatePage> {
  const { data } = await api.get<CandidatePageResponse<StudentCandidate>>(
    '/matchmaking/candidates/students',
    { params },
  )
  return {
    candidates: data.data,
    total: data.total,
    page: data.page,
    limit: data.limit,
  }
}

export async function selectTutor(tutorId: string): Promise<Assignment> {
  const { data } = await api.post<Assignment>('/matchmaking/select', { tutorId })
  return data
}

export async function submitFeedback(assignmentId: string, payload: FeedbackPayload) {
  const { data } = await api.post<FeedbackResult>(
    `/matchmaking/assignments/${assignmentId}/feedback`,
    payload,
  )
  return data
}

export interface CandidateQuery {
  page?: number
  /** Backend caps this at 50 (PaginationQueryDto @Max(50)). */
  limit?: number
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

export interface StudentPreferencesPayload {
  subjects?: string[]
  requiredSubject?: string
  gradeLevel?: number
  examType?: string
  bio?: string
  learningGoals?: string
  budget?: number
  region?: string
}

export interface TutorPreferencesPayload {
  subjectsTaught?: string[]
  gradeLevelsSupported?: number[]
  examTypesSupported?: string[]
  experienceYears?: number
  hourlyRate?: number
  capacity?: number
  bio?: string
  region?: string
}

/** Mirrors backend CandidateTutorDto. Do not add fields the backend does not send. */
export interface TutorCandidate {
  tutorId: string
  firstName: string
  lastName: string
  region: string | null
  subjectsTaught: string[]
  /** Composite match score in [0,1]. */
  score: number
  rankPercentage: number
  isEligible?: boolean
  /** Why the candidate is ineligible, when isEligible is false. */
  reason?: string
  experienceYears: number
  /** Already scaled to a 0-5 star value by the backend. Not the raw 0-1 EMA. */
  avgRating: string | null
  ratingCount: number
  hourlyRate: number
  bio: string | null
  isVerified: boolean
}

/** Mirrors backend CandidateStudentDto. */
export interface StudentCandidate {
  studentId: string
  firstName: string
  lastName: string
  region: string | null
  requiredSubject: string
  subjects: string[]
  gradeLevel: number
  budget: number | null
  score: number
  rankPercentage: number
  isEligible?: boolean
  reason?: string
}

export type AssignmentStatus = 'active' | 'waitlisted' | 'completed' | 'cancelled'

/** Mirrors backend AssignmentResponseDto. */
export interface Assignment {
  id: string
  studentId: string
  /** Null while waitlisted — no tutor has been allocated yet. */
  tutorId: string | null
  status: AssignmentStatus
  matchScore: string | null
  reason: string | null
}

export interface FeedbackPayload {
  rating: number
  comment?: string
}

export interface FeedbackResult {
  assignmentId: string
  tutorId: string
  rating: number
  updatedTutorQuality: number
}

interface CandidatePageResponse<T> {
  page: number
  limit: number
  total: number
  data: T[]
}

export interface TutorCandidatePage {
  candidates: TutorCandidate[]
  total: number
  page: number
  limit: number
}

export interface StudentCandidatePage {
  candidates: StudentCandidate[]
  total: number
  page: number
  limit: number
}
