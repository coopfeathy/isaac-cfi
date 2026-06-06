'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, I } from '@/app/admin/ops-console/primitives'
import { useAuth } from '@/app/contexts/AuthContext'

type AircraftBlock = {
  id: string
  aircraft_id: string
  tail_number: string
  model: string
  block_type: 'booking' | 'maintenance' | 'squawk'
  start_time: string
  end_time: string
  cfi_id: string | null
  cfi_name: string | null
  student_name: string | null
  notes: string | null
  status?: 'confirmed' | 'pending'
}

type Aircraft = {
  id: string
  tail_number: string
  model: string
  status: 'airworthy' | 'grounded' | 'maintenance'
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7)

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
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function AircraftSkeleton() {
  return (
    <div className="view-pad">
      <div className="skeleton">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sk-row">
            <div className="sk-bar" style={{ width: `${45 + i * 5}%` }} />
            <div className="sk-bar sk-thin" style={{ width: `${20 + i * 2}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CFIAircraftPage() {
  const { session, user } = useAuth()
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [blocks, setBlocks] = useState<AircraftBlock[]>([])
  const [selectedAircraft, setSelectedAircraft] = useState<string>('')
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overrideTarget, setOverrideTarget] = useState<AircraftBlock | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [sending, setSending] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)

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
        const res = await fetch('/api/cfi/aircraft', { headers: getAuthHeaders() })
        if (!res.ok) throw new Error('aircraft')
        const data = await res.json()
        if (cancelled) return
        setAircraft(data.aircraft ?? [])
        setBlocks(data.blocks ?? [])
        if ((data.aircraft ?? []).length > 0 && !selectedAircraft) {
          setSelectedAircraft(data.aircraft[0].id)
        }
      } catch {
        if (!cancelled) setError('Could not load aircraft availability. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [getAuthHeaders, selectedAircraft])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const blocksByDayHour = useMemo(() => {
    const map: Record<string, AircraftBlock[]> = {}
    for (const b of blocks.filter((b) => b.aircraft_id === selectedAircraft)) {
      const start = new Date(b.start_time)
      const dayIdx = weekDays.findIndex((d) => d.toDateString() === start.toDateString())
      if (dayIdx === -1) continue
      const startHour = start.getHours()
      const endHour = new Date(b.end_time).getHours()
      for (let h = startHour; h <= endHour && h <= HOURS[HOURS.length - 1]; h++) {
        if (h < HOURS[0]) continue
        const key = `${dayIdx}-${h}`
        if (!map[key]) map[key] = []
        if (h === startHour) map[key].push(b)
      }
    }
    return map
  }, [blocks, selectedAircraft, weekDays])

  const stats = useMemo(() => {
    const forAircraft = blocks.filter((b) => b.aircraft_id === selectedAircraft)
    return {
      bookings: forAircraft.filter((b) => b.block_type === 'booking').length,
      maintenance: forAircraft.filter((b) => b.block_type === 'maintenance').length,
      squawks: forAircraft.filter((b) => b.block_type === 'squawk').length,
      airworthy: aircraft.filter((a) => a.status === 'airworthy').length,
    }
  }, [blocks, aircraft, selectedAircraft])

  const currentAircraft = aircraft.find((a) => a.id === selectedAircraft)

  function blockClassName(b: AircraftBlock): string {
    if (b.block_type === 'maintenance') return 'cfi-block-maint'
    if (b.block_type === 'squawk') return 'cfi-block-squawk'
    if (b.cfi_id === user?.id) return 'cfi-block-mine'
    return 'cfi-block-other'
  }

  async function sendOverrideRequest() {
    if (!overrideTarget) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/cfi/aircraft-override', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          block_id: overrideTarget.id,
          aircraft_id: overrideTarget.aircraft_id,
          start_time: overrideTarget.start_time,
          end_time: overrideTarget.end_time,
          target_cfi_id: overrideTarget.cfi_id,
          reason: overrideReason,
        }),
      })
      if (!res.ok) throw new Error('override')
      setSentMessage(`Override request sent to ${overrideTarget.cfi_name}.`)
      setOverrideTarget(null)
      setOverrideReason('')
      window.setTimeout(() => setSentMessage(null), 4000)
    } catch {
      setError('Could not send override request. Try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <AircraftSkeleton />

  return (
    <>
      <div className="cfi-toolbar">
        <div className="tb-date">
          <span className="mono dim">AIRCRAFT</span>
          <span className="mono">{aircraft.length} in fleet</span>
        </div>
        <div className="tb-divider" />
        <select
          className="cfi-form-select"
          style={{ minWidth: 180 }}
          value={selectedAircraft}
          onChange={(e) => setSelectedAircraft(e.target.value)}
        >
          {aircraft.map((a) => (
            <option key={a.id} value={a.id}>
              {a.tail_number} · {a.model} {a.status !== 'airworthy' ? `· ${a.status.toUpperCase()}` : ''}
            </option>
          ))}
        </select>
        <button className="btn-ghost" onClick={() => setWeekStart(getWeekStart(addDays(weekStart, -7)))}>
          <I name="chev-l" /> Prev
        </button>
        <button className="btn-ghost" onClick={() => setWeekStart(getWeekStart(new Date()))}>Today</button>
        <button className="btn-ghost" onClick={() => setWeekStart(getWeekStart(addDays(weekStart, 7)))}>
          Next <I name="chev-r" />
        </button>
        <div className="tb-spacer" />
        <span className="mono dim">{formatDateLabel(weekStart)} – {formatDateLabel(addDays(weekStart, 6))}</span>
      </div>

      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-k mono">STATUS</div>
            <div className="stat-v">{currentAircraft?.status.toUpperCase() ?? '—'}</div>
            <div className={`stat-delta ${currentAircraft?.status === 'airworthy' ? 'pos' : 'warn'}`}>
              {currentAircraft?.tail_number ?? 'no aircraft'}
            </div>
          </div>
          <div className="stat"><div className="stat-k mono">BOOKINGS</div><div className="stat-v">{stats.bookings}</div><div className="stat-delta dim">this week</div></div>
          <div className="stat"><div className="stat-k mono">MAINT</div><div className="stat-v">{stats.maintenance}</div><div className={stats.maintenance ? 'stat-delta warn' : 'stat-delta dim'}>scheduled blocks</div></div>
          <div className="stat"><div className="stat-k mono">SQUAWKS</div><div className="stat-v">{stats.squawks}</div><div className={stats.squawks ? 'stat-delta neg' : 'stat-delta pos'}>{stats.squawks ? 'review' : 'clear'}</div></div>
        </div>

        {sentMessage && <div className="cfi-flash-ok">{sentMessage}</div>}
        {error && <div className="cfi-muted-panel neg" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="sect-head">
          <h3>Aircraft availability — {currentAircraft?.tail_number}</h3>
          <span className="mono dim">your bookings · others · maintenance · squawks</span>
        </div>

        <div className="cfi-legend">
          <span><span className="cfi-legend-dot cfi-block-mine" /> Your bookings</span>
          <span><span className="cfi-legend-dot cfi-block-other" /> Other CFI</span>
          <span><span className="cfi-legend-dot cfi-block-maint" /> Maintenance</span>
          <span><span className="cfi-legend-dot cfi-block-squawk" /> Grounded (squawk)</span>
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
                  const cellBlocks = blocksByDayHour[cellKey] ?? []
                  return (
                    <div key={dayIdx} className="cfi-week-cell">
                      {cellBlocks.map((b) => (
                        <div
                          key={b.id}
                          className={`cfi-week-lesson ${blockClassName(b)}`}
                          onClick={() => {
                            if (b.block_type === 'booking' && b.cfi_id !== user?.id) {
                              setOverrideTarget(b)
                            }
                          }}
                        >
                          <div className="cfi-week-lesson-time mono">
                            {formatTimeShort(b.start_time)}–{formatTimeShort(b.end_time)}
                          </div>
                          <div className="cfi-week-lesson-name">
                            {b.block_type === 'booking' ? (b.cfi_name ?? 'Booked') : b.block_type === 'maintenance' ? 'Maintenance' : 'GROUNDED'}
                          </div>
                          <div className="cfi-week-lesson-type mono dim">
                            {b.block_type === 'booking' ? b.student_name ?? '' : b.notes ?? ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="sect-head" style={{ marginTop: 18 }}>
          <h3>Block summary</h3>
          <span className="mono dim">click another CFI&apos;s booking to request override</span>
        </div>

        {blocks.filter((b) => b.aircraft_id === selectedAircraft).length === 0 ? (
          <div className="empty-state">
            <div className="empty-ico"><I name="plane" size={22} /></div>
            <div className="empty-title">Aircraft is fully open this week</div>
            <div className="empty-sub mono dim">No bookings, maintenance, or squawks on the books.</div>
          </div>
        ) : (
          <div className="cfi-board-list">
            <div className="cfi-board-row cfi-board-head mono">
              <div>Time</div>
              <div>CFI</div>
              <div>Mission</div>
              <div>Type</div>
              <div>Action</div>
            </div>
            {blocks
              .filter((b) => b.aircraft_id === selectedAircraft)
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((b) => {
                const isMine = b.cfi_id === user?.id
                return (
                  <div key={b.id} className="cfi-board-row">
                    <div>
                      <div className="mono strong">{formatTimeShort(b.start_time)} – {formatTimeShort(b.end_time)}</div>
                      <div className="mono dim">{formatDateLabel(new Date(b.start_time))}</div>
                    </div>
                    <div>
                      <div className="strong">{b.cfi_name ?? '—'}</div>
                      <div className="mono dim">{isMine ? 'you' : 'other instructor'}</div>
                    </div>
                    <div>
                      <div>{b.student_name ?? (b.block_type === 'maintenance' ? '100hr/Annual' : 'Squawk')}</div>
                      <div className="mono dim">{b.notes ?? '—'}</div>
                    </div>
                    <div>
                      <Badge kind={b.block_type === 'booking' ? (isMine ? 'ok' : 'muted') : b.block_type === 'maintenance' ? 'warn' : 'error'}>
                        {b.block_type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="dc-actions">
                      {b.block_type === 'booking' && !isMine ? (
                        <button className="btn-ghost" onClick={() => setOverrideTarget(b)}>
                          Request override
                        </button>
                      ) : (
                        <span className="mono dim">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {overrideTarget && (
        <div className="cfi-modal-backdrop" onClick={() => setOverrideTarget(null)}>
          <div className="cfi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cfi-modal-head">
              <div>
                <div className="mono dim">REQUEST OVERRIDE</div>
                <div className="cfi-modal-title">
                  {overrideTarget.tail_number} · {formatTimeShort(overrideTarget.start_time)}–{formatTimeShort(overrideTarget.end_time)}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setOverrideTarget(null)}>
                <I name="x-oct" />
              </button>
            </div>
            <div className="cfi-modal-body">
              <div className="cfi-info-row">
                <span className="mono dim">Currently booked by</span>
                <strong>{overrideTarget.cfi_name}</strong>
              </div>
              <div className="cfi-info-row">
                <span className="mono dim">Student</span>
                <strong>{overrideTarget.student_name ?? '—'}</strong>
              </div>
              <div className="cfi-info-row">
                <span className="mono dim">When</span>
                <strong className="mono">
                  {formatDateLabel(new Date(overrideTarget.start_time))} · {formatTimeShort(overrideTarget.start_time)}–{formatTimeShort(overrideTarget.end_time)}
                </strong>
              </div>
              <div className="cfi-modal-note">
                The current CFI will be notified and must accept before the booking is reassigned. They keep the slot if they decline or do not respond.
              </div>
              <label className="cfi-field">
                <span className="cfi-field-label mono dim">REASON</span>
                <textarea
                  className="cfi-form-textarea"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Why you need this slot — checkride window, weather backup, etc."
                />
              </label>
            </div>
            <div className="cfi-modal-foot">
              <button className="btn-ghost" onClick={() => setOverrideTarget(null)}>Cancel</button>
              <button className="btn-primary" onClick={sendOverrideRequest} disabled={sending || !overrideReason.trim()}>
                <I name="bell" /> {sending ? 'Sending...' : 'Send request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
