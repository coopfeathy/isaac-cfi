'use client'

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

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_MINS = 15        // grid resolution
const START_HOUR = 6
const END_HOUR = 21
const ROWS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINS

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const diff = (copy.getDay() + 6) % 7          // Mon-start: Mon=0
  copy.setDate(copy.getDate() - diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const addDays = (date: Date, days: number) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const fmtHHMM = (date: Date) =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

// row index → Date in that column
const rowToTime = (day: Date, row: number) => {
  const d = new Date(day)
  d.setHours(START_HOUR, row * SLOT_MINS, 0, 0)
  return d
}

// Date → row index (-1 if outside range)
const timeToRow = (date: Date) => {
  const totalMins = (date.getHours() - START_HOUR) * 60 + date.getMinutes()
  if (totalMins < 0 || totalMins >= (END_HOUR - START_HOUR) * 60) return -1
  return Math.floor(totalMins / SLOT_MINS)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminBookingPlanner({ slots, onCreated }: PlannerProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [students, setStudents] = useState<StudentOption[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  // drag state
  const [dragDay, setDragDay] = useState<number | null>(null)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)

  // form state
  const [selStart, setSelStart] = useState<Date | null>(null)
  const [selEnd, setSelEnd] = useState<Date | null>(null)
  const [studentId, setStudentId] = useState('')
  const [slotType, setSlotType] = useState<'training' | 'tour'>('training')
  const [priceDisplay, setPriceDisplay] = useState('120.00')   // dollars
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" onMouseUp={onMouseUp}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-gray-100">
        <div>
          <h3 className="text-xl font-bold text-black">Flight Planner</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Click and drag to select a time range, then fill in the details below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(prev => addDays(prev, -7))}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            ← Prev
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors">
            Today
          </button>
          <button onClick={() => setWeekStart(prev => addDays(prev, 7))}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Next →
          </button>
        </div>
      </div>

      {/* Week label */}
      <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          Week of {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" /> Training</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> Discovery</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-golden/40 border border-golden inline-block" /> Selecting</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]" style={{ display: 'grid', gridTemplateColumns: '64px repeat(7, 1fr)' }}>

          {/* Day headers */}
          <div className="bg-gray-50 border-b border-r border-gray-200" />
          {weekDays.map(day => {
            const key = toLocalDateKey(day)
            const isToday = key === todayKey
            return (
              <div key={day.toISOString()}
                className={`border-b border-r border-gray-200 px-2 py-3 text-center last:border-r-0 ${isToday ? 'bg-golden/10' : 'bg-gray-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-golden' : 'text-gray-400'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-black' : 'text-gray-700'}`}>
                  {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                {isToday && <div className="w-1.5 h-1.5 bg-golden rounded-full mx-auto mt-1" />}
              </div>
            )
          })}

          {/* Time rows */}
          {Array.from({ length: ROWS }, (_, rowIdx) => {
            const totalMins = rowIdx * SLOT_MINS
            const hour = START_HOUR + Math.floor(totalMins / 60)
            const minute = totalMins % 60
            const showLabel = minute === 0
            const labelDate = new Date(); labelDate.setHours(hour, minute, 0, 0)

            return (
              <Fragment key={`row-${rowIdx}`}>
                {/* Time label */}
                <div className={`border-r border-gray-100 px-2 flex items-start justify-end pr-2 select-none bg-gray-50 ${showLabel ? 'border-t border-gray-200' : ''}`}
                  style={{ height: '20px' }}>
                  {showLabel && (
                    <span className="text-[10px] text-gray-400 font-medium -mt-2 whitespace-nowrap">
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

                  // Determine if this is the first cell of a covering slot (for label rendering)
                  const isFirstCellOfSlot = coveringSlot && toLocalDateKey(new Date(coveringSlot.start_time)) === key &&
                    timeToRow(new Date(coveringSlot.start_time)) === rowIdx

                  // Slot row span for visual label
                  let slotRows = 0
                  if (isFirstCellOfSlot && coveringSlot) {
                    const ss = new Date(coveringSlot.start_time)
                    const se = new Date(coveringSlot.end_time)
                    slotRows = Math.round((se.getTime() - ss.getTime()) / (SLOT_MINS * 60000))
                  }

                  const bgClass = isDragging
                    ? 'bg-golden/40 border-golden/50'
                    : coveringSlot
                    ? coveringSlot.type === 'tour'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-green-50 border-green-200'
                    : 'bg-white hover:bg-gray-50'

                  return (
                    <div
                      key={`${key}-${rowIdx}`}
                      className={`relative border-r border-b border-gray-100 cursor-crosshair select-none last:border-r-0 overflow-visible transition-colors ${bgClass} ${showLabel ? 'border-t border-gray-200' : ''}`}
                      style={{ height: '20px' }}
                      onMouseDown={() => !coveringSlot && onMouseDown(dayIdx, rowIdx)}
                      onMouseEnter={() => onMouseEnter(dayIdx, rowIdx)}
                    >
                      {isFirstCellOfSlot && coveringSlot && slotRows > 0 && (
                        <div
                          className={`absolute left-0 right-0 z-10 px-1 py-0.5 pointer-events-none ${
                            coveringSlot.type === 'tour' ? 'text-blue-700' : 'text-green-700'
                          }`}
                          style={{ top: 0, height: `${slotRows * 20}px` }}
                        >
                          {slotRows >= 4 && (
                            <div className={`rounded text-[9px] font-semibold leading-tight px-1 py-0.5 truncate ${
                              coveringSlot.type === 'tour'
                                ? coveringSlot.is_booked ? 'bg-blue-200' : 'bg-blue-100'
                                : coveringSlot.is_booked ? 'bg-green-200' : 'bg-green-100'
                            }`}>
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
        <div className="border-t border-gray-100 px-6 py-5 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-black">New Slot</h4>
              <p className="text-sm text-gray-500">
                {selStart.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                {' · '}
                <span className="font-semibold text-black">{fmtHHMM(selStart)} – {fmtHHMM(selEnd)}</span>
                {' · '}
                {Math.round((selEnd.getTime() - selStart.getTime()) / 60000)} min
              </p>
            </div>
            <button onClick={() => { setSelStart(null); setSelEnd(null); setStatus(null) }}
              className="text-gray-400 hover:text-black transition-colors text-xl leading-none">
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Student */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Student</label>
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                disabled={loadingStudents}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-golden outline-none"
              >
                {loadingStudents && <option>Loading...</option>}
                {students.map(s => (
                  <option key={s.userId} value={s.userId}>{s.fullName} — {s.email || 'no email'}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Type</label>
              <select
                value={slotType}
                onChange={e => {
                  const t = e.target.value as 'training' | 'tour'
                  setSlotType(t)
                  if (t === 'tour') { setDescription('Discovery Flight'); setPriceDisplay('265.00'); setSyllabusId('') }
                  else { setDescription(''); setPriceDisplay('120.00') }
                }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-golden outline-none"
              >
                <option value="training">🎓 Training Flight</option>
                <option value="tour">✈ Discovery Flight</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Price ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceDisplay}
                  onChange={e => setPriceDisplay(e.target.value)}
                  className="w-full pl-6 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-golden outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional label shown to student"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-golden outline-none"
              />
            </div>

            {/* Syllabus lesson (training only) */}
            {slotType === 'training' && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Syllabus Lesson <span className="font-normal text-gray-400">(optional)</span></label>
                <select
                  value={syllabusId}
                  onChange={e => setSyllabusId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-golden outline-none"
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
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
              status.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {status.msg}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => void createSlot()}
              disabled={saving || loadingStudents || !studentId}
              className="px-6 py-2.5 bg-golden text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? 'Creating...' : 'Create Flight Slot'}
            </button>
            <button
              onClick={() => { setSelStart(null); setSelEnd(null); setStatus(null) }}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status (when no selection open) */}
      {status && !selStart && (
        <div className={`px-6 py-3 text-sm font-medium border-t ${
          status.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {status.msg}
          <button onClick={() => setStatus(null)} className="ml-3 underline text-xs opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}
    </div>
  )
}
