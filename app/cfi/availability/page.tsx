'use client'

import { useEffect, useState, useCallback } from 'react'
import CFIPageShell from '@/app/components/CFIPageShell'
import { useAuth } from '@/app/contexts/AuthContext'
import type { InstructorAvailability } from '@/lib/types/calendar'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type DayBlocks = {
  [dow: number]: InstructorAvailability[]
}

function formatTime(timeStr: string): string {
  // timeStr is "HH:MM:SS" or "HH:MM"
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

function TableSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-10 animate-pulse rounded bg-slate-200" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CFIAvailabilityPage() {
  const { session } = useAuth()
  const [blocks, setBlocks] = useState<DayBlocks>({})
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Per-day add form state: { [dow]: { start_time, end_time, saving } }
  const [addForms, setAddForms] = useState<
    Record<number, { start_time: string; end_time: string; saving: boolean; error: string | null }>
  >(() =>
    Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [i, { start_time: '', end_time: '', saving: false, error: null }])
    )
  )

  const getAuthHeaders = useCallback(() => {
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
        // silent on initial load — user can retry
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAvailability()
    return () => { cancelled = true }
  }, [getAuthHeaders])

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
      setBlocks((prev) => ({
        ...prev,
        [dow]: [...(prev[dow] ?? []), newRow],
      }))
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
        setBlocks((prev) => ({
          ...prev,
          [dow]: (prev[dow] ?? []).filter((b) => b.id !== id),
        }))
      } else {
        setSaveError('Your availability could not be saved. Check your connection and try again.')
      }
    } catch {
      setSaveError('Your availability could not be saved. Check your connection and try again.')
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
          [dow]: (prev[dow] ?? []).map((b) => (b.id === block.id ? json.data : b)),
        }))
      } else {
        setSaveError('Your availability could not be saved. Check your connection and try again.')
      }
    } catch {
      setSaveError('Your availability could not be saved. Check your connection and try again.')
    }
  }

  return (
    <CFIPageShell title="Weekly Availability" description="Set the hours you are available to fly each week.">
      {saveError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="space-y-8">
            {Array.from({ length: 7 }, (_, dow) => (
              <div key={dow}>
                <h3 className="mb-3 text-sm font-semibold text-darkText">{DAY_NAMES[dow]}</h3>

                {(blocks[dow] ?? []).length > 0 ? (
                  <div className="mb-3 space-y-2">
                    {(blocks[dow] ?? []).map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5"
                      >
                        <span className="text-sm text-slate-700">
                          {formatTime(block.start_time)} — {formatTime(block.end_time)}
                          {!block.is_active && (
                            <span className="ml-2 text-xs text-slate-400">(inactive)</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggle(dow, block)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-golden/40"
                          >
                            {block.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(dow, block.id)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-slate-400">No availability set for {DAY_NAMES[dow]}.</p>
                )}

                {/* Add Block row */}
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor={`start-${dow}`}>
                      Start
                    </label>
                    <input
                      id={`start-${dow}`}
                      type="time"
                      value={addForms[dow].start_time}
                      onChange={(e) =>
                        setAddForms((prev) => ({ ...prev, [dow]: { ...prev[dow], start_time: e.target.value } }))
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-darkText focus:outline-none focus:ring-2 focus:ring-golden/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor={`end-${dow}`}>
                      End
                    </label>
                    <input
                      id={`end-${dow}`}
                      type="time"
                      value={addForms[dow].end_time}
                      onChange={(e) =>
                        setAddForms((prev) => ({ ...prev, [dow]: { ...prev[dow], end_time: e.target.value } }))
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-darkText focus:outline-none focus:ring-2 focus:ring-golden/40"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={addForms[dow].saving || !addForms[dow].start_time || !addForms[dow].end_time}
                    onClick={() => handleAdd(dow)}
                    className="rounded-xl bg-golden px-4 py-2 text-sm font-semibold text-darkText transition-colors hover:bg-[#FFE79A] disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-golden/40"
                  >
                    {addForms[dow].saving ? 'Saving...' : 'Add'}
                  </button>
                </div>
                {addForms[dow].error && (
                  <p className="mt-1 text-xs text-red-600">{addForms[dow].error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </CFIPageShell>
  )
}
