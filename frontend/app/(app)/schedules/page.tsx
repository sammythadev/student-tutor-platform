'use client'

/**
 * Schedules — Apple Calendar × Academia
 * ────────────────────────────────────────
 * Skill: ui-ux-pro-max → Flat Design, #6366F1 Indigo, #10B981 Emerald CTA
 * Fixes:
 *   1. Drag-drop: chip drags disable block pointer-events so grid cells receive drops
 *   2. Dynamic row height: SLOT_H auto-expands if session content needs more space
 *   3. Legibility: bigger fonts, higher contrast, current-time red line, bolder labels
 *   4. Placeholder samples visible on first load
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Badge }  from '@/components/Badge'
import {
  ChevronLeft, ChevronRight, Plus, GripVertical, X,
  BookOpen, FlaskConical, Calculator, Globe2, Pencil, Music,
  CheckCircle2, AlertCircle, Clock,
} from 'lucide-react'

/* ════════════════════════════════
   CONSTANTS  (skill: flat design)
════════════════════════════════ */
const BASE_SLOT_H = 80    // minimum px per time-row
const GUTTER_W    = 60    // px — time label column
const EVT_INSET   = 4     // px gap inside each cell for blocks
const HEADER_H    = 64    // px — sticky day header row

/* ════════════════════════════════
   TYPES
════════════════════════════════ */
interface CalSession {
  id: number
  dayIdx: number
  slotIdx: number
  subject: string
  tutor: string
  color: AccentKey
  status: 'confirmed' | 'pending'
  durationSlots: number
}

type AccentKey = 'lavender' | 'sky' | 'mint' | 'sun' | 'coral' | 'tangerine'

/* ════════════════════════════════
   ACCENT TOKENS
════════════════════════════════ */
const AC: Record<AccentKey, { bg: string; fg: string; border: string }> = {
  lavender:  { bg: 'var(--accent-lavender-bg)',  fg: 'var(--accent-lavender-fg)',  border: '#6366F1' },
  sky:       { bg: 'var(--accent-sky-bg)',        fg: 'var(--accent-sky-fg)',        border: '#0EA5E9' },
  mint:      { bg: 'var(--accent-mint-bg)',        fg: 'var(--accent-mint-fg)',       border: '#10B981' },
  sun:       { bg: 'var(--accent-sun-bg)',         fg: 'var(--accent-sun-fg)',        border: '#D97706' },
  coral:     { bg: 'var(--accent-coral-bg)',       fg: 'var(--accent-coral-fg)',      border: '#EF4444' },
  tangerine: { bg: 'var(--accent-tangerine-bg)',  fg: 'var(--accent-tangerine-fg)',  border: '#EA580C' },
}

/* ════════════════════════════════
   STATIC DATA
════════════════════════════════ */
const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = ['8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM']

const CHIPS: { label: string; color: AccentKey; icon: React.ElementType }[] = [
  { label: 'Mathematics', color: 'lavender',  icon: Calculator   },
  { label: 'Physics',     color: 'sky',       icon: FlaskConical },
  { label: 'Literature',  color: 'sun',       icon: BookOpen     },
  { label: 'Languages',   color: 'mint',      icon: Globe2       },
  { label: 'Writing',     color: 'tangerine', icon: Pencil       },
  { label: 'Arts',        color: 'coral',     icon: Music        },
]

/* ════════════════════════════════
   HELPERS
════════════════════════════════ */
const getMonday = (d: Date) => {
  const dt = new Date(d)
  dt.setDate(dt.getDate() - (dt.getDay() + 6) % 7)
  dt.setHours(0, 0, 0, 0)
  return dt
}
const addDays = (d: Date, n: number) => {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt
}

/*
 * Dynamic slot height:
 * Each slot is BASE_SLOT_H by default.
 * If that slot has a session whose content needs more room,
 * we expand the row height proportionally.
 * Content need ≈ (number of lines of text × 18px) + padding
 */
function calcSlotH(slotIdx: number, sessions: CalSession[]): number {
  const sessionsInSlot = sessions.filter(s => s.slotIdx === slotIdx)
  if (sessionsInSlot.length === 0) return BASE_SLOT_H
  const maxLines = sessionsInSlot.reduce((acc, s) => {
    // subject (1 line) + tutor (1 line) + status (if >=2 slots) + small padding
    const lines = s.durationSlots >= 2 ? 3 : 2
    return Math.max(acc, lines)
  }, 1)
  const needed = maxLines * 20 + EVT_INSET * 3
  return Math.max(BASE_SLOT_H, needed)
}

/* cumulative top offset for a given slotIdx */
function slotTop(slotIdx: number, sessions: CalSession[]): number {
  let total = 0
  for (let i = 0; i < slotIdx; i++) total += calcSlotH(i, sessions)
  return total
}

/* ════════════════════════════════
   COMPONENT
════════════════════════════════ */
export default function SchedulesPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [sessions,  setSessions]  = useState<CalSession[]>([
    { id: 1, dayIdx: 0, slotIdx: 1,  subject: 'Mathematics', tutor: 'Dr. Sarah Chen',    color: 'lavender', status: 'confirmed', durationSlots: 2 },
    { id: 2, dayIdx: 2, slotIdx: 4,  subject: 'Physics',     tutor: 'Prof. James Wilson', color: 'sky',      status: 'pending',   durationSlots: 1 },
    { id: 3, dayIdx: 4, slotIdx: 6,  subject: 'Literature',  tutor: 'Ms. Emily Brown',   color: 'sun',      status: 'confirmed', durationSlots: 2 },
    { id: 4, dayIdx: 1, slotIdx: 2,  subject: 'Languages',   tutor: 'Ms. Vega',          color: 'mint',     status: 'confirmed', durationSlots: 1 },
    { id: 5, dayIdx: 3, slotIdx: 8,  subject: 'Arts',        tutor: 'Mr. Pascal',        color: 'coral',    status: 'pending',   durationSlots: 1 },
    { id: 6, dayIdx: 5, slotIdx: 3,  subject: 'Writing',     tutor: 'Ms. Brown',         color: 'tangerine',status: 'confirmed', durationSlots: 2 },
  ])

  /* drag state */
  const [draggingId,      setDraggingId]      = useState<number | null>(null)
  const [isDraggingChip,  setIsDraggingChip]  = useState(false)
  const [dropTarget,      setDropTarget]      = useState<{ d: number; s: number } | null>(null)
  const nextId = useRef(200)

  /* current time line */
  const [nowPct, setNowPct] = useState<number | null>(null)
  const [nowDay, setNowDay] = useState<number | null>(null)
  useEffect(() => {
    const update = () => {
      const now  = new Date()
      const wday = (now.getDay() + 6) % 7  // 0=Mon
      const h    = now.getHours() + now.getMinutes() / 60
      const start = 8   // HOURS starts at 8 AM
      const end   = 20  // HOURS ends at 8 PM
      if (h >= start && h < end) {
        setNowPct((h - start) / (end - start))
        setNowDay(wday)
      } else {
        setNowPct(null); setNowDay(null)
      }
    }
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [])

  /* navigation */
  const prevWeek = useCallback(() => setWeekStart(d => addDays(d, -7)), [])
  const nextWeek = useCallback(() => setWeekStart(d => addDays(d, +7)), [])
  const goToday  = useCallback(() => setWeekStart(getMonday(new Date())), [])

  /* ─── drag: existing session ─── */
  const onSessionDragStart = useCallback((e: React.DragEvent, id: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('type', 'session')
    e.dataTransfer.setData('id', String(id))
    setIsDraggingChip(false)
    setTimeout(() => setDraggingId(id), 0)
  }, [])

  /* ─── drag: chip palette ─── */
  const onChipDragStart = useCallback((e: React.DragEvent, label: string) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('type', 'chip')
    e.dataTransfer.setData('label', label)
    setIsDraggingChip(true)
  }, [])

  /* ─── drag over / leave ─── */
  const onDragOver = useCallback((e: React.DragEvent, d: number, s: number) => {
    e.preventDefault()
    setDropTarget({ d, s })
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
  }, [])

  /* ─── drop ─── */
  const onDrop = useCallback((e: React.DragEvent, dayIdx: number, slotIdx: number) => {
    e.preventDefault()
    setDropTarget(null)
    setIsDraggingChip(false)
    const type = e.dataTransfer.getData('type')

    if (type === 'session') {
      const id = Number(e.dataTransfer.getData('id'))
      setSessions(prev => prev.map(s => s.id === id ? { ...s, dayIdx, slotIdx } : s))
      setDraggingId(null)
    } else if (type === 'chip') {
      const label = e.dataTransfer.getData('label')
      const chip  = CHIPS.find(c => c.label === label)
      if (!chip) return
      setSessions(prev => {
        const occupied = prev.some(s => s.dayIdx === dayIdx && s.slotIdx === slotIdx)
        if (occupied) {
          // nudge to the next available slot in the same column
          let next = slotIdx + 1
          while (next < HOURS.length && prev.some(s => s.dayIdx === dayIdx && s.slotIdx === next)) next++
          if (next >= HOURS.length) return prev
          return [...prev, { id: nextId.current++, dayIdx, slotIdx: next, subject: chip.label, tutor: 'Tap to assign', color: chip.color, status: 'pending', durationSlots: 1 }]
        }
        return [...prev, { id: nextId.current++, dayIdx, slotIdx, subject: chip.label, tutor: 'Tap to assign', color: chip.color, status: 'pending', durationSlots: 1 }]
      })
    }
  }, [])

  const onDragEnd = useCallback(() => {
    setDraggingId(null)
    setIsDraggingChip(false)
    setDropTarget(null)
  }, [])

  const removeSession = useCallback((id: number) => setSessions(prev => prev.filter(s => s.id !== id)), [])

  /* ─── computed ─── */
  const today     = new Date()
  const weekLabel = `${addDays(weekStart, 0).toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const isToday   = (i: number) => addDays(weekStart, i).toDateString() === today.toDateString()

  /* total grid height = sum of all dynamic slot heights */
  const totalH = HOURS.reduce((acc, _, i) => acc + calcSlotH(i, sessions), 0)

  /* cumulative top positions for each slot (avoids re-computing) */
  const slotTops = HOURS.map((_, i) => slotTop(i, sessions))
  const slotHs   = HOURS.map((_, i) => calcSlotH(i, sessions))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 12 }}>

      {/* ══ PAGE HEADER ══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Schedule
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>
            Drag a subject from the palette below onto any time slot
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={goToday}>Today</Button>
          <Button size="sm">
            <Plus size={14} strokeWidth={2.5} /> Book Session
          </Button>
        </div>
      </div>

      {/* ══ CHIP PALETTE ══ */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '10px 16px',
        display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
        boxShadow: 'var(--shadow-xs)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginRight: 4, whiteSpace: 'nowrap' }}>
          Drag to schedule →
        </span>
        {CHIPS.map(chip => {
          const ac   = AC[chip.color]
          const Icon = chip.icon
          return (
            <div
              key={chip.label}
              draggable
              onDragStart={e => onChipDragStart(e, chip.label)}
              onDragEnd={onDragEnd}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 13px', borderRadius: 9,
                background: ac.bg, color: ac.fg,
                border: `1.5px solid ${ac.border}40`,
                fontSize: 12, fontWeight: 600,
                cursor: 'grab', userSelect: 'none',
                transition: 'opacity 120ms, box-shadow 120ms',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                whiteSpace: 'nowrap',
              }}
            >
              <GripVertical size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
              <Icon size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
              {chip.label}
            </div>
          )
        })}
      </div>

      {/* ══ CALENDAR CARD ══ */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '2px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={prevWeek} style={navBtnStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <span className="font-heading" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', minWidth: 210, textAlign: 'center' }}>
              {weekLabel}
            </span>
            <button onClick={nextWeek} style={navBtnStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} style={{ color: '#10B981' }} />
              Confirmed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={13} style={{ color: '#D97706' }} />
              Pending
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '72vh' }}>
          <div style={{ minWidth: GUTTER_W + DAYS.length * 110 }}>

            {/* Day headers — sticky */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `${GUTTER_W}px repeat(${DAYS.length}, 1fr)`,
              position: 'sticky', top: 0, zIndex: 30,
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ height: HEADER_H, background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }} />
              {DAYS.map((day, i) => {
                const date    = addDays(weekStart, i)
                const todayHl = isToday(i)
                return (
                  <div key={i} style={{
                    height: HEADER_H,
                    borderLeft: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4,
                    background: todayHl ? 'var(--primary-subtle)' : 'var(--surface)',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: todayHl ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {day}
                    </span>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: todayHl ? 'var(--primary)' : 'transparent',
                      color: todayHl ? '#fff' : 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                      boxShadow: todayHl ? '0 3px 12px rgba(99,102,241,0.45)' : 'none',
                      transition: 'all 150ms',
                    }}>
                      {date.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ══════════════════════════════════════════════════════
             *  TWO-LAYER GRID BODY
             *  Layer 1: transparent grid cells — drop targets only
             *  Layer 2: absolute overlay — session block rendering
             *
             *  KEY FIX: when isDraggingChip=true, all session
             *  blocks get pointerEvents:'none' so chip drags
             *  fall through to the grid cells below.
             * ══════════════════════════════════════════════════════ */}
            <div style={{ position: 'relative' }}>

              {/* ── LAYER 1: Drop-target cells ── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `${GUTTER_W}px repeat(${DAYS.length}, 1fr)`,
              }}>
                {HOURS.map((hour, hIdx) => {
                  const rowH = slotHs[hIdx]
                  return (
                    <React.Fragment key={hIdx}>
                      {/* Hour label */}
                      <div style={{
                        height: rowH,
                        borderBottom: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'flex-end',
                        paddingRight: 8, paddingTop: 7,
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                        color: 'var(--text-secondary)',     // skill: darker for contrast
                      }}>
                        {hour}
                      </div>

                      {/* Day cells */}
                      {DAYS.map((_, dIdx) => {
                        const isTarget  = dropTarget?.d === dIdx && dropTarget?.s === hIdx
                        const stripe    = dIdx % 2 === 0 ? 'var(--surface)' : 'var(--canvas)'
                        return (
                          <div
                            key={dIdx}
                            onDragOver={e => onDragOver(e, dIdx, hIdx)}
                            onDragLeave={onDragLeave}
                            onDrop={e => onDrop(e, dIdx, hIdx)}
                            style={{
                              height: rowH,
                              borderBottom: '1px solid var(--border)',
                              borderLeft: '1px solid var(--border)',
                              background: isTarget ? 'var(--primary-subtle)' : stripe,
                              outline: isTarget ? '2px dashed var(--primary)' : 'none',
                              outlineOffset: -2,
                              transition: 'background 80ms',
                              position: 'relative',
                            }}
                          >
                            {isTarget && (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}>
                                  <Plus size={13} strokeWidth={3} />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>

              {/* ── LAYER 2: Session blocks overlay ── */}
              <div style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: totalH,
                display: 'grid',
                gridTemplateColumns: `${GUTTER_W}px repeat(${DAYS.length}, 1fr)`,
                pointerEvents: 'none',
              }}>
                {/* Gutter spacer */}
                <div />

                {/* One column per day */}
                {DAYS.map((_, dIdx) => (
                  <div key={dIdx} style={{ position: 'relative', height: totalH }}>

                    {/* Current time indicator */}
                    {nowDay === dIdx && nowPct !== null && (
                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${nowPct * 100}%`, zIndex: 20, pointerEvents: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                          <div style={{ flex: 1, height: 1.5, background: '#EF4444', opacity: 0.8 }} />
                        </div>
                      </div>
                    )}

                    {sessions
                      .filter(s => s.dayIdx === dIdx)
                      .map(sess => {
                        const ac         = AC[sess.color]
                        const isDragging  = draggingId === sess.id
                        const blockTop    = slotTops[sess.slotIdx] + EVT_INSET
                        const blockH      = sess.durationSlots > 1
                          /* multi-slot: span across slot heights dynamically */
                          ? Array.from({ length: sess.durationSlots }, (_, i) => slotHs[sess.slotIdx + i] ?? slotHs[sess.slotIdx]).reduce((a, b) => a + b, 0) - EVT_INSET * 2
                          /* single slot: fill current row */
                          : slotHs[sess.slotIdx] - EVT_INSET * 2
                        const isShort    = blockH < 44

                        return (
                          <div
                            key={sess.id}
                            draggable
                            onDragStart={e => onSessionDragStart(e, sess.id)}
                            onDragEnd={onDragEnd}
                            style={{
                              position: 'absolute',
                              top: blockTop,
                              left: EVT_INSET, right: EVT_INSET,
                              height: blockH,
                              background: ac.bg,
                              borderLeft: `4px solid ${ac.border}`,
                              borderRadius: 10,
                              overflow: 'hidden',
                              /*
                               * KEY FIX: while dragging a chip, blocks are
                               * transparent to pointer events → chips drop on grid cells.
                               * While dragging a session, normal pointer events for drag.
                               */
                              pointerEvents: isDraggingChip ? 'none' : 'all',
                              cursor: 'grab',
                              userSelect: 'none',
                              opacity: isDragging ? 0.42 : 1,
                              transform: isDragging ? 'scale(1.03)' : 'scale(1)',
                              transition: 'opacity 150ms, transform 150ms, box-shadow 150ms',
                              boxShadow: isDragging
                                ? `0 10px 28px ${ac.border}44`
                                : `0 2px 6px ${ac.border}22`,
                              display: 'flex', flexDirection: 'column',
                              padding: isShort ? '3px 8px' : '7px 10px',
                            }}
                          >
                            {/* Remove button */}
                            <button
                              onClick={e => { e.stopPropagation(); removeSession(sess.id) }}
                              style={{
                                position: 'absolute', top: 4, right: 4,
                                width: 18, height: 18, borderRadius: '50%',
                                border: 'none', background: ac.border + '22',
                                color: ac.fg, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, transition: 'background 150ms, opacity 150ms',
                                pointerEvents: isDraggingChip ? 'none' : 'all',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = ac.border + '55')}
                              onMouseLeave={e => (e.currentTarget.style.background = ac.border + '22')}
                            >
                              <X size={10} strokeWidth={2.5} />
                            </button>

                            {/* Subject — skill: text-gray-900 contrast, 1.3 line-height */}
                            <p style={{
                              margin: 0,
                              fontSize: isShort ? 11 : 12,
                              fontWeight: 800,
                              lineHeight: 1.3,
                              color: ac.fg,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              paddingRight: 18,
                            }}>
                              {sess.subject}
                            </p>

                            {/* Tutor */}
                            {!isShort && (
                              <p style={{
                                margin: '3px 0 0',
                                fontSize: 11, fontWeight: 500,
                                lineHeight: 1.4,
                                color: ac.fg, opacity: 0.75,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                              }}>
                                {sess.tutor}
                              </p>
                            )}

                            {/* Status + time */}
                            {sess.durationSlots >= 2 && (
                              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                                {sess.status === 'confirmed'
                                  ? <CheckCircle2 size={10} style={{ color: ac.fg, flexShrink: 0 }} />
                                  : <AlertCircle  size={10} style={{ color: ac.fg, flexShrink: 0 }} />
                                }
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: ac.fg, opacity: 0.85 }}>
                                  {sess.status}
                                </span>
                                <span style={{ marginLeft: 'auto', fontSize: 10, color: ac.fg, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Clock size={9} />
                                  {HOURS[sess.slotIdx]}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ SESSION LIST ══ */}
      {sessions.length > 0 && (
        <div>
          <h2 className="font-heading" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            This Week&apos;s Sessions <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>({sessions.length})</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {sessions.map(sess => {
              const ac = AC[sess.color]
              return (
                <div key={sess.id} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${ac.border}`,
                  borderRadius: 13,
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'box-shadow 150ms, transform 150ms',
                  cursor: 'default',
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'none' }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: ac.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {sess.status === 'confirmed'
                      ? <CheckCircle2 size={15} style={{ color: ac.fg }} />
                      : <AlertCircle  size={15} style={{ color: ac.fg }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {sess.subject}
                    </p>
                    <p style={{ margin: '2px 0 6px', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.5 }}>
                      {sess.tutor}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={11} /> {DAYS[sess.dayIdx]} · {HOURS[sess.slotIdx]}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSession(sess.id)}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-coral-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── shared nav button style ── */
const navBtnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: '50%',
  border: 'none', background: 'transparent',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text-secondary)',
  transition: 'background 150ms',
}
