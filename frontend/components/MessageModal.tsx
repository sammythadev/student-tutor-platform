'use client'

import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import { sendMessage, getConversation, type MessageItem } from '@/lib/api/messages'
import { apiErrorText } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/store/authStore'
import { Send, CheckCircle2, CheckCheck, MessageSquare } from 'lucide-react'

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
    let alive = true
    setLoading(true)
    setError(null)
    getConversation(otherUserId)
      .then(data => { if (alive) setMessages(data) })
      .catch(err => { if (alive) setError(apiErrorText(err)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
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
    } catch (err) {
      setError(apiErrorText(err))
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
          <div
            className="mb-2 rounded-lg px-3 py-2 text-xs"
            role="alert"
            style={{ background: 'var(--accent-coral-bg)', color: 'var(--accent-coral-fg)' }}
          >
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 mb-3 px-1">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className="h-12 w-[62%] animate-pulse rounded-xl"
                    style={{ background: 'var(--surface-2)' }}
                  />
                </div>
              ))}
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <MessageSquare className="h-7 w-7" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No messages yet</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Send the first message to {otherUserName}.
              </p>
            </div>
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
                  <p
                    className="tabular mt-0.5 flex items-center gap-1 text-[10px]"
                    style={{ color: isMine ? 'var(--primary-fg)' : 'var(--text-muted)', opacity: isMine ? 0.72 : 1 }}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMine && msg.readAt && (
                      <>
                        <CheckCheck className="h-3 w-3" aria-hidden="true" />
                        <span>Read</span>
                      </>
                    )}
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
          <Button size="md" onClick={handleSend} loading={sending} disabled={!content.trim()} aria-label="Send message">
            <Send className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Modal>
  )
}
