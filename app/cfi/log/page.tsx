'use client'

import { useEffect, useState, useCallback } from 'react'
import CFIPageShell from '@/app/components/CFIPageShell'
import { useAuth } from '@/app/contexts/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

type Student = {
  user_id: string
  full_name: string
  email?: string
}

type FlightLogEntry = {
  id: string
  student_id: string
  instructor_id: string
  completed_at: string
  notes: string | null
  student_name?: string
}

type EndorsementEntry = {
  id: string
  student_id: string
  instructor_id: string
  endorsement_type: string
  endorsed_at: string
  notes: string | null
}

type EndorsementType =
  | 'solo'
  | 'xc_solo'
  | 'night_solo'
  | 'checkride_prep'
  | 'instrument_proficiency_check'
  | 'flight_review'
  | 'other'

// ── Constants ─────────────────────────────────────────────────────────────────

const ENDORSEMENT_TYPE_LABELS: Record<EndorsementType, string> = {
  solo: 'Solo',
  xc_solo: 'XC Solo',
  night_solo: 'Night Solo',
  checkride_prep: 'Checkride Prep',
  instrument_proficiency_check: 'IPC',
  flight_review: 'Flight Review',
  other: 'Other',
}

const ENDORSEMENT_TYPES = Object.keys(ENDORSEMENT_TYPE_LABELS) as EndorsementType[]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  })
}

function truncate(text: string | null, max = 50): string {
  if (!text) return '—'
  return text.length > max ? text.slice(0, max) + '…' : text
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Badge components ──────────────────────────────────────────────────────────

function EndorsementBadge({ type }: { type: string }) {
  const label = ENDORSEMENT_TYPE_LABELS[type as EndorsementType] ?? type
  const isOther = type === 'other'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isOther
          ? 'bg-slate-100 text-slate-700 border border-slate-300'
          : 'bg-[#FFF3C9] text-[#7A5C00] border border-[#D7B24A]'
      }`}
    >
      {label}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  )
}

// ── Dialog (modal overlay, matches schedule/page.tsx pattern) ────────────────

function ModalOverlay({
  open,
  onClose,
  title,
  dialogId,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  dialogId: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogId}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-100 px-6 py-4">
          <h2 id={dialogId} className="text-xl font-semibold text-darkText">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-darkText"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Log Hours Dialog ──────────────────────────────────────────────────────────

function LogHoursDialog({
  open,
  onClose,
  students,
  token,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  students: Student[]
  token: string | undefined
  onSuccess: () => void
}) {
  const [studentId, setStudentId] = useState('')
  const [hours, setHours] = useState('')
  const [date, setDate] = useState(todayISO)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setStudentId('')
    setHours('')
    setDate(todayISO())
    setNotes('')
    setError(null)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !hours || !date) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/cfi/flight-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          student_id: studentId,
          hours: parseFloat(hours),
          date,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        setError(
          'The flight hours could not be recorded. Check your connection and try again. If the problem persists, contact support.'
        )
        return
      }

      resetForm()
      onSuccess()
      onClose()
    } catch {
      setError(
        'The flight hours could not be recorded. Check your connection and try again. If the problem persists, contact support.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay open={open} onClose={handleClose} title="Log Hours" dialogId="log-hours-title">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student */}
        <div>
          <label htmlFor="log-student" className="mb-1.5 block text-sm font-medium text-darkText">
            Student
          </label>
          <select
            id="log-student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-darkText focus:outline-none focus:ring-2 focus:ring-golden/40"
          >
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Hours Flown */}
        <div>
          <label htmlFor="log-hours" className="mb-1.5 block text-sm font-medium text-darkText">
            Hours Flown
          </label>
          <input
            id="log-hours"
            type="number"
            step="0.1"
            min="0.1"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
            placeholder="1.5"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-darkText focus:outline-none focus:ring-2 focus:ring-golden/40"
          />
        </div>

        {/* Date */}
        <div>
          <label htmlFor="log-date" className="mb-1.5 block text-sm font-medium text-darkText">
            Date
          </label>
          <input
            id="log-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-darkText focus:outline-none focus:ring-2 focus:ring-golden/40"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="log-notes" className="mb-1.5 block text-sm font-medium text-darkText">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="log-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Flight notes…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-darkText focus:outline-none focus:ring-2 focus:ring-golden/40"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-golden/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !studentId || !hours || !date}
            className="rounded-xl bg-golden px-4 py-2 text-sm font-semibold text-darkText transition-colors hover:bg-[#FFE79A] disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-golden/40"
          >
            {saving ? 'Logging…' : 'Save Flight Log'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

// ── Log Endorsement Dialog ────────────────────────────────────────────────────

function LogEndorsementDialog({
  open,
  onClose,
  students,
  token,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  students: Student[]
  token: string | undefined
  onSuccess: () => void
}) {
  const [studentId, setStudentId] = useState('')
  const [endorsementType, setEndorsementType] = useState<EndorsementType | ''>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setStudentId('')
    setEndorsementType('')
    setNotes('')
    setError(null)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !endorsementType) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/cfi/endorsements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          student_id: studentId,
          endorsement_type: endorsementType,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        setError(
          'The endorsement could not be saved. Check your connection and try again. If the problem persists, contact support.'
        )
        return
      }

      resetForm()
      onSuccess()
      onClose()
    } catch {
      setError(
        'The endorsement could not be saved. Check your connection and try again. If the problem persists, contact support.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay
      open={open}
      onClose={handleClose}
      title="Log Endorsement"
      dialogId="log-endorsement-title"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student */}
        <div>
          <label htmlFor="endorse-student" className="mb-1.5 block text-sm font-medium text-darkText">
            Student
          </label>
          <select
            id="endorse-student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-darkText focus:outline-none focus:ring-2 focus:ring-golden/40"
          >
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Endorsement Type */}
        <div>
          <label htmlFor="endorse-type" className="mb-1.5 block text-sm font-medium text-darkText">
            Endorsement Type
          </label>
          <select
            id="endorse-type"
            value={endorsementType}
            onChange={(e) => setEndorsementType(e.target.value as EndorsementType)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-darkText focus:outline-none focus:ring-2 focus:ring-golden/40"
          >
            <option value="">Select type…</option>
            {ENDORSEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENDORSEMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="endorse-notes" className="mb-1.5 block text-sm font-medium text-darkText">
            Notes{' '}
            <span className="text-slate-400 font-normal">
              {endorsementType === 'other' ? '(encouraged for "Other")' : '(optional)'}
            </span>
          </label>
          <textarea
            id="endorse-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Endorsement notes…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-darkText focus:outline-none focus:ring-2 focus:ring-golden/40"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-golden/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !studentId || !endorsementType}
            className="rounded-xl bg-golden px-4 py-2 text-sm font-semibold text-darkText transition-colors hover:bg-[#FFE79A] disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-golden/40"
          >
            {saving ? 'Recording…' : 'Record Endorsement'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CFILogPage() {
  const { session } = useAuth()
  const token = session?.access_token

  const [students, setStudents] = useState<Student[]>([])
  const [flightLogs, setFlightLogs] = useState<FlightLogEntry[]>([])
  const [endorsements, setEndorsements] = useState<EndorsementEntry[]>([])

  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [loadingEndorsements, setLoadingEndorsements] = useState(true)

  const [logHoursOpen, setLogHoursOpen] = useState(false)
  const [logEndorsementOpen, setLogEndorsementOpen] = useState(false)

  const authHeaders = useCallback(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  )

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true)
    try {
      const res = await fetch('/api/cfi/students', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStudents(Array.isArray(data) ? data : (data.students ?? []))
      }
    } catch {
      // silent — students will be empty, form will show no options
    } finally {
      setLoadingStudents(false)
    }
  }, [authHeaders])

  const fetchFlightLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/cfi/flight-log', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setFlightLogs(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setLoadingLogs(false)
    }
  }, [authHeaders])

  const fetchEndorsements = useCallback(async () => {
    setLoadingEndorsements(true)
    try {
      const res = await fetch('/api/cfi/endorsements', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setEndorsements(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setLoadingEndorsements(false)
    }
  }, [authHeaders])

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      await Promise.all([
        fetchStudents(),
        fetchFlightLogs(),
        fetchEndorsements(),
      ])
    }

    fetchAll()

    return () => {
      cancelled = true
    }
  }, [fetchStudents, fetchFlightLogs, fetchEndorsements])

  // ── Student name lookup ────────────────────────────────────────────────────

  const studentNameMap = new Map(students.map((s) => [s.user_id, s.full_name]))

  // ── Actions slot ──────────────────────────────────────────────────────────

  const actions = (
    <>
      <button
        type="button"
        onClick={() => setLogHoursOpen(true)}
        className="inline-flex items-center rounded-xl bg-golden px-4 py-2 text-sm font-semibold text-darkText transition-colors hover:bg-[#FFE79A] focus:outline-none focus:ring-2 focus:ring-golden/40"
      >
        Log Hours
      </button>
      <button
        type="button"
        onClick={() => setLogEndorsementOpen(true)}
        className="inline-flex items-center rounded-xl bg-golden px-4 py-2 text-sm font-semibold text-darkText transition-colors hover:bg-[#FFE79A] focus:outline-none focus:ring-2 focus:ring-golden/40"
      >
        Log Endorsement
      </button>
    </>
  )

  return (
    <CFIPageShell title="Flight Log" actions={actions}>
      {/* ── Flight Hours Section ─────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-darkText">Flight Hours</h2>

        {loadingLogs ? (
          <TableSkeleton />
        ) : flightLogs.length === 0 ? (
          <div role="status" aria-live="polite" className="py-12 text-center">
            <h3 className="text-base font-semibold text-darkText">No flight hours logged</h3>
            <p className="mt-2 text-sm text-slate-500">
              Use the Log Hours button above to record hours for a completed lesson.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" aria-busy={loadingLogs}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th scope="col" className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Date
                  </th>
                  <th scope="col" className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Student
                  </th>
                  <th scope="col" className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flightLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#FFFDF7]">
                    <td className="py-3 text-slate-700">
                      {formatDate(entry.completed_at)}
                    </td>
                    <td className="py-3 font-medium text-darkText">
                      {entry.student_name ?? studentNameMap.get(entry.student_id) ?? 'Unknown'}
                    </td>
                    <td className="py-3 text-slate-600">
                      {truncate(entry.notes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Endorsements Section ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-darkText">Endorsements</h2>

        {loadingEndorsements ? (
          <TableSkeleton />
        ) : endorsements.length === 0 ? (
          <div role="status" aria-live="polite" className="py-12 text-center">
            <h3 className="text-base font-semibold text-darkText">No endorsements on record</h3>
            <p className="mt-2 text-sm text-slate-500">
              Use the Log Endorsement button above to record your first endorsement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" aria-busy={loadingEndorsements}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th scope="col" className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Date
                  </th>
                  <th scope="col" className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Student
                  </th>
                  <th scope="col" className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Type
                  </th>
                  <th scope="col" className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {endorsements.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#FFFDF7]">
                    <td className="py-3 text-slate-700">
                      {formatDate(entry.endorsed_at)}
                    </td>
                    <td className="py-3 font-medium text-darkText">
                      {studentNameMap.get(entry.student_id) ?? 'Unknown'}
                    </td>
                    <td className="py-3">
                      <EndorsementBadge type={entry.endorsement_type} />
                    </td>
                    <td className="py-3 text-slate-600">
                      {truncate(entry.notes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <LogHoursDialog
        open={logHoursOpen}
        onClose={() => setLogHoursOpen(false)}
        students={students}
        token={token}
        onSuccess={fetchFlightLogs}
      />

      <LogEndorsementDialog
        open={logEndorsementOpen}
        onClose={() => setLogEndorsementOpen(false)}
        students={students}
        token={token}
        onSuccess={fetchEndorsements}
      />
    </CFIPageShell>
  )
}
