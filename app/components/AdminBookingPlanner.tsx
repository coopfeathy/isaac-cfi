'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type SlotView = {
  id: string
  start_time: string
  end_time: string
  is_booked: boolean
  type: string
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

const HALF_HOUR = 30
const START_HOUR = 6
const END_HOUR = 21
const ROWS_PER_DAY = ((END_HOUR - START_HOUR) * 60) / HALF_HOUR

const normalizeName = (value: string | null | undefined) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''

const normalizeEmail = (value: string | null | undefined) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const deriveNameFromEmail = (email: string) => {
  const localPart = email.split('@')[0] || ''
  const words = localPart
    .replace(/[^a-z0-9._-]/gi, '')
    .split(/[._-]+/)
    .filter(Boolean)

  if (words.length === 0) return 'Student'

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const startOfWeek = (date: Date) => {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = (day + 6) % 7
  copy.setDate(copy.getDate() - diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const addDays = (date: Date, days: number) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

export default function AdminBookingPlanner({ slots, onCreated }: PlannerProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [students, setStudents] = useState<StudentOption[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [dragDayIndex, setDragDayIndex] = useState<number | null>(null)
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null)
  const [dragEndIndex, setDragEndIndex] = useState<number | null>(null)
  const [selectedStart, setSelectedStart] = useState<Date | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [slotType, setSlotType] = useState<'training' | 'tour'>('training')
  const [slotPrice, setSlotPrice] = useState('12000')
  const [slotDescription, setSlotDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [syllabusLessons, setSyllabusLessons] = useState<{ id: string; lesson_number: number; title: string; stage: string }[]>([])
  const [selectedSyllabusLessonId, setSelectedSyllabusLessonId] = useState('')

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
          const fallbackName = email ? deriveNameFromEmail(email) : 'Student'

          const candidate: StudentOption = {
            userId,
            email: email || '',
            fullName: fullName && !fullName.includes('@') ? fullName : fallbackName,
          }

          const existing = deduped.get(userId)
          if (!existing) {
            deduped.set(userId, candidate)
            return
          }

          if (existing.fullName === 'Student' && candidate.fullName !== 'Student') {
            deduped.set(userId, candidate)
          }
        })

        const values = Array.from(deduped.values()).sort((left, right) => left.fullName.localeCompare(right.fullName))
        setStudents(values)
        if (!selectedStudentId && values.length > 0) {
          setSelectedStudentId(values[0].userId)
        }
      } catch (error) {
        console.error('Error loading students for planner:', error)
      } finally {
        setLoadingStudents(false)
      }
    }

    void fetchStudents()
  }, [])

  useEffect(() => {
    const fetchSyllabusLessons = async () => {
      const { data, error } = await supabase
        .from('syllabus_lessons')
        .select('id, lesson_number, title, stage')
        .order('lesson_number', { ascending: true })

      if (!error && data) {
        setSyllabusLessons(data)
      }
    }

    void fetchSyllabusLessons()
  }, [])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  }, [weekStart])

  const slotsByDay = useMemo(() => {
    const map = new Map<string, SlotView[]>()
    weekDays.forEach((day) => {
      map.set(toLocalDateKey(day), [])
    })

    slots.forEach((slot) => {
      const start = new Date(slot.start_time)
      const key = toLocalDateKey(start)
      if (!map.has(key)) return
      map.get(key)!.push(slot)
    })

    return map
  }, [slots, weekDays])

  const beginDrag = (dayIndex: number, rowIndex: number) => {
    setStatusMessage('')
    setDragDayIndex(dayIndex)
    setDragStartIndex(rowIndex)
    setDragEndIndex(rowIndex)
  }

  const extendDrag = (dayIndex: number, rowIndex: number) => {
    if (dragDayIndex === null || dragStartIndex === null) return
    if (dayIndex !== dragDayIndex) return
    setDragEndIndex(rowIndex)
  }

  const finishDrag = () => {
    if (dragDayIndex === null || dragStartIndex === null || dragEndIndex === null) return

    const day = weekDays[dragDayIndex]
    const minIndex = Math.min(dragStartIndex, dragEndIndex)
    const maxIndex = Math.max(dragStartIndex, dragEndIndex)

    const start = new Date(day)
    start.setHours(START_HOUR, minIndex * HALF_HOUR, 0, 0)

    const end = new Date(day)
    end.setHours(START_HOUR, (maxIndex + 1) * HALF_HOUR, 0, 0)

    setSelectedStart(start)
    setSelectedEnd(end)
    if (slotType === 'tour' && !slotDescription.trim()) {
      setSlotDescription('Discovery Flight')
      setSlotPrice('29900')
    }

    setDragDayIndex(null)
    setDragStartIndex(null)
    setDragEndIndex(null)
  }

  const cancelSelection = () => {
    setSelectedStart(null)
    setSelectedEnd(null)
    setStatusMessage('')
  }

  const createPlannedBooking = async () => {
    if (!selectedStart || !selectedEnd || !selectedStudentId) {
      setStatusMessage('Select a time range and student first.')
      return
    }

    const price = Number.parseInt(slotPrice, 10)
    if (!Number.isFinite(price) || price < 0) {
      setStatusMessage('Price must be a valid number in cents.')
      return
    }

    setSaving(true)
    setStatusMessage('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Missing admin session token')
      }

      const response = await fetch('/api/admin/bookings/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          studentUserId: selectedStudentId,
          startTime: selectedStart.toISOString(),
          endTime: selectedEnd.toISOString(),
          type: slotType,
          price,
          description: slotDescription.trim() || null,
          syllabusLessonId: selectedSyllabusLessonId || null,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking slot')
      }

      setStatusMessage('Flight slot + booking created successfully.')
      setSelectedStart(null)
      setSelectedEnd(null)
      setSelectedSyllabusLessonId('')
      if (onCreated) {
        await onCreated()
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create booking slot')
    } finally {
      setSaving(false)
    }
  }

  const isCellSelected = (dayIndex: number, rowIndex: number) => {
    if (dragDayIndex !== dayIndex || dragStartIndex === null || dragEndIndex === null) return false
    const minIndex = Math.min(dragStartIndex, dragEndIndex)
    const maxIndex = Math.max(dragStartIndex, dragEndIndex)
    return rowIndex >= minIndex && rowIndex <= maxIndex
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6" onMouseUp={finishDrag}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-2xl font-bold text-darkText">Flight Planner Calendar</h3>
          <p className="text-sm text-gray-600">Drag across day columns to block exact time ranges, then assign the student.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded border border-gray-300 text-sm"
            onClick={() => setWeekStart((prev) => addDays(prev, -7))}
          >
            Previous Week
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded border border-gray-300 text-sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            This Week
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded border border-gray-300 text-sm"
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
          >
            Next Week
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-golden/30 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Week of {weekStart.toLocaleDateString()} • Drag to select in 30-minute increments.
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px] grid grid-cols-[80px_repeat(7,minmax(120px,1fr))] border border-gray-200 rounded-lg">
          <div className="border-r border-b border-gray-200 bg-gray-50" />
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="border-r border-b border-gray-200 bg-gray-50 px-2 py-2 text-center last:border-r-0">
              <p className="text-xs uppercase tracking-wide text-gray-500">{day.toLocaleDateString([], { weekday: 'short' })}</p>
              <p className="text-sm font-semibold text-darkText">{day.toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
            </div>
          ))}

          {Array.from({ length: ROWS_PER_DAY }, (_, rowIndex) => {
            const hour = START_HOUR + Math.floor((rowIndex * HALF_HOUR) / 60)
            const minute = (rowIndex * HALF_HOUR) % 60
            const labelDate = new Date()
            labelDate.setHours(hour, minute, 0, 0)

            return (
              <Fragment key={`row-${rowIndex}`}>
                <div className="border-r border-b border-gray-100 px-2 py-2 text-xs text-gray-500 bg-gray-50">
                  {formatTime(labelDate)}
                </div>
                {weekDays.map((day, dayIndex) => (
                  <div
                    key={`${day.toISOString()}-${rowIndex}`}
                    className={`relative border-r border-b border-gray-100 h-8 cursor-crosshair select-none last:border-r-0 ${
                      isCellSelected(dayIndex, rowIndex) ? 'bg-golden/30' : 'bg-white hover:bg-blue-50'
                    }`}
                    onMouseDown={() => beginDrag(dayIndex, rowIndex)}
                    onMouseEnter={() => extendDrag(dayIndex, rowIndex)}
                  />
                ))}
              </Fragment>
            )
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {weekDays.map((day) => {
          const key = toLocalDateKey(day)
          const daySlots = slotsByDay.get(key) || []
          if (daySlots.length === 0) return null

          return (
            <div key={`summary-${key}`} className="text-xs text-gray-600">
              <span className="font-semibold text-darkText">{day.toLocaleDateString([], { weekday: 'long' })}:</span>{' '}
              {daySlots.length} existing slot{daySlots.length === 1 ? '' : 's'}
            </div>
          )
        })}
      </div>

      {selectedStart && selectedEnd && (
        <div className="mt-6 border border-blue-200 bg-blue-50 rounded-lg p-4 grid gap-3">
          <p className="text-sm text-blue-900 font-semibold">
            Creating slot for {selectedStart.toLocaleDateString()} from {formatTime(selectedStart)} to {formatTime(selectedEnd)}
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm text-darkText font-semibold">
              Student
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                disabled={loadingStudents}
              >
                {students.map((student) => (
                  <option key={student.userId} value={student.userId}>
                    {student.fullName} ({student.email || 'no-email'})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-darkText font-semibold">
              Slot Type
              <select
                value={slotType}
                onChange={(event) => {
                  const nextType = event.target.value as 'training' | 'tour'
                  setSlotType(nextType)
                  if (nextType === 'tour') {
                    setSlotPrice('29900')
                    setSlotDescription('Discovery Flight')
                    setSelectedSyllabusLessonId('')
                  }
                }}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="training">Training Flight</option>
                <option value="tour">Discovery Flight</option>
              </select>
            </label>
          </div>

          {slotType === 'training' && (
            <label className="text-sm text-darkText font-semibold">
              Syllabus Lesson (optional)
              <select
                value={selectedSyllabusLessonId}
                onChange={(event) => setSelectedSyllabusLessonId(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="">— No lesson linked —</option>
                {syllabusLessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    #{lesson.lesson_number} — {lesson.title} ({lesson.stage})
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm text-darkText font-semibold">
              Price (cents)
              <input
                type="number"
                value={slotPrice}
                onChange={(event) => setSlotPrice(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                min={0}
              />
            </label>

            <label className="text-sm text-darkText font-semibold">
              Description
              <input
                type="text"
                value={slotDescription}
                onChange={(event) => setSlotDescription(event.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                placeholder="Optional flight description"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void createPlannedBooking()}
              disabled={saving || loadingStudents || !selectedStudentId}
              className="px-4 py-2 rounded bg-golden text-darkText font-semibold disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Flight Slot'}
            </button>
            <button
              type="button"
              onClick={cancelSelection}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700"
            >
              Cancel Selection
            </button>
          </div>

          {statusMessage ? <p className="text-sm text-gray-700">{statusMessage}</p> : null}
        </div>
      )}
    </div>
  )
}
