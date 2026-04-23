'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import './ops-console.css'
import { INITIAL_BOOKINGS, INITIAL_ALERTS, STUDENTS, type TreeNodeData } from './data'
import { supabase } from '@/lib/supabase'
import {
  Sidebar, TopBar, IconRail, DocNav, SubTabs, Toolbar, Inspector, OpsPulse,
  Tweaks, TWEAK_DEFAULTS, type TweakState,
  EMPTY_FILTERS, type Filters,
} from './shell'
import {
  ScheduleBoard, ScheduleTimeline, ScheduleCalendar, ScheduleCapacity,
  FleetView, StudentsView, IntegrityView, RequestsView, DispatchView,
  BillingView, SyllabusView, OnboardingView, PayoutsView, ExpensesView, DebriefsView,
  Skeleton, EmptyState, type Student, type Aircraft,
} from './views'
import { NewSlotModal, NewAircraftModal, NewStudentModal, ReassignModal, ConfirmModal, AircraftDetailModal, StudentDetailModal, Toast } from './modals'
import { listAircraft, createAircraft, deleteAircraft, updateAircraft } from '@/lib/ops-console/aircraft'
import { listStudents, softDeleteStudent, createStudent } from '@/lib/ops-console/students'
import { listPendingSlotRequests, approveSlotRequest, denySlotRequest, type OpsSlotRequest } from '@/lib/ops-console/slot-requests'
import { listInstructors, listActiveStudentsForDirectory, type DirectoryPerson } from '@/lib/ops-console/directory'
import {
  listEventsForDay, createScheduleEvent, moveScheduleEvent,
  resizeScheduleEvent, deleteScheduleEvent, tickToIso,
  type OpsScheduleEvent,
} from '@/lib/ops-console/schedule-events'

declare global {
  interface Window {
    __toast?: (msg: string, kind?: string) => void
  }
}

type Booking = {
  id: string; code?: string; tail: string; start: number; end: number; student: string;
  studentId?: string | null; aircraftId?: string | null;
  cfi: string | null; cfiInitials?: string | null; lesson: string; status: string; paid: boolean | null;
}
type AlertRow = { id: string; sev: string; code: string; msg: string; ts: string; resolved: boolean }
type ModalState =
  | { kind: 'new'; prefill?: { tail?: string; start?: string; end?: string; student?: string } }
  | { kind: 'reassign'; payload: Booking }
  | { kind: 'newAircraft' }
  | { kind: 'newStudent' }
  | { kind: 'aircraft'; payload: Aircraft }
  | { kind: 'student'; payload: Student }
  | { kind: 'confirm'; payload: { title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void } }
  | null

// Convert a tick index (30-min increments starting at 07:00) back to HH:MM.
function tickToHHMM(tick: number): string {
  const mins = tick * 30 + 7 * 60
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Use noon to avoid DST-induced off-by-one when adding days near spring-forward.
function makeDate(y: number, m: number, d: number) {
  return new Date(y, m, d, 12, 0, 0, 0)
}
function todayDate() {
  const n = new Date()
  return makeDate(n.getFullYear(), n.getMonth(), n.getDate())
}
function addDays(d: Date, n: number) {
  return makeDate(d.getFullYear(), d.getMonth(), d.getDate() + n)
}
function formatDateLabel(d: Date) {
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function OpsConsolePage() {
  const [selectedNode, setSelectedNode] = useState<TreeNodeData>({ id: 'schedule', label: 'Schedule Board', kind: 'view', view: 'schedule' })
  const [view, setView] = useState('schedule')
  const [subTab, setSubTab] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS as Booking[])
  // DB-backed schedule events for the currently viewed day. `null` means we
  // haven't fetched yet (or the fetch failed) and the board falls back to the
  // in-memory `bookings` seed. Once this is non-null the board renders straight
  // from the DB and all mutations persist.
  const [scheduleEvents, setScheduleEvents] = useState<OpsScheduleEvent[] | null>(null)
  // Fleet is DB-backed. We start empty so nothing stale shows before the first
  // fetch resolves; the Supabase load + realtime subscription below keep it in sync.
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [students, setStudents] = useState<Student[]>(STUDENTS as unknown as Student[])
  const [slotRequests, setSlotRequests] = useState<OpsSlotRequest[]>([])
  const [instructors, setInstructors] = useState<DirectoryPerson[]>([])
  const [studentOptions, setStudentOptions] = useState<DirectoryPerson[]>([])
  const [alerts, setAlerts] = useState<AlertRow[]>(INITIAL_ALERTS)
  const [selBooking, setSelBooking] = useState<string | null>('BK-20488')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [tweaks, setTweaks] = useState<TweakState>(TWEAK_DEFAULTS)
  const [showTweaks, setShowTweaks] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)
  const [toast, setToast] = useState<{ msg: string; kind?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  // Initialize with a stable seed date so SSR and first client render agree;
  // the effect below syncs it to today's real date after mount.
  const [date, setDate] = useState<Date>(() => makeDate(2026, 3, 22))
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Hydrate persisted settings from localStorage + sync date to real "today"
  // after mount. Both are done post-hydration to avoid SSR/client mismatch.
  useEffect(() => {
    const z = Number(localStorage.getItem('mf_zoom'))
    if (z) setZoom(z)
    const t = localStorage.getItem('mf_theme') as 'dark' | 'light' | null
    if (t) setTheme(t)
    setDate(todayDate())
  }, [])

  // Load the real fleet from Supabase and keep it in sync via realtime. The DB
  // is the only source of truth — if a row is inserted/updated/deleted anywhere
  // (other tab, another admin, direct DB edit) we refetch so the fleet dropdown
  // and every aircraft-aware view reflect it immediately.
  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      listAircraft().then(list => {
        if (!cancelled) setAircraft(list)
      }).catch(err => {
        // eslint-disable-next-line no-console
        console.warn('[ops-console] aircraft fetch failed:', err)
      })
    }
    refresh()
    const channel = supabase
      .channel('ops-console-aircraft')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aircraft' }, refresh)
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  // Load the student roster AND the NewSlot dropdown directory. Both are
  // backed by the `students` table, so one realtime subscription keeps them
  // in sync — if George Hubbard is added in another tab / the admin dashboard
  // the dropdown picks him up without requiring a page reload.
  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      listStudents().then(list => {
        if (!cancelled && list.length > 0) setStudents(list)
      }).catch(err => {
        // eslint-disable-next-line no-console
        console.warn('[ops-console] students fetch failed, using seed data:', err)
      })
      listActiveStudentsForDirectory().then(list => {
        if (!cancelled) setStudentOptions(list)
      }).catch(err => {
        console.warn('[ops-console] student directory fetch failed:', err)
      })
    }
    refresh()
    const channel = supabase
      .channel('ops-console-students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, refresh)
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  // Load pending slot requests. Always replace — empty list is a valid state.
  useEffect(() => {
    let cancelled = false
    listPendingSlotRequests().then(list => {
      if (cancelled) return
      setSlotRequests(list)
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.warn('[ops-console] slot requests fetch failed:', err)
    })
    return () => { cancelled = true }
  }, [])

  // Instructor directory for the New Slot dropdown. Student directory is
  // handled alongside the roster above (shared realtime subscription).
  useEffect(() => {
    let cancelled = false
    listInstructors().then(list => { if (!cancelled) setInstructors(list) })
      .catch(err => { console.warn('[ops-console] instructors fetch failed:', err) })
    return () => { cancelled = true }
  }, [])

  // Re-fetch the schedule for the currently-viewed day. Called from any
  // mutation handler so the UI reflects the new state.
  const refreshSchedule = useCallback(async () => {
    try {
      const list = await listEventsForDay(date)
      setScheduleEvents(list)
    } catch (err) {
      console.warn('[ops-console] schedule_events fetch failed:', err)
      // Leave scheduleEvents as-is so the in-memory demo keeps working.
    }
  }, [date])

  // Initial fetch + refetch whenever the user advances the date.
  useEffect(() => {
    let cancelled = false
    listEventsForDay(date).then(list => {
      if (cancelled) return
      setScheduleEvents(list)
    }).catch(err => {
      console.warn('[ops-console] schedule_events fetch failed:', err)
    })
    return () => { cancelled = true }
  }, [date])

  useEffect(() => { localStorage.setItem('mf_zoom', String(zoom)) }, [zoom])
  useEffect(() => { localStorage.setItem('mf_theme', theme) }, [theme])

  // Apply tweak-driven CSS vars + body classes so the Tweaks panel is live.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    el.style.setProperty('--accent-h', String(tweaks.accentHue))
    el.style.setProperty('--accent', `oklch(0.72 0.14 ${tweaks.accentHue})`)
    el.style.setProperty('--accent-dim', `oklch(0.42 0.09 ${tweaks.accentHue})`)
    el.style.setProperty('--accent-bg', `oklch(0.28 0.07 ${tweaks.accentHue})`)
    el.className = `ops-console-root density-${tweaks.density} data-${tweaks.dataFont} ${tweaks.showGrid ? '' : 'nogrid'}`
  }, [tweaks])

  // Edit-mode bridge: parent frame toggles the Tweaks panel via postMessage.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data as { type?: string } | null
      if (data?.type === '__activate_edit_mode') setShowTweaks(true)
      if (data?.type === '__deactivate_edit_mode') setShowTweaks(false)
    }
    window.addEventListener('message', handler)
    if (window.parent !== window) {
      window.parent.postMessage({ type: '__edit_mode_available' }, '*')
    }
    return () => window.removeEventListener('message', handler)
  }, [])

  const showToast = useCallback((msg: string, kind: string = 'info') => {
    setToast({ msg, kind })
    const handle = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(handle)
  }, [])

  // Expose globally so deep children (sidebar buttons, table actions) can fire
  // toasts without prop-drilling through every view.
  useEffect(() => {
    window.__toast = showToast
    return () => { if (window.__toast === showToast) delete window.__toast }
  }, [showToast])

  // Brief loading state when switching views to match the design.
  useEffect(() => {
    setLoading(true)
    const t = window.setTimeout(() => setLoading(false), 220)
    return () => window.clearTimeout(t)
  }, [view])

  // Flatten OpsScheduleEvent → Booking so ScheduleBoard / Inspector keep their
  // existing prop shape. When `scheduleEvents` is null (initial fetch hasn't
  // finished or it failed) we fall back to the in-memory seed.
  const displayBookings: Booking[] = useMemo(() => {
    if (!scheduleEvents) return bookings
    return scheduleEvents.map(ev => ({
      id: ev.id,
      code: ev.code,
      tail: ev.tail,
      aircraftId: ev.aircraftId,
      start: ev.start,
      end: ev.end,
      student: ev.student,
      studentId: ev.studentId,
      cfi: ev.cfiId,
      cfiInitials: ev.cfi,
      lesson: ev.lesson,
      status: ev.status,
      paid: ev.paid,
    }))
  }, [scheduleEvents, bookings])
  const usingDb = scheduleEvents !== null

  // Sidebar filter panel narrows the set of bookings shown on the schedule
  // board (and Ops Pulse). Applied on top of `displayBookings` so it composes
  // with the Supabase source of truth.
  const visibleBookings = useMemo(() => {
    const f = filters
    if (f.status.length === 0 && f.aircraft.length === 0 && f.cfi.length === 0 && f.paid === null) {
      return displayBookings
    }
    return displayBookings.filter(b => {
      if (f.status.length > 0 && !f.status.includes(b.status)) return false
      if (f.aircraft.length > 0 && !f.aircraft.includes(b.tail)) return false
      if (f.cfi.length > 0 && (!b.cfi || !f.cfi.includes(b.cfi))) return false
      if (f.paid !== null && b.paid !== f.paid) return false
      return true
    })
  }, [displayBookings, filters])

  // Ref-forward `handleCancelBooking` so the keyboard shortcut effect below can
  // call it without sitting in its dep array. The handler is declared further
  // down the component, so including it in the deps would hit the TDZ during
  // the first render pass when useEffect's dep array is evaluated.
  const cancelBookingRef = useRef<(id: string) => void>(() => {})

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA')) return
      if (tgt && (tgt as HTMLElement).isContentEditable) return
      if (e.key === 'Escape') { setSelBooking(null); setModal(null) }
      if (e.key === 'j' || e.key === 'k') {
        const todayBookings = displayBookings.filter(b => b.status !== 'maint' && b.status !== 'aog')
        const idx = todayBookings.findIndex(b => b.id === selBooking)
        const next = e.key === 'j'
          ? (idx + 1) % todayBookings.length
          : (idx - 1 + todayBookings.length) % todayBookings.length
        setSelBooking(todayBookings[next]?.id ?? null)
      }
      if (e.key === 'n' || e.key === 'N') setModal({ kind: 'new' })
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selBooking) return
        const b = displayBookings.find(x => x.id === selBooking)
        if (!b) return
        // Prevent the browser's default (Backspace → history back).
        e.preventDefault()
        const displayId = usingDb ? b.id.slice(0, 8) : b.id
        setModal({
          kind: 'confirm',
          payload: {
            title: 'CANCEL BOOKING',
            message: `Cancel ${displayId} (${b.student})? This cannot be undone.`,
            confirmLabel: 'Cancel booking',
            danger: true,
            onConfirm: () => cancelBookingRef.current(b.id),
          },
        })
      }
      if (e.key === '?') showToast('Keyboard: j/k nav · Del delete · Esc clear · N new slot', 'info')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [displayBookings, selBooking, showToast, usingDb])

  const handleSelect = (node: TreeNodeData) => {
    setSelectedNode(node)
    setSubTab(0)
    if (node.kind === 'view' && node.view) setView(node.view)
    else if (node.kind === 'aircraft') {
      // Open the detail modal for the clicked aircraft so the user lands
      // directly on its data (and can schedule an event scoped to it).
      const found = aircraft.find(a => a.tail === node.label)
      if (found) setModal({ kind: 'aircraft', payload: found })
      setView('fleet')
    }
    else if (node.kind === 'student') {
      // Match by id first (stable, the tree uses student id as node id), then
      // fall back to label (name) for backward compatibility with older nodes.
      const found = students.find(s => s.id === node.id) || students.find(s => s.name === node.label)
      if (found) setModal({ kind: 'student', payload: found })
      setView('students')
    }
  }

  const handleEditBooking = (id: string, patch: Partial<Booking>) => {
    setBookings(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b))
    showToast(`Booking ${id} updated`, 'ok')
  }
  const handleReassign = (id: string, patch: Partial<Booking>) => {
    setBookings(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b))
    setModal(null)
    showToast(`Booking ${id} reassigned`, 'ok')
  }
  const handleCancelBooking = async (id: string) => {
    if (usingDb) {
      try {
        await deleteScheduleEvent(id)
      } catch (err) {
        console.error('[ops-console] deleteScheduleEvent failed:', err)
        showToast(`Failed to cancel — ${(err as Error).message || 'unknown error'}`, 'error')
        return
      }
      setModal(null)
      setSelBooking(null)
      await refreshSchedule()
      showToast(`Booking cancelled`, 'info')
      return
    }
    setBookings(bs => bs.filter(b => b.id !== id))
    setModal(null)
    setSelBooking(null)
    showToast(`Booking ${id} cancelled`, 'info')
  }
  // Keep the ref used by the Delete/Backspace keyboard shortcut pointing at
  // the latest cancel handler so the shortcut closes over fresh state.
  cancelBookingRef.current = handleCancelBooking
  const handleNewSlot = async (data: { tail: string; start: string; end: string; student: string; cfi: string; lesson: string }) => {
    const parseT = (s: string) => { const [h, m] = s.split(':').map(Number); return Math.round((h * 60 + m - 7 * 60) / 30) }
    if (usingDb) {
      const ac = aircraft.find(a => a.tail === data.tail)
      if (!ac?.id) {
        showToast(`Can't create slot: aircraft ${data.tail} is not in the database yet`, 'error')
        return
      }
      const startTick = parseT(data.start)
      const endTick = parseT(data.end)
      if (!(endTick > startTick)) {
        showToast(`End must be after start`, 'error')
        return
      }
      // Map the student name back to an id if we recognize it; otherwise pass
      // it through as a free-text `student_label` on the event.
      const studentMatch = studentOptions.find(s => s.name === data.student)
      // Only pass the CFI as an FK if it's a UUID (i.e. sourced from the
      // instructors dropdown). The seed CFI ids (`cfi_01`) won't match.
      const cfiIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.cfi)
      try {
        await createScheduleEvent({
          aircraftId: ac.id,
          instructorId: cfiIsUuid ? data.cfi : null,
          studentId: studentMatch?.id ?? null,
          studentLabel: studentMatch ? null : data.student,
          lesson: data.lesson,
          startIso: tickToIso(startTick, date),
          endIso: tickToIso(endTick, date),
          status: 'booked',
          paid: false,
        }, date)
      } catch (err) {
        console.error('[ops-console] createScheduleEvent failed:', err)
        showToast(`Failed to create slot — ${(err as Error).message || 'unknown error'}`, 'error')
        return
      }
      setModal(null)
      setView('schedule')
      await refreshSchedule()
      showToast(`Slot created for ${data.student}`, 'ok')
      return
    }
    const nb: Booking = {
      id: 'BK-' + (20500 + Math.floor(Math.random() * 500)),
      tail: data.tail,
      start: parseT(data.start),
      end: parseT(data.end),
      student: data.student,
      cfi: data.cfi,
      lesson: data.lesson,
      status: 'booked',
      paid: false,
    }
    setBookings(bs => [...bs, nb])
    setModal(null)
    setSelBooking(nb.id)
    setView('schedule')
    showToast(`New slot ${nb.id} created`, 'ok')
  }
  const handleResolve = (alertId: string) => {
    setAlerts(as => as.map(a => a.id === alertId ? { ...a, resolved: true } : a))
    showToast(`Alert ${alertId} resolved`, 'ok')
  }
  const handleAddAircraft = () => setModal({ kind: 'newAircraft' })
  const handleCreateAircraft = async (data: { tail: string; model: string; hobbs: number; nextInsp: string; status: string }) => {
    try {
      const created = await createAircraft({ tail: data.tail, model: data.model, status: data.status, hobbs: data.hobbs })
      setAircraft(list => [...list, created])
      setModal(null)
      showToast(`${created.tail} added to fleet`, 'ok')
    } catch (err) {
      console.error('[ops-console] createAircraft failed:', err)
      showToast(`Failed to add ${data.tail} — ${(err as Error).message || 'unknown error'}`, 'error')
    }
  }
  const handleDeleteAircraft = (a: Aircraft) => {
    // Cascade note: the DB foreign key `schedule_events.aircraft_id` uses
    // `on delete cascade`, so any schedule events on this tail will be
    // removed by Postgres automatically when we delete the aircraft row.
    const linked = displayBookings.filter(b => b.tail === a.tail)
    const msg = linked.length > 0
      ? `Remove ${a.tail} (${a.model})? ${linked.length} booking${linked.length === 1 ? '' : 's'} on this aircraft will also be removed.`
      : `Remove ${a.tail} (${a.model}) from the fleet?`
    setModal({
      kind: 'confirm',
      payload: {
        title: 'DELETE AIRCRAFT',
        message: msg,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          if (a.id) {
            try {
              await deleteAircraft(a.id)
            } catch (err) {
              console.error('[ops-console] deleteAircraft failed:', err)
              showToast(`Failed to remove ${a.tail} — ${(err as Error).message || 'unknown error'}`, 'error')
              return
            }
          }
          setAircraft(list => list.filter(x => x.tail !== a.tail))
          if (usingDb) {
            await refreshSchedule()
          } else {
            setBookings(list => list.filter(b => b.tail !== a.tail))
          }
          if (selBooking && linked.some(b => b.id === selBooking)) setSelBooking(null)
          setModal(null)
          showToast(`${a.tail} removed`, 'ok')
        },
      },
    })
  }
  const handleSaveAircraft = async (patch: Partial<Aircraft> & { tail: string }) => {
    const current = aircraft.find(a => a.tail === patch.tail)
    if (!current) return
    // Persist only the DB-backed columns. Next-insp/home-base live in-memory
    // until we add columns for them.
    if (current.id) {
      const persistedChanged =
        (patch.model != null && patch.model !== current.model) ||
        (patch.status != null && patch.status !== current.status) ||
        (patch.hobbs != null && patch.hobbs !== current.hobbs)
      if (persistedChanged) {
        try {
          await updateAircraft(current.id, { model: patch.model, status: patch.status, hobbs: patch.hobbs })
        } catch (err) {
          console.error('[ops-console] updateAircraft failed:', err)
          showToast(`Failed to save ${patch.tail} — ${(err as Error).message || 'unknown error'}`, 'error')
          return
        }
      }
    }
    setAircraft(list => list.map(a => a.tail === patch.tail ? { ...a, ...patch } : a))
    setModal(null)
    showToast(`${patch.tail} updated`, 'ok')
  }
  const handleAddStudent = () => setModal({ kind: 'newStudent' })
  const handleCreateStudent = async (data: { fullName: string; email: string; phone: string; trainingStage: string }) => {
    try {
      const created = await createStudent({
        fullName: data.fullName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        trainingStage: data.trainingStage || undefined,
      })
      setStudents(list => [...list, created])
      setModal(null)
      showToast(`${created.name} added to roster`, 'ok')
    } catch (err) {
      console.error('[ops-console] createStudent failed:', err)
      showToast(`Failed to add ${data.fullName} — ${(err as Error).message || 'unknown error'}`, 'error')
    }
  }
  const handleDeleteStudent = (s: Student) => {
    setModal({
      kind: 'confirm',
      payload: {
        title: 'REMOVE STUDENT',
        message: `Remove ${s.name} from the active roster? This is a soft-delete — their record is kept for historical bookings, invoices, and progress.`,
        confirmLabel: 'Remove',
        danger: true,
        onConfirm: async () => {
          // Only hit the DB if this row looks like a real UUID from Supabase.
          // Seed rows use ids like "STU-0412" which the DB will reject.
          const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id)
          if (looksLikeUuid) {
            try {
              await softDeleteStudent(s.id)
            } catch (err) {
              console.error('[ops-console] softDeleteStudent failed:', err)
              showToast(`Failed to remove ${s.name} — ${(err as Error).message || 'unknown error'}`, 'error')
              return
            }
          }
          setStudents(list => list.filter(x => x.id !== s.id))
          setModal(null)
          showToast(`${s.name} removed`, 'ok')
        },
      },
    })
  }
  const handleApproveRequest = (r: OpsSlotRequest) => {
    setModal({
      kind: 'confirm',
      payload: {
        title: 'APPROVE SLOT REQUEST',
        message: `Approve ${r.student}'s request for ${r.preferred}? This marks the request approved; booking creation is a separate step.`,
        confirmLabel: 'Approve',
        onConfirm: async () => {
          try {
            await approveSlotRequest(r.id)
          } catch (err) {
            console.error('[ops-console] approveSlotRequest failed:', err)
            showToast(`Failed to approve — ${(err as Error).message || 'unknown error'}`, 'error')
            return
          }
          setSlotRequests(list => list.filter(x => x.id !== r.id))
          setModal(null)
          showToast(`Request for ${r.student} approved`, 'ok')
        },
      },
    })
  }
  const handleDeclineRequest = (r: OpsSlotRequest) => {
    setModal({
      kind: 'confirm',
      payload: {
        title: 'DECLINE SLOT REQUEST',
        message: `Decline ${r.student}'s request for ${r.preferred}?`,
        confirmLabel: 'Decline',
        danger: true,
        onConfirm: async () => {
          try {
            await denySlotRequest(r.id)
          } catch (err) {
            console.error('[ops-console] denySlotRequest failed:', err)
            showToast(`Failed to decline — ${(err as Error).message || 'unknown error'}`, 'error')
            return
          }
          setSlotRequests(list => list.filter(x => x.id !== r.id))
          setModal(null)
          showToast(`Request for ${r.student} declined`, 'info')
        },
      },
    })
  }
  const handleResizeBookingRequest = (id: string, nextStart: number, nextEnd: number) => {
    const b = displayBookings.find(x => x.id === id)
    if (!b) return
    if (nextStart === b.start && nextEnd === b.end) return
    // Collision check: resize cannot overlap any other booking on the same tail.
    const collides = displayBookings.some(other =>
      other.id !== id &&
      other.tail === b.tail &&
      nextStart < other.end &&
      nextEnd > other.start,
    )
    if (collides) {
      showToast(`Resize would overlap another booking on ${b.tail}`, 'error')
      return
    }
    const oldDur = (b.end - b.start) * 0.5
    const newDur = (nextEnd - nextStart) * 0.5
    const oldRange = `${tickToHHMM(b.start)}–${tickToHHMM(b.end)}`
    const newRange = `${tickToHHMM(nextStart)}–${tickToHHMM(nextEnd)}`
    const displayId = usingDb ? id.slice(0, 8) : id
    setModal({
      kind: 'confirm',
      payload: {
        title: 'ADJUST BOOKING TIME',
        message: `Change ${displayId} (${b.student}) from ${oldRange} (${oldDur.toFixed(1)}h) to ${newRange} (${newDur.toFixed(1)}h)?`,
        confirmLabel: 'Apply',
        onConfirm: async () => {
          if (usingDb) {
            try {
              await resizeScheduleEvent(id, tickToIso(nextStart, date), tickToIso(nextEnd, date))
            } catch (err) {
              console.error('[ops-console] resizeScheduleEvent failed:', err)
              showToast(`Failed to resize — ${(err as Error).message || 'unknown error'}`, 'error')
              return
            }
            setModal(null)
            await refreshSchedule()
            showToast(`Booking updated to ${newRange}`, 'ok')
            return
          }
          setBookings(list => list.map(x => x.id === id ? { ...x, start: nextStart, end: nextEnd } : x))
          setModal(null)
          showToast(`${id} updated to ${newRange}`, 'ok')
        },
      },
    })
  }
  const handleMoveBooking = async (id: string, to: { tail: string; startTick: number }) => {
    const b = displayBookings.find(x => x.id === id)
    if (!b) return
    const duration = b.end - b.start
    let startTick = to.startTick
    // Clamp so the booking stays within the 12h visible window.
    const maxStart = 24 - duration
    if (maxStart < 0) return
    startTick = Math.max(0, Math.min(startTick, maxStart))
    const endTick = startTick + duration
    // Abort if the target aircraft is missing (shouldn't happen, defensive).
    const targetAc = aircraft.find(a => a.tail === to.tail)
    if (!targetAc) return
    // Collision check against other bookings on the target aircraft.
    const collides = displayBookings.some(other =>
      other.id !== id &&
      other.tail === to.tail &&
      startTick < other.end &&
      endTick > other.start,
    )
    if (collides) {
      showToast(`Can't drop ${usingDb ? id.slice(0, 8) : id} — that slot is taken on ${to.tail}`, 'error')
      return
    }
    if (b.tail === to.tail && b.start === startTick) return
    if (usingDb) {
      if (!targetAc.id) {
        showToast(`Can't move to ${to.tail}: not in the database yet`, 'error')
        return
      }
      try {
        await moveScheduleEvent(id, {
          aircraftId: targetAc.id,
          startIso: tickToIso(startTick, date),
          endIso: tickToIso(endTick, date),
        })
      } catch (err) {
        console.error('[ops-console] moveScheduleEvent failed:', err)
        showToast(`Failed to move — ${(err as Error).message || 'unknown error'}`, 'error')
        return
      }
      await refreshSchedule()
      const moved: string[] = []
      if (b.tail !== to.tail) moved.push(`→ ${to.tail}`)
      if (b.start !== startTick) moved.push(`→ ${tickToHHMM(startTick)}`)
      showToast(`Booking moved ${moved.join(' ')}`, 'ok')
      return
    }
    setBookings(list => list.map(x => x.id === id ? { ...x, tail: to.tail, start: startTick, end: endTick } : x))
    const moved: string[] = []
    if (b.tail !== to.tail) moved.push(`→ ${to.tail}`)
    if (b.start !== startTick) moved.push(`→ ${tickToHHMM(startTick)}`)
    showToast(`${id} moved ${moved.join(' ')}`, 'ok')
  }
  const handleEmptySlotClick = (tail: string, startTick: number) => {
    // Default new slots to 1 hour (2 ticks). Clamp to the end of the day.
    const endTick = Math.min(startTick + 2, 24)
    setModal({
      kind: 'new',
      prefill: { tail, start: tickToHHMM(startTick), end: tickToHHMM(endTick) },
    })
  }
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // Live subtitle for DocNav. Replaces the static VIEW_META.doc strings for
  // views backed by DB/live state so the header never shows stale counts
  // (e.g. "5 aircraft · 1 AOG" after fleet changes). Returns undefined for
  // views where we don't have better information than the static default.
  const docOverride = useMemo<string | undefined>(() => {
    if (view === 'fleet') {
      const n = aircraft.length
      const aog = aircraft.filter(a => a.status === 'ground').length
      const acLabel = `${n} aircraft`
      return aog > 0 ? `${acLabel} · ${aog} AOG` : acLabel
    }
    if (view === 'students') {
      const active = students.filter(s => s.status === 'active').length
      const prospect = students.filter(s => s.status === 'pending').length
      if (active === 0 && prospect === 0) return `${students.length} total`
      const parts: string[] = []
      if (active > 0) parts.push(`${active} active`)
      if (prospect > 0) parts.push(`${prospect} prospect${prospect === 1 ? '' : 's'}`)
      return parts.join(' · ')
    }
    if (view === 'requests') {
      const n = slotRequests.length
      const stale = slotRequests.filter(r => (r.ageH ?? 0) > 48).length
      if (n === 0) return 'no pending requests'
      return stale > 0 ? `${n} pending · ${stale} stale` : `${n} pending`
    }
    if (view === 'integrity') {
      const open = alerts.filter(a => !a.resolved).length
      return open === 0 ? 'all clear' : `${open} open`
    }
    return undefined
  }, [view, aircraft, students, slotRequests, alerts])

  const renderView = () => {
    if (loading) return <div className="view-pad"><Skeleton lines={8} /></div>
    switch (view) {
      case 'schedule': {
        if (subTab === 1) return <ScheduleTimeline bookings={visibleBookings} />
        if (subTab === 2) return <ScheduleCalendar bookings={visibleBookings} viewDate={date} />
        if (subTab === 3) return <ScheduleCapacity bookings={visibleBookings} aircraft={aircraft} />
        return <ScheduleBoard aircraft={aircraft} bookings={visibleBookings} zoom={zoom} viewDate={date} selBookingId={selBooking} onSelBooking={setSelBooking} onEmptySlotClick={handleEmptySlotClick} onAddAircraft={handleAddAircraft} onDeleteAircraft={handleDeleteAircraft} onMoveBooking={handleMoveBooking} onResizeBookingRequest={handleResizeBookingRequest} />
      }
      case 'fleet':      return <FleetView aircraft={aircraft} bookings={displayBookings} subTab={subTab} onAddAircraft={handleAddAircraft} onDeleteAircraft={handleDeleteAircraft} onOpenAircraft={(a) => setModal({ kind: 'aircraft', payload: a })} />
      case 'students':   return <StudentsView students={students} subTab={subTab} onDelete={handleDeleteStudent} onAddStudent={handleAddStudent} />
      case 'integrity':  return <IntegrityView alerts={alerts} bookings={displayBookings} slotRequests={slotRequests} subTab={subTab} onResolve={handleResolve} />
      case 'requests':   return <RequestsView requests={slotRequests} subTab={subTab} onApprove={handleApproveRequest} onDecline={handleDeclineRequest} />
      case 'dispatch':   return <DispatchView subTab={subTab} />
      case 'syllabus':   return <SyllabusView subTab={subTab} />
      case 'onboarding': return <OnboardingView />
      case 'debriefs':   return <DebriefsView />
      case 'billing':    return <BillingView subTab={subTab} />
      case 'expenses':   return <ExpensesView subTab={subTab} />
      case 'payouts':    return <PayoutsView subTab={subTab} />
      default: return <div className="view-pad"><EmptyState icon="square" title="View not found" sub={view} /></div>
    }
  }

  return (
    <div ref={rootRef} className="ops-console-root" data-theme={theme}>
      <div className="app">
        <TopBar view={view} theme={theme} onToggleTheme={toggleTheme} />
        <Sidebar
          selected={selectedNode?.id ?? null}
          onSelect={handleSelect}
          filters={filters}
          setFilters={(updater) => setFilters(updater)}
          onSync={() => showToast('Synced · 0 changes', 'ok')}
          aircraft={aircraft}
          students={students}
        />
        <main className="main">
          <IconRail view={view} onView={(v) => { setView(v); setSubTab(0) }} />
          <div className="main-inner">
            <DocNav view={view} docOverride={docOverride} />
            <SubTabs view={view} active={subTab} onActive={setSubTab} />
            {view === 'schedule' && (
              <Toolbar
                zoom={zoom}
                onZoom={setZoom}
                dateLabel={formatDateLabel(date)}
                onPrevDay={() => setDate(d => addDays(d, -1))}
                onNextDay={() => setDate(d => addDays(d, 1))}
                onToday={() => setDate(todayDate())}
                onNewSlot={() => setModal({ kind: 'new' })}
              />
            )}
            <div className="main-canvas">{renderView()}</div>
          </div>
        </main>
        <OpsPulse
          alerts={alerts}
          bookings={visibleBookings}
          aircraftCount={aircraft.length}
          airportIcao="KPNE"
          onSelBooking={setSelBooking}
          onJumpView={(v) => { setView(v); setSubTab(0) }}
        />
        <Inspector
          bookings={displayBookings}
          bookingId={selBooking}
          aircraft={aircraft}
          instructors={instructors}
          students={studentOptions}
          onClear={() => setSelBooking(null)}
          onEditBooking={handleEditBooking}
          onReassign={(b) => setModal({ kind: 'reassign', payload: b })}
          onCancel={(b) =>
            setModal({
              kind: 'confirm',
              payload: {
                title: 'CANCEL BOOKING',
                message: `Cancel ${b.id} (${b.student})? This cannot be undone.`,
                confirmLabel: 'Cancel booking',
                danger: true,
                onConfirm: () => handleCancelBooking(b.id),
              },
            })
          }
        />
      </div>

      {modal?.kind === 'aircraft' && (
        <AircraftDetailModal
          aircraft={modal.payload}
          bookings={displayBookings}
          onClose={() => setModal(null)}
          onSave={handleSaveAircraft}
          onNewSlot={(a) => {
            setView('schedule')
            setModal({ kind: 'new', prefill: { tail: a.tail } })
          }}
        />
      )}
      {modal?.kind === 'newAircraft' && <NewAircraftModal onClose={() => setModal(null)} onCreate={handleCreateAircraft} existingTails={aircraft.map(a => a.tail)} />}
      {modal?.kind === 'newStudent' && <NewStudentModal onClose={() => setModal(null)} onCreate={handleCreateStudent} existingNames={students.map(s => s.name)} />}
      {modal?.kind === 'student' && (
        <StudentDetailModal
          student={modal.payload}
          bookings={displayBookings}
          onClose={() => setModal(null)}
          onNewSlot={(s) => {
            setView('schedule')
            setModal({ kind: 'new', prefill: { student: s.name } })
          }}
        />
      )}
      {modal?.kind === 'new' && (
        <NewSlotModal
          onClose={() => setModal(null)}
          onCreate={handleNewSlot}
          prefill={modal.prefill}
          aircraft={aircraft}
          instructors={instructors}
          studentList={studentOptions}
        />
      )}
      {modal?.kind === 'reassign' && <ReassignModal booking={modal.payload} onClose={() => setModal(null)} onReassign={handleReassign} aircraft={aircraft} />}
      {modal?.kind === 'confirm' && <ConfirmModal {...modal.payload} onClose={() => setModal(null)} />}

      {showTweaks && (
        <Tweaks
          tweaks={tweaks}
          setTweaks={(updater) => setTweaks(updater)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onClose={() => setShowTweaks(false)}
        />
      )}
      <Toast toast={toast} />
    </div>
  )
}
