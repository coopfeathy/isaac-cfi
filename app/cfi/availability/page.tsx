'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import Link from 'next/link'
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

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="h-5 w-24 animate-pulse rounded bg-white/10 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="h-8 animate-pulse rounded bg-white/[0.06]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CFIAvailabilityPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [blocks, setBlocks] = useState<DayBlocks>({})
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)

  // Per-day add form state: { [dow]: { start_time, end_time, saving } }
  const [addForms, setAddForms] = useState<
    Record<number, { start_time: string; end_time: string; saving: boolean; error: string | null }>
  >(() =>
    Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [i, { start_time: '', end_time: '', saving: false, error: null }])
    )
  )

  // Get session from localStorage or context
  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      window.location.href = '/login'
      return
    }

    // Try to get session from Supabase context or localStorage
    const getSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        setSession(data.session)
      } catch {
        // Fallback: try to use auth token if available
        setSession({ access_token: '' })
      }
    }

    getSession()
  }, [user, authLoading])

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = session?.access_token
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
  }, [session])

  useEffect(() => {
    if (!session) return

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
  }, [session, getAuthHeaders])

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-24">
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* --------- Header --------- */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-golden/80 mb-3">
          <Link href="/cfi/dashboard" className="hover:text-golden transition">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-2">
          <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
            My Availability
          </span>
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-2xl">
          Set your weekly availability blocks. Toggle blocks active or inactive, or remove them entirely.
        </p>
      </div>

      {/* --------- Main Content --------- */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        {/* Error alert */}
        {saveError && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {saveError}
          </div>
        )}

        {/* Day cards */}
        <div className="space-y-6">
          {Array.from({ length: 7 }, (_, dow) => (
            <div
              key={dow}
              className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden"
            >
              {/* Day header bar */}
              <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">{DAY_NAMES[dow]}</h3>
              </div>

              {/* Day content */}
              <div className="p-4 space-y-3">
                {/* Existing blocks */}
                {(blocks[dow] ?? []).length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {(blocks[dow] ?? []).map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between rounded-lg bg-white/[0.06] border border-white/10 px-3 py-2 group"
                      >
                        <span
                          className={`text-sm font-medium ${
                            block.is_active ? 'text-green-300' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(block.start_time)} — {formatTime(block.end_time)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggle(dow, block)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              block.is_active
                                ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                            }`}
                          >
                            {block.is_active ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(dow, block.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                            aria-label="Delete block"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic mb-4">No availability set for {DAY_NAMES[dow]}.</p>
                )}

                {/* Add block form */}
                <div className="flex flex-col sm:flex-row gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[11px] uppercase tracking-widest text-gray-400 mb-1.5" htmlFor={`start-${dow}`}>
                      Start
                    </label>
                    <input
                      id={`start-${dow}`}
                      type="time"
                      value={addForms[dow].start_time}
                      onChange={(e) =>
                        setAddForms((prev) => ({ ...prev, [dow]: { ...prev[dow], start_time: e.target.value } }))
                      }
                      className="w-full rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white focus:border-golden/70 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] uppercase tracking-widest text-gray-400 mb-1.5" htmlFor={`end-${dow}`}>
                      End
                    </label>
                    <input
                      id={`end-${dow}`}
                      type="time"
                      value={addForms[dow].end_time}
                      onChange={(e) =>
                        setAddForms((prev) => ({ ...prev, [dow]: { ...prev[dow], end_time: e.target.value } }))
                      }
                      className="w-full rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white focus:border-golden/70 focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={addForms[dow].saving || !addForms[dow].start_time || !addForms[dow].end_time}
                    onClick={() => handleAdd(dow)}
                    className="rounded-lg bg-golden text-black font-semibold px-4 py-2 hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {addForms[dow].saving ? 'Adding...' : 'Add'}
                  </button>
                </div>
                {addForms[dow].error && (
                  <p className="text-xs text-red-300">{addForms[dow].error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scoped input styles */}
      <style jsx>{`
        input[type="time"] {
          color-scheme: dark;
        }
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.6;
        }
      `}</style>
    </div>
  )
}
