'use client'

/**
 * =============================================================================
 *  ADMIN FLIGHT PLANNER (Apple Calendar–style dark theme)
 * =============================================================================
 *
 *  Drag-to-select time range, assign student, set price/type/syllabus lesson.
 *  All existing logic preserved; styling updated to dark theme with:
 *  - Dark gradient card (bg-white/[0.04] backdrop-blur-xl)
 *  - Gold accent for selection (golden = #FFBF00)
 *  - Training = green-500/20, Discovery = blue-500/20 (semi-transparent)
 * =============================================================================
 */

import { Fragment, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type SlotView = {
  id: string
  start_time: string
  end_time: string
  is_booked: boolean
  type: string
  description?: string | null
  price?: number
}

type StudentOption = {
  userId: string
  fullName: string
  email: string
}

type PlannerProps = {
  slots: SlotView[]
  onCreated?: () => void | Promise<void>
}

// ─── Constants ────────────────────────────────────────────────────────────

const SLOT_MINS = 15
const START_HOUR = 6
const END_HOUR = 21
const ROWS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINS
const HOUR_HEIGHT = 56
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Helpers ──────────────────────────────────────────────────────────

const normalizeName = (v: string | null | undefined) =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : ''

const normalizeEmail = (v: string | null | undefined) =>
  typeof v === 'string' ? v.trim().toLowerCase() : ''

const deriveNameFromEmail = (email: string) => {
  const words = email.split('@')[0].replace(/[^a-z0-9._-]/gi, '').split(/[._-]+/).filter(Boolean)
  return words.length === 0 ? 'Student' : words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const startOfWeek = (date: Date) => {
  const copy = new Date(date)
  const diff = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const addDays = (date: Date, days: number) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const isSameDay = (a: Date, b: Date) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const fmtHHMM = (date: Date) =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const rowToTime = (day: Date, row: number) => {
  const d = new Date(day)
  d.setHours(START_HOUR, row * SLOT_MINS, 0, 0)
  return d
}

const timeToRow = (date: Date) => {
  const totalMins = (date.getHours() - START_HOUR) * 60 + date.getMinutes()
  if (totalMins < 0 || totalMins >= (END_HOUR - START_HOUR) * 60) return -1
  return Math.floor(totalMins / SLOT_MINS)
}

// ─── Component ────────────────────────────────────────────────────────────

export default function AdminBookingPlanner({ slots, onCreated }: PlannerProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [students, setStudents] = useState<StudentOption[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [now, setNow] = useState<Date>(() => new Date())

  // Tick every minute so the red "current time" indicator moves
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // drag state
  const [dragDay, setDragDay] = useState<number | null>(null)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)

  // form state
  const [selStart, setSelStart] = useState<Date | null>(null)
  const [selEnd, setSelEnd] = useState<Date | null>(null)
  const [studentId, setStudentId] = useState('')
  const [slotType, setSlotType] = useState<'training' | 'tour'>('training')
  const [priceDisplay, setPriceDisplay] = useState('120.00')
  const [description, setDescription] = useState('')
  const [syllabusLessons, setSyllabusLessons] = useState<{ id: string; lesson_number: number; title: string; stage: string }[]>([])
  const [syllabusId, setSyllabusId] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null)

  // ── Data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true)
      try {
        const { data, error } = await supabase
          .from('students')
          .select('user_id, full_name, email')
          .not('user_id', 'is', null)
          .order('full_name', { ascending: true })

        if (error) throw error

        const deduped = new Map<string, StudentOption>()
        ;(data || []).forEach((row: any) => {
          const userId = row.user_id as string | null
          if (!userId) return
          const email = normalizeEmail(row.email)
          const fullName = normalizeName(row.full_name)
          const fallback = email ? deriveNameFromEmail(email) : 'Student'
          const candidate: StudentOption = {
            userId,
            email: email || '',
            fullName: fullName && !fullName.includes('@') ? fullName : fallback,
          }
          const existing = deduped.get(userId)
          if (!existing || (existing.fullName === 'Student' && candidate.fullName !== 'Student')) {
            deduped.set(userId, candidate)
          }
        })

        const values = Array.from(deduped.values()).sort((a, b) => a.fullName.localeCompare(b.fullName))
        setStudents(values)
        if (!studentId && values.length > 0) setStudentId(values[0].userId)
      } catch (err) {
        console.error('Error loading students:', err)
      } finally {
        setLoadingStudents(false)
      }
    }
    void fetchStudents()
  }, [])

  useEffect(() => {
    supabase
      .from('syllabus_lessons')
      .select('id, lesson_number, title, stage')
      .order('lesson_number', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setSyllabusLessons(data)
      })
  }, [])

  // ── Computed ─────────────────────────────────────────────────────────────

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const slotsByDay = useMemo(() => {
    const map = new Map<string, SlotView[]>()
    weekDays.forEach(d => map.set(toLocalDateKey(d), []))
    slots.forEach(slot => {
      const key = toLocalDateKey(new Date(slot.start_time))
      if (map.has(key)) map.get(key)!.push(slot)
    })
    return map
  }, [slots, weekDays])

  const headerLabel = useMemo(() => {
    const mid = weekDays[3] ?? weekDays[0]
    return mid.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }, [weekDays])

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const onMouseDown = (dayIdx: number, row: number) => {
    setStatus(null)
    setDragDay(dayIdx)
    setDragStart(row)
    setDragEnd(row)
  }

  const onMouseEnter = (dayIdx: number, row: number) => {
    if (dragDay === null || dragDay !== dayIdx) return
    setDragEnd(row)
  }

  const onMouseUp = () => {
    if (dragDay === null || dragStart === null || dragEnd === null) return
    const day = weekDays[dragDay]
    const minR = Math.min(dragStart, dragEnd)
    const maxR = Math.max(dragStart, dragEnd)
    const s = rowToTime(day, minR)
    const e = rowToTime(day, maxR + 1)
    setSelStart(s)
    setSelEnd(e)
    if (slotType === 'tour') {
      setDescription('Discovery Flight')
      setPriceDisplay('265.00')
    }
    setDragDay(null)
    setDragStart(null)
    setDragEnd(null)
  }

  const isCellDragging = (dayIdx: number, row: number) => {
    if (dragDay !== dayIdx || dragStart === null || dragEnd === null) return false
    const min = Math.min(dragStart, dragEnd)
    const max = Math.max(dragStart, dragEnd)
    return row >= min && row <= max
  }

  const handleNavigate = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') {
      setWeekStart(startOfWeek(new Date()))
      return
    }
    const d = new Date(weekStart)
    d.setDate(d.getDate() + (dir === 'next' ? 7 : -7))
    setWeekStart(d)
  }

  // ── Slot creation ─────────────────────────────────────────────────────────

  const createSlot = async () => {
    if (!selStart || !selEnd || !studentId) {
      setStatus({ msg: 'Select a time range and student first.', ok: false })
      return
    }
    const priceDollars = parseFloat(priceDisplay)
    if (isNaN(priceDollars) || priceDollars < 0) {
      setStatus({ msg: 'Enter a valid price.', ok: false })
      return
    }
    const priceCents = Math.round(priceDollars * 100)
    setSaving(true)
    setStatus(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Missing admin session')
      const res = await fetch('/api/admin/bookings/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          studentUserId: studentId,
          startTime: selStart.toISOString(),
          endTime: selEnd.toISOString(),
          type: slotType,
          price: priceCents,
          description: description.trim() || null,
          syllabusLessonId: syllabusId || null,
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Failed to create slot')
      setStatus({ msg: `✓ Slot created for ${fmtHHMM(selStart)} – ${fmtHHMM(selEnd)} on ${selStart.toLocaleDateString()}`, ok: true })
      setSelStart(null)
      setSelEnd(null)
      setSyllabusId('')
      if (onCreated) await onCreated()
    } catch (err) {
      setStatus({ msg: err instanceof Error ? err.message : 'Failed to create slot', ok: false })
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const todayKey = toLocalDateKey(new Date())

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden" onMouseUp={onMouseUp}>

      {/* Title bar */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10 bg-white/[0.03]">
        <div>
          <h3 className="text-lg font-bold text-white">Flight Planner</h3>
          <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-widest">
            Drag to select, then fill in details
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <NavButton onClick={() => handleNavigate('prev')} ariaLabel="Previous week">
            <ChevronLeft />
          </NavButton>
          <button
            onClick={() => handleNavigate('today')}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            Today
          </button>
          <NavButton onClick={() => handleNavigate('next')} ariaLabel="Next week">
            <ChevronRight />
          </NavButton>
        </div>

        <div className="text-sm font-semibold text-gray-300">{headerLabel}</div>
      </div>

      {/* Day headers & legend */}
      <div className="border-b border-white/10 bg-white/[0.02] px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <LegendSwatch className="w-3 h-3 rounded bg-green-500/20 border border-green-400/40" label="Training" />
            <LegendSwatch className="w-3 h-3 rounded bg-blue-500/20 border border-blue-400/40" label="Discovery" />
            <LegendSwatch className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-400/60" label="Selecting" />
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]" style={{ display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)' }}>

          {/* Day headers */}
          <div />
          {weekDays.map((d, i) => {
            const key = toLocalDateKey(d)
            const isToday = key === todayKey
            return (
              <div
                key={i}
                className={`px-2 py-3 text-center border-l border-white/10 first:border-l-0 ${
                  isToday ? 'bg-white/[0.08]' : 'bg-white/[0.02]'
                }`}
              >
                <p className={`text-[10px] uppercase tracking-widest font-semibold ${
                  isToday ? 'text-gray-200' : 'text-gray-400'
                }`}>
                  {DAY_LABELS[i]}
                </p>
                <p className={`text-sm font-bold mt-1 ${isToday ? 'text-white' : 'text-gray-300'}`}>
                  {d.getDate()}
                </p>
                {isToday && (
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white text-[10px] font-bold mt-1">
                    {d.getDate()}
                  </div>
                )}
              </div>
            )
          })}

          {/* Time rows */}
          {Array.from({ length: ROWS }, (_, rowIdx) => {
            const totalMins = rowIdx * SLOT_MINS
            const hour = START_HOUR + Math.floor(totalMins / 60)
            const minute = totalMins % 60
            const showLabel = minute === 0
            const labelDate = new Date()
            labelDate.setHours(hour, minute, 0, 0)

            return (
              <Fragment key={`row-${rowIdx}`}>
                {/* Time label */}
                <div
                  className={`border-r border-white/5 px-2 flex items-start justify-end select-none bg-white/[0.02] ${
                    showLabel ? 'border-t border-white/10' : ''
                  }`}
                  style={{ height: '56px' }}
                >
                  {showLabel && (
                    <span className="text-[10px] uppercase tracking-wide text-gray-500 font-medium -mt-2 whitespace-nowrap">
                      {fmtHHMM(labelDate)}
                    </span>
                  )}
                </div>

                {/* Day cells */}
                {weekDays.map((day, dayIdx) => {
                  const key = toLocalDateKey(day)
                  const daySlots = slotsByDay.get(key) || []

                  // Check if any existing slot covers this cell
                  const cellStart = rowToTime(day, rowIdx)
                  const cellEnd = rowToTime(day, rowIdx + 1)
                  const coveringSlot = daySlots.find(s => {
                    const ss = new Date(s.start_time)
                    const se = new Date(s.end_time)
                    return ss < cellEnd && se > cellStart
                  })

                  const isDragging = isCellDragging(dayIdx, rowIdx)

                  // Determine if this is the first cell of a covering slot
                  const isFirstCellOfSlot = coveringSlot && toLocalDateKey(new Date(coveringSlot.start_time)) === key &&
                    timeToRow(new Date(coveringSlot.start_time)) === rowIdx

                  // Slot row span
                  let slotRows = 0
                  if (isFirstCellOfSlot && coveringSlot) {
                    const ss = new Date(coveringSlot.start_time)
                    const se = new Date(coveringSlot.end_time)
                    slotRows = Math.round((se.getTime() - ss.getTime()) / (SLOT_MINS * 60000))
                  }

                  const bgClass = isDragging
                    ? 'bg-yellow-500/30 border-yellow-400/60'
                    : coveringSlot
                    ? coveringSlot.type === 'tour'
                      ? 'bg-blue-500/20 border-blue-400/40'
                      : 'bg-green-500/20 border-green-400/40'
                    : 'bg-white/[0.02] hover:bg-white/[0.06]'

                  return (
                    <div
                      key={`${key}-${rowIdx}`}
                      className={`relative border-r border-b border-white/5 cursor-crosshair select-none last:border-r-0 overflow-visible transition-colors ${bgClass} ${
                        showLabel ? 'border-t border-white/10' : ''
                      }`}
                      style={{ height: '56px' }}
                      onMouseDown={() => !coveringSlot && onMouseDown(dayIdx, rowIdx)}
                      onMouseEnter={() => onMouseEnter(dayIdx, rowIdx)}
                    >
                      {isFirstCellOfSlot && coveringSlot && slotRows > 0 && (
                        <div
                          className={`absolute left-0 right-0 z-10 px-2 py-1 pointer-events-none ${
                            coveringSlot.type === 'tour'
                              ? 'text-blue-300'
                              : 'text-green-300'
                          }`}
                          style={{ top: 0, height: `${slotRows * 56}px` }}
                        >
                          {slotRows >= 2 && (
                            <div
                              className={`rounded text-[10px] font-semibold leading-tight px-2 py-1.5 truncate ${
                                coveringSlot.type === 'tour'
                                  ? coveringSlot.is_booked
                                    ? 'bg-blue-500/40 border border-blue-400/50'
                                    : 'bg-blue-500/30 border border-blue-400/40'
                                  : coveringSlot.is_booked
                                  ? 'bg-green-500/40 border border-green-400/50'
                                  : 'bg-green-500/30 border border-green-400/40'
                              }`}
                            >
                              {coveringSlot.is_booked ? '✓ ' : ''}
                              {coveringSlot.description || (coveringSlot.type === 'tour' ? 'Discovery' : 'Training')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* Slot creation form */}
      {selStart && selEnd && (
        <div className="border-t border-white/10 px-6 py-5 bg-white/[0.03]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-white">New Slot</h4>
              <p className="text-[11px] text-gray-400 uppercase tracking-widest mt-1">
                {selStart.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                {' · '}
                <span className="font-semibold text-gray-200">{fmtHHMM(selStart)} – {fmtHHMM(selEnd)}</span>
                {' · '}
                {Math.round((selEnd.getTime() - selStart.getTime()) / 60000)} min
              </p>
            </div>
            <button
              onClick={() => { setSelStart(null); setSelEnd(null); setStatus(null) }}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition text-gray-300 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {/* Student */}
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">
                Student
              </label>
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                disabled={loadingStudents}
                className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/12 rounded-lg text-sm text-white focus:border-yellow-400/70 focus:outline-none transition"
              >
                {loadingStudents && <option>Loading...</option>}
                {students.map(s => (
                  <option key={s.userId} value={s.userId}>{s.fullName} — {s.email || 'no email'}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">
                Type
              </label>
              <select
                value={slotType}
                onChange={e => {
                  const t = e.target.value as 'training' | 'tour'
                  setSlotType(t)
                  if (t === 'tour') {
                    setDescription('Discovery Flight')
                    setPriceDisplay('265.00')
                    setSyllabusId('')
                  } else {
                    setDescription('')
                    setPriceDisplay('120.00')
                  }
                }}
                className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/12 rounded-lg text-sm text-white focus:border-yellow-400/70 focus:outline-none transition"
              >
                <option value="training">🎓 Training Flight</option>
                <option value="tour">✈️ Discovery Flight</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">
                Price ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceDisplay}
                  onChange={e => setPriceDisplay(e.target.value)}
                  className="w-full pl-6 pr-3 py-2.5 bg-white/[0.06] border border-white/12 rounded-lg text-sm text-white focus:border-yellow-400/70 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional label shown to student"
                className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/12 rounded-lg text-sm text-white placeholder-gray-500 focus:border-yellow-400/70 focus:outline-none transition"
              />
            </div>

            {/* Syllabus lesson (training only) */}
            {slotType === 'training' && (
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest">
                  Syllabus Lesson <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <select
                  value={syllabusId}
                  onChange={e => setSyllabusId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/12 rounded-lg text-sm text-white focus:border-yellow-400/70 focus:outline-none transition"
                >
                  <option value="">— No lesson linked —</option>
                  {syllabusLessons.map(l => (
                    <option key={l.id} value={l.id}>#{l.lesson_number} — {l.title} ({l.stage})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {status && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium border ${
                status.ok
                  ? 'bg-green-500/10 border-green-400/30 text-green-300'
                  : 'bg-red-500/10 border-red-400/30 text-red-300'
              }`}
            >
              {status.msg}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => void createSlot()}
              disabled={saving || loadingStudents || !studentId}
              className="px-6 py-2.5 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
            >
              {saving ? 'Creating...' : 'Create Flight Slot'}
            </button>
            <button
              onClick={() => {
                setSelStart(null)
                setSelEnd(null)
                setStatus(null)
              }}
              className="px-5 py-2.5 border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status (when no selection open) */}
      {status && !selStart && (
        <div
          className={`px-6 py-3 text-sm font-medium border-t border-white/10 ${
            status.ok
              ? 'bg-green-500/10 text-green-300'
              : 'bg-red-500/10 text-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{status.msg}</span>
            <button
              onClick={() => setStatus(null)}
              className="ml-3 text-[10px] opacity-70 hover:opacity-100 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
//  Small presentational helpers
// =========================================================================

function NavButton({
  onClick,
  children,
  ariaLabel,
}: {
  onClick: () => void
  children: React.ReactNode
  ariaLabel: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition"
    >
      {children}
    </button>
  )
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block ${className}`} />
      <span className="text-gray-400">{label}</span>
    </span>
  )
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
