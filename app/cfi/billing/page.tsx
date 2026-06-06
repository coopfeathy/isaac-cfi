'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, I } from '@/app/admin/ops-console/primitives'
import { useAuth } from '@/app/contexts/AuthContext'

type Student = {
  user_id: string
  full_name: string
  email: string
}

type Invoice = {
  id: string
  student_user_id: string
  student_name: string
  student_email: string
  flight_hours: number
  instruction_hours: number
  rate_flight: number
  rate_instruction: number
  notes: string | null
  amount_total: number
  status: 'draft' | 'sent' | 'paid'
  sent_at: string | null
  paid_at: string | null
  created_at: string
}

const DEFAULT_FLIGHT_RATE = 195
const DEFAULT_INSTRUCTION_RATE = 85

function money(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusKind(status: Invoice['status']) {
  if (status === 'paid') return 'ok'
  if (status === 'sent') return 'warn'
  return 'muted'
}

function BillingSkeleton() {
  return (
    <div className="view-pad">
      <div className="skeleton">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sk-row">
            <div className="sk-bar" style={{ width: `${42 + i * 4}%` }} />
            <div className="sk-bar sk-thin" style={{ width: `${18 + i * 2}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CFIBillingPage() {
  const { session } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  // Draft form
  const [studentId, setStudentId] = useState('')
  const [flightHours, setFlightHours] = useState('')
  const [instructionHours, setInstructionHours] = useState('')
  const [flightRate, setFlightRate] = useState(String(DEFAULT_FLIGHT_RATE))
  const [instructionRate, setInstructionRate] = useState(String(DEFAULT_INSTRUCTION_RATE))
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)

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
        const [studentsRes, billingRes] = await Promise.all([
          fetch('/api/cfi/students', { headers }),
          fetch('/api/cfi/billing', { headers }),
        ])
        if (!studentsRes.ok) throw new Error('students')
        const studentData = (await studentsRes.json()) as Array<{
          user_id: string
          full_name: string
          email: string
        }>
        if (cancelled) return
        setStudents(studentData.map((s) => ({ user_id: s.user_id, full_name: s.full_name, email: s.email })))
        if (studentData.length > 0) setStudentId(studentData[0].user_id)
        if (billingRes.ok) {
          const billingData = (await billingRes.json()) as { invoices: Invoice[] }
          setInvoices(billingData.invoices ?? [])
        }
      } catch {
        if (!cancelled) setError('Could not load billing data. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [getAuthHeaders])

  const flight = Number(flightHours) || 0
  const instruction = Number(instructionHours) || 0
  const rateF = Number(flightRate) || 0
  const rateI = Number(instructionRate) || 0
  const total = flight * rateF + instruction * rateI

  const stats = useMemo(() => {
    const outstanding = invoices.filter((i) => i.status === 'sent').reduce((sum, i) => sum + Number(i.amount_total), 0)
    const paid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount_total), 0)
    const draft = invoices.filter((i) => i.status === 'draft').length
    return { outstanding, paid, draft, count: invoices.length }
  }, [invoices])

  function resetForm() {
    setFlightHours('')
    setInstructionHours('')
    setNotes('')
    setFlightRate(String(DEFAULT_FLIGHT_RATE))
    setInstructionRate(String(DEFAULT_INSTRUCTION_RATE))
  }

  async function handleSend(asDraft: boolean) {
    if (!studentId) return
    if (flight === 0 && instruction === 0) {
      setError('Enter at least one flight or instruction hour.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/cfi/billing', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_user_id: studentId,
          flight_hours: flight,
          instruction_hours: instruction,
          rate_flight: rateF,
          rate_instruction: rateI,
          notes,
          action: asDraft ? 'draft' : 'send',
        }),
      })
      if (!res.ok) throw new Error('billing')
      const data = (await res.json()) as { invoice: Invoice }
      setInvoices((prev) => [data.invoice, ...prev])
      setFlash(asDraft ? 'Draft saved.' : `Bill sent to ${data.invoice.student_email}.`)
      resetForm()
      window.setTimeout(() => setFlash(null), 4000)
    } catch {
      setError('Could not save bill. Try again.')
    } finally {
      setSending(false)
    }
  }

  async function markPaid(id: string) {
    try {
      const res = await fetch('/api/cfi/billing', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status: 'paid' }),
      })
      if (!res.ok) throw new Error('mark paid')
      const data = (await res.json()) as { invoice: Invoice }
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? data.invoice : inv)))
    } catch {
      setError('Could not update invoice.')
    }
  }

  async function resend(inv: Invoice) {
    try {
      const res = await fetch('/api/cfi/billing', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_user_id: inv.student_user_id,
          flight_hours: inv.flight_hours,
          instruction_hours: inv.instruction_hours,
          rate_flight: inv.rate_flight,
          rate_instruction: inv.rate_instruction,
          notes: inv.notes,
          action: 'send',
        }),
      })
      if (!res.ok) throw new Error('resend')
      setFlash(`Bill resent to ${inv.student_email}.`)
      window.setTimeout(() => setFlash(null), 4000)
    } catch {
      setError('Could not resend invoice.')
    }
  }

  if (loading) return <BillingSkeleton />

  const selectedStudent = students.find((s) => s.user_id === studentId)

  return (
    <>
      <div className="cfi-toolbar">
        <div className="tb-date">
          <span className="mono dim">BILLING</span>
          <span className="mono">{invoices.length} invoices</span>
        </div>
        <div className="tb-divider" />
        <div className="tb-group mono dim">flat-rate flight · CFI instruction</div>
        <div className="tb-spacer" />
        <button className="btn-ghost" onClick={resetForm}><I name="refresh" /> Reset form</button>
      </div>

      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">OUTSTANDING</div><div className="stat-v">{money(stats.outstanding)}</div><div className={stats.outstanding ? 'stat-delta warn' : 'stat-delta pos'}>{stats.outstanding ? 'awaiting payment' : 'all caught up'}</div></div>
          <div className="stat"><div className="stat-k mono">COLLECTED</div><div className="stat-v">{money(stats.paid)}</div><div className="stat-delta pos">paid YTD</div></div>
          <div className="stat"><div className="stat-k mono">DRAFTS</div><div className="stat-v">{stats.draft}</div><div className="stat-delta dim">not yet sent</div></div>
          <div className="stat"><div className="stat-k mono">INVOICES</div><div className="stat-v">{stats.count}</div><div className="stat-delta dim">total sent</div></div>
        </div>

        {flash && <div className="cfi-flash-ok">{flash}</div>}
        {error && <div className="cfi-muted-panel neg" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="sect-head">
          <h3>Send a bill</h3>
          <span className="mono dim">just hours, no math — we do the rest</span>
        </div>

        <div className="cfi-bill-form">
          <div className="cfi-bill-grid">
            <label className="cfi-field">
              <span className="cfi-field-label mono dim">STUDENT</span>
              <select className="cfi-form-select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {students.length === 0 && <option value="">No students assigned</option>}
                {students.map((s) => (
                  <option key={s.user_id} value={s.user_id}>{s.full_name} — {s.email}</option>
                ))}
              </select>
            </label>

            <label className="cfi-field">
              <span className="cfi-field-label mono dim">FLIGHT HOURS</span>
              <input
                type="number"
                step="0.1"
                min="0"
                className="cfi-form-input"
                value={flightHours}
                onChange={(e) => setFlightHours(e.target.value)}
                placeholder="e.g. 1.5"
              />
            </label>

            <label className="cfi-field">
              <span className="cfi-field-label mono dim">INSTRUCTION HOURS</span>
              <input
                type="number"
                step="0.1"
                min="0"
                className="cfi-form-input"
                value={instructionHours}
                onChange={(e) => setInstructionHours(e.target.value)}
                placeholder="e.g. 2.0"
              />
            </label>

            <label className="cfi-field">
              <span className="cfi-field-label mono dim">FLIGHT RATE $/HR</span>
              <input
                type="number"
                step="1"
                min="0"
                className="cfi-form-input"
                value={flightRate}
                onChange={(e) => setFlightRate(e.target.value)}
              />
            </label>

            <label className="cfi-field">
              <span className="cfi-field-label mono dim">INSTRUCTION $/HR</span>
              <input
                type="number"
                step="1"
                min="0"
                className="cfi-form-input"
                value={instructionRate}
                onChange={(e) => setInstructionRate(e.target.value)}
              />
            </label>

            <label className="cfi-field cfi-field-wide">
              <span className="cfi-field-label mono dim">NOTES (OPTIONAL)</span>
              <input
                type="text"
                className="cfi-form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="N511MF · steep turns + ground review"
              />
            </label>
          </div>

          <div className="cfi-bill-summary">
            <div className="cfi-bill-summary-row">
              <span className="mono dim">Flight: {flight.toFixed(1)} × {money(rateF)}</span>
              <span className="mono">{money(flight * rateF)}</span>
            </div>
            <div className="cfi-bill-summary-row">
              <span className="mono dim">Instruction: {instruction.toFixed(1)} × {money(rateI)}</span>
              <span className="mono">{money(instruction * rateI)}</span>
            </div>
            <div className="cfi-bill-summary-total">
              <span className="mono">TOTAL</span>
              <span className="cfi-bill-total-num">{money(total)}</span>
            </div>
            <div className="mono dim cfi-bill-recipient">
              {selectedStudent ? `→ ${selectedStudent.email}` : 'select a student'}
            </div>
          </div>

          <div className="cfi-bill-actions">
            <button className="btn-ghost" onClick={() => handleSend(true)} disabled={sending || !studentId}>
              Save draft
            </button>
            <button className="btn-primary" onClick={() => handleSend(false)} disabled={sending || !studentId || total === 0}>
              <I name="check" /> {sending ? 'Sending...' : `Send bill — ${money(total)}`}
            </button>
          </div>
        </div>

        <div className="sect-head" style={{ marginTop: 24 }}>
          <h3>Recent invoices</h3>
          <span className="mono dim">drafts · sent · paid</span>
        </div>

        {invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-ico"><I name="wallet" size={22} /></div>
            <div className="empty-title">No invoices yet</div>
            <div className="empty-sub mono dim">Fill out the form above to bill your first lesson.</div>
          </div>
        ) : (
          <div className="cfi-board-list">
            <div className="cfi-board-row cfi-board-head mono">
              <div>Date</div>
              <div>Student</div>
              <div>Hours</div>
              <div>Status</div>
              <div>Action</div>
            </div>
            {invoices.map((inv) => (
              <div key={inv.id} className="cfi-board-row">
                <div>
                  <div className="mono strong">{formatDate(inv.created_at)}</div>
                  <div className="mono dim">{money(Number(inv.amount_total))}</div>
                </div>
                <div>
                  <div className="strong">{inv.student_name}</div>
                  <div className="mono dim">{inv.student_email}</div>
                </div>
                <div>
                  <div>F {Number(inv.flight_hours).toFixed(1)} · I {Number(inv.instruction_hours).toFixed(1)}</div>
                  <div className="mono dim">{inv.notes || 'no notes'}</div>
                </div>
                <div><Badge kind={statusKind(inv.status)}>{inv.status.toUpperCase()}</Badge></div>
                <div className="dc-actions">
                  {inv.status === 'sent' && (
                    <>
                      <button className="btn-ghost" onClick={() => resend(inv)}>Resend</button>
                      <button className="btn-primary" onClick={() => markPaid(inv.id)}><I name="check" /> Paid</button>
                    </>
                  )}
                  {inv.status === 'draft' && (
                    <button className="btn-primary" onClick={() => resend(inv)}><I name="check" /> Send</button>
                  )}
                  {inv.status === 'paid' && <span className="mono dim">paid {inv.paid_at ? formatDate(inv.paid_at) : ''}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
