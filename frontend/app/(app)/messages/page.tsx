'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import {
  getConversations,
  getConversation,
  sendMessage,
  markRead,
  type ConversationItem,
  type MessageItem,
} from '@/lib/api/messages'
import { ArrowLeft, Check, CheckCheck, Image, MessageSquare, Paperclip, Send, Smile } from 'lucide-react'

export default function MessagesPage() {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [selectedConvo, setSelectedConvo] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadConversations = useCallback(() => {
    getConversations()
      .then(setConversations)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 15000)
    return () => clearInterval(interval)
  }, [loadConversations])

  useEffect(() => {
    if (!selectedConvo) return
    const loadMessages = () => {
      getConversation(selectedConvo.userId).then((data) => {
        setMessages(data)
        if (selectedConvo.unreadCount && selectedConvo.unreadCount > 0) {
          markRead(selectedConvo.userId).then(() => {
            setConversations((prev) =>
              prev.map((c) =>
                c.userId === selectedConvo.userId ? { ...c, unreadCount: 0 } : c
              )
            )
          })
        }
      })
    }
    loadMessages()
    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  }, [selectedConvo])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConvo) return
    const text = newMessage.trim()
    setNewMessage('')
    inputRef.current?.focus()
    
    // Optimistic UI
    const optimisticMsg: MessageItem = {
      id: Date.now().toString(),
      senderId: user?.id || '',
      receiverId: selectedConvo.userId,
      content: text,
      readAt: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])
    
    try {
      const saved = await sendMessage({ receiverId: selectedConvo.userId, content: text })
      setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? saved : m)))
      loadConversations()
    } catch (error) {
      console.error('Failed to send message', error)
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setNewMessage(text)
    }
  }

  const formatMsgTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const shouldShowDateSeparator = (i: number, msgs: MessageItem[]) => {
    if (i === 0) return true
    const prev = new Date(msgs[i - 1].createdAt)
    const curr = new Date(msgs[i].createdAt)
    return prev.toDateString() !== curr.toDateString()
  }

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString()
    if (isToday) return 'Today'
    if (isYesterday) return 'Yesterday'
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Sidebar — Conversations */}
      <div
        className={`${selectedConvo ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r`}
        style={{ borderColor: 'var(--border)', background: 'var(--canvas)' }}
      >
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Messages</h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{conversations.length} conversations</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 border-b p-4" style={{ borderColor: 'var(--border)' }}>
                <div className="h-12 w-12 animate-pulse rounded-full" style={{ background: 'var(--surface-2)' }} />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-1/2 animate-pulse rounded" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-3 w-3/4 animate-pulse rounded" style={{ background: 'var(--surface-2)' }} />
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--surface-2)' }}>
                <MessageSquare className="h-7 w-7 opacity-50" />
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>No conversations</p>
                <p className="mt-1 text-xs">Find a tutor to start a chat</p>
              </div>
            </div>
          ) : (
            conversations.map((convo) => {
              const isSelected = selectedConvo?.userId === convo.userId
              return (
                <button
                  key={convo.userId}
                  onClick={() => setSelectedConvo(convo)}
                  className="group w-full border-b p-4 text-left transition-all duration-200"
                  style={{
                    borderColor: 'var(--border)',
                    background: isSelected ? 'var(--primary-subtle)' : 'transparent',
                  }}
                >
                  <div className="flex gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold" style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun-fg)' }}>
                        {convo.firstName[0]}{convo.lastName[0]}
                      </div>
                      {convo.unreadCount ? (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-coral-fg text-[9px] font-bold text-white ring-2" style={{ ringColor: 'var(--surface)' }}>
                          {convo.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="truncate pr-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {convo.firstName} {convo.lastName}
                        </span>
                        <span className="shrink-0 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                          {new Date(convo.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="block flex-1 truncate text-xs" style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {convo.lastMessage}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Main — Chat Interface */}
      <div className={`${!selectedConvo ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConvo ? (
          <>
            {/* Chat Header */}
            <div className="flex h-16 shrink-0 items-center gap-3 border-b px-5" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setSelectedConvo(null)} className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-2 md:hidden" style={{ color: 'var(--text-secondary)' }}>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun-fg)' }}>
                {selectedConvo.firstName[0]}{selectedConvo.lastName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {selectedConvo.firstName} {selectedConvo.lastName}
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Active now</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-1 p-5" style={{ background: 'var(--canvas)' }}>
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?.id
                const showDateSep = shouldShowDateSeparator(i, messages)
                const showTime = i === messages.length - 1 || new Date(messages[i + 1]?.createdAt).getTime() - new Date(msg.createdAt).getTime() > 10 * 60 * 1000

                return (
                  <div key={msg.id}>
                    {showDateSep && (
                      <div className="py-3 text-center">
                        <span className="inline-block rounded-full px-3 py-1 text-[10px] font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} px-1`}>
                      <div className={`max-w-[75%] group relative ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm transition-all ${
                            isMe
                              ? 'rounded-br-sm bg-primary text-primary-fg'
                              : 'rounded-bl-sm text-text-primary'
                          }`}
                          style={!isMe ? { background: 'var(--surface-2)' } : undefined}
                        >
                          {msg.content}
                        </div>
                        <div className={`mt-0.5 flex items-center gap-1.5 px-1 opacity-0 transition-opacity group-hover:opacity-100 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                          {showTime && (
                            <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
                              {formatMsgTime(msg.createdAt)}
                            </span>
                          )}
                          {isMe && (
                            msg.readAt
                              ? <CheckCheck className="h-3 w-3" style={{ color: 'var(--accent-mint-fg)' }} />
                              : <Check className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {typingUsers.size > 0 && (
                <div className="flex items-start px-1">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: 'var(--surface-2)' }}>
                    <span className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full" style={{ background: 'var(--text-muted)', animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full" style={{ background: 'var(--text-muted)', animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full" style={{ background: 'var(--text-muted)', animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4" style={{ borderColor: 'var(--border)', background: 'var(--canvas)' }}>
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <div className="flex flex-1 items-end gap-1 rounded-xl border px-3 py-2 transition-shadow focus-within:shadow-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-surface-2" style={{ color: 'var(--text-muted)' }}>
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="min-h-[40px] flex-1 bg-transparent px-2 text-sm outline-none"
                    style={{ color: 'var(--text-primary)' }}
                    autoFocus
                  />
                  <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-surface-2" style={{ color: 'var(--text-muted)' }}>
                    <Smile className="h-4 w-4" />
                  </button>
                  <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-surface-2" style={{ color: 'var(--text-muted)' }}>
                    <Image className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--surface-2)' }}>
              <MessageSquare className="h-8 w-8 opacity-50" />
            </div>
            <div>
              <p className="mb-1 font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Your Messages</p>
              <p className="text-sm">Select a conversation from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
