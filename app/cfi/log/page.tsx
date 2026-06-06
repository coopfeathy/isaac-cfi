'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Badge, I } from '@/app/admin/ops-console/primitives'
import { useAuth } from '@/app/contexts/AuthContext'

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

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  })
}

function truncate(text: string | null, max = 62): string {
  if (!text) return '-'
  return text.length > max ? text.slice(0, max) + '...' : text
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function TableSkeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div className="skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="sk-row">
          <div className="sk-bar" style={{ width: `${34 + i * 6}%` }} />
          <div className="sk-bar sk-thin" style={{ width: `${20 + i * 2}%` }} />
        </div>
      ))}
    </div>
  )
}

function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="ops-console-modal-scrim" onClick={onClose}>
      <div className="ops-console-modal" style={{ width: 520 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <span className="mono">{title}</span>
          <button className="btn-ghost icon" onClick={onClose} aria-label="Close"><I name="x-oct" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function LogHoursModal({
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

  function reset() {
    setStudentId('')
    setHours('')
    setDate(todayISO())
    setNotes('')
    setError(null)
  }

  async function submit() {
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
        setError('Flight hours could not be recorded. Check the roster and try again.')
        return
      }
      reset()
      onSuccess()
      onClose()
    } catch {
      setError('Flight hours could not be recorded. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell open={open} title="LOG HOURS" onClose={() => { reset(); onClose() }}>
      <div className="modal-body form-grid">
        <div className="f-row">
          <label className="f-label">Student</label>
          <select className="f-input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select student...</option>
            {students.map((student) => <option key={student.user_id} value={student.user_id}>{student.full_name}</option>)}
          </select>
        </div>
        <div className="f-row">
          <label className="f-label">Hours</label>
          <input className="f-input mono" type="number" step="0.1" min="0.1" max="24" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="1.5" />
        </div>
        <div className="f-row">
          <label className="f-label">Date</label>
          <input className="f-input mono" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="f-row" style={{ alignItems: 'start' }}>
          <label className="f-label">Notes</label>
          <textarea className="cfi-form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Flight notes" />
        </div>
        {error && <div className="confirm-msg neg">{error}</div>}
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={() => { reset(); onClose() }}>Cancel</button>
        <button className="btn-primary" disabled={saving || !studentId || !hours || !date} onClick={() => void submit()}>
          {saving ? 'Saving...' : 'Save Flight Log'}
        </button>
      </div>
    </ModalShell>
  )
}

function EndorsementModal({
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

  function reset() {
    setStudentId('')
    setEndorsementType('')
    setNotes('')
    setError(null)
  }

  async function submit() {
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
        setError('Endorsement could not be saved. Check the roster and try again.')
        return
      }
      reset()
      onSuccess()
      onClose()
    } catch {
      setError('Endorsement could not be saved. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell open={open} title="LOG ENDORSEMENT" onClose={() => { reset(); onClose() }}>
      <div className="modal-body form-grid">
        <div className="f-row">
          <label className="f-label">Student</label>
          <select className="f-input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select student...</option>
            {students.map((student) => <option key={student.user_id} value={student.user_id}>{student.full_name}</option>)}
          </select>
        </div>
        <div className="f-row">
          <label className="f-label">Type</label>
          <select className="f-input" value={endorsementType} onChange={(e) => setEndorsementType(e.target.value as EndorsementType)}>
            <option value="">Select type...</option>
            {ENDORSEMENT_TYPES.map((type) => <option key={type} value={type}>{ENDORSEMENT_TYPE_LABELS[type]}</option>)}
          </select>
        </div>
        <div className="f-row" style={{ alignItems: 'start' }}>
          <label className="f-label">Notes</label>
          <textarea className="cfi-form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Endorsement notes" />
        </div>
        {error && <div className="confirm-msg neg">{error}</div>}
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={() => { reset(); onClose() }}>Cancel</button>
        <button className="btn-primary" disabled={saving || !studentId || !endorsementType} onClick={() => void submit()}>
          {saving ? 'Recording...' : 'Record Endorsement'}
        </button>
      </div>
    </ModalShell>
  )
}

export default function CFILogPage() {
  const { session } = useAuth()
  const token = session?.access_token
  const [students, setStudents] = useState<Student[]>([])
  const [flightLogs, setFlightLogs] = useState<FlightLogEntry[]>([])
  const [endorsements, setEndorsements] = useState<EndorsementEntry[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [loadingEndorsements, setLoadingEndorsements] = useState(true)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [endorsementOpen, setEndorsementOpen] = useState(false)

  const authHeaders = useCallback(
    (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  )

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true)
    try {
      const res = await fetch('/api/cfi/students', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStudents(Array.isArray(data) ? data : (data.students ?? []))
      }
    } finally {
      setLoadingStudents(false)
    }
  }, [authHeaders])

  const fetchFlightLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/cfi/flight-log', { headers: authHeaders() })
      if (res.ok) setFlightLogs(await res.json())
    } finally {
      setLoadingLogs(false)
    }
  }, [authHeaders])

  const fetchEndorsements = useCallback(async () => {
    setLoadingEndorsements(true)
    try {
      const res = await fetch('/api/cfi/endorsements', { headers: authHeaders() })
      if (res.ok) setEndorsements(await res.json())
    } finally {
      setLoadingEndorsements(false)
    }
  }, [authHeaders])

  useEffect(() => {
    fetchStudents()
    fetchFlightLogs()
    fetchEndorsements()
  }, [fetchStudents, fetchFlightLogs, fetchEndorsements])

  const studentNameMap = useMemo(() => new Map(students.map((student) => [student.user_id, student.full_name])), [students])

  return (
    <>
      <div className="cfi-toolbar">
        <div className="tb-date">
          <span className="mono dim">LOGBOOK</span>
          <span className="mono">{flightLogs.length} completions</span>
        </div>
        <div className="tb-divider" />
        <div className="tb-group mono dim">{endorsements.length} endorsements</div>
        <div className="tb-spacer" />
        <button className="btn-primary" onClick={() => setHoursOpen(true)}><I name="plus" /> Log Hours</button>
        <button className="btn-ghost" onClick={() => setEndorsementOpen(true)}><I name="check" /> Endorsement</button>
      </div>

      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">COMPLETIONS</div><div className="stat-v">{flightLogs.length}</div><div className="stat-delta dim">recent 50</div></div>
          <div className="stat"><div className="stat-k mono">ENDORSEMENTS</div><div className="stat-v">{endorsements.length}</div><div className="stat-delta pos">recorded</div></div>
          <div className="stat"><div className="stat-k mono">ROSTER</div><div className="stat-v">{students.length}</div><div className={loadingStudents ? 'stat-delta warn' : 'stat-delta dim'}>{loadingStudents ? 'loading' : 'selectable'}</div></div>
          <div className="stat"><div className="stat-k mono">AUDIT</div><div className="stat-v">{loadingLogs || loadingEndorsements ? '-' : 'OK'}</div><div className="stat-delta dim">server-backed</div></div>
        </div>

        <div className="sect-head">
          <h3>Flight hours</h3>
          <span className="mono dim">lesson completion records</span>
        </div>
        {loadingLogs ? (
          <TableSkeleton />
        ) : flightLogs.length === 0 ? (
          <div className="cfi-muted-panel">No flight hours logged. Use Log Hours to record a completed lesson.</div>
        ) : (
          <table className="dt">
            <thead><tr><th>Date</th><th>Student</th><th>Instructor ID</th><th>Notes</th></tr></thead>
            <tbody>
              {flightLogs.map((entry) => (
                <tr key={entry.id}>
                  <td className="mono dim">{formatDate(entry.completed_at)}</td>
                  <td className="strong">{entry.student_name ?? studentNameMap.get(entry.student_id) ?? 'Unknown'}</td>
                  <td className="mono dim">{entry.instructor_id.slice(0, 8)}</td>
                  <td>{truncate(entry.notes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="sect-head" style={{ marginTop: 18 }}>
          <h3>Endorsements</h3>
          <span className="mono dim">student endorsements issued by this CFI</span>
        </div>
        {loadingEndorsements ? (
          <TableSkeleton lines={4} />
        ) : endorsements.length === 0 ? (
          <div className="cfi-muted-panel">No endorsements on record. Use Log Endorsement when a student is ready.</div>
        ) : (
          <table className="dt">
            <thead><tr><th>Date</th><th>Student</th><th>Type</th><th>Notes</th></tr></thead>
            <tbody>
              {endorsements.map((entry) => (
                <tr key={entry.id}>
                  <td className="mono dim">{formatDate(entry.endorsed_at)}</td>
                  <td className="strong">{studentNameMap.get(entry.student_id) ?? 'Unknown'}</td>
                  <td><Badge kind={entry.endorsement_type === 'other' ? 'muted' : 'info'}>{ENDORSEMENT_TYPE_LABELS[entry.endorsement_type as EndorsementType] ?? entry.endorsement_type}</Badge></td>
                  <td>{truncate(entry.notes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <LogHoursModal
        open={hoursOpen}
        onClose={() => setHoursOpen(false)}
        students={students}
        token={token}
        onSuccess={fetchFlightLogs}
      />
      <EndorsementModal
        open={endorsementOpen}
        onClose={() => setEndorsementOpen(false)}
        students={students}
        token={token}
        onSuccess={fetchEndorsements}
      />
    </>
  )
}
