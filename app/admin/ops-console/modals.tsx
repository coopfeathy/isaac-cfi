'use client'

import { useState, type ReactNode } from 'react'
import { I } from './primitives'
import { INSTRUCTORS, STUDENTS, TICKS, SQUAWKS, MAINT_EVENTS } from './data'
import type { Aircraft } from './views'

type Booking = {
  id: string; tail: string; start: number; end: number; student: string;
  cfi: string | null; lesson: string; status: string; paid: boolean | null;
}

export function Modal({ title, onClose, children, footer, width = 520 }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number;
}) {
  return (
    <div className="ops-console-modal-scrim" onClick={onClose}>
      <div className="ops-console-modal" style={{ width }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="mono">{title}</span>
          <button className="btn-ghost icon" onClick={onClose}><I name="x-oct" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function NewSlotModal({ onClose, onCreate, prefill, aircraft }: {
  onClose: () => void;
  onCreate: (data: { tail: string; start: string; end: string; student: string; cfi: string; lesson: string }) => void;
  prefill?: { tail?: string; start?: string; end?: string };
  aircraft: Aircraft[];
}) {
  const defaultTail = prefill?.tail && aircraft.some(a => a.tail === prefill.tail)
    ? prefill.tail
    : (aircraft[0]?.tail ?? '')
  const [tail, setTail] = useState(defaultTail)
  const [start, setStart] = useState(prefill?.start ?? '13:00')
  const [end, setEnd] = useState(prefill?.end ?? '15:00')
  const [student, setStudent] = useState<string>(STUDENTS[0].name)
  const [cfi, setCfi] = useState('cfi_01')
  const [lesson, setLesson] = useState('PPL-04 Ground Ref')
  return (
    <Modal
      title="NEW SLOT"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onCreate({ tail, start, end, student, cfi, lesson })}>Create slot</button>
        </>
      }
    >
      <div className="form-grid">
        <div className="f-row">
          <label className="f-label mono">Aircraft</label>
          <select className="f-input mono" value={tail} onChange={e => setTail(e.target.value)}>
            {aircraft.map(a => <option key={a.tail} value={a.tail}>{a.tail} · {a.model}</option>)}
          </select>
        </div>
        <div className="f-row"><label className="f-label mono">Start</label><input className="f-input mono" value={start} onChange={e => setStart(e.target.value)} /></div>
        <div className="f-row"><label className="f-label mono">End</label><input className="f-input mono" value={end} onChange={e => setEnd(e.target.value)} /></div>
        <div className="f-row">
          <label className="f-label mono">Student</label>
          <select className="f-input" value={student} onChange={e => setStudent(e.target.value)}>
            {STUDENTS.map(s => <option key={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="f-row">
          <label className="f-label mono">Instructor</label>
          <select className="f-input" value={cfi} onChange={e => setCfi(e.target.value)}>
            {INSTRUCTORS.map(c => <option key={c.id} value={c.id}>{c.name} · {c.ratings.join('/')}</option>)}
          </select>
        </div>
        <div className="f-row"><label className="f-label mono">Lesson</label><input className="f-input" value={lesson} onChange={e => setLesson(e.target.value)} /></div>
      </div>
    </Modal>
  )
}

export function NewAircraftModal({ onClose, onCreate, existingTails }: {
  onClose: () => void;
  onCreate: (data: { tail: string; model: string; hobbs: number; nextInsp: string; status: string }) => void;
  existingTails: string[];
}) {
  const [tail, setTail] = useState('')
  const [model, setModel] = useState('Cessna 172S')
  const [hobbs, setHobbs] = useState('0.0')
  const [nextInsp, setNextInsp] = useState('100h @ TBD')
  const [status, setStatus] = useState('active')

  const normalizedTail = tail.trim().toUpperCase()
  const dupe = existingTails.includes(normalizedTail)
  const hobbsNum = Number(hobbs)
  const valid = !!normalizedTail && !dupe && !Number.isNaN(hobbsNum) && hobbsNum >= 0

  return (
    <Modal
      title="NEW AIRCRAFT"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!valid}
            style={valid ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}
            onClick={() => valid && onCreate({ tail: normalizedTail, model: model.trim(), hobbs: hobbsNum, nextInsp: nextInsp.trim() || '—', status })}
          >
            Add aircraft
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="f-row">
          <label className="f-label mono">Tail number</label>
          <input className="f-input mono" value={tail} onChange={e => setTail(e.target.value)} placeholder="N123AB" autoFocus />
        </div>
        {dupe && <div className="f-row"><div /><div className="warn mono" style={{ fontSize: 11 }}>{normalizedTail} is already in the fleet</div></div>}
        <div className="f-row">
          <label className="f-label mono">Model</label>
          <input className="f-input" value={model} onChange={e => setModel(e.target.value)} placeholder="Cessna 172S" />
        </div>
        <div className="f-row">
          <label className="f-label mono">Hobbs</label>
          <input className="f-input mono" value={hobbs} onChange={e => setHobbs(e.target.value)} inputMode="decimal" />
        </div>
        <div className="f-row">
          <label className="f-label mono">Next inspection</label>
          <input className="f-input" value={nextInsp} onChange={e => setNextInsp(e.target.value)} />
        </div>
        <div className="f-row">
          <label className="f-label mono">Status</label>
          <select className="f-input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="squawk">Squawk</option>
            <option value="ground">AOG / Ground</option>
          </select>
        </div>
      </div>
    </Modal>
  )
}

export function ReassignModal({ booking, onClose, onReassign, aircraft }: {
  booking: Booking; onClose: () => void; onReassign: (id: string, patch: Partial<Booking>) => void;
  aircraft: Aircraft[];
}) {
  const [tail, setTail] = useState(booking.tail)
  const [cfi, setCfi] = useState(booking.cfi || '')
  return (
    <Modal
      title={`REASSIGN · ${booking.id}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onReassign(booking.id, { tail, cfi })}>Apply</button>
        </>
      }
    >
      <div className="form-grid">
        <div className="f-row"><label className="f-label mono">Current student</label><div className="f-val">{booking.student}</div></div>
        <div className="f-row"><label className="f-label mono">Current slot</label><div className="f-val mono">{TICKS[booking.start]} – {TICKS[booking.end]}</div></div>
        <div className="f-row">
          <label className="f-label mono">New aircraft</label>
          <select className="f-input mono" value={tail} onChange={e => setTail(e.target.value)}>
            {aircraft.map(a => <option key={a.tail} value={a.tail}>{a.tail} · {a.model}</option>)}
          </select>
        </div>
        <div className="f-row">
          <label className="f-label mono">New instructor</label>
          <select className="f-input" value={cfi} onChange={e => setCfi(e.target.value)}>
            {INSTRUCTORS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}

export function AircraftDetailModal({ aircraft, bookings, onClose }: {
  aircraft: Aircraft; bookings: Booking[]; onClose: () => void;
}) {
  const today = bookings.filter(b => b.tail === aircraft.tail)
  const squawks = SQUAWKS.filter(s => s.tail === aircraft.tail)
  const maint = MAINT_EVENTS.filter(m => m.tail === aircraft.tail)
  const openSquawks = squawks.filter(s => s.status !== 'resolved')
  return (
    <Modal
      title={`AIRCRAFT · ${aircraft.tail}`}
      onClose={onClose}
      width={680}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={() => window.__toast?.('Opening aircraft record')}>Open full record ›</button>
        </>
      }
    >
      <div className="ins-hero">
        <div className="hero-id mono">{aircraft.tail}</div>
        <div className="hero-title">{aircraft.model}</div>
        <div className="hero-sub mono dim">KMHR · based · last sync 09:12</div>
        <div className="hero-chips">
          {aircraft.status === 'active' && <span className="chip chip-muted mono"><span className="chip-dot" style={{ background: 'var(--teal-1)' }} />ACTIVE</span>}
          {aircraft.status === 'squawk' && <span className="chip chip-muted mono"><span className="chip-dot" style={{ background: 'var(--amber-1)' }} />SQUAWK</span>}
          {aircraft.status === 'ground' && <span className="chip chip-muted mono"><span className="chip-dot" style={{ background: 'var(--red-1)' }} />AOG</span>}
          <span className="chip chip-muted mono">TACH {aircraft.hobbs.toFixed(1)}</span>
        </div>
      </div>
      <div className="ins-sect-head"><span className="mono">TIMES &amp; INSPECTIONS</span></div>
      <div className="f-row"><label className="f-label mono">Model</label><div className="f-val">{aircraft.model}</div></div>
      <div className="f-row"><label className="f-label mono">Tach total</label><div className="f-val mono">{aircraft.hobbs.toFixed(1)} h</div></div>
      <div className="f-row"><label className="f-label mono">Next inspection</label><div className="f-val mono">{aircraft.nextInsp}</div></div>
      <div className="f-row"><label className="f-label mono">Bookings today</label><div className="f-val mono">{today.length}</div></div>
      <div className="ins-sect-head"><span className="mono">OPEN SQUAWKS</span></div>
      {openSquawks.length === 0
        ? <div className="f-val dim">None</div>
        : openSquawks.map(s => (
          <div key={s.id} className="f-row">
            <label className="f-label mono">{s.id}</label>
            <div className="f-val">{s.item} <span className="dim mono">· {s.reported}</span></div>
          </div>
        ))}
      <div className="ins-sect-head"><span className="mono">MAINTENANCE</span></div>
      {maint.length === 0
        ? <div className="f-val dim">No scheduled events</div>
        : maint.map(m => (
          <div key={m.id} className="f-row">
            <label className="f-label mono">{m.kind}</label>
            <div className="f-val mono">{m.due} <span className="dim">· {m.status.replace('_', ' ')}</span></div>
          </div>
        ))}
    </Modal>
  )
}

export function ConfirmModal({ title, message, confirmLabel, onClose, onConfirm, danger }: {
  title: string; message: string; confirmLabel: string;
  onClose: () => void; onConfirm: () => void; danger?: boolean;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <div className="confirm-msg">{message}</div>
    </Modal>
  )
}

export function Toast({ toast }: { toast: { msg: string; kind?: string } | null }) {
  if (!toast) return null
  return (
    <div className={`ops-console-toast toast-${toast.kind || 'info'}`}>
      <I name={toast.kind === 'error' ? 'alert' : toast.kind === 'ok' ? 'check' : 'info'} />
      <span>{toast.msg}</span>
    </div>
  )
}
