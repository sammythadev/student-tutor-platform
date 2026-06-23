'use client'

import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  subject: string
  color: 'lavender' | 'sky' | 'mint' | 'sun' | 'coral' | 'tangerine'
  status: 'confirmed' | 'pending'
  isDragging?: boolean
}

interface CalendarGridProps {
  events: CalendarEvent[]
  onEventMove?: (eventId: string, newTime: string) => void
  onEventCreate?: (time: string, day: number) => void
  readOnly?: boolean
}

const ACCENT_COLORS = {
  lavender: 'bg-accent-lavender-bg text-accent-lavender-fg border-l-4 border-accent-lavender-fg',
  sky: 'bg-accent-sky-bg text-accent-sky-fg border-l-4 border-accent-sky-fg',
  mint: 'bg-accent-mint-bg text-accent-mint-fg border-l-4 border-accent-mint-fg',
  sun: 'bg-accent-sun-bg text-accent-sun-fg border-l-4 border-accent-sun-fg',
  coral: 'bg-accent-coral-bg text-accent-coral-fg border-l-4 border-accent-coral-fg',
  tangerine: 'bg-accent-tangerine-bg text-accent-tangerine-fg border-l-4 border-accent-tangerine-fg',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']

export function CalendarGrid({
  events,
  onEventMove,
  onEventCreate,
  readOnly = false,
}: CalendarGridProps) {
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const calendarRef = useRef<HTMLDivElement>(null)

  const getEventPosition = (event: CalendarEvent) => {
    const [startHour] = event.startTime.split(':').map(Number)
    const startIdx = TIMES.indexOf(`${String(startHour).padStart(2, '0')}:00`)
    return startIdx >= 0 ? startIdx : 0
  }

  const getEventHeight = (event: CalendarEvent) => {
    const [startHour] = event.startTime.split(':').map(Number)
    const [endHour] = event.endTime.split(':').map(Number)
    return Math.max(1, endHour - startHour)
  }

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    if (readOnly) return
    setDraggedEvent(eventId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, timeSlot: string) => {
    if (readOnly || !draggedEvent) return
    e.preventDefault()
    onEventMove?.(draggedEvent, timeSlot)
    setDraggedEvent(null)
  }

  const handleCellClick = (timeSlot: string, dayIdx: number) => {
    if (!readOnly && !draggedEvent) {
      onEventCreate?.(timeSlot, dayIdx)
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between p-4 glass-card rounded-2xl">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="p-2 hover:bg-surface/50 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Week of {new Date(new Date().setDate(new Date().getDate() + weekOffset * 7)).toLocaleDateString()}</h2>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="p-2 hover:bg-surface/50 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div ref={calendarRef} className="glass-card rounded-2xl p-4 overflow-x-auto">
        <div className="grid grid-cols-8 gap-1 min-w-max">
          {/* Time gutter */}
          <div className="col-span-1 space-y-2 pr-2 border-r border-border/30">
            <div className="h-12"></div>
            {TIMES.map((time) => (
              <div key={time} className="h-16 flex items-start justify-end pr-2 text-xs text-text-secondary font-medium">
                {time}
              </div>
            ))}
          </div>

          {/* Days */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="col-span-1">
              {/* Day header */}
              <div className="h-12 flex flex-col items-center justify-center border-b border-border/30 mb-2">
                <p className="text-xs font-semibold">{day}</p>
                <p className="text-xs text-text-secondary">{new Date(new Date().setDate(new Date().getDate() + weekOffset * 7 + dayIdx)).getDate()}</p>
              </div>

              {/* Time slots */}
              <div className="space-y-2">
                {TIMES.map((time) => {
                  const dayEvents = events.filter((e) => {
                    const eventStartHour = parseInt(e.startTime.split(':')[0])
                    const timeHour = parseInt(time.split(':')[0])
                    return eventStartHour === timeHour
                  })

                  return (
                    <div
                      key={`${day}-${time}`}
                      onClick={() => handleCellClick(time, dayIdx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, time)}
                      className={`h-16 border-2 border-dashed border-border/30 rounded-lg p-1 cursor-pointer transition-colors ${
                        !readOnly ? 'hover:border-primary/50 hover:bg-primary/5' : ''
                      }`}
                    >
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          draggable={!readOnly}
                          onDragStart={(e) => handleDragStart(e, event.id)}
                          className={`text-xs p-2 rounded border-l-4 cursor-move transition-all ${
                            ACCENT_COLORS[event.color]
                          } ${draggedEvent === event.id ? 'opacity-50' : ''}`}
                        >
                          <p className="font-semibold truncate">{event.title}</p>
                          <p className="text-xs opacity-75">{event.startTime}</p>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current time indicator */}
      <div className="flex items-center gap-2 text-xs text-text-secondary px-4">
        <Clock className="w-4 h-4" />
        <span>Drag events to reschedule. Click empty slots to create new availability.</span>
      </div>
    </div>
  )
}
