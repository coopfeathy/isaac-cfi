'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { InstructorAvailability } from '@/lib/types/calendar'
import {
  DAY_NAMES,
  generateTimeOptions,
  formatTimeDisplay,
  validateTimeRange,
  checkOverlap,
} from './availability-template-utils'

const TIME_OPTIONS = generateTimeOptions()

type FormState = {
  dayOfWeek: number
  startTime: string
  endTime: string
}

const INITIAL_FORM: FormState = { dayOfWeek: 1, startTime: '08:00', endTime: '16:00' }

export default function AdminAvailabilityTemplateEditor() {
  const [entries, setEntries] = useState<InstructorAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ startTime: string; endTime: string }>({ startTime: '', endTime: '' })

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setError('Session expired. Please log in again.')
      return null
    }
    return session.access_token
  }, [])

  const fetchEntries = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/availability', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch')
      setEntries(json.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleAdd = async () => {
    const validationError = validateTimeRange(form.startTime, form.endTime)
    if (validationError) {
      setError(validationError)
      return
    }
    if (checkOverlap(entries, form.dayOfWeek, form.startTime, form.endTime)) {
      setError('This time range overlaps with an existing entry')
      return
    }

    const token = await getToken()
    if (!token) return
    setSaving(true)
    setError(null)

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimistic: InstructorAvailability = {
      id: tempId,
      day_of_week: form.dayOfWeek,
      start_time: form.startTime + ':00',
      end_time: form.endTime + ':00',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setEntries((prev) => [...prev, optimistic])

    try {
      const res = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          day_of_week: form.dayOfWeek,
          start_time: form.startTime,
          end_time: form.endTime,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create')
      // Replace optimistic entry with real one
      setEntries((prev) => prev.map((e) => (e.id === tempId ? json.data : e)))
      setForm(INITIAL_FORM)
    } catch (err) {
      // Rollback
      setEntries((prev) => prev.filter((e) => e.id !== tempId))
      setError(err instanceof Error ? err.message : 'Failed to add entry')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (entry: InstructorAvailability) => {
    const token = await getToken()
    if (!token) return

    const newActive = !entry.is_active
    // Optimistic update
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, is_active: newActive } : e)))

    try {
      const res = await fetch('/api/admin/availability', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: entry.id, is_active: newActive }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update')
      }
    } catch (err) {
      // Rollback
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, is_active: entry.is_active } : e)))
      setError(err instanceof Error ? err.message : 'Failed to update entry')
    }
  }

  const handleEditStart = (entry: InstructorAvailability) => {
    setEditingId(entry.id)
    setEditForm({
      startTime: entry.start_time.substring(0, 5),
      endTime: entry.end_time.substring(0, 5),
    })
    setError(null)
  }

  const handleEditSave = async (entry: InstructorAvailability) => {
    const validationError = validateTimeRange(editForm.startTime, editForm.endTime)
    if (validationError) {
      setError(validationError)
      return
    }
    if (checkOverlap(entries, entry.day_of_week, editForm.startTime, editForm.endTime, entry.id)) {
      setError('This time range overlaps with an existing entry')
      return
    }

    const token = await getToken()
    if (!token) return

    const prev = entries.slice()
    // Optimistic
    setEntries((curr) =>
      curr.map((e) =>
        e.id === entry.id
          ? { ...e, start_time: editForm.startTime + ':00', end_time: editForm.endTime + ':00' }
          : e,
      ),
    )
    setEditingId(null)

    try {
      const res = await fetch('/api/admin/availability', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: entry.id,
          start_time: editForm.startTime,
          end_time: editForm.endTime,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to update')
      }
    } catch (err) {
      setEntries(prev)
      setError(err instanceof Error ? err.message : 'Failed to update entry')
    }
  }

  const handleDelete = async (id: string) => {
    const token = await getToken()
    if (!token) return

    const prev = entries.slice()
    // Optimistic
    setEntries((curr) => curr.filter((e) => e.id !== id))

    try {
      const res = await fetch('/api/admin/availability', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to delete')
      }
    } catch (err) {
      setEntries(prev)
      setError(err instanceof Error ? err.message : 'Failed to delete entry')
    }
  }

  const entriesByDay = DAY_NAMES.map((name, i) => ({
    name,
    dayIndex: i,
    entries: entries.filter((e) => e.day_of_week === i).sort((a, b) => (a.start_time < b.start_time ? -1 : 1)),
  }))

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-darkText mb-4">Weekly Availability Template</h2>
      <p className="text-sm text-gray-500 mb-6">
        Set your recurring weekly availability. Students can only book during these hours.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Add New Entry */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h3 className="text-sm font-semibold text-darkText mb-3">Add Availability</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Day</label>
            <select
              value={form.dayOfWeek}
              onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
              className="px-3 py-2 rounded border border-gray-300 text-sm"
            >
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start</label>
            <select
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="px-3 py-2 rounded border border-gray-300 text-sm"
            >
              {TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End</label>
            <select
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="px-3 py-2 rounded border border-gray-300 text-sm"
            >
              {TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="bg-golden text-darkText font-bold px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      {/* Template Table */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {entriesByDay.map(({ name, dayIndex, entries: dayEntries }) => (
            <div key={dayIndex} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
              <span className="w-28 text-sm font-medium text-darkText pt-1 shrink-0">{name}</span>
              <div className="flex-1">
                {dayEntries.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">No availability</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dayEntries.map((entry) => {
                      const isEditing = editingId === entry.id
                      return (
                        <div
                          key={entry.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm border ${
                            entry.is_active
                              ? 'bg-golden/10 border-golden/30 text-darkText'
                              : 'bg-gray-100 border-gray-200 text-gray-400'
                          }`}
                        >
                          {isEditing ? (
                            <>
                              <select
                                value={editForm.startTime}
                                onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                                className="px-1 py-0.5 rounded border border-gray-300 text-xs"
                              >
                                {TIME_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-xs">–</span>
                              <select
                                value={editForm.endTime}
                                onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                                className="px-1 py-0.5 rounded border border-gray-300 text-xs"
                              >
                                {TIME_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleEditSave(entry)}
                                className="text-green-600 text-xs font-bold hover:underline"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-gray-400 text-xs hover:underline"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span
                                onClick={() => handleEditStart(entry)}
                                className="cursor-pointer hover:underline"
                              >
                                {formatTimeDisplay(entry.start_time)} – {formatTimeDisplay(entry.end_time)}
                              </span>
                              <button
                                onClick={() => handleToggle(entry)}
                                title={entry.is_active ? 'Deactivate' : 'Activate'}
                                className={`w-8 h-4 rounded-full relative transition-colors ${
                                  entry.is_active ? 'bg-golden' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                    entry.is_active ? 'left-4' : 'left-0.5'
                                  }`}
                                />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-400 hover:text-red-600 text-xs font-bold"
                                title="Delete"
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
