import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'student' | 'tutor' | 'admin'
  status: string
  region: string | null
  avatarUrl: string | null
  timezone: string | null
  language: string | null
  theme: string | null
  accentColor: string | null
  notificationPrefs: {
    sessionReminders?: boolean
    newMessages?: boolean
    sessionUpdates?: boolean
    marketingEmails?: boolean
    weeklyReports?: boolean
  } | null
  createdAt: string
  updatedAt: string
}

export interface StudentProfile {
  userId: string
  subjects: string[]
  requiredSubject: string
  gradeLevel: number
  examType: string
  bio: string | null
  learningGoals: string | null
  totalHoursLearned: string
  streakDays: number
  budget: string | null
  region: string | null
}

export interface TutorProfile {
  userId: string
  subjectsTaught: string[]
  gradeLevelsSupported: number[]
  examTypesSupported: string[]
  experienceYears: number
  hourlyRate: string
  capacity: number
  assignedCount: number
  avgRating: string | null
  ratingCount: number
  studentsCount: number
  bio: string | null
  region: string | null
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserProfile | null
  studentProfile: StudentProfile | null
  tutorProfile: TutorProfile | null

  // Setters
  setSession: (params: {
    accessToken: string
    refreshToken: string
    user: UserProfile
    studentProfile: StudentProfile | null
    tutorProfile: TutorProfile | null
  }) => void

  updateUser: (updates: Partial<UserProfile>) => void
  updateStudentProfile: (updates: Partial<StudentProfile>) => void
  updateTutorProfile: (updates: Partial<TutorProfile>) => void
  clearSession: () => void

  // Computed helpers
  isAuthenticated: () => boolean
  fullName: () => string
  initials: () => string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      studentProfile: null,
      tutorProfile: null,

      setSession: ({ accessToken, refreshToken, user, studentProfile, tutorProfile }) =>
        set({ accessToken, refreshToken, user, studentProfile, tutorProfile }),

      updateUser: (updates) =>
        set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),

      updateStudentProfile: (updates) =>
        set((s) => ({
          studentProfile: s.studentProfile ? { ...s.studentProfile, ...updates } : null,
        })),

      updateTutorProfile: (updates) =>
        set((s) => ({
          tutorProfile: s.tutorProfile ? { ...s.tutorProfile, ...updates } : null,
        })),

      clearSession: () =>
        set({ accessToken: null, refreshToken: null, user: null, studentProfile: null, tutorProfile: null }),

      isAuthenticated: () => !!get().accessToken && !!get().user,

      fullName: () => {
        const u = get().user
        return u ? `${u.firstName} ${u.lastName}` : ''
      },

      initials: () => {
        const u = get().user
        if (!u) return '?'
        return `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase()
      },
    }),
    {
      name: 'auth-store', // localStorage key — must match what axios.ts reads
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
        studentProfile: s.studentProfile,
        tutorProfile: s.tutorProfile,
      }),
    },
  ),
)
