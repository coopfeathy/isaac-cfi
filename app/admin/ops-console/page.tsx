'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import './ops-console.css'
import { INITIAL_BOOKINGS, INITIAL_ALERTS, type TreeNodeData } from './data'
import { Sidebar, TopBar, IconRail, DocNav, SubTabs, Toolbar, Inspector, OpsPulse, EMPTY_FILTERS, type Filters } from './shell'
import {
  ScheduleBoard, FleetView, StudentsView, IntegrityView, RequestsView, DispatchView,
  BillingView, SyllabusView, OnboardingView, PayoutsView, ExpensesView, DebriefsView,
  Skeleton, EmptyState,
} from './views'
import { NewSlotModal, ReassignModal, ConfirmModal, Toast } from './modals'

type Booking = {
  id: string; tail: string; start: number; end: number; student: string;
  cfi: string | null; lesson: string; status: string; paid: boolean | null;
}
type AlertRow = { id: string; sev: string; code: string; msg: string; ts: string; resolved: boolean }
type ModalState =
  | { kind: 'new' }
  | { kind: 'reassign'; payload: Booking }
  | { kind: 'confirm'; payload: { title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void } }
  | null

const DRAFT_COUNT = 3

export default function OpsConsolePage() {
  const [selectedNode, setSelectedNode] = useState<TreeNodeData>({ id: 'schedule', label: 'Schedule Board', kind: 'view', view: 'schedule' })
  const [view, setView] = useState('schedule')
  const [subTab, setSubTab] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS as Booking[])
  const [alerts, setAlerts] = useState<AlertRow[]>(INITIAL_ALERTS)
  const [selBooking, setSelBooking] = useState<string | null>('BK-20488')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [modal, setModal] = useState<ModalState>(null)
  const [toast, setToast] = useState<{ msg: string; kind?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState(1)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const visibleBookings = useMemo(() => {
    const f = filters
    if (f.status.length === 0 && f.aircraft.length === 0 && f.cfi.length === 0 && f.paid === null) return bookings
    return bookings.filter(b => {
      if (f.status.length > 0 && !f.status.includes(b.status)) return false
      if (f.aircraft.length > 0 && !f.aircraft.includes(b.tail)) return false
      if (f.cfi.length > 0 && (!b.cfi || !f.cfi.includes(b.cfi))) return false
      if (f.paid !== null && b.paid !== f.paid) return false
      return true
    })
  }, [bookings, filters])

  // Hydrate persisted settings from localStorage after mount.
  useEffect(() => {
    const z = Number(localStorage.getItem('mf_zoom'))
    if (z) setZoom(z)
    const t = localStorage.getItem('mf_theme') as 'dark' | 'light' | null
    if (t) setTheme(t)
  }, [])

  useEffect(() => { localStorage.setItem('mf_zoom', String(zoom)) }, [zoom])
  useEffect(() => { localStorage.setItem('mf_theme', theme) }, [theme])

  const showToast = useCallback((msg: string, kind: string = 'info') => {
    setToast({ msg, kind })
    const handle = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(handle)
  }, [])

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
  const handleConvertRequest = (r: { id: string; student: string }) => {
    setModal({
      kind: 'confirm',
      payload: {
        title: 'APPROVE SLOT REQUEST',
        message: `Approve ${r.id} for ${r.student}? This will create a pending booking.`,
        confirmLabel: 'Approve',
        onConfirm: () => { setModal(null); showToast(`${r.id} approved`, 'ok') },
      },
    })
  }
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const renderView = () => {
    if (loading) return <div className="view-pad"><Skeleton lines={8} /></div>
    switch (view) {
      case 'schedule':   return <ScheduleBoard bookings={visibleBookings} zoom={zoom} selBookingId={selBooking} onSelBooking={setSelBooking} />
      case 'fleet':      return <FleetView subTab={subTab} />
      case 'students':   return <StudentsView />
      case 'integrity':  return <IntegrityView alerts={alerts} onResolve={handleResolve} />
      case 'requests':   return <RequestsView onConvert={handleConvertRequest} />
      case 'dispatch':   return <DispatchView />
      case 'syllabus':   return <SyllabusView />
      case 'onboarding': return <OnboardingView />
      case 'debriefs':   return <DebriefsView />
      case 'billing':    return <BillingView subTab={subTab} />
      case 'expenses':   return <ExpensesView />
      case 'payouts':    return <PayoutsView />
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
        />
        <main className="main">
          <IconRail view={view} onView={(v) => { setView(v); setSubTab(0) }} />
          <div className="main-inner">
            <DocNav
              view={view}
              draftIdx={draft}
              draftCount={DRAFT_COUNT}
              onPrevDraft={() => setDraft(d => Math.max(1, d - 1))}
              onNextDraft={() => setDraft(d => Math.min(DRAFT_COUNT, d + 1))}
            />
            <SubTabs view={view} active={subTab} onActive={setSubTab} />
            {view === 'schedule' && (
              <Toolbar zoom={zoom} onZoom={setZoom} date="22 Apr 2026" onNewSlot={() => setModal({ kind: 'new' })} />
            )}
            <div className="main-canvas">{renderView()}</div>
          </div>
        </main>
        <OpsPulse
          alerts={alerts}
          bookings={visibleBookings}
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

      {modal?.kind === 'new' && <NewSlotModal onClose={() => setModal(null)} onCreate={handleNewSlot} />}
      {modal?.kind === 'reassign' && <ReassignModal booking={modal.payload} onClose={() => setModal(null)} onReassign={handleReassign} />}
      {modal?.kind === 'confirm' && <ConfirmModal {...modal.payload} onClose={() => setModal(null)} />}

      <Toast toast={toast} />
    </div>
  )
}
