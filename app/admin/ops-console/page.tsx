'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import './ops-console.css'
import { INITIAL_BOOKINGS, INITIAL_ALERTS, STUDENTS, AIRCRAFT, type TreeNodeData } from './data'
import { Sidebar, TopBar, IconRail, DocNav, SubTabs, Toolbar, Inspector, OpsPulse, Tweaks, TWEAK_DEFAULTS, type TweakState } from './shell'
import {
  ScheduleBoard, FleetView, StudentsView, IntegrityView, RequestsView, DispatchView,
  BillingView, SyllabusView, OnboardingView, PayoutsView, ExpensesView, DebriefsView,
  Skeleton, EmptyState, type Student, type Aircraft,
} from './views'
import { NewSlotModal, NewAircraftModal, ReassignModal, ConfirmModal, AircraftDetailModal, Toast } from './modals'
import { listAircraft, createAircraft, deleteAircraft } from '@/lib/ops-console/aircraft'
import { listStudents, softDeleteStudent } from '@/lib/ops-console/students'
import { listPendingSlotRequests, approveSlotRequest, denySlotRequest, type OpsSlotRequest } from '@/lib/ops-console/slot-requests'

declare global {
  interface Window {
    __toast?: (msg: string, kind?: string) => void
  }
}

type Booking = {
  id: string; tail: string; start: number; end: number; student: string;
  cfi: string | null; lesson: string; status: string; paid: boolean | null;
}
type AlertRow = { id: string; sev: string; code: string; msg: string; ts: string; resolved: boolean }
type ModalState =
  | { kind: 'new'; prefill?: { tail?: string; start?: string; end?: string } }
  | { kind: 'reassign'; payload: Booking }
  | { kind: 'newAircraft' }
  | { kind: 'aircraft'; payload: Aircraft }
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
  const [aircraft, setAircraft] = useState<Aircraft[]>(AIRCRAFT as unknown as Aircraft[])
  const [students, setStudents] = useState<Student[]>(STUDENTS as unknown as Student[])
  const [slotRequests, setSlotRequests] = useState<OpsSlotRequest[]>([])
  const [alerts, setAlerts] = useState<AlertRow[]>(INITIAL_ALERTS)
  const [selBooking, setSelBooking] = useState<string | null>('BK-20488')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [tweaks, setTweaks] = useState<TweakState>(TWEAK_DEFAULTS)
  const [showTweaks, setShowTweaks] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)
  const [toast, setToast] = useState<{ msg: string; kind?: string } | null>(null)
  const [loading, setLoading] = useState(false)
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

  // Load the real fleet from Supabase; fall back silently to seed on failure
  // so the console still renders offline / during DB outages.
  useEffect(() => {
    let cancelled = false
    listAircraft().then(list => {
      if (cancelled) return
      if (list.length > 0) setAircraft(list)
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.warn('[ops-console] aircraft fetch failed, using seed data:', err)
    })
    return () => { cancelled = true }
  }, [])

  // Load the real student roster (excluding soft-deleted inactive rows).
  useEffect(() => {
    let cancelled = false
    listStudents().then(list => {
      if (cancelled) return
      if (list.length > 0) setStudents(list)
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.warn('[ops-console] students fetch failed, using seed data:', err)
    })
    return () => { cancelled = true }
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

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA')) return
      if (e.key === 'Escape') { setSelBooking(null); setModal(null) }
      if (e.key === 'j' || e.key === 'k') {
        const todayBookings = bookings.filter(b => b.status !== 'maint' && b.status !== 'aog')
        const idx = todayBookings.findIndex(b => b.id === selBooking)
        const next = e.key === 'j'
          ? (idx + 1) % todayBookings.length
          : (idx - 1 + todayBookings.length) % todayBookings.length
        setSelBooking(todayBookings[next]?.id ?? null)
      }
      if (e.key === 'n' || e.key === 'N') setModal({ kind: 'new' })
      if (e.key === '?') showToast('Keyboard: j/k nav · Esc clear · N new slot', 'info')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [bookings, selBooking, showToast])

  const handleSelect = (node: TreeNodeData) => {
    setSelectedNode(node)
    setSubTab(0)
    if (node.kind === 'view' && node.view) setView(node.view)
    else if (node.kind === 'aircraft') setView('fleet')
    else if (node.kind === 'student') setView('students')
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
  const handleCancelBooking = (id: string) => {
    setBookings(bs => bs.filter(b => b.id !== id))
    setModal(null)
    setSelBooking(null)
    showToast(`Booking ${id} cancelled`, 'info')
  }
  const handleNewSlot = (data: { tail: string; start: string; end: string; student: string; cfi: string; lesson: string }) => {
    const parseT = (s: string) => { const [h, m] = s.split(':').map(Number); return Math.round((h * 60 + m - 7 * 60) / 30) }
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
      const created = await createAircraft({ tail: data.tail, model: data.model, status: data.status })
      setAircraft(list => [...list, created])
      setModal(null)
      showToast(`${created.tail} added to fleet`, 'ok')
    } catch (err) {
      console.error('[ops-console] createAircraft failed:', err)
      showToast(`Failed to add ${data.tail} — ${(err as Error).message || 'unknown error'}`, 'error')
    }
  }
  const handleDeleteAircraft = (a: Aircraft) => {
    const linked = bookings.filter(b => b.tail === a.tail)
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
          // Only hit the DB if this row originated from the DB (has an id).
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
          setBookings(list => list.filter(b => b.tail !== a.tail))
          if (selBooking && linked.some(b => b.id === selBooking)) setSelBooking(null)
          setModal(null)
          showToast(`${a.tail} removed`, 'ok')
        },
      },
    })
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
    const b = bookings.find(x => x.id === id)
    if (!b) return
    if (nextStart === b.start && nextEnd === b.end) return
    // Collision check: resize cannot overlap any other booking on the same tail.
    const collides = bookings.some(other =>
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
    setModal({
      kind: 'confirm',
      payload: {
        title: 'ADJUST BOOKING TIME',
        message: `Change ${id} (${b.student}) from ${oldRange} (${oldDur.toFixed(1)}h) to ${newRange} (${newDur.toFixed(1)}h)?`,
        confirmLabel: 'Apply',
        onConfirm: () => {
          setBookings(list => list.map(x => x.id === id ? { ...x, start: nextStart, end: nextEnd } : x))
          setModal(null)
          showToast(`${id} updated to ${newRange}`, 'ok')
        },
      },
    })
  }
  const handleMoveBooking = (id: string, to: { tail: string; startTick: number }) => {
    const b = bookings.find(x => x.id === id)
    if (!b) return
    const duration = b.end - b.start
    let startTick = to.startTick
    // Clamp so the booking stays within the 12h visible window.
    const maxStart = 24 - duration
    if (maxStart < 0) return
    startTick = Math.max(0, Math.min(startTick, maxStart))
    const endTick = startTick + duration
    // Abort if the target aircraft is missing (shouldn't happen, defensive).
    if (!aircraft.some(a => a.tail === to.tail)) return
    // Collision check against other bookings on the target aircraft.
    const collides = bookings.some(other =>
      other.id !== id &&
      other.tail === to.tail &&
      startTick < other.end &&
      endTick > other.start,
    )
    if (collides) {
      showToast(`Can't drop ${id} — that slot is taken on ${to.tail}`, 'error')
      return
    }
    // No-op if nothing would change.
    if (b.tail === to.tail && b.start === startTick) return
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

  const renderView = () => {
    if (loading) return <div className="view-pad"><Skeleton lines={8} /></div>
    switch (view) {
      case 'schedule':   return <ScheduleBoard aircraft={aircraft} bookings={bookings} zoom={zoom} selBookingId={selBooking} onSelBooking={setSelBooking} onEmptySlotClick={handleEmptySlotClick} onAddAircraft={handleAddAircraft} onDeleteAircraft={handleDeleteAircraft} onMoveBooking={handleMoveBooking} onResizeBookingRequest={handleResizeBookingRequest} />
      case 'fleet':      return <FleetView aircraft={aircraft} bookings={bookings} subTab={subTab} onAddAircraft={handleAddAircraft} onDeleteAircraft={handleDeleteAircraft} onOpenAircraft={(a) => setModal({ kind: 'aircraft', payload: a })} />
      case 'students':   return <StudentsView students={students} subTab={subTab} onDelete={handleDeleteStudent} />
      case 'integrity':  return <IntegrityView alerts={alerts} onResolve={handleResolve} />
      case 'requests':   return <RequestsView requests={slotRequests} onApprove={handleApproveRequest} onDecline={handleDeclineRequest} />
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
        <Sidebar selected={selectedNode?.id ?? null} onSelect={handleSelect} />
        <main className="main">
          <IconRail view={view} onView={(v) => { setView(v); setSubTab(0) }} />
          <div className="main-inner">
            <DocNav view={view} />
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
          bookings={bookings}
          onSelBooking={setSelBooking}
          onJumpView={(v) => { setView(v); setSubTab(0) }}
        />
        <Inspector
          bookings={bookings}
          bookingId={selBooking}
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

      {modal?.kind === 'aircraft' && <AircraftDetailModal aircraft={modal.payload} bookings={bookings} onClose={() => setModal(null)} />}
      {modal?.kind === 'newAircraft' && <NewAircraftModal onClose={() => setModal(null)} onCreate={handleCreateAircraft} existingTails={aircraft.map(a => a.tail)} />}
      {modal?.kind === 'new' && <NewSlotModal onClose={() => setModal(null)} onCreate={handleNewSlot} prefill={modal.prefill} aircraft={aircraft} />}
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
