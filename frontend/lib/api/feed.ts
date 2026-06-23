import api from '@/lib/axios'

export async function getFeed(params?: { page?: number; limit?: number; filter?: string }) {
  const { data } = await api.get('/feed', { params })
  return data as FeedResponse
}

export async function createPost(payload: CreatePostPayload) {
  const { data } = await api.post('/feed', payload)
  return data as PostItem
}

export async function toggleLike(postId: string) {
  const { data } = await api.post(`/feed/${postId}/like`)
  return data as { liked: boolean; likesCount: number }
}

export interface PostItem {
  id: string
  authorId: string
  authorName: string
  authorRole: string
  authorAvatarUrl: string | null
  content: string
  tags: string[]
  attachments: Array<{ type: 'link' | 'book'; title: string; meta?: string; url?: string }> | null
  likesCount: number
  commentsCount: number
  isPromo: boolean
  likedByMe: boolean
  createdAt: string
}

export interface TrendingTopic {
  label: string
  postCount: number
}

export interface ActiveTutor {
  id: string
  name: string
  subjects: string[]
  avatarUrl: string | null
  avgRating: string | null
}

export interface FeedResponse {
  posts: PostItem[]
  total: number
  page: number
  limit: number
  trending: TrendingTopic[]
  activeTutors: ActiveTutor[]
}

export interface CreatePostPayload {
  content: string
  tags?: string[]
  attachments?: Array<{ type: 'link' | 'book'; title: string; meta?: string; url?: string }>
  isPromo?: boolean
}
