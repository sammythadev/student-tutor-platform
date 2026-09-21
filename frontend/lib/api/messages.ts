import api from '@/lib/axios'

export async function sendMessage(payload: { receiverId: string; content: string; replyToId?: string }) {
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

/** The original message a reply points at — enough to render a quote. */
export interface MessageReplyItem {
  id: string
  content: string
  senderId: string
  senderName?: string
}

export interface MessageItem {
  id: string
  senderId: string
  receiverId: string
  content: string
  /** Set when this message is a reply; `replyTo` carries the quote. */
  replyToId: string | null
  replyTo: MessageReplyItem | null
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
