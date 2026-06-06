'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, I } from '@/app/admin/ops-console/primitives'
import { useAuth } from '@/app/contexts/AuthContext'
import type { InstructorAvailability } from '@/lib/types/calendar'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type DayBlocks = {
  [dow: number]: InstructorAvailability[]
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

function LoadingSkeleton() {
  return (
    <div className="view-pad">
      <div className="skeleton">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="sk-row">
            <div className="sk-bar" style={{ width: `${45 + i * 4}%` }} />
            <div className="sk-bar sk-thin" style={{ width: `${18 + i * 3}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CFIAvailabilityPage() {
  const { session } = useAuth()
  const [blocks, setBlocks] = useState<DayBlocks>({})
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [addForms, setAddForms] = useState<
    Record<number, { start_time: string; end_time: string; saving: boolean; error: string | null }>
  >(() =>
    Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [i, { start_time: '', end_time: '', saving: false, error: null }])
    )
  )

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = session?.access_token
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
  }, [session])

  useEffect(() => {
    let cancelled = false

    async function fetchAvailability() {
      try {
        setLoading(true)
        const res = await fetch('/api/cfi/availability', { headers: getAuthHeaders() })
        if (!res.ok) throw new Error('Failed to load availability')
        const json = await res.json()
        if (!cancelled) {
          const grouped: DayBlocks = {}
          for (const row of (json.data ?? []) as InstructorAvailability[]) {
            if (!grouped[row.day_of_week]) grouped[row.day_of_week] = []
            grouped[row.day_of_week].push(row)
          }
          setBlocks(grouped)
        }
      } catch {
        if (!cancelled) setSaveError('Availability could not be loaded. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAvailability()
    return () => { cancelled = true }
  }, [getAuthHeaders])

  const stats = useMemo(() => {
    const all = Object.values(blocks).flat()
    const active = all.filter((block) => block.is_active)
    return {
      total: all.length,
      active: active.length,
      inactive: all.length - active.length,
      days: Object.keys(blocks).filter((dow) => (blocks[Number(dow)] ?? []).length > 0).length,
    }
  }, [blocks])

  async function handleAdd(dow: number) {
    const form = addForms[dow]
    if (!form.start_time || !form.end_time) return

    setAddForms((prev) => ({ ...prev, [dow]: { ...prev[dow], saving: true, error: null } }))
    setSaveError(null)

    try {
      const res = await fetch('/api/cfi/availability', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ day_of_week: dow, start_time: form.start_time, end_time: form.end_time }),
      })

      if (!res.ok) {
        const json = await res.json()
        setAddForms((prev) => ({ ...prev, [dow]: { ...prev[dow], saving: false, error: json.error ?? 'Failed to add' } }))
        return
      }

      const json = await res.json()
      const newRow: InstructorAvailability = json.data
      setBlocks((prev) => ({ ...prev, [dow]: [...(prev[dow] ?? []), newRow] }))
      setAddForms((prev) => ({ ...prev, [dow]: { start_time: '', end_time: '', saving: false, error: null } }))
    } catch {
      setAddForms((prev) => ({ ...prev, [dow]: { ...prev[dow], saving: false, error: 'Network error' } }))
    }
  }

  async function handleDelete(dow: number, id: string) {
    setSaveError(null)
    try {
      const res = await fetch(`/api/cfi/availability?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (res.status === 204 || res.ok) {
        setBlocks((prev) => ({ ...prev, [dow]: (prev[dow] ?? []).filter((block) => block.id !== id) }))
      } else {
        setSaveError('Availability could not be saved. Check your connection and try again.')
      }
    } catch {
      setSaveError('Availability could not be saved. Check your connection and try again.')
    }
  }

  async function handleToggle(dow: number, block: InstructorAvailability) {
    setSaveError(null)
    try {
      const res = await fetch('/api/cfi/availability', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: block.id, is_active: !block.is_active }),
      })

      if (res.ok) {
        const json = await res.json()
        setBlocks((prev) => ({
          ...prev,
          [dow]: (prev[dow] ?? []).map((item) => (item.id === block.id ? json.data : item)),
        }))
      } else {
        setSaveError('Availability could not be saved. Check your connection and try again.')
      }
    } catch {
      setSaveError('Availability could not be saved. Check your connection and try again.')
    }
  }

  if (loading) return <LoadingSkeleton />

  return (
    <>
      <div className="cfi-toolbar">
        <div className="tb-date">
          <span className="mono dim">AVAILABILITY</span>
          <span className="mono">{stats.active} active blocks</span>
        </div>
        <div className="tb-divider" />
        <div className="tb-group mono dim">weekly recurrence</div>
        <div className="tb-spacer" />
        <button className="btn-ghost"><I name="refresh" /> Re-sync calendar</button>
      </div>

      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE</div><div className="stat-v">{stats.active}</div><div className="stat-delta pos">bookable</div></div>
          <div className="stat"><div className="stat-k mono">INACTIVE</div><div className="stat-v">{stats.inactive}</div><div className="stat-delta dim">hidden</div></div>
          <div className="stat"><div className="stat-k mono">COVERAGE</div><div className="stat-v">{stats.days}/7</div><div className="stat-delta dim">days configured</div></div>
          <div className="stat"><div className="stat-k mono">TOTAL</div><div className="stat-v">{stats.total}</div><div className="stat-delta warn">review monthly</div></div>
        </div>

        {saveError && <div className="cfi-muted-panel neg" style={{ marginBottom: 12 }}>{saveError}</div>}

        <div className="sect-head">
          <h3>Weekly availability matrix</h3>
          <span className="mono dim">toggle blocks active or inactive</span>
        </div>

        <div className="cfi-availability-grid">
          {DAY_NAMES.map((day, dow) => (
            <div key={day} className="cfi-day-card">
              <div className="cfi-day-head">
                <span className="strong">{day}</span>
                <span className="mono dim">{(blocks[dow] ?? []).length} block{(blocks[dow] ?? []).length === 1 ? '' : 's'}</span>
              </div>
              <div className="cfi-day-body">
                {(blocks[dow] ?? []).length > 0 ? (
                  (blocks[dow] ?? []).map((block) => (
                    <div key={block.id} className="cfi-time-block">
                      <span className="mono strong">{formatTime(block.start_time)} - {formatTime(block.end_time)}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button className="btn-ghost" onClick={() => void handleToggle(dow, block)}>
                          <Badge kind={block.is_active ? 'ok' : 'error'}>{block.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                        </button>
                        <button className="btn-ghost icon" onClick={() => void handleDelete(dow, block.id)} aria-label={`Delete ${day} block`}>
                          <I name="x-oct" />
                        </button>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="cfi-muted-panel mono dim">no blocks configured</div>
                )}

                <div className="cfi-inline-form">
                  <input
                    type="time"
                    value={addForms[dow].start_time}
                    onChange={(e) => setAddForms((prev) => ({ ...prev, [dow]: { ...prev[dow], start_time: e.target.value } }))}
                    aria-label={`${day} start time`}
                  />
                  <input
                    type="time"
                    value={addForms[dow].end_time}
                    onChange={(e) => setAddForms((prev) => ({ ...prev, [dow]: { ...prev[dow], end_time: e.target.value } }))}
                    aria-label={`${day} end time`}
                  />
                  <button
                    type="button"
                    disabled={addForms[dow].saving || !addForms[dow].start_time || !addForms[dow].end_time}
                    onClick={() => void handleAdd(dow)}
                    className="btn-primary"
                  >
                    {addForms[dow].saving ? 'Adding' : 'Add'}
                  </button>
                </div>
                {addForms[dow].error && <div className="mono neg">{addForms[dow].error}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
