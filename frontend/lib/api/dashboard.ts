import api from '@/lib/axios'

export async function getDashboardMetrics() {
  const { data } = await api.get('/dashboard/metrics')
  return data as DashboardMetrics
}

export async function getTutorDashboardMetrics() {
  const { data } = await api.get('/dashboard/tutor-metrics')
  return data as TutorDashboardMetrics
}

export async function getAdminMetrics() {
  const { data } = await api.get('/dashboard/admin-metrics')
  return data as AdminMetrics
}

export interface KpiItem {
  label: string
  value: string
  trend: string
  isUp: boolean
  color: string
  deltaPct: number | null
}

export interface WeeklyBar {
  day: string
  hours: number
}

export interface ChannelPoint {
  day: string
  completed: number
  booked: number
}

export interface EarningsPoint {
  day: string
  amount: number
}

export interface ActivityItem {
  id: string
  title: string
  type: string
  createdAt: string
}

export interface RecentSession {
  id: string
  subject: string
  counterpart: string
  startAt: string
  status: string
  hours: number
}

export interface SubjectDistribution {
  subject: string
  count: number
  hours: number
}

export interface UpcomingSession {
  id: string
  subject: string
  tutorName: string
  studentName: string
  avatarUrl: string | null
  startAt: string
  endAt: string
  status: string
  meetingUrl: string | null
}

export interface DashboardMetrics {
  kpis: KpiItem[]
  weeklyBars: WeeklyBar[]
  upcomingSessions: UpcomingSession[]
  streakDays: number
  totalHoursLearned: string
  channelSeries: ChannelPoint[]
  activity: ActivityItem[]
  recentSessions: RecentSession[]
  subjectDistribution: SubjectDistribution[]
}

export interface TutorDashboardMetrics {
  kpis: KpiItem[]
  weeklyBars: WeeklyBar[]
  upcomingSessions: UpcomingSession[]
  studentsCount: number
  avgRating: string | null
  channelSeries: ChannelPoint[]
  earningsSeries: EarningsPoint[]
  activity: ActivityItem[]
  recentSessions: RecentSession[]
  subjectDistribution: SubjectDistribution[]
}

export interface AdminMetrics {
  totalUsers: number
  activeSessions: number
  openIssues: number
  avgRating: string | null
}
