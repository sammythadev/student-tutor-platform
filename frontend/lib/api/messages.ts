import api from '@/lib/axios'

export async function sendMessage(payload: { receiverId: string; content: string }) {
  const { data } = await api.post('/messages', payload)
  return data as MessageItem
}

export async function getConversations() {
  const { data } = await api.get('/messages/conversations')
  return data as ConversationItem[]
}

export async function getConversation(userId: string) {
  const { data } = await api.get(`/messages/${userId}`)
  return data as MessageItem[]
}

export async function markRead(userId: string) {
  await api.patch(`/messages/${userId}/read`)
}

export interface MessageItem {
  id: string
  senderId: string
  receiverId: string
  content: string
  readAt: string | null
  createdAt: string
  senderName?: string
  senderIsVerified?: boolean
}

export interface ConversationItem {
  userId: string
  firstName: string
  lastName: string
  lastMessage: string
  lastMessageAt: string
  unreadCount?: number
}
