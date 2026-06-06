'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge, I } from '@/app/admin/ops-console/primitives'
import { useAuth } from '@/app/contexts/AuthContext'

type ScheduleEntry = {
  id: string
  status: 'pending' | 'confirmed' | 'completed'
  notes: string | null
  user_id: string
  created_at: string
  student_name: string
  slots: {
    start_time: string
    end_time: string
    type: string
  } | null
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
}

function formatTimeRange(entry: ScheduleEntry): string {
  if (!entry.slots?.start_time || !entry.slots?.end_time) return '-'
  const start = new Date(entry.slots.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
  const end = new Date(entry.slots.end_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
  return `${start} - ${end}`
}

function statusKind(status: ScheduleEntry['status']) {
  if (status === 'confirmed') return 'ok'
  if (status === 'pending') return 'warn'
  return 'muted'
}

function ScheduleSkeleton() {
  return (
    <div className="view-pad">
      <div className="skeleton">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="sk-row">
            <div className="sk-bar" style={{ width: `${42 + i * 3}%` }} />
            <div className="sk-bar sk-thin" style={{ width: `${24 + i * 2}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CFISchedulePage() {
  const { session } = useAuth()
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchSchedule() {
      try {
        setLoading(true)
        setError(null)

        const token = session?.access_token
        const res = await fetch('/api/cfi/schedule', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (!res.ok) {
          throw new Error(`Failed to load schedule (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) setSchedule(data)
      } catch {
        if (!cancelled) setError('Could not load schedule. Refresh the page to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSchedule()
    return () => { cancelled = true }
  }, [session])

  const stats = useMemo(() => {
    const pending = schedule.filter((entry) => entry.status === 'pending').length
    const confirmed = schedule.filter((entry) => entry.status === 'confirmed').length
    const completed = schedule.filter((entry) => entry.status === 'completed').length
    const next = schedule.find((entry) => entry.slots?.start_time)?.slots?.start_time
    return { pending, confirmed, completed, next }
  }, [schedule])

  if (loading) return <ScheduleSkeleton />

  return (
    <>
      <div className="cfi-toolbar">
        <div className="tb-date">
          <span className="mono dim">CFI SCHEDULE</span>
          <span className="mono">{schedule.length} lessons</span>
        </div>
        <div className="tb-divider" />
        <div className="tb-group mono dim">next 7 days</div>
        <div className="tb-spacer" />
        <Link href="/cfi/log" className="btn-primary"><I name="plus" /> Log Hours</Link>
        <Link href="/cfi/availability" className="btn-ghost"><I name="cal" /> Availability</Link>
      </div>

      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">CONFIRMED</div><div className="stat-v">{stats.confirmed}</div><div className="stat-delta pos">ready to fly</div></div>
          <div className="stat"><div className="stat-k mono">PENDING</div><div className="stat-v">{stats.pending}</div><div className={stats.pending ? 'stat-delta warn' : 'stat-delta dim'}>{stats.pending ? 'confirm today' : 'clear'}</div></div>
          <div className="stat"><div className="stat-k mono">COMPLETED</div><div className="stat-v">{stats.completed}</div><div className="stat-delta dim">needs log check</div></div>
          <div className="stat"><div className="stat-k mono">NEXT</div><div className="stat-v">{stats.next ? formatTimeRange({ slots: { start_time: stats.next, end_time: stats.next, type: '' } } as ScheduleEntry).split(' - ')[0] : '-'}</div><div className="stat-delta dim">America/New_York</div></div>
        </div>

        <div className="sect-head">
          <h3>Lesson queue</h3>
          <span className="mono dim">student · mission · status</span>
        </div>

        {error ? (
          <div className="cfi-muted-panel neg">{error}</div>
        ) : schedule.length === 0 ? (
          <div className="empty-state">
            <div className="empty-ico"><I name="cal" size={22} /></div>
            <div className="empty-title">No lessons scheduled</div>
            <div className="empty-sub mono dim">No confirmed or pending lessons in the next 7 days.</div>
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
            {schedule.map((entry) => (
              <div key={entry.id} className="cfi-board-row">
                <div>
                  <div className="mono strong">{entry.slots?.start_time ? formatTimeRange(entry) : '-'}</div>
                  <div className="mono dim">{entry.slots?.start_time ? formatDateTime(entry.slots.start_time).split(',')[0] : 'unscheduled'}</div>
                </div>
                <div>
                  <div className="strong">{entry.student_name}</div>
                  <div className="mono dim">{entry.user_id.slice(0, 8)}</div>
                </div>
                <div>
                  <div>{entry.slots?.type ?? 'Lesson'}</div>
                  <div className="mono dim">{entry.notes || 'no notes'}</div>
                </div>
                <div><Badge kind={statusKind(entry.status)}>{entry.status.toUpperCase()}</Badge></div>
                <div className="dc-actions">
                  <Link className="btn-ghost" href="/cfi/log">Debrief</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
