'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, I } from '@/app/admin/ops-console/primitives'
import { useAuth } from '@/app/contexts/AuthContext'

type Student = {
  user_id: string
  full_name: string
  email: string
}

type ScheduledLesson = {
  id: string
  student_user_id: string
  student_name: string
  start_time: string
  end_time: string
  type: string
  status: 'pending' | 'confirmed' | 'completed'
  notes: string | null
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7 AM to 7 PM

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}${period}`
}

function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function statusKind(status: ScheduledLesson['status']) {
  if (status === 'confirmed') return 'ok'
  if (status === 'pending') return 'warn'
  return 'muted'
}

function isoForCell(weekStart: Date, dayIndex: number, hour: number): string {
  const d = addDays(weekStart, dayIndex)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function CalendarSkeleton() {
  return (
    <div className="view-pad">
      <div className="skeleton">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sk-row">
            <div className="sk-bar" style={{ width: `${50 + i * 4}%` }} />
            <div className="sk-bar sk-thin" style={{ width: `${20 + i * 3}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CFISchedulingPage() {
  const { session } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [lessons, setLessons] = useState<ScheduledLesson[]>([])
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDay, setModalDay] = useState(0)
  const [modalHour, setModalHour] = useState(10)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [lessonType, setLessonType] = useState('Dual Instruction')
  const [duration, setDuration] = useState(2)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = session?.access_token
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  }, [session])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const headers = getAuthHeaders()
        const [studentsRes, scheduleRes] = await Promise.all([
          fetch('/api/cfi/students', { headers }),
          fetch('/api/cfi/schedule', { headers }),
        ])
        if (!studentsRes.ok) throw new Error('students')
        if (!scheduleRes.ok) throw new Error('schedule')
        const studentData = await studentsRes.json()
        const scheduleData = await scheduleRes.json()
        if (cancelled) return
        setStudents(
          (studentData as Array<{ user_id: string; full_name: string; email: string }>).map((s) => ({
            user_id: s.user_id,
            full_name: s.full_name,
            email: s.email,
          }))
        )
        type RawBooking = {
          id: string
          status: 'pending' | 'confirmed' | 'completed'
          notes: string | null
          user_id: string
          student_name: string
          slots: { start_time: string; end_time: string; type: string } | null
        }
        setLessons(
          (scheduleData as RawBooking[])
            .filter((b) => b.slots)
            .map((b) => ({
              id: b.id,
              student_user_id: b.user_id,
              student_name: b.student_name,
              start_time: b.slots!.start_time,
              end_time: b.slots!.end_time,
              type: b.slots!.type,
              status: b.status,
              notes: b.notes,
            }))
        )
      } catch {
        if (!cancelled) setError('Could not load scheduling data. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [getAuthHeaders])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const lessonsByDayHour = useMemo(() => {
    const map: Record<string, ScheduledLesson[]> = {}
    for (const lesson of lessons) {
      const start = new Date(lesson.start_time)
      const dayIdx = weekDays.findIndex((d) => d.toDateString() === start.toDateString())
      if (dayIdx === -1) continue
      const hour = start.getHours()
      const key = `${dayIdx}-${hour}`
      if (!map[key]) map[key] = []
      map[key].push(lesson)
    }
    return map
  }, [lessons, weekDays])

  const stats = useMemo(() => {
    const inWeek = lessons.filter((l) => {
      const t = new Date(l.start_time).getTime()
      return t >= weekStart.getTime() && t < addDays(weekStart, 7).getTime()
    })
    return {
      total: inWeek.length,
      confirmed: inWeek.filter((l) => l.status === 'confirmed').length,
      pending: inWeek.filter((l) => l.status === 'pending').length,
      students: new Set(inWeek.map((l) => l.student_user_id)).size,
    }
  }, [lessons, weekStart])

  function openSchedule(dayIdx: number, hour: number) {
    setModalDay(dayIdx)
    setModalHour(hour)
    setSelectedStudent(students[0]?.user_id ?? '')
    setLessonType('Dual Instruction')
    setDuration(2)
    setNotes('')
    setModalOpen(true)
  }

  async function handleSchedule() {
    if (!selectedStudent) return
    setSaving(true)
    setError(null)
    try {
      const startIso = isoForCell(weekStart, modalDay, modalHour)
      const endDate = new Date(startIso)
      endDate.setHours(endDate.getHours() + duration)
      const res = await fetch('/api/cfi/schedule-lesson', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_user_id: selectedStudent,
          start_time: startIso,
          end_time: endDate.toISOString(),
          type: lessonType,
          notes,
        }),
      })
      if (!res.ok) throw new Error('save failed')
      const created = (await res.json()) as { lesson: ScheduledLesson }
      setLessons((prev) => [...prev, created.lesson])
      setModalOpen(false)
    } catch {
      setError('Could not schedule lesson. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CalendarSkeleton />

  return (
    <>
      <div className="cfi-toolbar">
        <div className="tb-date">
          <span className="mono dim">WEEK OF</span>
          <span className="mono">{formatDateLabel(weekStart)} – {formatDateLabel(addDays(weekStart, 6))}</span>
        </div>
        <div className="tb-divider" />
        <button className="btn-ghost" onClick={() => setWeekStart(getWeekStart(addDays(weekStart, -7)))}>
          <I name="chev-l" /> Prev
        </button>
        <button className="btn-ghost" onClick={() => setWeekStart(getWeekStart(new Date()))}>
          Today
        </button>
        <button className="btn-ghost" onClick={() => setWeekStart(getWeekStart(addDays(weekStart, 7)))}>
          Next <I name="chev-r" />
        </button>
        <div className="tb-spacer" />
        <button className="btn-primary" onClick={() => openSchedule(new Date().getDay(), 10)}>
          <I name="plus" /> Schedule Lesson
        </button>
      </div>

      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">THIS WEEK</div><div className="stat-v">{stats.total}</div><div className="stat-delta dim">lessons booked</div></div>
          <div className="stat"><div className="stat-k mono">CONFIRMED</div><div className="stat-v">{stats.confirmed}</div><div className="stat-delta pos">ready to fly</div></div>
          <div className="stat"><div className="stat-k mono">PENDING</div><div className="stat-v">{stats.pending}</div><div className={stats.pending ? 'stat-delta warn' : 'stat-delta dim'}>awaiting confirm</div></div>
          <div className="stat"><div className="stat-k mono">STUDENTS</div><div className="stat-v">{stats.students}</div><div className="stat-delta dim">on the books</div></div>
        </div>

        {error && <div className="cfi-muted-panel neg" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="sect-head">
          <h3>Week schedule</h3>
          <span className="mono dim">click any empty cell to schedule</span>
        </div>

        <div className="cfi-week-cal">
          <div className="cfi-week-head">
            <div className="cfi-week-time-col mono dim">EST</div>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString()
              return (
                <div key={i} className={`cfi-week-day-head ${isToday ? 'today' : ''}`}>
                  <div className="mono dim">{DAY_NAMES[i]}</div>
                  <div className="cfi-week-day-num">{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          <div className="cfi-week-grid">
            {HOURS.map((hour) => (
              <div key={hour} className="cfi-week-row">
                <div className="cfi-week-time-col mono dim">{formatHourLabel(hour)}</div>
                {weekDays.map((_, dayIdx) => {
                  const cellKey = `${dayIdx}-${hour}`
                  const cellLessons = lessonsByDayHour[cellKey] ?? []
                  return (
                    <div
                      key={dayIdx}
                      className="cfi-week-cell"
                      onClick={() => cellLessons.length === 0 && openSchedule(dayIdx, hour)}
                    >
                      {cellLessons.map((lesson) => (
                        <div key={lesson.id} className={`cfi-week-lesson cfi-status-${lesson.status}`}>
                          <div className="cfi-week-lesson-time mono">{formatTimeShort(lesson.start_time)}</div>
                          <div className="cfi-week-lesson-name">{lesson.student_name}</div>
                          <div className="cfi-week-lesson-type mono dim">{lesson.type}</div>
                        </div>
                      ))}
                      {cellLessons.length === 0 && <div className="cfi-week-cell-plus"><I name="plus" /></div>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="sect-head" style={{ marginTop: 18 }}>
          <h3>Upcoming lessons</h3>
          <span className="mono dim">next 7 days</span>
        </div>

        {lessons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-ico"><I name="cal" size={22} /></div>
            <div className="empty-title">No lessons scheduled</div>
            <div className="empty-sub mono dim">Click any cell above to schedule a student.</div>
          </div>
        ) : (
          <div className="cfi-board-list">
            <div className="cfi-board-row cfi-board-head mono">
              <div>Time</div>
              <div>Student</div>
              <div>Lesson</div>
              <div>Status</div>
              <div>Action</div>
            </div>
            {lessons.slice(0, 10).map((lesson) => (
              <div key={lesson.id} className="cfi-board-row">
                <div>
                  <div className="mono strong">{formatTimeShort(lesson.start_time)} – {formatTimeShort(lesson.end_time)}</div>
                  <div className="mono dim">{formatDateLabel(new Date(lesson.start_time))}</div>
                </div>
                <div>
                  <div className="strong">{lesson.student_name}</div>
                </div>
                <div>
                  <div>{lesson.type}</div>
                  <div className="mono dim">{lesson.notes || 'no notes'}</div>
                </div>
                <div><Badge kind={statusKind(lesson.status)}>{lesson.status.toUpperCase()}</Badge></div>
                <div className="dc-actions">
                  <button className="btn-ghost">Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="cfi-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="cfi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cfi-modal-head">
              <div>
                <div className="mono dim">SCHEDULE LESSON</div>
                <div className="cfi-modal-title">
                  {DAY_NAMES[modalDay]} {formatDateLabel(addDays(weekStart, modalDay))} · {formatHourLabel(modalHour)}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>
                <I name="x-oct" />
              </button>
            </div>
            <div className="cfi-modal-body">
              <label className="cfi-field">
                <span className="cfi-field-label mono dim">STUDENT</span>
                <select
                  className="cfi-form-select"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  {students.length === 0 && <option value="">No assigned students</option>}
                  {students.map((s) => (
                    <option key={s.user_id} value={s.user_id}>{s.full_name}</option>
                  ))}
                </select>
              </label>
              <label className="cfi-field">
                <span className="cfi-field-label mono dim">LESSON TYPE</span>
                <select
                  className="cfi-form-select"
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value)}
                >
                  <option>Dual Instruction</option>
                  <option>Solo Supervised</option>
                  <option>Ground School</option>
                  <option>Stage Check</option>
                  <option>Checkride Prep</option>
                  <option>Discovery Flight</option>
                </select>
              </label>
              <label className="cfi-field">
                <span className="cfi-field-label mono dim">DURATION (HRS)</span>
                <select
                  className="cfi-form-select"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  <option value={1}>1.0</option>
                  <option value={1.5}>1.5</option>
                  <option value={2}>2.0</option>
                  <option value={2.5}>2.5</option>
                  <option value={3}>3.0</option>
                </select>
              </label>
              <label className="cfi-field">
                <span className="cfi-field-label mono dim">NOTES</span>
                <textarea
                  className="cfi-form-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mission profile, prep work, what to bring..."
                />
              </label>
            </div>
            <div className="cfi-modal-foot">
              <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSchedule} disabled={saving || !selectedStudent}>
                <I name="check" /> {saving ? 'Saving...' : 'Schedule Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
