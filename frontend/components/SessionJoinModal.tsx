'use client'

import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { updateSessionStatus, type SessionItem } from '@/lib/api/sessions'
import { CheckCircle2, ExternalLink, Mic, MicOff, Video, VideoOff, Monitor, Users } from 'lucide-react'

const HARDCODED_MEET_LINK = 'https://meet.google.com/abc-defg-hij'

interface SessionJoinModalProps {
  isOpen: boolean
  onClose: () => void
  session: SessionItem
  onAttended: (session: SessionItem) => void
}

export function SessionJoinModal({ isOpen, onClose, session, onAttended }: SessionJoinModalProps) {
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [joining, setJoining] = useState(false)
  const [attending, setAttending] = useState(false)
  const [joined, setJoined] = useState(false)

  const meetUrl = session.meetingUrl || HARDCODED_MEET_LINK

  const handleJoin = () => {
    setJoining(true)
    setJoined(true)
    window.open(meetUrl, '_blank', 'noopener,noreferrer')
    setTimeout(() => setJoining(false), 500)
  }

  const handleMarkAttended = async () => {
    setAttending(true)
    try {
      const updated = await updateSessionStatus(session.id, 'completed')
      onAttended(updated)
      onClose()
    } catch {
      // silent
    } finally {
      setAttending(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Session" size="md">
      <div className="space-y-5">
        {/* Mock meeting interface */}
        <div className="relative overflow-hidden rounded-2xl" style={{ background: 'var(--surface-2)' }}>
          <div className="aspect-video flex flex-col items-center justify-center gap-3 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold" style={{ background: 'var(--accent-lavender-bg)', color: 'var(--accent-lavender-fg)' }}>
              {session.subject.slice(0, 2).toUpperCase()}
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{session.subject}</p>
            <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              <Users className="h-3.5 w-3.5" /> 2 participants
            </div>
          </div>

          {/* Overlay controls */}
          {!joined && (
            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <Button size="lg" onClick={handleJoin} loading={joining}>
                <ExternalLink className="h-4 w-4" /> Join Meeting
              </Button>
            </div>
          )}
        </div>

        {/* Meeting info */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Meeting Link</p>
          <a href={meetUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold break-all transition-colors hover:opacity-80"
            style={{ color: 'var(--primary)' }}>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            {meetUrl}
          </a>
        </div>

        {/* Device controls (mock) */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setMicOn(!micOn)}
            className="flex h-12 w-12 items-center justify-center rounded-xl transition-all cursor-pointer"
            style={{ background: micOn ? 'var(--surface-2)' : 'var(--accent-coral-bg)', color: micOn ? 'var(--text-primary)' : 'var(--accent-coral-fg)' }}>
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button onClick={() => setCamOn(!camOn)}
            className="flex h-12 w-12 items-center justify-center rounded-xl transition-all cursor-pointer"
            style={{ background: camOn ? 'var(--surface-2)' : 'var(--accent-coral-bg)', color: camOn ? 'var(--text-primary)' : 'var(--accent-coral-fg)' }}>
            {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl cursor-pointer" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
            <Monitor className="h-5 w-5" />
          </div>
        </div>

        {/* Mark as attended */}
        {joined && (
          <Button size="md" className="w-full" onClick={handleMarkAttended} loading={attending}>
            <CheckCircle2 className="h-4 w-4" /> Mark as Attended
          </Button>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Cancel</Button>
          {joined && (
            <Button variant="secondary" size="md" className="flex-1" onClick={handleJoin}>
              <ExternalLink className="h-4 w-4" /> Rejoin
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
