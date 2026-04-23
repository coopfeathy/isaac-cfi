'use client'

import { useState, type ReactNode } from 'react'
import { I } from './primitives'
import { INSTRUCTORS, STUDENTS, TICKS, SQUAWKS, MAINT_EVENTS } from './data'
import type { Aircraft, Student } from './views'

type Booking = {
  id: string; tail: string; start: number; end: number; student: string;
  studentId?: string | null; aircraftId?: string | null;
  cfi: string | null; cfiInitials?: string | null; lesson: string; status: string; paid: boolean | null;
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

type DirectoryOption = { id: string; name: string }

export function NewSlotModal({ onClose, onCreate, prefill, aircraft, instructors, studentList }: {
  onClose: () => void;
  onCreate: (data: { tail: string; start: string; end: string; student: string; cfi: string; lesson: string }) => void;
  prefill?: { tail?: string; start?: string; end?: string; student?: string };
  aircraft: Aircraft[];
  // Optional live lists from Supabase. If omitted we fall back to the seed
  // INSTRUCTORS/STUDENTS so the modal still works in demo mode.
  instructors?: DirectoryOption[];
  studentList?: DirectoryOption[];
}) {
  const cfiOpts: DirectoryOption[] = instructors && instructors.length > 0
    ? instructors
    : INSTRUCTORS.map(c => ({ id: c.id, name: `${c.name} · ${c.ratings.join('/')}` }))
  const studentOpts: DirectoryOption[] = studentList && studentList.length > 0
    ? studentList
    : STUDENTS.map(s => ({ id: s.id, name: s.name }))

  const defaultTail = prefill?.tail && aircraft.some(a => a.tail === prefill.tail)
    ? prefill.tail
    : (aircraft[0]?.tail ?? '')
  const defaultStudent = prefill?.student && studentOpts.some(s => s.name === prefill.student)
    ? prefill.student
    : (studentOpts[0]?.name ?? '')
  const [tail, setTail] = useState(defaultTail)
  const [start, setStart] = useState(prefill?.start ?? '13:00')
  const [end, setEnd] = useState(prefill?.end ?? '15:00')
  const [student, setStudent] = useState<string>(defaultStudent)
  const [cfi, setCfi] = useState<string>(cfiOpts[0]?.id ?? '')
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
          {/* Type-to-search combobox so picking a student out of the full
           * roster stays fast as the list grows. Any roster name the user
           * types matches the datalist; anything else is still accepted
           * (typed free-text gets stored as student_label). */}
          <input
            className="f-input"
            list="ops-console-students"
            value={student}
            onChange={e => setStudent(e.target.value)}
            placeholder="Type to search roster…"
          />
          <datalist id="ops-console-students">
            {studentOpts.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </datalist>
        </div>
        <div className="f-row">
          <label className="f-label mono">Instructor</label>
          <select className="f-input" value={cfi} onChange={e => setCfi(e.target.value)}>
            {cfiOpts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

export function NewStudentModal({ onClose, onCreate, existingNames }: {
  onClose: () => void;
  onCreate: (data: { fullName: string; email: string; phone: string; trainingStage: string }) => void;
  existingNames: string[];
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [trainingStage, setTrainingStage] = useState('PPL · Pre-solo')

  const trimmedName = fullName.trim()
  const dupe = existingNames.some(n => n.toLowerCase() === trimmedName.toLowerCase())
  const valid = trimmedName.length >= 2 && !dupe

  return (
    <Modal
      title="NEW STUDENT"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!valid}
            style={valid ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}
            onClick={() => valid && onCreate({ fullName: trimmedName, email: email.trim(), phone: phone.trim(), trainingStage: trainingStage.trim() })}
          >
            Add student
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="f-row">
          <label className="f-label mono">Full name</label>
          <input className="f-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" autoFocus />
        </div>
        {dupe && <div className="f-row"><div /><div className="warn mono" style={{ fontSize: 11 }}>A student named {trimmedName} already exists</div></div>}
        <div className="f-row">
          <label className="f-label mono">Email</label>
          <input className="f-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" type="email" />
        </div>
        <div className="f-row">
          <label className="f-label mono">Phone</label>
          <input className="f-input mono" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
        </div>
        <div className="f-row">
          <label className="f-label mono">Training stage</label>
          <select className="f-input" value={trainingStage} onChange={e => setTrainingStage(e.target.value)}>
            <option value="PPL · Pre-solo">PPL · Pre-solo</option>
            <option value="PPL · Solo XC">PPL · Solo XC</option>
            <option value="PPL · XC">PPL · XC</option>
            <option value="PPL · Checkride">PPL · Checkride</option>
            <option value="IR · Approaches">IR · Approaches</option>
            <option value="IR · Partial Panel">IR · Partial Panel</option>
            <option value="CPL">CPL</option>
            <option value="Discovery">Discovery</option>
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

export function AircraftDetailModal({ aircraft, bookings, onClose, onSave, onNewSlot }: {
  aircraft: Aircraft; bookings: Booking[]; onClose: () => void;
  onSave?: (patch: Partial<Aircraft> & { tail: string }) => void | Promise<void>;
  // Optional: when provided, the modal renders a "New slot" action that
  // hands the scheduling handoff back to the parent with this aircraft.
  onNewSlot?: (a: Aircraft) => void;
}) {
  const today = bookings.filter(b => b.tail === aircraft.tail)
  const squawks = SQUAWKS.filter(s => s.tail === aircraft.tail)
  const maint = MAINT_EVENTS.filter(m => m.tail === aircraft.tail)
  const openSquawks = squawks.filter(s => s.status !== 'resolved')

  // Local editable state, seeded from the incoming row. Home base defaults to
  // KPNE for rows that don't persist it yet.
  const [model, setModel] = useState(aircraft.model)
  const [homeBase, setHomeBase] = useState(aircraft.homeBase ?? 'KPNE')
  const [hobbs, setHobbs] = useState(String(aircraft.hobbs ?? 0))
  const [nextInsp, setNextInsp] = useState(aircraft.nextInsp ?? '—')
  const [status, setStatus] = useState(aircraft.status || 'active')
  const [saving, setSaving] = useState(false)
  // Editing is gated behind "Open full record" — the initial view shows a
  // read-only summary so the most common path (look-up) stays lightweight.
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  const hobbsNum = Number(hobbs)
  const dirty =
    model !== aircraft.model ||
    homeBase !== (aircraft.homeBase ?? 'KPNE') ||
    (!Number.isNaN(hobbsNum) && hobbsNum !== aircraft.hobbs) ||
    nextInsp !== aircraft.nextInsp ||
    status !== aircraft.status
  const valid = model.trim().length > 0 && !Number.isNaN(hobbsNum) && hobbsNum >= 0 && homeBase.trim().length > 0

  const statusMeta = status === 'active'
    ? { label: 'ACTIVE', dot: 'var(--teal-1)' }
    : status === 'squawk'
      ? { label: 'SQUAWK', dot: 'var(--amber-1)' }
      : status === 'ground'
        ? { label: 'AOG', dot: 'var(--red-1)' }
        : { label: status.toUpperCase(), dot: 'var(--fg-2)' }

  const handleSave = async () => {
    if (!onSave || !valid || !dirty) return
    setSaving(true)
    try {
      await onSave({
        tail: aircraft.tail,
        model: model.trim(),
        homeBase: homeBase.trim().toUpperCase(),
        hobbs: hobbsNum,
        nextInsp: nextInsp.trim() || '—',
        status,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`AIRCRAFT · ${aircraft.tail}`}
      onClose={onClose}
      width={680}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          {onNewSlot && (
            <button className="btn-ghost" onClick={() => onNewSlot(aircraft)}>
              <I name="plus" /> New slot
            </button>
          )}
          {mode === 'view' ? (
            <button className="btn-primary" onClick={() => setMode('edit')}>
              Open full record ›
            </button>
          ) : (
            <button
              className="btn-primary"
              disabled={!valid || !dirty || saving}
              style={(!valid || !dirty || saving) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'No changes'}
            </button>
          )}
        </>
      }
    >
      <div className="ins-hero">
        <div className="hero-id mono">{aircraft.tail}</div>
        <div className="hero-title">{model || aircraft.model}</div>
        <div className="hero-sub mono dim">{homeBase || 'KPNE'} · based</div>
        <div className="hero-chips">
          <span className="chip chip-muted mono"><span className="chip-dot" style={{ background: statusMeta.dot }} />{statusMeta.label}</span>
          <span className="chip chip-muted mono">TACH {Number.isNaN(hobbsNum) ? aircraft.hobbs.toFixed(1) : hobbsNum.toFixed(1)}</span>
          <span className="chip chip-muted mono">TODAY {today.length}</span>
        </div>
      </div>
      {mode === 'view' ? (
        <>
          <div className="ins-sect-head"><span className="mono">TIMES &amp; INSPECTIONS</span></div>
          <div className="f-row"><label className="f-label mono">Model</label><div className="f-val">{aircraft.model}</div></div>
          <div className="f-row"><label className="f-label mono">Home base</label><div className="f-val mono">{aircraft.homeBase ?? 'KPNE'}</div></div>
          <div className="f-row"><label className="f-label mono">Tach total</label><div className="f-val mono">{aircraft.hobbs.toFixed(1)} h</div></div>
          <div className="f-row"><label className="f-label mono">Next inspection</label><div className="f-val mono">{aircraft.nextInsp}</div></div>
          <div className="f-row"><label className="f-label mono">Bookings today</label><div className="f-val mono">{today.length}</div></div>
        </>
      ) : (
        <>
          <div className="ins-sect-head"><span className="mono">IDENTITY</span></div>
          <div className="f-row">
            <label className="f-label mono">Model</label>
            <input className="f-input" value={model} onChange={e => setModel(e.target.value)} placeholder="Grumman AA-5A Cheetah" />
          </div>
          <div className="f-row">
            <label className="f-label mono">Home base</label>
            <input className="f-input mono" value={homeBase} onChange={e => setHomeBase(e.target.value.toUpperCase())} placeholder="KPNE" maxLength={4} />
          </div>
          <div className="ins-sect-head"><span className="mono">TIMES &amp; INSPECTIONS</span></div>
          <div className="f-row">
            <label className="f-label mono">Tach total</label>
            <input className="f-input mono" value={hobbs} onChange={e => setHobbs(e.target.value)} inputMode="decimal" placeholder="1234.5" />
          </div>
          <div className="f-row">
            <label className="f-label mono">Next inspection</label>
            <input className="f-input" value={nextInsp} onChange={e => setNextInsp(e.target.value)} placeholder="100h @ 1300 or Annual 08/15" />
          </div>
          <div className="f-row">
            <label className="f-label mono">Bookings today</label>
            <div className="f-val mono">{today.length} <span className="dim">· live</span></div>
          </div>
          <div className="ins-sect-head"><span className="mono">MAINTENANCE STATUS</span></div>
          <div className="f-row">
            <label className="f-label mono">Status</label>
            <select className="f-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="squawk">Squawk</option>
              <option value="ground">AOG / Ground</option>
            </select>
          </div>
        </>
      )}
      <div className="ins-sect-head"><span className="mono">OPEN SQUAWKS</span></div>
      {openSquawks.length === 0
        ? <div className="f-val dim">None</div>
        : openSquawks.map(s => (
          <div key={s.id} className="f-row">
            <label className="f-label mono">{s.id}</label>
            <div className="f-val">{s.item} <span className="dim mono">· {s.reported}</span></div>
          </div>
        ))}
      <div className="ins-sect-head"><span className="mono">SCHEDULED MAINTENANCE</span></div>
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

export function StudentDetailModal({ student, bookings, onClose, onNewSlot }: {
  student: Student;
  // All known bookings (seed + DB). We filter to this student by name for the
  // recent-activity section until we wire student_id through the whole board.
  bookings: Booking[];
  onClose: () => void;
  // Hand off to the parent to open NewSlot prefilled with this student.
  onNewSlot?: (s: Student) => void;
}) {
  // "Hours" isn't yet a real DB field; mirror the StudentsView estimate
  // (progress fraction of a 40h syllabus) so the number stays consistent.
  const hoursEst = (student.progress * 40).toFixed(1)
  const lessonsDone = Math.round(student.progress * 22)

  const studentBookings = bookings
    .filter(b => b.student === student.name)
    .slice()
    .sort((a, b) => b.start - a.start)
  const recent = studentBookings.slice(0, 5)

  const statusMeta = student.status === 'active'
    ? { label: 'ACTIVE', dot: 'var(--teal-1)' }
    : student.status === 'pending'
      ? { label: 'PENDING', dot: 'var(--amber-1)' }
      : { label: student.status.toUpperCase(), dot: 'var(--fg-2)' }

  return (
    <Modal
      title={`STUDENT · ${student.id}`}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          {onNewSlot && (
            <button className="btn-primary" onClick={() => onNewSlot(student)}>
              <I name="plus" /> New slot
            </button>
          )}
        </>
      }
    >
      <div className="ins-hero">
        <div className="hero-id mono">{student.id}</div>
        <div className="hero-title">{student.name}</div>
        <div className="hero-sub mono dim">{student.phase}</div>
        <div className="hero-chips">
          <span className="chip chip-muted mono"><span className="chip-dot" style={{ background: statusMeta.dot }} />{statusMeta.label}</span>
          <span className="chip chip-muted mono">{Math.round(student.progress * 100)}% COMPLETE</span>
          <span className="chip chip-muted mono">{hoursEst}h</span>
        </div>
      </div>

      <div className="ins-sect-head"><span className="mono">PROGRESS</span></div>
      <div className="f-row">
        <label className="f-label mono">Phase</label>
        <div className="f-val">{student.phase}</div>
      </div>
      <div className="f-row">
        <label className="f-label mono">Completion</label>
        <div className="f-val" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="progress" style={{ flex: 1 }}>
            <div className="progress-fill" style={{ width: `${student.progress * 100}%` }} />
            <span className="progress-txt mono">{Math.round(student.progress * 100)}%</span>
          </div>
        </div>
      </div>
      <div className="f-row">
        <label className="f-label mono">Lessons</label>
        <div className="f-val mono">{lessonsDone}/22</div>
      </div>
      <div className="f-row">
        <label className="f-label mono">Hours (est.)</label>
        <div className="f-val mono">{hoursEst} <span className="dim">h</span></div>
      </div>
      <div className="f-row">
        <label className="f-label mono">Last lesson</label>
        <div className="f-val mono dim">{student.lastLesson || '—'}</div>
      </div>

      <div className="ins-sect-head"><span className="mono">RECENT ACTIVITY</span></div>
      {recent.length === 0
        ? <div className="f-val dim">No bookings on file</div>
        : recent.map(b => (
          <div key={b.id} className="f-row">
            <label className="f-label mono">{TICKS[b.start]}–{TICKS[b.end]}</label>
            <div className="f-val">
              <span className="mono">{b.tail}</span>
              {' · '}
              <span>{b.lesson}</span>
              {' '}
              <span className="dim mono">· {b.status}</span>
            </div>
          </div>
        ))}
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
