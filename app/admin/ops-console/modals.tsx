'use client'

import { useState, type ReactNode } from 'react'
import { I } from './primitives'
import { AIRCRAFT, INSTRUCTORS, STUDENTS, TICKS } from './data'

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

export function NewSlotModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { tail: string; start: string; end: string; student: string; cfi: string; lesson: string }) => void;
}) {
  const [tail, setTail] = useState('N428MF')
  const [start, setStart] = useState('13:00')
  const [end, setEnd] = useState('15:00')
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
            {AIRCRAFT.map(a => <option key={a.tail} value={a.tail}>{a.tail} · {a.model}</option>)}
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

export function ReassignModal({ booking, onClose, onReassign }: {
  booking: Booking; onClose: () => void; onReassign: (id: string, patch: Partial<Booking>) => void;
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
            {AIRCRAFT.map(a => <option key={a.tail} value={a.tail}>{a.tail} · {a.model}</option>)}
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
