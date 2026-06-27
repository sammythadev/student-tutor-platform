'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import {
  getConversations,
  getConversation,
  sendMessage,
  markRead,
  type ConversationItem,
  type MessageItem,
} from '@/lib/api/messages'
import { Send, ArrowLeft, MessageSquare } from 'lucide-react'

export default function MessagesPage() {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [selectedConvo, setSelectedConvo] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = () => {
    getConversations()
      .then(setConversations)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 15000)
    return () => clearInterval(interval)
  }, [])

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
      // Rollback on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setNewMessage(text)
    }
  }

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Sidebar — Conversations */}
      <div
        className={`${selectedConvo ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r`}
        style={{ borderColor: 'var(--border)', background: 'var(--canvas)' }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-xl font-bold text-text-primary">Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex gap-3 border-b border-transparent">
                <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-1/2 rounded animate-pulse" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: 'var(--surface-2)' }} />
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted p-8 text-center space-y-4">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">You have no active conversations yet. Find a tutor to start a chat!</p>
            </div>
          ) : (
            conversations.map((convo) => (
              <button
                key={convo.userId}
                onClick={() => setSelectedConvo(convo)}
                className="w-full text-left p-4 flex gap-3 border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  borderColor: 'var(--border)',
                  background: selectedConvo?.userId === convo.userId ? 'var(--primary-subtle)' : 'transparent',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                  style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun-fg)' }}
                >
                  {convo.firstName[0]}
                  {convo.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-semibold text-text-primary truncate pr-2">
                      {convo.firstName} {convo.lastName}
                    </span>
                    <span className="text-[10px] text-text-muted flex-shrink-0">
                      {new Date(convo.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-text-secondary truncate block flex-1">
                      {convo.lastMessage}
                    </span>
                    {convo.unreadCount ? (
                      <span className="flex-shrink-0 bg-accent-coral-fg text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {convo.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main — Chat Interface */}
      <div className={`${!selectedConvo ? 'hidden md:flex' : 'flex'} flex-1 flex-col relative`}>
        {selectedConvo ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b flex items-center px-4 gap-3 shrink-0" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setSelectedConvo(null)}
                className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: 'var(--accent-sun-bg)', color: 'var(--accent-sun-fg)' }}
              >
                {selectedConvo.firstName[0]}
                {selectedConvo.lastName[0]}
              </div>
              <div>
                <h3 className="font-bold text-text-primary">
                  {selectedConvo.firstName} {selectedConvo.lastName}
                </h3>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?.id
                const showTime =
                  i === 0 ||
                  new Date(msg.createdAt).getTime() - new Date(messages[i - 1].createdAt).getTime() > 10 * 60 * 1000

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showTime && (
                      <div className="text-[10px] text-text-muted mb-2 w-full text-center">
                        {new Date(msg.createdAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-primary text-primary-fg rounded-br-sm'
                          : 'bg-surface-2 text-text-primary rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--canvas)' }}>
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-3 rounded-xl bg-primary text-primary-fg disabled:opacity-50 transition-all flex items-center justify-center shrink-0 hover:opacity-90"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              <MessageSquare className="w-8 h-8 opacity-50" />
            </div>
            <div>
              <p className="font-medium text-text-primary mb-1">Your Messages</p>
              <p className="text-sm">Select a conversation from the sidebar to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
