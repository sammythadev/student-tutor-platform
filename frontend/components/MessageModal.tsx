'use client'

import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import { sendMessage, getConversation, type MessageItem } from '@/lib/api/messages'
import { useAuthStore } from '@/lib/store/authStore'
import { Send, CheckCircle2 } from 'lucide-react'

interface MessageModalProps {
  isOpen: boolean
  onClose: () => void
  otherUserId: string
  otherUserName: string
  otherUserVerified?: boolean
}

export function MessageModal({
  isOpen, onClose, otherUserId, otherUserName, otherUserVerified,
}: MessageModalProps) {
  const currentUser = useAuthStore(s => s.user)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !otherUserId) return
    setLoading(true)
    setError(null)
    getConversation(otherUserId)
      .then(data => setMessages(data))
      .catch(err => setError(err?.response?.data?.message ?? 'Could not load messages'))
      .finally(() => setLoading(false))
  }, [isOpen, otherUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!content.trim()) return
    setSending(true)
    try {
      const msg = await sendMessage({ receiverId: otherUserId, content: content.trim() })
      setMessages(prev => [...prev, msg])
      setContent('')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={
      <span>
        {otherUserName}
        {otherUserVerified && <CheckCircle2 className="w-3.5 h-3.5 inline ml-1 text-accent-mint-fg" />}
      </span>
    } size="lg">
      <div className="flex flex-col h-[400px]">
        {error && (
          <div className="p-2 rounded-lg text-xs mb-2" style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}>
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 mb-3 px-1">
          {loading && (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl" style={{ background: 'var(--surface-2)', width: i % 2 === 0 ? '60%' : '40%', marginLeft: i % 2 === 0 ? 0 : 'auto' }} />)}</div>
          )}

          {!loading && messages.length === 0 && (
            <p className="text-sm text-text-secondary text-center py-8">No messages yet. Say hello!</p>
          )}

          {messages.map(msg => {
            const isMine = msg.senderId === currentUser?.id
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                  style={{
                    background: isMine ? 'var(--primary)' : 'var(--surface-2)',
                    color: isMine ? 'var(--primary-fg)' : 'var(--text-primary)',
                  }}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-0.5 ${isMine ? 'text-white/60' : 'text-text-muted'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.readAt && isMine && <span className="ml-1">✓ Read</span>}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="Type a message..."
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            />
          </div>
          <Button size="md" onClick={handleSend} loading={sending} disabled={!content.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Modal>
  )
}
