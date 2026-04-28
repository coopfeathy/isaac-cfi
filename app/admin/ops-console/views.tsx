'use client'

import { useRef, useState } from 'react'
import type { ReactNode, MouseEvent, DragEvent, PointerEvent } from 'react'
import { I, Badge, Avatar } from './primitives'
import { useNow } from './shell'
import {
  INSTRUCTORS, SLOT_REQUESTS, DISPATCH,
  INVOICES, SYLLABUS, ONBOARDING, PAYOUTS, EXPENSES, SUBSCRIPTIONS, CREDITS,
  DISPUTES, SQUAWKS, MAINT_EVENTS, TICKS, STATUS,
} from './data'

type Booking = {
  id: string; code?: string; tail: string; start: number; end: number; student: string;
  studentId?: string | null; aircraftId?: string | null;
  cfi: string | null; cfiInitials?: string | null; lesson: string; status: string; paid: boolean | null;
}
type AlertRow = { id: string; sev: string; code: string; msg: string; ts: string; resolved: boolean }
export type Student = {
  id: string; name: string; phase: string; progress: number;
  balance: number; lastLesson: string; status: string;
}
export type Aircraft = {
  // `id` is present for DB-backed rows; seed/fallback rows omit it.
  id?: string;
  tail: string; model: string; hobbs: number; nextInsp: string; status: string;
  // Home base ICAO. Defaults to KPNE for rows that don't yet persist this.
  homeBase?: string;
}

// Deterministic color bucket for DB-backed instructors so each CFI renders a
// stable avatar color across reloads. Uses the Avatar color tokens defined in
// ops-console.css (avatar-blue/teal/violet).
const CFI_PALETTE = ['blue', 'teal', 'violet'] as const
function pickCfiColor(cfiId: string | null): string {
  if (!cfiId) return CFI_PALETTE[0]
  let h = 0
  for (let i = 0; i < cfiId.length; i++) h = (h * 31 + cfiId.charCodeAt(i)) | 0
  return CFI_PALETTE[Math.abs(h) % CFI_PALETTE.length]
}

export function EmptyState({ icon, title, sub, cta }: { icon?: string; title: string; sub?: string; cta?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-ico"><I name={icon || 'square'} size={22} /></div>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub mono dim">{sub}</div>}
      {cta && <div className="empty-cta">{cta}</div>}
    </div>
  )
}

export function Skeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div className="skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="sk-row">
          <div className="sk-bar" style={{ width: `${30 + ((i * 37) % 50)}%` }} />
          <div className="sk-bar sk-thin" style={{ width: `${20 + ((i * 19) % 30)}%` }} />
        </div>
      ))}
    </div>
  )
}

export function ScheduleBoard({ aircraft, bookings, zoom, viewDate, selBookingId, onSelBooking, onEmptySlotClick, onAddAircraft, onDeleteAircraft, onMoveBooking, onResizeBookingRequest }: {
  aircraft: Aircraft[];
  bookings: Booking[]; zoom: number; viewDate?: Date; selBookingId: string | null;
  onSelBooking: (id: string) => void;
  onEmptySlotClick?: (tail: string, startTick: number) => void;
  onAddAircraft?: () => void;
  onDeleteAircraft?: (a: Aircraft) => void;
  onMoveBooking?: (id: string, to: { tail: string; startTick: number }) => void;
  onResizeBookingRequest?: (id: string, nextStart: number, nextEnd: number) => void;
}) {
  const TICK_PX = 44 * zoom
  const ROW_H = 62
  const LABEL_W = 168

  // Only render the amber "now" line when the viewed day is the real-world
  // today (compared in the user's local timezone). Board ticks run 07:00→19:00
  // in 30-min increments, so times outside that window also hide the line.
  const now = useNow()
  const nowTick: number | null = (() => {
    if (!now || !viewDate) return null
    const sameDay =
      now.getFullYear() === viewDate.getFullYear() &&
      now.getMonth() === viewDate.getMonth() &&
      now.getDate() === viewDate.getDate()
    if (!sameDay) return null
    const minutes = now.getHours() * 60 + now.getMinutes()
    const tick = (minutes - 7 * 60) / 30
    if (tick < 0 || tick > TICKS.length - 1) return null
    return tick
  })()
  const nowLabel = now
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} · NOW`
    : ''
  // Track drag state: which booking is being dragged and the pointer-offset (in ticks)
  // from its left edge, so drop position maps naturally to the new start tick.
  const dragRef = useRef<{ id: string; offsetTicks: number } | null>(null)

  // Live resize preview (pointer-driven). While pointer is down on a handle,
  // we render the affected booking at previewStart/previewEnd instead of its
  // stored start/end. On pointer up we bubble the new values up to the parent
  // via onResizeBookingRequest (which typically opens a confirm modal).
  const [resize, setResize] = useState<{ id: string; side: 'l' | 'r'; previewStart: number; previewEnd: number } | null>(null)
  const resizeRef = useRef<{ id: string; side: 'l' | 'r'; origStart: number; origEnd: number; trackLeft: number } | null>(null)

  const handleResizePointerDown = (b: Booking, side: 'l' | 'r') => (e: PointerEvent<HTMLDivElement>) => {
    if (!onResizeBookingRequest) return
    e.preventDefault()
    e.stopPropagation()
    const track = (e.currentTarget as HTMLElement).closest('.row-track') as HTMLElement | null
    if (!track) return
    const trackLeft = track.getBoundingClientRect().left
    resizeRef.current = { id: b.id, side, origStart: b.start, origEnd: b.end, trackLeft }
    setResize({ id: b.id, side, previewStart: b.start, previewEnd: b.end })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleResizePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current
    if (!r) return
    const x = e.clientX - r.trackLeft
    const tick = Math.max(0, Math.min(24, Math.round(x / TICK_PX)))
    if (r.side === 'l') {
      const nextStart = Math.max(0, Math.min(tick, r.origEnd - 1))
      setResize({ id: r.id, side: 'l', previewStart: nextStart, previewEnd: r.origEnd })
    } else {
      const nextEnd = Math.max(r.origStart + 1, Math.min(tick, 24))
      setResize({ id: r.id, side: 'r', previewStart: r.origStart, previewEnd: nextEnd })
    }
  }

  const handleResizePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current
    const p = resize
    resizeRef.current = null
    setResize(null)
    if (!r || !p || !onResizeBookingRequest) return
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
    // No-op if nothing changed.
    if (p.previewStart === r.origStart && p.previewEnd === r.origEnd) return
    onResizeBookingRequest(r.id, p.previewStart, p.previewEnd)
  }

  // Compute the tick index under a pointer within the row's track element.
  const handleTrackClick = (tail: string, e: MouseEvent<HTMLDivElement>) => {
    if (!onEmptySlotClick) return
    // Only fire if the click landed on the track itself or a bare cell, not a block.
    const target = e.target as HTMLElement
    if (target.closest('.block')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const tick = Math.floor(x / TICK_PX)
    if (tick < 0 || tick >= TICKS.length - 1) return
    // Don't open on a tick already occupied by a booking.
    const occupied = bookings.some(b => b.tail === tail && tick >= b.start && tick < b.end)
    if (occupied) return
    onEmptySlotClick(tail, tick)
  }

  const handleBlockDragStart = (b: Booking, e: DragEvent<HTMLDivElement>) => {
    if (!onMoveBooking) return
    // Offset in pixels from the block's left edge, converted to whole ticks.
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetTicks = Math.floor((e.clientX - rect.left) / TICK_PX)
    dragRef.current = { id: b.id, offsetTicks }
    e.dataTransfer.effectAllowed = 'move'
    // Some browsers require a dataTransfer payload to initiate drag.
    e.dataTransfer.setData('text/plain', b.id)
  }

  const handleTrackDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!onMoveBooking || !dragRef.current) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleTrackDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (!onMoveBooking || !dragRef.current) return
    e.preventDefault()
  }

  const handleTrackDrop = (tail: string, e: DragEvent<HTMLDivElement>) => {
    if (!onMoveBooking || !dragRef.current) return
    e.preventDefault()
    const { id, offsetTicks } = dragRef.current
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const rawTick = Math.floor(x / TICK_PX)
    const startTick = Math.max(0, rawTick - offsetTicks)
    onMoveBooking(id, { tail, startTick })
    dragRef.current = null
  }
  return (
    <div className="canvas-wrap">
      <div className="canvas-scroll">
        <div className="board">
          <div className="board-header">
            <div className="board-corner" style={{ width: LABEL_W }}><span className="mono dim">AIRCRAFT / TIME</span></div>
            <div className="board-ticks">
              {TICKS.map((t, i) => (
                <div key={i} className={`tick ${i % 2 === 0 ? 'tick-major' : 'tick-minor'}`} style={{ width: TICK_PX }}>
                  <span className="mono">{i % 2 === 0 ? t : ''}</span>
                </div>
              ))}
            </div>
          </div>
          {nowTick !== null && (
            <div className="now-line" style={{ left: LABEL_W + nowTick * TICK_PX - 1 }}>
              <div className="now-dot" />
              <div className="now-label mono">{nowLabel}</div>
            </div>
          )}
          {aircraft.map(ac => {
            const rowBookings = bookings.filter(b => b.tail === ac.tail)
            return (
              <div key={ac.tail} className="board-row" style={{ height: ROW_H }}>
                <div className="row-label" style={{ width: LABEL_W }}>
                  <div className="row-label-top">
                    <I name="plane" />
                    <span className="mono row-tail">{ac.tail}</span>
                    {ac.status === 'ground' && <Badge kind="error">AOG</Badge>}
                    {ac.status === 'squawk' && <Badge kind="warn">SQK</Badge>}
                    {onDeleteAircraft && (
                      <button
                        className="row-del"
                        onClick={(e) => { e.stopPropagation(); onDeleteAircraft(ac) }}
                        title={`Remove ${ac.tail}`}
                        aria-label={`Remove ${ac.tail}`}
                      >
                        <I name="x-oct" size={11} />
                      </button>
                    )}
                  </div>
                  <div className="row-label-bot"><span className="dim">{ac.model}</span></div>
                  <div className="row-label-meta mono dim">HOBBS {ac.hobbs.toFixed(1)}</div>
                </div>
                <div
                  className="row-track"
                  onClick={(e) => handleTrackClick(ac.tail, e)}
                  onDragEnter={handleTrackDragEnter}
                  onDragOver={handleTrackDragOver}
                  onDrop={(e) => handleTrackDrop(ac.tail, e)}
                  style={{ cursor: onEmptySlotClick ? 'crosshair' : undefined }}
                >
                  {TICKS.slice(0, -1).map((_, i) => <div key={i} className={`cell ${i % 2 === 0 ? 'cell-major' : ''}`} style={{ width: TICK_PX }} />)}
                  {rowBookings.map(b => {
                    const s = STATUS[b.status]
                    // Prefer the live-DB initials if present (sourced from the
                    // `profiles` join in rowToOps). Fall back to the seed
                    // INSTRUCTORS lookup for in-memory demo bookings.
                    const seedCfi = INSTRUCTORS.find(c => c.id === b.cfi) || null
                    const cfi = b.cfiInitials
                      ? { initials: b.cfiInitials, color: pickCfiColor(b.cfi) }
                      : seedCfi
                    // If this booking is mid-resize, use the live preview values.
                    const isResizing = resize?.id === b.id
                    const displayStart = isResizing ? resize!.previewStart : b.start
                    const displayEnd = isResizing ? resize!.previewEnd : b.end
                    const width = (displayEnd - displayStart) * TICK_PX - 4
                    const left = displayStart * TICK_PX + 2
                    const sel = selBookingId === b.id
                    const canEdit = b.status !== 'maint' && b.status !== 'aog'
                    const draggable = !!onMoveBooking && canEdit
                    const resizable = !!onResizeBookingRequest && canEdit
                    return (
                      <div
                        key={b.id}
                        className={`block block-${b.status} ${sel ? 'block-sel' : ''} ${isResizing ? 'block-resizing' : ''}`}
                        style={{ left, width, background: s.fill, borderColor: s.stroke, color: s.text, cursor: draggable ? 'grab' : 'pointer' }}
                        onClick={() => onSelBooking(b.id)}
                        draggable={draggable && !isResizing}
                        onDragStart={draggable ? (e) => handleBlockDragStart(b, e) : undefined}
                      >
                        {resizable && (
                          <>
                            <div
                              className="block-handle block-handle-l"
                              onPointerDown={handleResizePointerDown(b, 'l')}
                              onPointerMove={handleResizePointerMove}
                              onPointerUp={handleResizePointerUp}
                              onClick={(e) => e.stopPropagation()}
                              title="Drag to adjust start"
                              aria-label="Resize start"
                            />
                            <div
                              className="block-handle block-handle-r"
                              onPointerDown={handleResizePointerDown(b, 'r')}
                              onPointerMove={handleResizePointerMove}
                              onPointerUp={handleResizePointerUp}
                              onClick={(e) => e.stopPropagation()}
                              title="Drag to adjust end"
                              aria-label="Resize end"
                            />
                          </>
                        )}
                        <div className="block-head">
                          <span className="mono block-id">{b.code ?? b.id}</span>
                          <Avatar cfi={cfi} />
                        </div>
                        <div className="block-body">
                          <div className="block-student">{b.student}</div>
                          <div className="block-lesson mono">{b.lesson}</div>
                        </div>
                        {!b.paid && b.status !== 'maint' && b.status !== 'aog' && (
                          <div className="block-badge"><I name="lock" size={10} /> UNPAID</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {onAddAircraft && (
            <div className="board-row board-row-add" style={{ height: ROW_H - 20 }}>
              <div className="row-label row-label-add" style={{ width: LABEL_W }}>
                <button className="btn-ghost row-add-btn" onClick={onAddAircraft}>
                  <I name="plus" /> Add aircraft
                </button>
              </div>
              <div className="row-track row-track-add" />
            </div>
          )}
        </div>
      </div>
      <div className="canvas-foot">
        <div className="legend">
          {Object.entries(STATUS).map(([k, v]) => (
            <span key={k} className="leg-item">
              <span className="leg-sw" style={{ background: v.fill, borderColor: v.stroke }} />
              <span className="leg-txt mono">{v.label}</span>
            </span>
          ))}
        </div>
        <span className="mono dim foot-right">
          {aircraft.length} aircraft · {bookings.filter(b => b.status !== 'maint' && b.status !== 'aog').length} bookings · {bookings.filter(b => !b.paid && b.status !== 'maint' && b.status !== 'aog').length} unpaid · sync {now ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '—:—'}
        </span>
      </div>
    </div>
  )
}

export function FleetView({ aircraft, bookings, subTab = 0, onAddAircraft, onDeleteAircraft, onOpenAircraft }: {
  aircraft: Aircraft[];
  bookings: Booking[];
  subTab?: number;
  onAddAircraft?: () => void;
  onDeleteAircraft?: (a: Aircraft) => void;
  onOpenAircraft?: (a: Aircraft) => void;
}) {
  if (subTab === 1) {
    // Derive AOG count from the live fleet so the "IN SHOP" delta reflects
    // actual grounded aircraft instead of the previous hardcoded "1 AOG".
    const aogCount = aircraft.filter(a => a.status === 'ground').length
    // MTD maintenance spend — sum EXPENSES in the Maintenance/Parts categories
    // whose `date` falls inside the current calendar month. Replaces the
    // previous hardcoded "$3,736.20 · 2 events" which stayed constant even
    // when the underlying expense ledger changed.
    const todayDate = new Date()
    const curMonthKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}`
    const mtdMaint = EXPENSES.filter(e =>
      (e.category === 'Maintenance' || e.category === 'Parts') && e.date.startsWith(curMonthKey)
    )
    const mtdMaintSpend = mtdMaint.reduce((s, e) => s + e.amount, 0)
    // Fleet uptime — previously "94.1% · ▴ 2.3 pp" was invented (no history is
    // persisted to compute a 30-day trend). Derive a current-state uptime from
    // the live roster: non-grounded aircraft / total. The tile is relabeled
    // "UPTIME · NOW" to reflect what it actually measures.
    const fleetUptimeNow = aircraft.length === 0
      ? null
      : (aircraft.filter(a => a.status !== 'ground').length / aircraft.length)
    // DUE · 14 DAYS tile previously hardcoded `stat-delta warn` with subtitle
    // "schedule now". When zero events were in the upcoming state the tile
    // still glowed orange and instructed the viewer to schedule something —
    // the literal opposite of the truth. Mirror the IN SHOP / UPTIME · NOW
    // pattern next door: tone warn and say "schedule now" only when there's
    // actually something due, else go dim with "none upcoming". Same
    // fragility class as the recently-fixed Disputes OPEN and Endorsements
    // ACTIVE tiles.
    const upcomingMaint = MAINT_EVENTS.filter(m => m.status === 'upcoming').length
    const upcomingTone = upcomingMaint > 0 ? 'stat-delta warn' : 'stat-delta dim'
    const upcomingSub = upcomingMaint > 0 ? 'schedule now' : 'none upcoming'
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">IN SHOP</div><div className="stat-v">{MAINT_EVENTS.filter(m => m.status === 'in_shop' || m.status === 'awaiting_parts').length}</div><div className={aogCount > 0 ? 'stat-delta neg' : 'stat-delta dim'}>{aogCount > 0 ? `${aogCount} AOG` : 'no AOG'}</div></div>
          <div className="stat"><div className="stat-k mono">DUE · 14 DAYS</div><div className="stat-v">{upcomingMaint}</div><div className={upcomingTone}>{upcomingSub}</div></div>
          <div className="stat"><div className="stat-k mono">MTD · SPEND</div><div className="stat-v">${mtdMaintSpend.toFixed(2)}</div><div className="stat-delta dim mono">{mtdMaint.length} event{mtdMaint.length === 1 ? '' : 's'}</div></div>
          <div className="stat"><div className="stat-k mono">UPTIME · NOW</div><div className="stat-v">{fleetUptimeNow === null ? '—' : `${Math.round(fleetUptimeNow * 100)}%`}</div><div className={aogCount > 0 ? 'stat-delta neg' : 'stat-delta dim'}>{fleetUptimeNow === null ? '—' : (aogCount > 0 ? `${aogCount} grounded` : 'all flying')}</div></div>
        </div>
        <div className="sect-head"><h3>Maintenance schedule</h3><span className="mono dim">{MAINT_EVENTS.length} events</span></div>
        <table className="dt"><thead><tr><th>ID</th><th>Tail</th><th>Type</th><th className="right">Hobbs now</th><th className="right">Due @</th><th>Due date</th><th>Status</th><th></th></tr></thead><tbody>
          {MAINT_EVENTS.map(m => (
            <tr key={m.id}>
              <td className="mono dim">{m.id}</td>
              <td className="mono strong">{m.tail}</td>
              <td>{m.kind}</td>
              <td className="right mono">{m.hobbs.toFixed(1)}</td>
              <td className="right mono dim">{m.dueHobbs ? m.dueHobbs.toFixed(1) : '—'}</td>
              <td className="mono dim">{m.due}</td>
              <td>
                {m.status === 'upcoming'       && <Badge kind="info">UPCOMING</Badge>}
                {m.status === 'scheduled'      && <Badge kind="muted">SCHEDULED</Badge>}
                {m.status === 'in_shop'        && <Badge kind="warn">IN SHOP</Badge>}
                {m.status === 'awaiting_parts' && <Badge kind="error">AWAIT PARTS</Badge>}
              </td>
              <td className="right"><button className="btn-ghost">{m.status === 'awaiting_parts' ? 'Track ›' : 'Open work order ›'}</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 2) {
    // Per-aircraft utilization derived from today's live bookings (slotsBooked
    // / SLOTS) instead of the previously hardcoded `utils` array that was
    // index-aligned to a 5-aircraft seed and produced nonsense whenever the
    // fleet changed. SLOTS matches ScheduleCapacity's day definition (24 × 30m
    // blocks spanning 07:00-19:00).
    const SLOTS = 24
    const utilByTail = new Map<string, number>()
    aircraft.forEach(a => {
      const slotsBooked = bookings
        .filter(b => b.tail === a.tail && b.status !== 'cancelled')
        .reduce((sum, b) => sum + (b.end - b.start), 0)
      utilByTail.set(a.tail, Math.min(1, slotsBooked / SLOTS))
    })
    // Fleet-wide utilization for today (avg across the roster). Replaces the
    // previous hardcoded "62% · ▴ 4 pp". We can't honestly show a 7-day number
    // until history is persisted, so the tile is relabeled "TODAY".
    const fleetUtilToday = aircraft.length === 0
      ? 0
      : Array.from(utilByTail.values()).reduce((a, b) => a + b, 0) / aircraft.length
    // Derive TOP UTILIZED / IDLE from today's live utilization. TOP = highest
    // utilization among non-grounded aircraft; IDLE = any grounded (AOG)
    // aircraft, else the lowest-utilization aircraft.
    const nonGrounded = aircraft.filter(a => a.status !== 'ground')
    const topAircraft = nonGrounded.reduce<Aircraft | null>(
      (top, a) => (!top || (utilByTail.get(a.tail) ?? 0) > (utilByTail.get(top.tail) ?? 0)) ? a : top,
      null,
    )
    const topUtil = topAircraft ? (utilByTail.get(topAircraft.tail) ?? 0) : 0
    const aog = aircraft.find(a => a.status === 'ground')
    const idleAircraft = aog || nonGrounded.reduce<Aircraft | null>(
      (lo, a) => (!lo || (utilByTail.get(a.tail) ?? 0) < (utilByTail.get(lo.tail) ?? 0)) ? a : lo,
      null,
    )
    // UTILIZATION · TODAY tile previously hardcoded `stat-delta dim mono` with
    // subtitle "avg across fleet" — a label that just restated the methodology
    // (the `%` value IS by definition an average across the fleet) and never
    // moved with data. Same fragility class as the recently-fixed Squawks
    // DEFER-ELIGIBLE "within MEL" / Endorsements ACTIVE "all current" / Payouts
    // NET · MTD "after fees" / Subscriptions ACTIVE "all current" tiles: a
    // bare descriptor that stayed the same shape whether the % was 0%, 40%, or
    // 100%, whether the fleet had 1 aircraft or 12, and whether an AOG was
    // dragging the avg toward zero. Surface the denominator that actually
    // matters here — how many aircraft are flying any block today vs the full
    // fleet — so the tile discloses *what* is being averaged. With one AOG +
    // four idle planes, fleetUtilToday will read ~10% with subtitle "1 of 6 in
    // use", which is a very different story than "avg across fleet" pretending
    // the % is a clean fleet-wide measure.
    const inUse = Array.from(utilByTail.values()).filter(u => u > 0).length
    const utilSub = aircraft.length === 0
      ? '—'
      : `${inUse} of ${aircraft.length} in use`
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">FLEET TOTAL</div><div className="stat-v">{aircraft.reduce((s, a) => s + a.hobbs, 0).toFixed(1)} h</div><div className="stat-delta dim mono">{aircraft.length} aircraft</div></div>
          <div className="stat"><div className="stat-k mono">UTILIZATION · TODAY</div><div className="stat-v">{Math.round(fleetUtilToday * 100)}%</div><div className="stat-delta dim mono">{utilSub}</div></div>
          <div className="stat">
            <div className="stat-k mono">TOP UTILIZED</div>
            <div className="stat-v">{topAircraft?.tail || '—'}</div>
            <div className="stat-delta dim mono">{topAircraft && topUtil > 0 ? `${Math.round(topUtil * 100)}% today` : '—'}</div>
          </div>
          <div className="stat">
            <div className="stat-k mono">IDLE · TODAY</div>
            <div className="stat-v">{idleAircraft?.tail || '—'}</div>
            <div className={`stat-delta ${aog ? 'neg' : 'dim'}`}>{aog ? 'AOG' : (idleAircraft ? 'no bookings' : '—')}</div>
          </div>
        </div>
        <div className="sect-head"><h3>Hobbs by aircraft</h3></div>
        <table className="dt"><thead><tr><th>Tail</th><th>Model</th><th className="right">Hobbs</th><th className="right">Last flight</th><th className="right">Δ · 7d</th><th>Until next insp.</th><th>Utilization</th></tr></thead><tbody>
          {aircraft.map(a => {
            // "Last flight" and "Δ · 7d" both require persisted hobbs history
            // that the current Aircraft row doesn't carry, so we show em-dashes
            // instead of inventing numbers. "Until next insp." passes through
            // the free-text `nextInsp` string (e.g. "100h @ 3002" or "Annual
            // 06/12") rather than the old index-aligned hour countdown that
            // belonged to whatever aircraft happened to sit at that row.
            const util = utilByTail.get(a.tail) ?? 0
            return (
              <tr key={a.tail}>
                <td><span className="mono strong">{a.tail}</span></td>
                <td className="dim">{a.model}</td>
                <td className="right mono strong">{a.hobbs.toFixed(1)}</td>
                <td className="right mono dim">—</td>
                <td className="right mono dim">—</td>
                <td className="mono dim">{a.nextInsp || '—'}</td>
                <td><div className="progress"><div className="progress-fill" style={{ width: `${util * 100}%` }} /><span className="progress-txt mono">{Math.round(util * 100)}%</span></div></td>
              </tr>
            )
          })}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 3) {
    // Derive the squawk-log tiles from the SQUAWKS table rather than inventing
    // numbers. The previous "RESOLVED · 30D: 14" was flat-out wrong (only 2
    // resolved in the seed), and "1 major" / "MTBF 86 h" drifted whenever the
    // log changed. We drop MTBF entirely — it would require engine-hours
    // history we don't persist — and replace it with an honest MAJOR count.
    const openSquawks = SQUAWKS.filter(s => s.status === 'open')
    const openMajor = openSquawks.filter(s => s.severity === 'major').length
    const deferredSquawks = SQUAWKS.filter(s => s.status === 'deferred')
    const deferredCount = deferredSquawks.length
    const resolvedCount = SQUAWKS.filter(s => s.status === 'resolved').length
    const majorCount = SQUAWKS.filter(s => s.severity === 'major').length
    // DEFERRED tile previously hardcoded `stat-delta dim` with subtitle
    // "within MEL" — same label-not-metric pattern as the recently-fixed
    // Squawks RESOLVED "in log" / Integrity PAID-UNBOOKED "BI-104 alerts"
    // / Payouts AVG SETTLE "ACH" / Receipts ATTACHED tiles. "within MEL"
    // just restates the regulatory category every deferred squawk belongs
    // to by definition; it never moves with data and adds no signal.
    // Worse, FAA MEL deferrals carry repair-interval limits — a stale
    // deferral is an active maintenance escalation, not a dim
    // informational state, same fragility class as the recently-fixed
    // Maintenance DUE·14D and Disputes OPEN tiles which were quietly dim
    // on real-action states. Compute the oldest deferral age from the
    // `reported` date and tone warn past the 30-day MEL Category-A
    // guideline; else dim with the age, and pos on empty.
    const oldestDeferredDays = deferredCount > 0
      ? Math.max(...deferredSquawks.map(s => Math.floor((Date.now() - new Date(s.reported).getTime()) / 86_400_000)))
      : 0
    const deferredTone = deferredCount === 0
      ? 'stat-delta pos'
      : (oldestDeferredDays > 30 ? 'stat-delta warn' : 'stat-delta dim')
    const deferredSub = deferredCount === 0
      ? 'none deferred'
      : `oldest ${oldestDeferredDays}d`
    // RESOLVED tile previously hardcoded `stat-delta dim` with subtitle
    // "in log" — same label-not-metric pattern as the recently-fixed Payouts
    // AVG SETTLE "ACH" / Receipts ATTACHED "100% covered" / Integrity PAID
    // UNBOOKED "BI-104 alerts" tiles. "in log" just restates that the count
    // came from the squawk log; it never moves with data and adds no signal.
    // Surface a denominator ("4 of 12 total") so the share is interpretable
    // and the tile communicates progress rather than a tautology. Tone stays
    // dim because resolved is a neutral historical metric, not an action
    // signal. Empty state is honest "no log entries" rather than "in log".
    const resolvedSub = SQUAWKS.length > 0
      ? `of ${SQUAWKS.length} total`
      : 'no log entries'
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">OPEN</div><div className="stat-v">{openSquawks.length}</div><div className={openMajor > 0 ? 'stat-delta warn' : 'stat-delta dim'}>{openMajor > 0 ? `${openMajor} major` : 'all minor'}</div></div>
          <div className="stat"><div className="stat-k mono">DEFERRED</div><div className="stat-v">{deferredCount}</div><div className={deferredTone}>{deferredSub}</div></div>
          <div className="stat"><div className="stat-k mono">RESOLVED</div><div className="stat-v">{resolvedCount}</div><div className="stat-delta dim">{resolvedSub}</div></div>
          <div className="stat"><div className="stat-k mono">MAJOR · ALL</div><div className="stat-v">{majorCount}</div><div className={majorCount > 0 ? 'stat-delta warn' : 'stat-delta pos'}>{majorCount > 0 ? 'severity flag' : 'none'}</div></div>
        </div>
        <div className="sect-head"><h3>Squawk log</h3><span className="mono dim">{SQUAWKS.length}</span></div>
        <table className="dt"><thead><tr><th>ID</th><th>Tail</th><th>Item</th><th>Severity</th><th>Reported</th><th>By</th><th>Status</th><th></th></tr></thead><tbody>
          {SQUAWKS.map(s => (
            <tr key={s.id}>
              <td className="mono dim">{s.id}</td>
              <td className="mono strong">{s.tail}</td>
              <td>{s.item}</td>
              <td>{s.severity === 'major' ? <Badge kind="error">MAJOR</Badge> : <Badge kind="muted">MINOR</Badge>}</td>
              <td className="mono dim">{s.reported}</td>
              <td className="dim">{s.by}</td>
              <td>
                {s.status === 'open'     && <Badge kind="warn">OPEN</Badge>}
                {s.status === 'deferred' && <Badge kind="info">DEFERRED</Badge>}
                {s.status === 'resolved' && <Badge kind="ok">RESOLVED</Badge>}
              </td>
              <td className="right"><button className="btn-ghost">{s.status === 'resolved' ? 'View ›' : 'Clear ›'}</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  return (
    <div className="view-pad">
      <div className="sect-head">
        <h3>Fleet roster</h3>
        {onAddAircraft && (
          <button className="btn-primary" onClick={onAddAircraft}>
            <I name="plus" /> Add aircraft
          </button>
        )}
      </div>
      {aircraft.length === 0 ? (
        <EmptyState
          icon="plane"
          title="No aircraft"
          sub="Add an aircraft to start scheduling flights."
          cta={onAddAircraft ? <button className="btn-primary" onClick={onAddAircraft}><I name="plus" /> Add aircraft</button> : undefined}
        />
      ) : (
        <table className="dt"><thead><tr><th>Tail</th><th>Model</th><th className="right">Hobbs</th><th>Next Inspection</th><th>Status</th><th className="right">Today</th><th></th></tr></thead><tbody>
          {aircraft.map(a => {
            const today = bookings.filter(b => b.tail === a.tail).length
            return (
              <tr key={a.tail}>
                <td><span className="mono strong">{a.tail}</span></td>
                <td className="dim">{a.model}</td>
                <td className="right mono">{a.hobbs.toFixed(1)}</td>
                <td className="mono dim">{a.nextInsp}</td>
                <td>
                  {a.status === 'active' && <Badge kind="ok">ACTIVE</Badge>}
                  {a.status === 'squawk' && <Badge kind="warn">SQUAWK</Badge>}
                  {a.status === 'ground' && <Badge kind="error">AOG</Badge>}
                </td>
                <td className="right mono">{today} bk</td>
                <td className="right">
                  <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); onOpenAircraft?.(a) }}>Open ›</button>
                  {onDeleteAircraft && (
                    <button
                      className="btn-ghost"
                      onClick={(e) => { e.stopPropagation(); onDeleteAircraft(a) }}
                      title={`Remove ${a.tail}`}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody></table>
      )}
    </div>
  )
}

export function StudentsView({ students, subTab = 0, onDelete, onAddStudent }: { students: Student[]; subTab?: number; onDelete: (s: Student) => void; onAddStudent?: () => void }) {
  if (subTab === 1) {
    // PROGRESS
    // Stat tiles are derived from the live roster so they stay correct as
    // students are added/removed (previously "CHECKRIDE READY" and
    // "STALLED > 14D" were hardcoded to 1 / 2 regardless of the roster).
    const avgPct = students.length === 0 ? 0 : Math.round(students.reduce((t, s) => t + s.progress, 0) / students.length * 100)
    const activeStudents = students.filter(s => s.status === 'active')
    const checkrideReady = activeStudents.filter(s =>
      s.phase.toLowerCase().includes('checkride') || s.progress >= 0.95
    )
    const nowTs = Date.now()
    const stalled = activeStudents.filter(s => {
      if (!s.lastLesson || s.lastLesson === '—') return false
      const lessonTs = Date.parse(s.lastLesson)
      if (Number.isNaN(lessonTs)) return false
      return (nowTs - lessonTs) / 86_400_000 > 14
    })
    const checkrideLabel = checkrideReady.length === 0
      ? 'none ready'
      : checkrideReady.length === 1 ? checkrideReady[0].name : `${checkrideReady.length} students`
    // AVG COMPLETION tile previously hardcoded `stat-delta dim` with subtitle
    // "across roster" — same dishonest-label / never-moves-with-data pattern
    // as the recently-fixed Aircraft UTILIZATION · TODAY "avg across fleet"
    // and Syllabus AVG DURATION "flight time" tiles. The `%` value IS by
    // definition the average across the full roster (computed by dividing by
    // students.length on the line above), so the subtitle just restated the
    // methodology of the cell next to it. Whether the avg was 0%, 30%, or
    // 90%, whether the roster had 1 student or 50, and whether the avg was
    // being dragged down by a pile of zero-progress new sign-ups, the
    // subtitle stayed identical and added no signal. The actually-useful
    // disclosure here is how many students have actually started — students
    // with progress > 0 vs the full denominator. With 4 brand-new students
    // who haven't flown yet sitting at 0% next to 8 active learners, the
    // avg looks artificially low; surfacing "8 of 12 started" exposes that
    // the avg is a roster-wide read and not a working-students read. Empty
    // roster dims to "—" so a 0% over zero students doesn't claim to have
    // been averaged across anything.
    const startedCount = students.filter(s => s.progress > 0).length
    const avgCompletionSub = students.length === 0
      ? '—'
      : `${startedCount} of ${students.length} started`
    const nextUpBank = ['PPL-15 XC Dual', 'PPL-13 Night', 'PPL-18 Ckr', 'PPL-10 Stalls', 'IR-05 Holds', 'PPL-22 Flight Test', 'CPL-03 Complex', 'Disc Intro', 'IR-08 ILS']
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE LEARNERS</div><div className="stat-v">{activeStudents.length}</div><div className="stat-delta dim">of {students.length} total</div></div>
          <div className="stat"><div className="stat-k mono">AVG COMPLETION</div><div className="stat-v">{avgPct}%</div><div className="stat-delta dim">{avgCompletionSub}</div></div>
          <div className="stat"><div className="stat-k mono">CHECKRIDE READY</div><div className="stat-v">{checkrideReady.length}</div><div className="stat-delta dim">{checkrideLabel}</div></div>
          <div className="stat"><div className="stat-k mono">STALLED &gt; 14D</div><div className="stat-v">{stalled.length}</div><div className={`stat-delta ${stalled.length > 0 ? 'warn' : 'pos'}`}>{stalled.length > 0 ? 'need outreach' : 'all engaged'}</div></div>
        </div>
        <div className="sect-head"><h3>Syllabus progress</h3></div>
        <table className="dt"><thead><tr><th>Student</th><th>Phase</th><th>Progress</th><th className="right">Lessons</th><th className="right">Hours</th><th className="right">Last</th><th>Next up</th></tr></thead><tbody>
          {students.map((s, i) => {
            const lessons = Math.round(s.progress * 22)
            const hours = (s.progress * 40).toFixed(1)
            const nextup = nextUpBank[i % nextUpBank.length]
            return (
              <tr key={s.id}>
                <td className="strong">{s.name}</td>
                <td className="dim">{s.phase}</td>
                <td><div className="progress"><div className="progress-fill" style={{ width: `${s.progress * 100}%` }} /><span className="progress-txt mono">{Math.round(s.progress * 100)}%</span></div></td>
                <td className="right mono">{lessons}/22</td>
                <td className="right mono">{hours}</td>
                <td className="right mono dim">{s.lastLesson}</td>
                <td className="mono dim">{nextup}</td>
              </tr>
            )
          })}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 2) {
    // SOLO STATUS
    const SOLO = [
      { name: 'Avery Chen',   phase: 'PPL · Solo XC',   soloDate: '2026-03-14', endorseExp: '2026-06-14', xcExp: '2026-06-14', notes: 'Night solo pending' },
      { name: 'Priya Rao',    phase: 'PPL · XC',        soloDate: '2026-02-28', endorseExp: '2026-05-28', xcExp: '2026-05-28', notes: 'Ok' },
      { name: 'T. Okafor',    phase: 'PPL · Checkride', soloDate: '2025-11-18', endorseExp: '2026-05-18', xcExp: '2026-05-18', notes: 'Checkride scheduled 04/30' },
      { name: 'R. Delacroix', phase: 'IR · Approaches', soloDate: null,         endorseExp: null,         xcExp: null,         notes: 'IR — N/A' },
      { name: 'Sofia Haddad', phase: 'PPL · Pre-solo',  soloDate: null,         endorseExp: null,         xcExp: null,         notes: 'Stage check scheduled' },
      { name: 'Marcus Ortiz', phase: 'PPL · Pre-solo',  soloDate: null,         endorseExp: null,         xcExp: null,         notes: '14 hrs to go' },
    ]
    // Derive the four tiles from the SOLO array so the counts stay honest
    // if the list changes (previously all four values were hardcoded).
    const soloCleared = SOLO.filter(s => s.soloDate !== null)
    const preSolo = SOLO.filter(s => s.soloDate === null && s.phase.toLowerCase().includes('pre-solo'))
    const nowTs = Date.now()
    const DAY_MS = 86_400_000
    const endorseExpiringSoon = SOLO.filter(s => {
      if (!s.endorseExp) return false
      const t = Date.parse(s.endorseExp)
      if (Number.isNaN(t)) return false
      const days = (t - nowTs) / DAY_MS
      return days >= 0 && days < 30
    })
    const xcTotal = SOLO.filter(s => s.xcExp !== null).length
    const xcValid = SOLO.filter(s => {
      if (!s.xcExp) return false
      const t = Date.parse(s.xcExp)
      return !Number.isNaN(t) && t >= nowTs
    }).length
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">SOLO-CLEARED</div><div className="stat-v">{soloCleared.length}</div><div className={`stat-delta ${soloCleared.length > 0 ? 'pos' : 'dim'}`}>{soloCleared.length > 0 ? 'all valid' : 'none yet'}</div></div>
          <div className="stat"><div className="stat-k mono">PRE-SOLO</div><div className="stat-v">{preSolo.length}</div><div className="stat-delta dim">{preSolo.length > 0 ? 'stage checks active' : 'none pending'}</div></div>
          <div className="stat"><div className="stat-k mono">ENDORSE EXPIRES &lt; 30D</div><div className="stat-v">{endorseExpiringSoon.length}</div><div className={`stat-delta ${endorseExpiringSoon.length > 0 ? 'warn' : 'pos'}`}>{endorseExpiringSoon.length > 0 ? 'renew soon' : 'clear'}</div></div>
          <div className="stat"><div className="stat-k mono">XC ENDORSE VALID</div><div className="stat-v">{xcTotal === 0 ? '—' : `${xcValid}/${xcTotal}`}</div><div className={`stat-delta ${xcTotal > 0 && xcValid === xcTotal ? 'pos' : xcTotal === 0 ? 'dim' : 'warn'}`}>{xcTotal === 0 ? 'no XC yet' : xcValid === xcTotal ? 'current' : 'renew needed'}</div></div>
        </div>
        <div className="sect-head"><h3>Solo endorsements</h3></div>
        <table className="dt"><thead><tr><th>Student</th><th>Phase</th><th>First solo</th><th>90-day renew</th><th>XC endorse</th><th>Notes</th></tr></thead><tbody>
          {SOLO.map(s => (
            <tr key={s.name}>
              <td className="strong">{s.name}</td>
              <td className="dim">{s.phase}</td>
              <td className="mono dim">{s.soloDate || '—'}</td>
              <td className="mono">{s.endorseExp || '—'}</td>
              <td className="mono dim">{s.xcExp || '—'}</td>
              <td className="dim">{s.notes}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 3) {
    // HOLD POINTS
    const HOLDS = [
      { student: 'Marcus Ortiz', reason: 'Balance over limit',     amount: '$1,240.00', days: 4,  action: 'Collect payment',      sev: 'error' },
      { student: 'L. Petrov',    reason: 'Medical not uploaded',   amount: null,        days: 11, action: 'Request 3rd class',    sev: 'warn' },
      { student: 'Hana Kim',     reason: 'Subscription past-due',  amount: '$49.00',    days: 2,  action: 'Retry Stripe charge',  sev: 'warn' },
      { student: 'Clara Mendez', reason: 'Pending medical review', amount: null,        days: 3,  action: 'Await FAA',            sev: 'info' },
    ]
    // Holds tile derivations. Two of these were hardcoded:
    //   - "1 blocking dispatch" assumed exactly one `error`-sev hold
    //   - "$1,240.00" assumed Marcus Ortiz was the only blocking row
    // Both are now derived from HOLDS so the tiles stay honest if a hold
    // is added, resolved, or upgraded/downgraded in severity. The blocking
    // total parses the displayed "$1,240.00" strings back to numbers so
    // the source of truth stays the same single HOLDS array.
    const blocking = HOLDS.filter(h => h.sev === 'error')
    const blockingTotal = blocking.reduce((s, h) => s + (h.amount ? Number(h.amount.replace(/[^0-9.]/g, '')) : 0), 0)
    // DOC HOLDS tile previously hardcoded `stat-delta dim` with subtitle
    // "medicals" — same label-not-metric pattern as the recently-fixed
    // Integrity PAID/UNBOOKED "BI-104 alerts" and Squawks RESOLVED "in log"
    // tiles. "medicals" just restates the tile name (the tile already
    // filters on reason.includes('medical')); it never moves with data and
    // adds no signal. Split the doc holds into actionable (sev='warn',
    // school can chase the student to upload / submit) vs awaiting
    // (sev='info', FAA-side processing where nothing's owed by us). Tone
    // warn when any actionable medical hold is outstanding — these block
    // student dispatch the same way balance holds do, same fragility class
    // as the recently-fixed BOOKED/UNPAID and Disputes OPEN tiles. Subtitle
    // communicates state ("1 actionable" / "all awaiting FAA" / "no medical
    // holds") rather than restating the category.
    const docHolds = HOLDS.filter(h => h.reason.toLowerCase().includes('medical'))
    const docActionable = docHolds.filter(h => h.sev === 'warn' || h.sev === 'error').length
    const docHoldsTone = docActionable > 0 ? 'stat-delta warn' : 'stat-delta dim'
    const docHoldsSub = docHolds.length === 0
      ? 'no medical holds'
      : docActionable > 0
        ? `${docActionable} actionable`
        : 'all awaiting FAA'
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE HOLDS</div><div className="stat-v">{HOLDS.length}</div><div className={blocking.length > 0 ? 'stat-delta neg' : 'stat-delta pos'}>{blocking.length > 0 ? `${blocking.length} blocking dispatch` : 'none blocking'}</div></div>
          <div className="stat"><div className="stat-k mono">BALANCE HOLDS</div><div className="stat-v">{blocking.length}</div><div className={blockingTotal > 0 ? 'stat-delta warn' : 'stat-delta dim'}>{blockingTotal > 0 ? `$${blockingTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</div></div>
          <div className="stat"><div className="stat-k mono">DOC HOLDS</div><div className="stat-v">{docHolds.length}</div><div className={docHoldsTone}>{docHoldsSub}</div></div>
          {/* RESOLVED · 7D was hardcoded "5" / "avg 1.8 d" but there is no
             resolved-holds dataset (HOLDS only contains currently-active rows
             above) — every claim there was made up. Show an honest dash + the
             reason until a resolution log is wired up. */}
          <div className="stat"><div className="stat-k mono">RESOLVED · 7D</div><div className="stat-v">—</div><div className="stat-delta dim">no resolution log</div></div>
        </div>
        <div className="sect-head"><h3>Hold list</h3><span className="mono dim">cannot dispatch while active</span></div>
        <table className="dt"><thead><tr><th>Student</th><th>Reason</th><th className="right">Amount</th><th className="right">Age</th><th>Action</th><th>Severity</th><th></th></tr></thead><tbody>
          {HOLDS.map(h => (
            <tr key={h.student + h.reason}>
              <td className="strong">{h.student}</td>
              <td>{h.reason}</td>
              <td className="right mono">{h.amount || '—'}</td>
              <td className="right mono dim">{h.days}d</td>
              <td className="dim">{h.action}</td>
              <td>
                {h.sev === 'error' && <Badge kind="error">BLOCKING</Badge>}
                {h.sev === 'warn'  && <Badge kind="warn">WARN</Badge>}
                {h.sev === 'info'  && <Badge kind="info">INFO</Badge>}
              </td>
              <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Hold · ${h.student}`)}>Open ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  // ROSTER (default)
  if (students.length === 0) {
    return (
      <div className="view-pad">
        <EmptyState
          icon="user"
          title="No students"
          sub="All students have been removed. Add one to get started."
          cta={onAddStudent ? <button className="btn-primary" onClick={onAddStudent}><I name="plus" /> Add student</button> : undefined}
        />
      </div>
    )
  }
  return (
    <div className="view-pad">
      <div className="sect-head">
        <h3>Active roster</h3>
        {onAddStudent && (
          <button className="btn-primary" onClick={onAddStudent}>
            <I name="plus" /> Add student
          </button>
        )}
      </div>
      <table className="dt"><thead><tr><th>ID</th><th>Name</th><th>Phase</th><th>Progress</th><th className="right">Balance</th><th>Last lesson</th><th>Status</th><th></th></tr></thead><tbody>
        {students.map(s => (
          <tr key={s.id}>
            <td className="mono dim">{s.id}</td>
            <td className="strong">{s.name}</td>
            <td className="dim">{s.phase}</td>
            <td><div className="progress"><div className="progress-fill" style={{ width: `${s.progress * 100}%` }} /><span className="progress-txt mono">{Math.round(s.progress * 100)}%</span></div></td>
            <td className={`right mono ${s.balance < 0 ? 'neg' : s.balance > 0 ? 'pos' : 'dim'}`}>
              {s.balance === 0 ? '—' : (s.balance < 0 ? '-$' : '$') + Math.abs(s.balance).toFixed(2)}
            </td>
            <td className="mono dim">{s.lastLesson}</td>
            <td>{s.status === 'active' ? <Badge kind="ok">ACTIVE</Badge> : <Badge kind="warn">PENDING</Badge>}</td>
            <td className="right">
              <button
                className="btn-ghost"
                onClick={(e) => { e.stopPropagation(); onDelete(s) }}
                title={`Delete ${s.name}`}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

export function IntegrityView({ alerts, bookings = [], slotRequests = [], subTab = 0, onResolve }: {
  alerts: AlertRow[];
  bookings?: Booking[];
  slotRequests?: OpsSlotRequest[];
  subTab?: number;
  onResolve: (id: string) => void;
}) {
  if (subTab === 1) return <IntegrityRules />
  if (subTab === 2) return <IntegrityRuns />
  if (subTab === 3) return <IntegritySnapshots />
  const open = alerts.filter(a => !a.resolved)
  // Stat counts are derived from live data instead of hardcoded placeholders so
  // the Integrity dashboard reflects the actual alerts/bookings/slot-requests.
  const stalePending = slotRequests.filter(r => r.status === 'pending' && (r.ageH ?? 0) > 48).length
  const paidUnbooked = open.filter(a => a.code?.startsWith('BI-104')).length
  const bookedUnpaid = bookings.filter(b => b.status !== 'cancelled' && b.paid === false).length
  const webhookFailures = open.filter(a => a.code?.startsWith('WH-')).length
  // PAID / UNBOOKED tile previously hardcoded `stat-delta dim` with subtitle
  // "BI-104 alerts" — same label-not-metric pattern as the recently-fixed
  // Payouts AVG SETTLE "ACH" / Receipts ATTACHED tiles. "BI-104 alerts" just
  // names the alert code; it never moves with data and adds no signal. Worse,
  // this tile is a real billing-integrity flag (money received with no booking
  // tracked) so a non-zero count is a reconciliation gap, not a dim
  // informational state. Tone neg when paidUnbooked > 0 to surface the gap;
  // else dim with the honest "no orphan payments" empty state.
  const paidUnbookedTone = paidUnbooked > 0 ? 'stat-delta neg' : 'stat-delta dim'
  const paidUnbookedSub = paidUnbooked > 0 ? 'needs reconciliation' : 'no orphan payments'
  // BOOKED / UNPAID tile previously hardcoded `stat-delta dim` with subtitle
  // "active bookings". Two issues. First, the subtitle is wrong about what
  // the value is — `bookedUnpaid` counts UNPAID active bookings, not active
  // bookings overall, so "3 active bookings" was actively misleading (the 3
  // is unpaid, not active total). Second, this is revenue-at-risk — a
  // non-zero count is a billing-action signal, not a dim informational state,
  // same fragility class as the recently-fixed Disputes OPEN / Maintenance
  // DUE · 14D work. Surface a denominator so the share is interpretable
  // ("4 of 18 active") and tone warn only when something is actually unpaid,
  // else go positive with "all paid".
  const activeBookings = bookings.filter(b => b.status !== 'cancelled').length
  const bookedUnpaidTone = bookedUnpaid > 0 ? 'stat-delta warn' : 'stat-delta pos'
  const bookedUnpaidSub = bookedUnpaid > 0 ? `of ${activeBookings} active` : 'all paid'
  const lastCaldavAlert = [...alerts].reverse().find(a => a.code?.startsWith('CAL-'))
  // CalDAV status: only report "OK" when the most recent CAL- alert is an
  // informational/success entry (or has been resolved). An unresolved warn/err
  // CAL- alert indicates a sync failure and should surface as "ERR" so the
  // tile doesn't mask a real problem behind a green label.
  const caldavOk = !!lastCaldavAlert && (lastCaldavAlert.resolved || lastCaldavAlert.sev === 'info')
  const caldavStatus = !lastCaldavAlert ? '—' : caldavOk ? 'OK' : 'ERR'
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">STALE PENDING</div><div className="stat-v">{stalePending}</div><div className="stat-delta dim">requests &gt; 48h</div></div>
        <div className="stat"><div className="stat-k mono">PAID / UNBOOKED</div><div className="stat-v">{paidUnbooked}</div><div className={paidUnbookedTone}>{paidUnbookedSub}</div></div>
        <div className="stat"><div className="stat-k mono">BOOKED / UNPAID</div><div className="stat-v">{bookedUnpaid}</div><div className={bookedUnpaidTone}>{bookedUnpaidSub}</div></div>
        <div className="stat"><div className="stat-k mono">WEBHOOK FAILURES</div><div className="stat-v">{webhookFailures}</div><div className="stat-delta dim">open WH alerts</div></div>
        <div className="stat"><div className="stat-k mono">CALDAV SYNC</div><div className="stat-v">{caldavStatus}</div><div className={`stat-delta mono ${lastCaldavAlert && !caldavOk ? 'neg' : 'dim'}`}>{lastCaldavAlert ? `last ${lastCaldavAlert.ts}` : 'no sync logged'}</div></div>
      </div>
      <div className="sect-head"><h3>Alerts</h3><span className="mono dim">{open.length} open</span></div>
      {open.length === 0 ? <EmptyState icon="check" title="All clear" sub="No open integrity alerts." /> : (
        <table className="dt"><thead><tr><th>Sev</th><th>Code</th><th>Message</th><th className="right">Time</th><th></th></tr></thead><tbody>
          {open.map(a => (
            <tr key={a.id}>
              <td>
                {a.sev === 'error' && <Badge kind="error">ERR</Badge>}
                {a.sev === 'warn'  && <Badge kind="warn">WRN</Badge>}
                {a.sev === 'info'  && <Badge kind="info">INF</Badge>}
              </td>
              <td className="mono">{a.code}</td>
              <td>{a.msg}</td>
              <td className="right mono dim">{a.ts}</td>
              <td className="right"><button className="btn-ghost" onClick={() => onResolve(a.id)}>Resolve ›</button></td>
            </tr>
          ))}
        </tbody></table>
      )}
    </div>
  )
}

export type OpsSlotRequest = {
  id: string; student: string; lesson: string; preferred: string; alt: string;
  cfiPref: string; ageH: number; status: 'pending' | 'approved' | 'denied';
}

export function RequestsView({ requests, subTab = 0, onApprove, onDecline }: {
  requests: OpsSlotRequest[];
  subTab?: number;
  onApprove: (r: OpsSlotRequest) => void;
  onDecline: (r: OpsSlotRequest) => void;
}) {
  if (subTab === 1) return <RequestsFilters />
  if (subTab === 2) return <RequestsRules />
  if (subTab === 3) return <RequestsArchive />
  if (requests.length === 0) {
    return (
      <div className="view-pad">
        <EmptyState icon="check" title="Queue clear" sub="No pending slot requests." />
      </div>
    )
  }
  return (
    <div className="view-pad">
      <table className="dt"><thead><tr><th>ID</th><th>Student</th><th>Lesson</th><th>Preferred</th><th>Alt</th><th>CFI</th><th className="right">Age</th><th></th></tr></thead><tbody>
        {requests.map(r => {
          const cfi = INSTRUCTORS.find(c => c.id === r.cfiPref) || null
          return (
            <tr key={r.id}>
              <td className="mono">{r.id.slice(0, 8)}</td>
              <td className="strong">{r.student}</td>
              <td className="dim">{r.lesson}</td>
              <td className="mono">{r.preferred}</td>
              <td className="mono dim">{r.alt}</td>
              <td>{cfi ? <span className="cfi-chip"><Avatar cfi={cfi} /> {cfi.name}</span> : <span className="dim">any</span>}</td>
              <td className={`right mono ${r.ageH > 48 ? 'warn' : 'dim'}`}>{r.ageH}h</td>
              <td className="right">
                <button className="btn-ghost" onClick={() => onDecline(r)}>Decline</button>
                <button className="btn-primary" onClick={() => onApprove(r)}>Approve ›</button>
              </td>
            </tr>
          )
        })}
      </tbody></table>
    </div>
  )
}

export function DispatchView({ subTab = 0 }: { subTab?: number }) {
  if (subTab === 1) {
    // PRE-FLIGHT
    const PREFLIGHT = [
      { id: 'PF-118', booking: 'BK-20492', student: 'Sofia Haddad', tail: 'N511MF', cfi: 'cfi_01', items: { wx: true,  notams: true,  wb: false, fuel: true,  docs: true  }, stage: 'brief' },
      { id: 'PF-119', booking: 'BK-20498', student: 'R. Delacroix', tail: 'N902MF', cfi: 'cfi_03', items: { wx: true,  notams: true,  wb: true,  fuel: true,  docs: true  }, stage: 'ready' },
      { id: 'PF-120', booking: 'BK-20489', student: 'Priya Rao',    tail: 'N428MF', cfi: 'cfi_01', items: { wx: true,  notams: false, wb: false, fuel: false, docs: true  }, stage: 'prep'  },
      { id: 'PF-121', booking: 'BK-20494', student: 'T. Okafor',    tail: 'N511MF', cfi: 'cfi_03', items: { wx: false, notams: false, wb: false, fuel: false, docs: false }, stage: 'queue' },
    ] as const
    const Cell = ({ ok }: { ok: boolean }) => <td>{ok ? <span className="check-box ok"><I name="check" size={10} /></span> : <span className="check-box" />}</td>
    // PREP delta — "2 items open" was hardcoded, but the only `prep`-stage
    // row (PF-120) has 3 unchecked checklist items (notams, wb, fuel), not 2.
    // Derive the count from the actual unchecked items across all `prep`
    // rows so this stays honest if a row is added/removed or items toggle.
    const prepRows = PREFLIGHT.filter(p => p.stage === 'prep')
    const prepOpen = prepRows.reduce((s, p) => s + Object.values(p.items).filter(v => !v).length, 0)
    // AVG BRIEF was hardcoded "22 min · trailing 7d" — there is no historical
    // briefing-time log to derive that from (PREFLIGHT only contains today's
    // 4 active rows above). Replace with a QUEUE tile that's actually
    // derivable from the same source: rows still in `queue` stage waiting
    // for a CFI to pick them up, plus how many checklist items remain open
    // across them. Stays honest if rows transition stages or items toggle.
    const queueRows = PREFLIGHT.filter(p => p.stage === 'queue')
    const queueOpen = queueRows.reduce((s, p) => s + Object.values(p.items).filter(v => !v).length, 0)
    // READY · TO LAUNCH subtitle was hardcoded "on time" — that's a label,
    // not a metric. It says nothing about the actual state and stays
    // green-positive even when zero rows are ready (which is the opposite
    // of "on time"). Surface "X of Y ready" so the tile communicates
    // ready-rate against today's active pre-flights, and only treat it as
    // positive when at least one row has reached `ready`.
    const readyRows = PREFLIGHT.filter(p => p.stage === 'ready')
    const readySubtitle = `${readyRows.length} of ${PREFLIGHT.length} active`
    const readyTone = readyRows.length > 0 ? 'stat-delta pos' : 'stat-delta dim'
    // IN BRIEF tile previously hardcoded `stat-delta dim` with subtitle
    // "active CFI time" — same dishonest-label / never-moves-with-data
    // pattern as the recently-fixed READY · TO LAUNCH "on time" /
    // Aircraft UTILIZATION "avg across fleet" / Syllabus AVG DURATION
    // "flight time" tiles. The intent of the label was to communicate
    // that a briefing in progress = CFI is engaged, but the subtitle
    // stayed identical whether 0, 1, or 4 rows were in brief and whether
    // they were spread across many CFIs or piled on one. The actually
    // useful disclosure here is *how many distinct CFIs* are tied up
    // briefing — that exposes briefing-load concentration (one CFI
    // running three briefs at once is a scheduling red flag the bare
    // count hides). Match the language shape of the other dispatch
    // tiles: dim to "no briefings" when zero rows are in brief so a "0"
    // doesn't claim CFI time was spent.
    const briefRows = PREFLIGHT.filter(p => p.stage === 'brief')
    const briefCfis = new Set(briefRows.map(p => p.cfi).filter(Boolean)).size
    const inBriefSub = briefRows.length === 0
      ? 'no briefings'
      : `${briefCfis} CFI${briefCfis === 1 ? '' : 's'} engaged`
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">IN BRIEF</div><div className="stat-v">{briefRows.length}</div><div className="stat-delta dim">{inBriefSub}</div></div>
          <div className="stat"><div className="stat-k mono">READY · TO LAUNCH</div><div className="stat-v">{readyRows.length}</div><div className={readyTone}>{readySubtitle}</div></div>
          <div className="stat"><div className="stat-k mono">PREP</div><div className="stat-v">{prepRows.length}</div><div className={prepOpen > 0 ? 'stat-delta warn' : 'stat-delta pos'}>{prepOpen > 0 ? `${prepOpen} item${prepOpen === 1 ? '' : 's'} open` : 'all checked'}</div></div>
          <div className="stat"><div className="stat-k mono">QUEUE</div><div className="stat-v">{queueRows.length}</div><div className={queueRows.length > 0 ? 'stat-delta dim' : 'stat-delta pos'}>{queueRows.length > 0 ? `${queueOpen} item${queueOpen === 1 ? '' : 's'} pending` : 'none waiting'}</div></div>
        </div>
        <div className="sect-head"><h3>Pre-flight checklist</h3><span className="mono dim">{PREFLIGHT.length} active</span></div>
        <table className="dt"><thead><tr><th>ID</th><th>Booking</th><th>Student</th><th>Tail</th><th>WX</th><th>NOTAM</th><th>W&amp;B</th><th>Fuel</th><th>Docs</th><th>Stage</th><th></th></tr></thead><tbody>
          {PREFLIGHT.map(p => {
            const done = Object.values(p.items).filter(Boolean).length
            const total = Object.keys(p.items).length
            return (
              <tr key={p.id}>
                <td className="mono dim">{p.id}</td>
                <td className="mono">{p.booking}</td>
                <td className="strong">{p.student}</td>
                <td className="mono">{p.tail}</td>
                <Cell ok={p.items.wx} />
                <Cell ok={p.items.notams} />
                <Cell ok={p.items.wb} />
                <Cell ok={p.items.fuel} />
                <Cell ok={p.items.docs} />
                <td>
                  {p.stage === 'ready' && <Badge kind="ok">READY {done}/{total}</Badge>}
                  {p.stage === 'brief' && <Badge kind="info">BRIEF {done}/{total}</Badge>}
                  {p.stage === 'prep'  && <Badge kind="warn">PREP {done}/{total}</Badge>}
                  {p.stage === 'queue' && <Badge kind="muted">QUEUE {done}/{total}</Badge>}
                </td>
                <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Pre-flight · ${p.student} · ${p.tail}`)}>Open ›</button></td>
              </tr>
            )
          })}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 2) {
    // POST-FLIGHT
    const POSTFLIGHT = [
      { id: 'PX-402', booking: 'BK-20491', student: 'J. Whitaker',  tail: 'N511MF', cfi: 'cfi_03', land: '10:28', tach: 1.4, fuelBurn: 9.2,  squawk: null,                 status: 'signed'  },
      { id: 'PX-401', booking: 'BK-20486', student: 'Avery Chen',   tail: 'N428MF', cfi: 'cfi_01', land: '09:02', tach: 2.0, fuelBurn: 11.4, squawk: null,                 status: 'signed'  },
      { id: 'PX-400', booking: 'BK-20483', student: 'Hana Kim',     tail: 'N902MF', cfi: 'cfi_01', land: '08:14', tach: 1.8, fuelBurn: 8.9,  squawk: 'Transponder sticky', status: 'review'  },
      { id: 'PX-399', booking: 'BK-20480', student: 'E. Bergström', tail: 'N733MF', cfi: 'cfi_02', land: '07:46', tach: 1.2, fuelBurn: 7.6,  squawk: 'EGT gauge erratic',  status: 'flagged' },
    ]
    // DEBRIEFS PENDING — derived from POSTFLIGHT statuses instead of the
    // previously hardcoded "1". Anything not yet `signed` (in `review` or
    // `flagged`) is still waiting on CFI sign-off; today that's 2 (PX-400 +
    // PX-399), not 1. The TACH delta is also pulled from the row count so
    // it stays accurate if a flight is added/removed.
    const pendingDebriefs = POSTFLIGHT.filter(p => p.status !== 'signed')
    // FUEL BURN avg-rate delta — "avg 9.3 g/h" was hardcoded, but the
    // actual fleet-wide rate across today's POSTFLIGHT rows is
    // 37.1 gal / 6.4 h ≈ 5.8 g/h (a Skyhawk burns ~6 g/h, not 9.3).
    // Derive it from the same rows that feed the gal total + tach total
    // so all three tiles stay consistent.
    const totalFuel = POSTFLIGHT.reduce((s, p) => s + p.fuelBurn, 0)
    const totalTach = POSTFLIGHT.reduce((s, p) => s + p.tach, 0)
    const avgFuelRate = totalTach > 0 ? totalFuel / totalTach : 0
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">TODAY · LANDED</div><div className="stat-v">{POSTFLIGHT.length}</div><div className="stat-delta dim">{POSTFLIGHT.length === 1 ? 'flight' : 'flights'} closed</div></div>
          <div className="stat"><div className="stat-k mono">FUEL BURN</div><div className="stat-v">{totalFuel.toFixed(1)} gal</div><div className="stat-delta dim">{avgFuelRate > 0 ? `avg ${avgFuelRate.toFixed(1)} g/h` : '—'}</div></div>
          <div className="stat"><div className="stat-k mono">TACH · TOTAL</div><div className="stat-v">{POSTFLIGHT.reduce((s, p) => s + p.tach, 0).toFixed(1)} h</div><div className="stat-delta dim">{POSTFLIGHT.length} flights</div></div>
          <div className="stat"><div className="stat-k mono">DEBRIEFS PENDING</div><div className="stat-v">{pendingDebriefs.length}</div><div className={pendingDebriefs.length > 0 ? 'stat-delta warn' : 'stat-delta pos'}>{pendingDebriefs.length > 0 ? 'awaiting CFI sign-off' : 'all signed'}</div></div>
        </div>
        <div className="sect-head"><h3>Post-flight close-out</h3></div>
        <table className="dt"><thead><tr><th>ID</th><th>Booking</th><th>Student</th><th>Tail</th><th>Landed</th><th className="right">Tach</th><th className="right">Fuel gal</th><th>Squawk</th><th>Status</th><th></th></tr></thead><tbody>
          {POSTFLIGHT.map(p => (
            <tr key={p.id}>
              <td className="mono dim">{p.id}</td>
              <td className="mono">{p.booking}</td>
              <td className="strong">{p.student}</td>
              <td className="mono">{p.tail}</td>
              <td className="mono">{p.land}</td>
              <td className="right mono">{p.tach.toFixed(1)}</td>
              <td className="right mono dim">{p.fuelBurn.toFixed(1)}</td>
              <td className="dim">{p.squawk || '—'}</td>
              <td>
                {p.status === 'signed'  && <Badge kind="ok">SIGNED</Badge>}
                {p.status === 'review'  && <Badge kind="warn">IN REVIEW</Badge>}
                {p.status === 'flagged' && <Badge kind="error">FLAGGED</Badge>}
              </td>
              <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Opening debrief for ${p.student}`)}>Debrief ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 3) {
    // SQUAWKS (dispatch-filtered view)
    // Derive the dispatch squawk tiles from the SQUAWKS table + MAINT_EVENTS
    // instead of the hardcoded "2 / 1 / 3 / 1" placeholders. Previously the
    // BLOCKING LAUNCH delta even named the wrong tail ("N733MF · EGT" — that
    // squawk is minor; the actually-blocking one is SQ-116 on N219MF).
    const openSquawks = SQUAWKS.filter(s => s.status === 'open')
    const blocking = openSquawks.filter(s => s.severity === 'major')
    const blockingLabel = blocking.length > 0
      ? `${blocking[0].tail} · ${blocking[0].item.split(/[·,]/)[0].trim()}`
      : 'none'
    const handedToMx = MAINT_EVENTS.filter(m => m.status === 'in_shop' || m.status === 'awaiting_parts')
    const deferEligible = openSquawks.filter(s => s.severity === 'minor')
    // DEFER-ELIGIBLE tile previously hardcoded `stat-delta dim` with
    // subtitle "within MEL" — same exact label-not-metric pattern just
    // removed from the Squawks DEFERRED tile (commit c12f3dd) and the
    // Holds DOC HOLDS / Squawks RESOLVED / Integrity PAID-UNBOOKED tiles
    // before that. "within MEL" restates the regulatory category every
    // minor open squawk belongs to by definition (FAR 91.213 / the MEL
    // is what makes minor squawks deferrable in the first place), so the
    // subtitle never moved with data and added no signal. These rows are
    // *still open* squawks pending the dispatcher's defer-or-fix call —
    // a stale entry here is a working-queue escalation in the same
    // fragility class as the deferred-too-long one the DEFERRED tile now
    // tones warn for. Mirror that fix's shape: oldest age from the
    // `reported` date, warn past the 30-day MEL Category-A guideline
    // (since once MEL-deferred the same clock applies anyway), else dim
    // with "oldest Nd", pos with "none eligible" on empty.
    const oldestEligibleDays = deferEligible.length > 0
      ? Math.max(...deferEligible.map(s => Math.floor((Date.now() - new Date(s.reported).getTime()) / 86_400_000)))
      : 0
    const eligibleTone = deferEligible.length === 0
      ? 'stat-delta pos'
      : (oldestEligibleDays > 30 ? 'stat-delta warn' : 'stat-delta dim')
    const eligibleSub = deferEligible.length === 0
      ? 'none eligible'
      : `oldest ${oldestEligibleDays}d`
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">OPEN</div><div className="stat-v">{openSquawks.length}</div><div className={openSquawks.length > 0 ? 'stat-delta warn' : 'stat-delta dim'}>{openSquawks.length > 0 ? 'from line' : 'all clear'}</div></div>
          <div className="stat"><div className="stat-k mono">BLOCKING LAUNCH</div><div className="stat-v">{blocking.length}</div><div className={blocking.length > 0 ? 'stat-delta neg' : 'stat-delta pos'}>{blockingLabel}</div></div>
          <div className="stat"><div className="stat-k mono">HANDED TO MX</div><div className="stat-v">{handedToMx.length}</div><div className={handedToMx.length > 0 ? 'stat-delta dim' : 'stat-delta pos'}>{handedToMx.length > 0 ? 'work orders open' : 'no MX backlog'}</div></div>
          <div className="stat"><div className="stat-k mono">DEFER-ELIGIBLE</div><div className="stat-v">{deferEligible.length}</div><div className={eligibleTone}>{eligibleSub}</div></div>
        </div>
        <div className="sect-head"><h3>Dispatch squawks</h3><span className="mono dim">live from cockpit reports</span></div>
        <table className="dt"><thead><tr><th>ID</th><th>Tail</th><th>Item</th><th>Severity</th><th>Reported</th><th>By</th><th>Status</th><th></th></tr></thead><tbody>
          {SQUAWKS.map(s => (
            <tr key={s.id}>
              <td className="mono dim">{s.id}</td>
              <td className="mono strong">{s.tail}</td>
              <td>{s.item}</td>
              <td>{s.severity === 'major' ? <Badge kind="error">MAJOR</Badge> : <Badge kind="muted">MINOR</Badge>}</td>
              <td className="mono dim">{s.reported}</td>
              <td className="dim">{s.by}</td>
              <td>
                {s.status === 'open'     && <Badge kind="warn">OPEN</Badge>}
                {s.status === 'deferred' && <Badge kind="info">DEFERRED</Badge>}
                {s.status === 'resolved' && <Badge kind="ok">RESOLVED</Badge>}
              </td>
              <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Routing squawk ${s.id} to MX`, 'ok')}>Route to MX ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  // READY (default)
  return (
    <div className="view-pad">
      <div className="dispatch-grid">
        {DISPATCH.map(d => {
          const cfi = INSTRUCTORS.find(c => c.id === d.cfi) || null
          const allChecked = Object.values(d.checks).every(Boolean)
          return (
            <div key={d.id} className="dispatch-card">
              <div className="dc-head">
                <span className="mono">{d.id}</span>
                {d.eta === 'In flight' ? <Badge kind="info">IN FLIGHT</Badge> : allChecked ? <Badge kind="ok">READY</Badge> : <Badge kind="warn">NOT READY</Badge>}
              </div>
              <div className="dc-title">{d.student}</div>
              <div className="dc-sub mono dim">{d.tail} · {d.slot}</div>
              <div className="dc-cfi"><Avatar cfi={cfi} /> <span>{cfi?.name}</span></div>
              <div className="dc-checks">
                {Object.entries(d.checks).map(([k, v]) => (
                  <div key={k} className={`check ${v ? 'ok' : ''}`}>
                    <span className="check-box">{v && <I name="check" size={10} />}</span>
                    <span className="mono">{k.toUpperCase()}</span>
                  </div>
                ))}
              </div>
              <div className="dc-actions">
                <button className="btn-ghost" onClick={() => window.__toast?.(`Brief ${d.student} · ${d.slot}`)}>Brief</button>
                <button
                  className="btn-primary"
                  onClick={() => window.__toast?.(d.eta === 'In flight' ? `Closing out ${d.student}` : `Launching ${d.tail}`, 'ok')}
                >
                  {d.eta === 'In flight' ? 'Close out' : 'Launch ›'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BillingView({ subTab = 0 }: { subTab?: number }) {
  if (subTab === 1) {
    const activeSubs = SUBSCRIPTIONS.filter(s => s.status === 'active')
    const pastDueSubs = SUBSCRIPTIONS.filter(s => s.status === 'past_due')
    const canceledSubs = SUBSCRIPTIONS.filter(s => s.status === 'canceled')
    const activeMrr = activeSubs.reduce((t, s) => t + s.mrr, 0)
    const pastDueAmount = pastDueSubs.reduce((t, s) => t + s.mrr, 0)
    // ACTIVE / MRR / CANCELED subtitles were all hardcoded "—" placeholders,
    // but every value needed to make them honest is already in scope. Match
    // the "X of Y total" pattern used by ACTIVE LEARNERS in StudentsView so
    // each tile actually carries a delta the reader can reason about, and
    // surface ARR for MRR (annualized = MRR × 12) so the recurring-revenue
    // tile communicates the metric finance teams actually plan against.
    const totalSubs = SUBSCRIPTIONS.length
    const activeArr = activeMrr * 12
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE</div><div className="stat-v">{activeSubs.length}</div><div className="stat-delta dim">of {totalSubs} total</div></div>
          <div className="stat"><div className="stat-k mono">MRR</div><div className="stat-v">${activeMrr.toFixed(2)}</div><div className="stat-delta dim mono">${activeArr.toFixed(0)} ARR</div></div>
          <div className="stat"><div className="stat-k mono">PAST DUE</div><div className="stat-v">{pastDueSubs.length}</div><div className={pastDueSubs.length ? 'stat-delta neg mono' : 'stat-delta dim mono'}>{pastDueSubs.length ? `$${pastDueAmount.toFixed(2)}` : '—'}</div></div>
          <div className="stat"><div className="stat-k mono">CANCELED</div><div className="stat-v">{canceledSubs.length}</div><div className="stat-delta dim">of {totalSubs} total</div></div>
        </div>
        <div className="sect-head"><h3>Subscriptions</h3><span className="mono dim">{SUBSCRIPTIONS.length} total</span></div>
        <table className="dt"><thead><tr><th>ID</th><th>Student</th><th>Plan</th><th className="right">MRR</th><th>Renews</th><th>Status</th><th></th></tr></thead><tbody>
          {SUBSCRIPTIONS.map(s => (
            <tr key={s.id}>
              <td className="mono dim">{s.id}</td>
              <td className="strong">{s.student}</td>
              <td className="dim">{s.plan}</td>
              <td className="right mono">${s.mrr.toFixed(2)}</td>
              <td className="mono dim">{s.renews}</td>
              <td>
                {s.status === 'active'   && <Badge kind="ok">ACTIVE</Badge>}
                {s.status === 'past_due' && <Badge kind="warn">PAST DUE</Badge>}
                {s.status === 'canceled' && <Badge kind="error">CANCELED</Badge>}
              </td>
              <td className="right"><button className="btn-ghost">Manage ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 2) {
    const totalCredit = CREDITS.reduce((t, c) => t + c.balance, 0)
    // ISSUED · MTD — derived from CREDITS whose `issued` date falls in the
    // current calendar month. Previously hardcoded "$962.50 · ▴ 12%" which
    // didn't move when credits were added or removed.
    const todayDate = new Date()
    const curMonthKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}`
    const issuedMtd = CREDITS.filter(c => c.issued.startsWith(curMonthKey))
    const issuedMtdTotal = issuedMtd.reduce((s, c) => s + c.balance, 0)
    // REDEEMED / EXPIRED — we don't persist a credit ledger yet, so these are
    // shown as em-dashes instead of the fabricated "$487.00 · 6 uses" /
    // "$0.00 · —" placeholders the tile used to display.
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">OUTSTANDING</div><div className="stat-v">${totalCredit.toFixed(2)}</div><div className="stat-delta dim">{CREDITS.length} accounts</div></div>
          <div className="stat"><div className="stat-k mono">ISSUED · MTD</div><div className="stat-v">${issuedMtdTotal.toFixed(2)}</div><div className="stat-delta dim mono">{issuedMtd.length} credit{issuedMtd.length === 1 ? '' : 's'}</div></div>
          <div className="stat"><div className="stat-k mono">REDEEMED · MTD</div><div className="stat-v">—</div><div className="stat-delta dim">no ledger yet</div></div>
          <div className="stat"><div className="stat-k mono">EXPIRED · 30D</div><div className="stat-v">—</div><div className="stat-delta dim">no expiry data</div></div>
        </div>
        <div className="sect-head"><h3>Credit balances</h3><span className="mono dim">{CREDITS.length} accounts</span></div>
        <table className="dt"><thead><tr><th>ID</th><th>Student</th><th className="right">Balance</th><th>Source</th><th>Issued</th><th></th></tr></thead><tbody>
          {CREDITS.map(c => (
            <tr key={c.id}>
              <td className="mono dim">{c.id}</td>
              <td className="strong">{c.student}</td>
              <td className="right mono strong pos">${c.balance.toFixed(2)}</td>
              <td className="dim">{c.source}</td>
              <td className="mono dim">{c.issued}</td>
              <td className="right"><button className="btn-ghost">Apply ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 3) {
    const totalExposed = DISPUTES.filter(d => d.status !== 'won').reduce((t, d) => t + d.amount, 0)
    // Earliest "respond by" across disputes that still need a response. The
    // tile previously hardcoded "respond by 04/26" which went stale the
    // moment the earliest due date changed. Picks the soonest date from the
    // DISPUTES list; em-dashes out if nothing is open.
    const needsResponse = DISPUTES.filter(d => d.status === 'needs_response' && (d.due as string) !== '—')
    const earliestDue = needsResponse
      .map(d => d.due as string)
      .sort()[0]
    const earliestLabel = earliestDue
      ? `respond by ${earliestDue.slice(5).replace('-', '/')}`
      : 'no open disputes'
    // Win rate over *resolved* disputes (won vs lost). Pending ones
    // (needs_response / under_review) are excluded from both sides so the
    // rate can't be distorted by outstanding cases. The tile used to
    // hardcode "67% · 2 of 3", which never matched the seed data
    // (DISPUTES currently has 1 won, 0 lost, 2 pending).
    const wonCount = DISPUTES.filter(d => d.status === 'won').length
    const lostCount = DISPUTES.filter(d => (d.status as string) === 'lost').length
    const resolvedCount = wonCount + lostCount
    const winRate = resolvedCount > 0 ? Math.round((wonCount / resolvedCount) * 100) : null
    // OPEN tile previously hardcoded `stat-delta neg` with subtitle
    // "needs response". Two problems: (1) when zero disputes are in the
    // needs_response state, the tile still glows red and says "needs
    // response" — the literal opposite of the truth; (2) the AT RISK
    // tile next door already conditions both its tone and its
    // "respond by …"/"no open disputes" subtitle on `needsResponse.length`,
    // so OPEN was the only tile in the row that lied when the queue
    // was empty. Mirror that pattern: tone red and say "needs response"
    // only when something actually does, else go dim with "none open".
    const openDisputes = DISPUTES.filter(d => d.status === 'needs_response')
    const openTone = openDisputes.length > 0 ? 'stat-delta neg' : 'stat-delta dim'
    const openSubtitle = openDisputes.length > 0 ? 'needs response' : 'none open'
    // UNDER REVIEW tile previously hardcoded `stat-delta dim` with
    // subtitle "Stripe processing" — same label-not-metric pattern as
    // the just-fixed Squawks DEFERRED "within MEL" / Endorsements
    // EXPIRED "archived" / Squawks RESOLVED "in log" tiles. "Stripe
    // processing" just restates the implementation detail that
    // chargeback adjudication runs on Stripe's rails (true of every
    // under_review row by definition), and never moves with data. The
    // tile next door (AT RISK) already carries the cross-bucket dollar
    // exposure including under_review, but this tile's count had no
    // dollar context — yet under-review disputes are exactly when funds
    // are *held* by the issuer pending decision, so $-held is the
    // signal a dispatcher actually wants here. Compute the held amount
    // across rows and surface it; tone stays dim because under_review
    // is a holding pattern (the response was already submitted), not an
    // action signal — empty state goes pos with "none in review".
    const underReview = DISPUTES.filter(d => d.status === 'under_review')
    const underReviewHeld = underReview.reduce((t, d) => t + d.amount, 0)
    const underReviewTone = underReview.length === 0 ? 'stat-delta pos' : 'stat-delta dim'
    const underReviewSub = underReview.length === 0
      ? 'none in review'
      : `$${underReviewHeld.toFixed(2)} held`
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">OPEN</div><div className="stat-v">{openDisputes.length}</div><div className={openTone}>{openSubtitle}</div></div>
          <div className="stat"><div className="stat-k mono">UNDER REVIEW</div><div className="stat-v">{underReview.length}</div><div className={underReviewTone}>{underReviewSub}</div></div>
          <div className="stat"><div className="stat-k mono">AT RISK</div><div className="stat-v">${totalExposed.toFixed(2)}</div><div className={needsResponse.length ? 'stat-delta warn' : 'stat-delta dim'}>{earliestLabel}</div></div>
          <div className="stat"><div className="stat-k mono">WIN RATE · 90D</div><div className="stat-v">{winRate === null ? '—' : `${winRate}%`}</div><div className={resolvedCount === 0 ? 'stat-delta dim' : 'stat-delta pos'}>{resolvedCount === 0 ? 'no resolved disputes' : `${wonCount} of ${resolvedCount}`}</div></div>
        </div>
        <div className="sect-head"><h3>Disputes</h3><span className="mono dim">{DISPUTES.length} total</span></div>
        <table className="dt"><thead><tr><th>ID</th><th>Invoice</th><th>Student</th><th className="right">Amount</th><th>Reason</th><th>Respond by</th><th>Status</th><th></th></tr></thead><tbody>
          {DISPUTES.map(d => (
            <tr key={d.id}>
              <td className="mono dim">{d.id}</td>
              <td className="mono">{d.invoice}</td>
              <td className="strong">{d.student}</td>
              <td className="right mono">${d.amount.toFixed(2)}</td>
              <td className="dim">{d.reason}</td>
              <td className="mono dim">{d.due}</td>
              <td>
                {d.status === 'needs_response' && <Badge kind="error">NEEDS RESPONSE</Badge>}
                {d.status === 'under_review'   && <Badge kind="warn">UNDER REVIEW</Badge>}
                {d.status === 'won'            && <Badge kind="ok">WON</Badge>}
              </td>
              <td className="right"><button className="btn-ghost">{d.status === 'won' ? 'View ›' : 'Respond ›'}</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  const openInvoices = INVOICES.filter(i => i.status !== 'paid')
  const totalOpen = openInvoices.reduce((s, i) => s + (i.total - i.paid), 0)
  // COLLECTED · MTD was summing every paid invoice regardless of date —
  // the label promised "MTD" but the math never filtered by month, so the
  // tile would happily report a year's worth of paid invoices as "this
  // month" the moment older paid rows landed. Today's seed accidentally
  // matches because every paid invoice was issued in 2026-04, but that
  // breaks the second a paid invoice from a prior month enters the seed.
  // Filter on the invoice's `issued` date so the value matches the label.
  const todayDate = new Date()
  const curMonthKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}`
  const paidThisMonth = INVOICES.filter(i => i.status === 'paid' && i.issued.startsWith(curMonthKey))
  const totalPaidMtd = paidThisMonth.reduce((s, i) => s + i.paid, 0)
  const overdueInvoices = INVOICES.filter(i => i.status === 'overdue')
  const overdueAmount = overdueInvoices.reduce((s, i) => s + (i.total - i.paid), 0)
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">OPEN A/R</div><div className="stat-v">${totalOpen.toFixed(2)}</div><div className="stat-delta dim">{openInvoices.length} invoice{openInvoices.length === 1 ? '' : 's'}</div></div>
        <div className="stat"><div className="stat-k mono">COLLECTED · MTD</div><div className="stat-v">${totalPaidMtd.toFixed(2)}</div><div className="stat-delta dim">{paidThisMonth.length} paid this month</div></div>
        <div className="stat"><div className="stat-k mono">OVERDUE</div><div className="stat-v">{overdueInvoices.length}</div><div className={overdueInvoices.length ? 'stat-delta neg' : 'stat-delta dim'}>{overdueInvoices.length ? `$${overdueAmount.toFixed(2)}` : 'none'}</div></div>
        <div className="stat"><div className="stat-k mono">AUTOPAY</div><div className="stat-v">{INVOICES.length ? `${Math.round(INVOICES.filter(i => i.stripe).length / INVOICES.length * 100)}%` : '—'}</div><div className="stat-delta dim mono">{INVOICES.filter(i => i.stripe).length} of {INVOICES.length}</div></div>
      </div>
      <div className="sect-head"><h3>Invoices</h3><span className="mono dim">{INVOICES.length} total</span></div>
      <table className="dt"><thead><tr><th>Invoice</th><th>Student</th><th className="right">Total</th><th className="right">Paid</th><th>Issued</th><th>Due</th><th>Status</th><th>Stripe</th><th></th></tr></thead><tbody>
        {INVOICES.map(i => (
          <tr key={i.id}>
            <td className="mono strong">{i.id}</td>
            <td>{i.student}</td>
            <td className="right mono">${i.total.toFixed(2)}</td>
            <td className="right mono">${i.paid.toFixed(2)}</td>
            <td className="mono dim">{i.issued}</td>
            <td className="mono dim">{i.due}</td>
            <td>
              {i.status === 'paid'    && <Badge kind="ok">PAID</Badge>}
              {i.status === 'partial' && <Badge kind="info">PARTIAL</Badge>}
              {i.status === 'open'    && <Badge kind="warn">OPEN</Badge>}
              {i.status === 'overdue' && <Badge kind="error">OVERDUE</Badge>}
            </td>
            <td className="mono dim">{i.stripe || '—'}</td>
            <td className="right"><button className="btn-ghost">View ›</button></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

export function SyllabusView({ subTab = 0, students = [] }: { subTab?: number; students?: Student[] }) {
  if (subTab === 1) {
    // LESSONS
    const LESSONS = [
      { id: 'PPL-01', title: 'Intro · Aircraft familiarization',  dur: '1.5h', ground: '0.5h', prereq: '—',      active: 2 },
      { id: 'PPL-02', title: 'Four fundamentals',                 dur: '1.5h', ground: '0.5h', prereq: 'PPL-01', active: 1 },
      { id: 'PPL-03', title: 'Slow flight & airwork',             dur: '1.3h', ground: '0.5h', prereq: 'PPL-02', active: 1 },
      { id: 'PPL-07', title: 'Stalls & spin awareness',           dur: '1.5h', ground: '1.0h', prereq: 'PPL-06', active: 1 },
      { id: 'PPL-09', title: 'Emergency procedures',              dur: '1.3h', ground: '1.0h', prereq: 'PPL-08', active: 1 },
      { id: 'PPL-12', title: 'S-turns & ground reference',        dur: '1.2h', ground: '0.5h', prereq: 'PPL-11', active: 1 },
      { id: 'PPL-14', title: 'Cross-country navigation',          dur: '2.5h', ground: '1.5h', prereq: 'PPL-13', active: 2 },
      { id: 'PPL-18', title: 'Checkride prep · stage 3',          dur: '1.8h', ground: '2.0h', prereq: 'PPL-17', active: 1 },
      { id: 'IR-04',  title: 'Partial panel · unusual attitudes', dur: '1.5h', ground: '1.0h', prereq: 'IR-03',  active: 1 },
      { id: 'IR-07',  title: 'Approaches · precision',            dur: '1.8h', ground: '1.0h', prereq: 'IR-06',  active: 1 },
      { id: 'CPL-02', title: 'Commercial maneuvers',              dur: '1.5h', ground: '1.0h', prereq: 'CPL-01', active: 1 },
    ]
    // Derive the top-row tiles from live data instead of hardcoding. The
    // previous "GROUND · RATIO: 0.43" was wrong — the actual ground/flight
    // ratio across LESSONS is ~0.60 — and TOTAL LESSONS / AVG DURATION drifted
    // as SYLLABUS / LESSONS changed. Parsing "1.5h"/"0.5h" keeps the table
    // row format intact while making the tiles honest.
    const parseH = (s: string) => parseFloat(s) || 0
    const totalLessons = SYLLABUS.reduce((t, c) => t + c.lessons, 0)
    const courseCount: number = SYLLABUS.length
    const totalFlight = LESSONS.reduce((t, l) => t + parseH(l.dur), 0)
    const totalGround = LESSONS.reduce((t, l) => t + parseH(l.ground), 0)
    const avgDuration = LESSONS.length > 0 ? totalFlight / LESSONS.length : 0
    const groundRatio = totalFlight > 0 ? totalGround / totalFlight : 0
    // IN PROGRESS tile previously hardcoded `stat-delta pos` with subtitle
    // "across fleet". When zero lessons had `active > 0` the tile still glowed
    // green and claimed coverage across the fleet — same dishonest-tone
    // pattern as the recently-fixed Disputes OPEN, Endorsements ACTIVE, and
    // Maintenance DUE · 14 DAYS tiles. Tone pos and say "across fleet" only
    // when something is actually in progress, else go dim with "none active".
    // Add a denominator-style sub so a reviewer sees magnitude (1-of-12 vs
    // 8-of-12 lessons in progress are very different stories).
    const inProgress = LESSONS.filter(l => l.active > 0).length
    const inProgressTone = inProgress > 0 ? 'stat-delta pos' : 'stat-delta dim'
    const inProgressSub = inProgress > 0
      ? `${inProgress} of ${LESSONS.length} active`
      : 'none active'
    // AVG DURATION tile previously hardcoded `stat-delta dim` with subtitle
    // "flight time" — a redundant label, not a metric. The "h" suffix on the
    // value already says it's hours, and the GROUND · RATIO tile next door
    // already discloses that the avg here excludes ground time, so "flight
    // time" added zero signal and never moved with data. Same dishonest-label
    // pattern just fixed on Endorsements ACTIVE "all current" / Payouts NET ·
    // MTD "after fees" / Squawks DEFER-ELIGIBLE "within MEL". Surface the
    // sample size instead — `avgDuration` divides by `LESSONS.length`, so the
    // denominator behind the average is the meaningful disclosure here. Match
    // the shape of TOTAL LESSONS' "{n} courses" sub on the same row, and dim
    // to '—' when the lesson library is empty (avoids "0.0 h · 0 lessons"
    // implying we sampled zero rows to produce a real number).
    const avgDurationSub = LESSONS.length === 0
      ? '—'
      : `${LESSONS.length} lesson${LESSONS.length === 1 ? '' : 's'}`
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">TOTAL LESSONS</div><div className="stat-v">{totalLessons}</div><div className="stat-delta dim">{courseCount} course{courseCount === 1 ? '' : 's'}</div></div>
          <div className="stat"><div className="stat-k mono">IN PROGRESS</div><div className="stat-v">{inProgress}</div><div className={inProgressTone}>{inProgressSub}</div></div>
          <div className="stat"><div className="stat-k mono">AVG DURATION</div><div className="stat-v">{avgDuration.toFixed(1)} h</div><div className="stat-delta dim">{avgDurationSub}</div></div>
          <div className="stat"><div className="stat-k mono">GROUND · RATIO</div><div className="stat-v">{groundRatio.toFixed(2)}</div><div className="stat-delta dim">hrs per flight hr</div></div>
        </div>
        <div className="sect-head"><h3>Lesson library</h3><span className="mono dim">{LESSONS.length} shown</span></div>
        <table className="dt"><thead><tr><th>ID</th><th>Lesson</th><th className="right">Flight</th><th className="right">Ground</th><th>Prereq</th><th className="right">Active</th><th></th></tr></thead><tbody>
          {LESSONS.map(l => (
            <tr key={l.id}>
              <td className="mono strong">{l.id}</td>
              <td>{l.title}</td>
              <td className="right mono">{l.dur}</td>
              <td className="right mono dim">{l.ground}</td>
              <td className="mono dim">{l.prereq}</td>
              <td className="right mono">{l.active}</td>
              <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Lesson ${l.id} · ${l.title}`)}>Open ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 2) {
    // DEBRIEFS
    const DEB = [
      { id: 'DB-842', student: 'Avery Chen',   lesson: 'PPL-07 Stalls',       cfi: 'Isaac M.',  date: '2026-04-20', grade: 'MP', flag: false, note: 'Power-off stall entry crisp; continues.' },
      { id: 'DB-841', student: 'J. Whitaker',  lesson: 'IR-04 Partial Panel', cfi: 'Darius P.', date: '2026-04-22', grade: 'SP', flag: false, note: 'Timed turns within 5°. Repeat UA.' },
      { id: 'DB-840', student: 'Priya Rao',    lesson: 'PPL-13 Night',        cfi: 'Isaac M.',  date: '2026-04-19', grade: 'MP', flag: false, note: 'Airport ops solid. XC tomorrow.' },
      { id: 'DB-839', student: 'Marcus Ortiz', lesson: 'PPL-11 Pattern',      cfi: 'Reena N.',  date: '2026-04-18', grade: 'UP', flag: true,  note: 'Flare late; scheduled for pattern focus.' },
      { id: 'DB-838', student: 'Hana Kim',     lesson: 'CPL-02 Cmcl Man.',    cfi: 'Isaac M.',  date: '2026-04-17', grade: 'MP', flag: false, note: 'Chandelles symmetrical.' },
    ]
    const grBadge = (g: string) => g === 'MP' ? <Badge kind="ok">MP</Badge> : g === 'SP' ? <Badge kind="info">SP</Badge> : <Badge kind="warn">UP</Badge>
    // THIS WEEK tile — both the count (5) and delta ("+2 vs prev") were
    // hardcoded. "5" was just DEB.length, but DEB spans two ISO weeks:
    //   week of Mon 2026-04-20: DB-842 (04-20), DB-841 (04-22) → 2
    //   week of Mon 2026-04-13: DB-840/839/838 (04-19/18/17)   → 3
    // So as of 2026-04-27 the real "this week" count is 2 (down 1 vs
    // prev). Anchor the window to the most-recent debrief date so the
    // tile stays correct as DEB changes.
    const debDates = DEB.map(d => new Date(d.date + 'T00:00:00')).sort((a, b) => b.getTime() - a.getTime())
    const anchor = debDates[0] ?? new Date()
    // Start of ISO week (Mon) for the anchor.
    const dow = (anchor.getDay() + 6) % 7 // 0 = Mon
    const weekStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - dow)
    const prevStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7)
    const inWeek = (d: Date, start: Date) => {
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
      return d >= start && d < end
    }
    const thisWeekCount = debDates.filter(d => inWeek(d, weekStart)).length
    const prevWeekCount = debDates.filter(d => inWeek(d, prevStart)).length
    const weekDelta = thisWeekCount - prevWeekCount
    const weekDeltaLabel = prevWeekCount === 0 && thisWeekCount === 0
      ? 'no recent activity'
      : weekDelta === 0
        ? 'flat vs prev'
        : `${weekDelta > 0 ? '+' : ''}${weekDelta} vs prev`
    const weekDeltaTone = weekDelta > 0 ? 'pos' : weekDelta < 0 ? 'warn' : 'dim'
    const mpCount = DEB.filter(d => d.grade === 'MP').length
    const mpPct = DEB.length > 0 ? Math.round(mpCount / DEB.length * 100) : 0
    // UNSATISFACTORY tile previously hardcoded `stat-delta warn` with
    // subtitle "repeat scheduled". Two issues: (1) when zero UP grades
    // exist the tile still glows orange and claims a repeat is on the
    // books — the literal opposite of the truth, and a copy-paste of
    // the same fragility class fixed for Endorsements ACTIVE / Disputes
    // OPEN; (2) DEB rows carry a `flag` boolean and a freeform `note`,
    // but no `repeatScheduled` (or `followUpAt`) field — so even when
    // upCount > 0, "repeat scheduled" was an editorial claim, not a
    // metric. The neighbour FLAGGED tile already does the honest thing
    // (warn + "X need follow-up" when > 0, pos + "none" when 0) over
    // the same data. Mirror that pattern with a UP-share subtitle that
    // gives the reviewer a sense of magnitude (1-of-5 vs 3-of-5 hits
    // very differently) and only tones warn when there's actually
    // something unsatisfactory to flag.
    const upCount = DEB.filter(d => d.grade === 'UP').length
    const upPct = DEB.length > 0 ? Math.round((upCount / DEB.length) * 100) : 0
    const upSubtitle = upCount === 0
      ? 'none'
      : `${upPct}% of debriefs`
    const upTone = upCount > 0 ? 'stat-delta warn' : 'stat-delta pos'
    // MEETS / EXCEEDS tile previously hardcoded `stat-delta pos` with a bare
    // `{mpPct}%` subtitle. When DEB.length === 0 the tile rendered "0" with
    // a green "0%" — the same dishonest-tone pattern as the just-fixed
    // UNSATISFACTORY tile next to it (and the earlier Disputes OPEN /
    // Endorsements ACTIVE / Maintenance DUE · 14 DAYS / Syllabus IN PROGRESS
    // work). A bare "0%" also reads as a failure rather than an empty-state.
    // Tone pos and show the share only when MP grades actually exist; else
    // go dim with "no debriefs" so the empty state is unambiguous.
    const mpTone = mpCount > 0 ? 'stat-delta pos' : 'stat-delta dim'
    const mpSubtitle = DEB.length === 0
      ? 'no debriefs'
      : `${mpPct}% of debriefs`
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">THIS WEEK</div><div className="stat-v">{thisWeekCount}</div><div className={`stat-delta ${weekDeltaTone}`}>{weekDeltaLabel}</div></div>
          <div className="stat"><div className="stat-k mono">MEETS / EXCEEDS</div><div className="stat-v">{mpCount}</div><div className={mpTone}>{mpSubtitle}</div></div>
          <div className="stat"><div className="stat-k mono">UNSATISFACTORY</div><div className="stat-v">{upCount}</div><div className={upTone}>{upSubtitle}</div></div>
          {/* AVG TIME-TO-SIGN was hardcoded "4 h · SLA ≤ 24h" but DEB rows
             carry no `signed`/`signedAt` field — there is no signing-time
             history to average. Replace with a FLAGGED tile derived from
             the `flag` boolean that DEB rows actually carry, so it stays
             honest as rows are added/resolved. */}
          {(() => {
            const flagged = DEB.filter(d => d.flag).length
            return (
              <div className="stat"><div className="stat-k mono">FLAGGED</div><div className="stat-v">{flagged}</div><div className={flagged > 0 ? 'stat-delta warn' : 'stat-delta pos'}>{flagged > 0 ? `${flagged} need follow-up` : 'none'}</div></div>
            )
          })()}
        </div>
        <div className="sect-head"><h3>Recent debriefs</h3></div>
        <table className="dt"><thead><tr><th>ID</th><th>Student</th><th>Lesson</th><th>CFI</th><th>Date</th><th>Grade</th><th>Note</th><th></th></tr></thead><tbody>
          {DEB.map(d => (
            <tr key={d.id}>
              <td className="mono dim">{d.id}</td>
              <td className="strong">{d.student}</td>
              <td className="dim">{d.lesson}</td>
              <td className="dim">{d.cfi}</td>
              <td className="mono dim">{d.date}</td>
              <td>{grBadge(d.grade)}</td>
              <td className="dim" style={{ maxWidth: 320 }}>{d.note}</td>
              <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Debrief ${d.id} · ${d.student}`)}>Open ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 3) {
    // ENDORSEMENTS
    const END = [
      { id: 'EN-208', kind: '14 CFR 61.87 Solo',    student: 'Avery Chen', cfi: 'Isaac M.',  issued: '2026-03-14', exp: '2026-06-14', status: 'active' },
      { id: 'EN-207', kind: '14 CFR 61.93 Solo XC', student: 'Avery Chen', cfi: 'Isaac M.',  issued: '2026-03-14', exp: '2026-06-14', status: 'active' },
      { id: 'EN-205', kind: '14 CFR 61.87 Solo',    student: 'Priya Rao',  cfi: 'Isaac M.',  issued: '2026-02-28', exp: '2026-05-28', status: 'active' },
      { id: 'EN-202', kind: 'Pre-checkride',        student: 'T. Okafor',  cfi: 'Darius P.', issued: '2026-04-12', exp: '2026-07-12', status: 'active' },
      { id: 'EN-198', kind: 'Complex aircraft',     student: 'Hana Kim',   cfi: 'Isaac M.',  issued: '2026-01-08', exp: '—',          status: 'active' },
      { id: 'EN-182', kind: '14 CFR 61.87 Solo',    student: 'G. Linden',  cfi: 'Reena N.',  issued: '2025-10-14', exp: '2026-01-14', status: 'expired' },
    ]
    // EXPIRE < 30D and ISSUED · MTD — derived from the END list instead of
    // the previously hardcoded "0 / clear" and "4 / ▴ 1 vs avg" placeholders.
    // The MTD count was egregiously wrong (only EN-202 was issued in the
    // current month, not 4). Endorsements with no expiry ("—") are skipped.
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const expiringSoon = END.filter(e => {
      if (e.status !== 'active' || !e.exp || e.exp === '—') return false
      const expDate = new Date(e.exp)
      if (Number.isNaN(expDate.getTime())) return false
      return expDate >= today && expDate <= in30
    })
    const issuedMtd = END.filter(e => e.issued.startsWith(monthKey))
    // ACTIVE subtitle "all current" was a hardcoded label, not a metric.
    // It stayed green-positive even when zero endorsements were active —
    // the opposite of "all current" — and it was also conceptually wrong:
    // an "active" endorsement can still be expiring in the next 30 days
    // (the tile next to it counts those). Replace with an "X of Y total"
    // shape that mirrors how SUBSCRIPTIONS · ACTIVE and STUDENTS · ACTIVE
    // express the same idea elsewhere in the console, and only tone it
    // positive when at least one endorsement is actually active.
    const activeEnd = END.filter(e => e.status === 'active')
    const activeSubtitle = `of ${END.length} total`
    const activeTone = activeEnd.length > 0 ? 'stat-delta pos' : 'stat-delta dim'
    // EXPIRED tile previously hardcoded `stat-delta dim` with subtitle
    // "archived" — same label-not-metric pattern as the recently-fixed
    // Squawks DEFERRED "within MEL" / Squawks RESOLVED "in log" / Holds
    // DOC HOLDS "medicals" tiles. "archived" just restates an
    // implementation detail (status === 'expired' rows live in the
    // historical log) and never moves with data. Surface a denominator
    // ("of N total") so the share is interpretable, mirroring the ACTIVE
    // tile next door which the recent Endorsements ACTIVE fix already
    // shaped this way. Tone stays dim because expired endorsements are a
    // neutral historical metric, not an action signal — empty state goes
    // pos with "none expired" since that is positive.
    const expiredEnd = END.filter(e => e.status === 'expired')
    const expiredTone = expiredEnd.length === 0 ? 'stat-delta pos' : 'stat-delta dim'
    const expiredSub = expiredEnd.length === 0 ? 'none expired' : `of ${END.length} total`
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE</div><div className="stat-v">{activeEnd.length}</div><div className={activeTone}>{activeSubtitle}</div></div>
          <div className="stat"><div className="stat-k mono">EXPIRE &lt; 30D</div><div className="stat-v">{expiringSoon.length}</div><div className={expiringSoon.length > 0 ? 'stat-delta warn' : 'stat-delta pos'}>{expiringSoon.length > 0 ? 'renew soon' : 'clear'}</div></div>
          <div className="stat"><div className="stat-k mono">EXPIRED</div><div className="stat-v">{expiredEnd.length}</div><div className={expiredTone}>{expiredSub}</div></div>
          <div className="stat"><div className="stat-k mono">ISSUED · MTD</div><div className="stat-v">{issuedMtd.length}</div><div className="stat-delta dim mono">{issuedMtd.length === 0 ? 'none this month' : `this month`}</div></div>
        </div>
        <div className="sect-head"><h3>Instructor endorsements</h3><span className="mono dim">FAA log</span></div>
        <table className="dt"><thead><tr><th>ID</th><th>Endorsement</th><th>Student</th><th>CFI</th><th>Issued</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>
          {END.map(e => (
            <tr key={e.id}>
              <td className="mono dim">{e.id}</td>
              <td>{e.kind}</td>
              <td className="strong">{e.student}</td>
              <td className="dim">{e.cfi}</td>
              <td className="mono dim">{e.issued}</td>
              <td className="mono">{e.exp}</td>
              <td>{e.status === 'active' ? <Badge kind="ok">ACTIVE</Badge> : <Badge kind="muted">EXPIRED</Badge>}</td>
              <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Opening ${e.kind} for ${e.student}`)}>View PDF ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  // COURSES (default)
  // Derive the "active" count per course from the live roster so the cards
  // stay in sync as students are added/removed, instead of showing the stale
  // seed counts (5/2/1/0). A student is counted toward a course when their
  // `phase` starts with the course id (e.g. "PPL · Solo XC" → PPL).
  const liveCourseCounts: Record<string, number> = {}
  for (const s of students) {
    if (s.status !== 'active') continue
    const prefix = (s.phase || '').split(/[·\s]/)[0]
    if (!prefix) continue
    liveCourseCounts[prefix] = (liveCourseCounts[prefix] || 0) + 1
  }
  return (
    <div className="view-pad">
      <div className="syl-grid">
        {SYLLABUS.map(s => {
          const activeCount = students.length > 0
            ? (liveCourseCounts[s.id] ?? 0)
            : s.students
          return (
          <div key={s.id} className="syl-card">
            <div className="syl-head">
              <span className="mono dim">{s.id}</span>
              <span className="mono">{activeCount} active</span>
            </div>
            <div className="syl-title">{s.title}</div>
            <div className="syl-meta mono dim">{s.lessons} lessons</div>
            {'children' in s && s.children && (
              <div className="syl-children">
                {s.children.map(ch => (
                  <div key={ch.id} className="syl-child">
                    <span>{ch.title}</span>
                    <span className="mono dim">{ch.lessons}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}

export function OnboardingView({ students = [] }: { students?: Student[] }) {
  // Prefer the live roster — every `pending` student is effectively in the
  // onboarding funnel (not yet an active trainee). When there are no pending
  // students we fall back to the ONBOARDING seed so the view isn't empty in
  // a fresh environment.
  type Row = { id: string; name: string; stage: string; progress: number; started: string; notes: string; live: boolean }
  const liveRows: Row[] = students
    .filter(s => s.status === 'pending')
    .map(s => ({
      id: s.id,
      name: s.name,
      stage: s.phase || 'Prospect',
      progress: Math.max(0, Math.min(1, s.progress ?? 0)),
      started: s.lastLesson && s.lastLesson !== '—' ? s.lastLesson : '—',
      notes: s.balance && s.balance !== 0 ? `Balance $${s.balance.toFixed(2)}` : 'Awaiting intake',
      live: true,
    }))
  const rows: Row[] = liveRows.length > 0
    ? liveRows
    : ONBOARDING.map(o => ({ ...o, live: false }))
  if (rows.length === 0) {
    return (
      <div className="view-pad">
        <EmptyState icon="users" title="No prospects in the onboarding funnel" sub="Pending students will appear here once added." />
      </div>
    )
  }
  return (
    <div className="view-pad">
      <div className="sect-head">
        <h3>Prospects in onboarding</h3>
        <span className="mono dim">{rows.length} total{liveRows.length > 0 ? ' · live' : ''}</span>
      </div>
      <table className="dt"><thead><tr><th>ID</th><th>Prospect</th><th>Stage</th><th>Progress</th><th>Started</th><th>Notes</th><th></th></tr></thead><tbody>
        {rows.map(o => (
          <tr key={o.id}>
            <td className="mono dim">{o.id}</td>
            <td className="strong">{o.name}</td>
            <td>
              {o.progress >= 0.8 ? <Badge kind="ok">{o.stage}</Badge> :
               o.progress >= 0.5 ? <Badge kind="info">{o.stage}</Badge> :
                                   <Badge kind="warn">{o.stage}</Badge>}
            </td>
            <td><div className="progress"><div className="progress-fill" style={{ width: `${o.progress * 100}%` }} /><span className="progress-txt mono">{Math.round(o.progress * 100)}%</span></div></td>
            <td className="mono dim">{o.started}</td>
            <td className="dim">{o.notes}</td>
            <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Convert ${o.name} to active roster`, 'ok')}>Convert ›</button></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

// Lifted from inside the BALANCES subTab so the main Payouts subview's
// AVAILABLE tile can reference the same Available bucket instead of
// hardcoding "$1,204.22" — see PayoutsView main return below.
const STRIPE_BALANCE = [
  { bucket: 'Available',       amount: 1204.22, currency: 'USD', note: 'Instant-payout eligible' },
  { bucket: 'Pending',         amount: 8420.14, currency: 'USD', note: 'Arrives 04/24 · T+2' },
  { bucket: 'In transit',      amount:  620.00, currency: 'USD', note: 'ACH rail · bank review' },
  { bucket: 'Reserve',         amount: 2500.00, currency: 'USD', note: 'Platform reserve · 30d rolling' },
  { bucket: 'Disputed (held)', amount:  645.00, currency: 'USD', note: 'INV-7709 · Sofia Haddad' },
]

export function PayoutsView({ subTab = 0 }: { subTab?: number }) {
  // LAST 30D was using the full PAYOUTS sum (all 5 rows, including the
  // 2026-03-25 row that's outside the 30-day window) while the label
  // promised "LAST 30D" — and the subtitle "▴ $2,420 vs prev" was a
  // fabricated delta with no backing data. Compute a real trailing-30-day
  // window vs the prior 30-day window from PAYOUTS dates so the value
  // matches the label and the delta moves with the data.
  //
  // FEES · 30D and its "X.X% eff." subtitle had the same shape of bug: a
  // prior fix replaced a hardcoded "$962.03 · 3.0% eff." with a sum across
  // *all* PAYOUTS rows, but the tile's label still promises a 30-day
  // window. With today's seed data the 2026-03-25 payout sits outside that
  // window, so the tile was over-counting fees by $216.77 (and the
  // effective rate was being computed against the wrong gross). Derive
  // fees and the effective rate from the same 30-day window the LAST 30D
  // tile uses so the two tiles in the same grid can't disagree.
  const dayMs = 86_400_000
  const now = Date.now()
  const last30Cutoff = now - 30 * dayMs
  const prev30Cutoff = now - 60 * dayMs
  const last30Payouts = PAYOUTS.filter(p => new Date(p.date).getTime() >= last30Cutoff)
  const last30Total = last30Payouts.reduce((s, p) => s + p.amount, 0)
  const feesTotal = last30Payouts.reduce((s, p) => s + p.fees, 0)
  const effRate = last30Total > 0 ? (feesTotal / last30Total) * 100 : 0
  const prev30Total = PAYOUTS
    .filter(p => {
      const t = new Date(p.date).getTime()
      return t >= prev30Cutoff && t < last30Cutoff
    })
    .reduce((s, p) => s + p.amount, 0)
  const delta30 = last30Total - prev30Total
  const has30dDelta = prev30Total > 0
  const delta30Label = has30dDelta
    ? `${delta30 >= 0 ? '▴' : '▾'} $${Math.abs(delta30).toFixed(2)} vs prev`
    : (last30Total > 0 ? 'no prior period' : '—')
  const delta30Tone = !has30dDelta
    ? 'stat-delta dim'
    : delta30 >= 0 ? 'stat-delta pos' : 'stat-delta neg'

  if (subTab === 1) {
    // BALANCES — uses the lifted STRIPE_BALANCE so the main subview's
    // AVAILABLE tile shows the same Available bucket value.
    //
    // The AVAILABLE / PENDING / HELD tiles previously read STRIPE_BALANCE
    // by hardcoded array index (BAL[0], BAL[1], BAL[3] + BAL[4]). That's
    // brittle: any reorder of STRIPE_BALANCE — adding a new bucket, sorting
    // by amount, etc. — would silently mislabel every tile (e.g. "AVAILABLE"
    // would suddenly show the Pending bucket's $8,420 if rows shifted).
    // Look up each bucket by name instead so the tiles stay correct
    // regardless of array order, and fall back to 0 if a bucket is missing.
    const BAL = STRIPE_BALANCE
    const bucketAmount = (name: string) => BAL.find(b => b.bucket === name)?.amount ?? 0
    const availableAmt = bucketAmount('Available')
    const pendingAmt = bucketAmount('Pending')
    const reserveAmt = bucketAmount('Reserve')
    const disputedHeldAmt = bucketAmount('Disputed (held)')
    const heldAmt = reserveAmt + disputedHeldAmt
    // HELD subtitle previously hardcoded "reserve + dispute" — a label, not
    // a metric, same flavour as the just-fixed AVAILABLE "instant OK" and
    // AVG SETTLE "ACH" tiles. Surface the actual reserve / disputed split
    // so the subtitle is metric-bearing (each component is independently
    // interpretable), and only fall back to a single label when one of
    // the two sub-buckets is empty.
    const heldSub = heldAmt > 0
      ? (reserveAmt > 0 && disputedHeldAmt > 0
          ? `reserve $${reserveAmt.toFixed(0)} · disputed $${disputedHeldAmt.toFixed(0)}`
          : reserveAmt > 0
            ? `reserve $${reserveAmt.toFixed(0)}`
            : `disputed $${disputedHeldAmt.toFixed(0)}`)
      : 'no holds'
    // PENDING subtitle previously hardcoded "T+2" — same pattern as the
    // "instant OK" / "ACH" labels: a fixed string that never moves with
    // data and renders "$0.00 · T+2" on an empty Pending bucket, where
    // the "T+2" promise is meaningless because nothing is settling. Tone
    // is dim either way (Pending is informational, not a positive or
    // alarm state), but the subtitle should at least disappear when the
    // bucket is empty so the tile reads honestly.
    const pendingSub = pendingAmt > 0 ? 'T+2 ACH' : 'no pending'
    // TOTAL BALANCE tile previously hardcoded `stat-delta dim` with subtitle
    // "all buckets" — same dishonest-label / never-moves-with-data pattern
    // as the recently-fixed Aircraft UTILIZATION · TODAY "avg across fleet"
    // / Syllabus AVG DURATION "flight time" / Endorsements ACTIVE "all
    // current" tiles. The dollar value IS by definition the sum across all
    // BAL buckets (computed by `BAL.reduce(...)` on the same line), so the
    // subtitle just restated the methodology of the cell next to it.
    // Whether the total was $0 or $13,389.36, whether 5 of 5 buckets were
    // funded or 1 of 5 was carrying everything, the subtitle stayed
    // identical and added no signal. Surface the share of buckets actually
    // carrying funds — the same shape used by the FLEET TOTAL "{n}
    // aircraft" sub on the Aircraft view's first tile, but counting only
    // funded buckets. With "Available" + "Disputed (held)" both empty
    // post-payout, the total stays the same but "3 of 5 funded" tells you
    // the balance has consolidated into fewer buckets — useful signal that
    // the bare "all buckets" label hid. Empty/zero-only state dims to "—"
    // so a $0.00 total doesn't claim to have summed across "all buckets"
    // as if the denominator were doing work.
    const fundedBuckets = BAL.filter(b => b.amount > 0).length
    const totalBalanceSub = BAL.length === 0 || fundedBuckets === 0
      ? '—'
      : `${fundedBuckets} of ${BAL.length} funded`
    return (
      <div className="view-pad">
        <div className="stat-grid">
          {/* AVAILABLE was hardcoded `stat-delta pos` with subtitle "instant
             OK". Two issues, same flavour as the recently-fixed Receipts
             ATTACHED / Payouts AVG SETTLE / Debriefs MEETS·EXCEEDS tiles.
             First, "instant OK" is a label, not a metric — it never moves,
             so it adds no information. Second, when availableAmt is 0 the
             tile rendered "$0.00 · instant OK" in green-pos tone, which
             reads as a healthy state when the truth is "nothing to pay
             out." Tone pos only when there's a non-zero available balance,
             else go dim with the honest "no balance" empty state. */}
          <div className="stat"><div className="stat-k mono">TOTAL BALANCE</div><div className="stat-v">${BAL.reduce((t, b) => t + b.amount, 0).toFixed(2)}</div><div className="stat-delta dim">{totalBalanceSub}</div></div>
          <div className="stat"><div className="stat-k mono">AVAILABLE</div><div className="stat-v">${availableAmt.toFixed(2)}</div><div className={availableAmt > 0 ? 'stat-delta pos' : 'stat-delta dim'}>{availableAmt > 0 ? 'instant-payout eligible' : 'no balance'}</div></div>
          <div className="stat"><div className="stat-k mono">PENDING</div><div className="stat-v">${pendingAmt.toFixed(2)}</div><div className="stat-delta dim">{pendingSub}</div></div>
          <div className="stat"><div className="stat-k mono">HELD</div><div className="stat-v">${heldAmt.toFixed(2)}</div><div className={heldAmt > 0 ? 'stat-delta warn' : 'stat-delta dim'}>{heldSub}</div></div>
        </div>
        <div className="sect-head"><h3>Stripe balance by bucket</h3></div>
        <table className="dt"><thead><tr><th>Bucket</th><th className="right">Amount</th><th>Currency</th><th>Note</th><th></th></tr></thead><tbody>
          {BAL.map(b => (
            <tr key={b.bucket}>
              <td className="strong">{b.bucket}</td>
              <td className="right mono">${b.amount.toFixed(2)}</td>
              <td className="mono dim">{b.currency}</td>
              <td className="dim">{b.note}</td>
              <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`${b.bucket} · ${b.amount.toFixed(2)}`)}>Details ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 2) {
    // TRANSFERS
    const TRA = [
      { id: 'tr_1OqR8x', date: '2026-04-22', amount: 8420.14, dest: 'Wells Fargo · …4812', method: 'ACH',     status: 'in_transit', eta: '2026-04-24' },
      { id: 'tr_1OqL2p', date: '2026-04-18', amount:  500.00, dest: 'Wells Fargo · …4812', method: 'Instant', status: 'paid',       eta: '2026-04-18' },
      { id: 'tr_1OqF7n', date: '2026-04-15', amount: 6192.00, dest: 'Wells Fargo · …4812', method: 'ACH',     status: 'paid',       eta: '2026-04-17' },
      { id: 'tr_1Oq9Tk', date: '2026-04-08', amount: 5870.50, dest: 'Wells Fargo · …4812', method: 'ACH',     status: 'paid',       eta: '2026-04-10' },
      { id: 'tr_1Oq3Bv', date: '2026-04-01', amount: 4412.00, dest: 'Wells Fargo · …4812', method: 'ACH',     status: 'paid',       eta: '2026-04-03' },
    ]
    // Derive the transfer tiles from TRA instead of the hardcoded
    // "$500.00 · 1 transfer / 0 / 2.1 d" placeholders. The AVG SETTLE figure
    // was the most visibly wrong — every paid ACH transfer in the table
    // settles in exactly 2 days, so the "2.1 d" was off. IN TRANSIT count,
    // INSTANT MTD total, and FAILED count are now all derived too so they
    // stay honest if rows change.
    const inTransit = TRA.filter(t => t.status === 'in_transit')
    const inTransitTotal = inTransit.reduce((s, t) => s + t.amount, 0)
    const monthKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })()
    const instantMtd = TRA.filter(t => t.method === 'Instant' && t.date.startsWith(monthKey))
    const instantMtdTotal = instantMtd.reduce((s, t) => s + t.amount, 0)
    const failedRecent = TRA.filter(t => t.status === 'failed')
    const achPaid = TRA.filter(t => t.status === 'paid' && t.method === 'ACH')
    const settleDays = achPaid.map(t => Math.round((new Date(t.eta).getTime() - new Date(t.date).getTime()) / 86_400_000))
    const avgSettle = settleDays.length > 0 ? settleDays.reduce((s, d) => s + d, 0) / settleDays.length : 0
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">IN TRANSIT</div><div className="stat-v">${inTransitTotal.toFixed(2)}</div><div className="stat-delta dim">{inTransit.length} transfer{inTransit.length === 1 ? '' : 's'}</div></div>
          <div className="stat"><div className="stat-k mono">INSTANT · MTD</div><div className="stat-v">${instantMtdTotal.toFixed(2)}</div><div className="stat-delta dim">{instantMtd.length} transfer{instantMtd.length === 1 ? '' : 's'}</div></div>
          <div className="stat"><div className="stat-k mono">FAILED · 30D</div><div className="stat-v">{failedRecent.length}</div><div className={failedRecent.length > 0 ? 'stat-delta neg' : 'stat-delta pos'}>{failedRecent.length > 0 ? 'review needed' : '—'}</div></div>
          {/* AVG SETTLE was `stat-delta pos · ACH` hardcoded. "ACH" is a
             label not a metric (same pattern as the just-fixed AVAILABLE
             "instant OK" tiles a row up, and Receipts ATTACHED before
             that), and when no ACH transfers have settled (achPaid empty)
             avgSettle is forced to 0, so the tile rendered "0.0 d · ACH"
             in green-pos tone — a dishonest read of an empty state. Tone
             pos only when there's an actual ACH cohort to summarise; else
             go dim with "no ACH paid · 30D" so the empty state surfaces
             unambiguously. */}
          <div className="stat"><div className="stat-k mono">AVG SETTLE</div><div className="stat-v">{achPaid.length > 0 ? `${avgSettle.toFixed(1)} d` : '—'}</div><div className={achPaid.length > 0 ? 'stat-delta pos' : 'stat-delta dim'}>{achPaid.length > 0 ? `ACH · n=${achPaid.length}` : 'no ACH paid · 30D'}</div></div>
        </div>
        <div className="sect-head"><h3>Bank transfers</h3></div>
        <table className="dt"><thead><tr><th>Transfer ID</th><th>Date</th><th className="right">Amount</th><th>Destination</th><th>Method</th><th>Status</th><th>ETA</th></tr></thead><tbody>
          {TRA.map(t => (
            <tr key={t.id}>
              <td className="mono">{t.id}</td>
              <td className="mono dim">{t.date}</td>
              <td className="right mono strong">${t.amount.toFixed(2)}</td>
              <td className="dim">{t.dest}</td>
              <td className="mono">{t.method}</td>
              <td>{t.status === 'paid' ? <Badge kind="ok">PAID</Badge> : <Badge kind="info">IN TRANSIT</Badge>}</td>
              <td className="mono dim">{t.eta}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 3) {
    // FEES
    const FEES = [
      { period: '2026-04 · MTD', gross: 31820.00, fees:  962.03, net: 30857.97, eff: 0.0302 },
      { period: '2026-03',       gross: 41205.50, fees: 1237.20, net: 39968.30, eff: 0.0300 },
      { period: '2026-02',       gross: 36448.00, fees: 1093.44, net: 35354.56, eff: 0.0300 },
      { period: '2026-01',       gross: 29770.00, fees:  910.21, net: 28859.79, eff: 0.0306 },
    ]
    // FEES · MTD subtitle "3.02% eff." was hardcoded — it happens to match
    // FEES[0].eff today, but updating the MTD row's gross/fees would leave
    // the tile lying about the effective rate while the table beneath shows
    // the new reality. Derive from the MTD row so the tile and the table can
    // never disagree. Same story for FEES · YTD: "4 periods" was hardcoded
    // but is just FEES.length — adding/removing a period would desync it.
    //
    // Previously the MTD row was located via FEES[0] — a hardcoded array
    // index. That's fragile in the same way STRIPE_BALANCE[0] was: any
    // reorder of FEES (sorting newest-last, inserting a closed-out April
    // row above the in-progress May MTD row, etc.) would silently swap the
    // MTD tile to a prior period's numbers while the row label still said
    // "MTD". Look up the MTD entry by matching its period string instead,
    // and fall back to a zeroed sentinel if no MTD row exists yet, so the
    // tiles stay correct regardless of array order or whether the month
    // has been opened.
    const mtdRow = FEES.find(f => f.period.includes('MTD')) ?? { gross: 0, fees: 0, net: 0, eff: 0 }
    const mtdEffPct = mtdRow.eff * 100
    // REFUND · COST was hardcoded "$0.30" with subtitle "minimal" — that's
    // Stripe's per-charge fixed fee, not a value derived from any data in
    // scope. There is no refunds feed anywhere here, so the tile was both
    // a magic number and editorial. Replace with NET · MTD = gross - fees
    // for the current month, which IS derivable from the MTD row (the same
    // row that powers the FEES · MTD tile next to it) and complements the
    // three other dollar-shaped tiles in this grid. Now the four tiles
    // collectively answer: how much did we charge (FEES · MTD), how much
    // YTD (FEES · YTD), how much is at risk (DISPUTES · MTD), and how
    // much actually landed (NET · MTD).
    const netMtd = mtdRow.net
    // NET · MTD subtitle "after fees" is a label, not a metric — it stays
    // green-positive even when net is zero (no MTD row yet, or a fully
    // refunded/disputed month). Tone the tile dim when there's nothing to
    // celebrate so the green check only fires when net actually landed.
    const netMtdTone = netMtd > 0 ? 'stat-delta pos' : 'stat-delta dim'
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">FEES · MTD</div><div className="stat-v">${mtdRow.fees.toFixed(2)}</div><div className="stat-delta dim">{mtdEffPct.toFixed(2)}% eff.</div></div>
          <div className="stat"><div className="stat-k mono">FEES · YTD</div><div className="stat-v">${FEES.reduce((s, f) => s + f.fees, 0).toFixed(2)}</div><div className="stat-delta dim">{FEES.length} period{FEES.length === 1 ? '' : 's'}</div></div>
          {(() => {
            const openDisputes = DISPUTES.filter(d => d.status !== 'won')
            const openDisputesAmount = openDisputes.reduce((s, d) => s + d.amount, 0)
            return (
              <div className="stat"><div className="stat-k mono">DISPUTES · MTD</div><div className="stat-v">${openDisputesAmount.toFixed(2)}</div><div className={openDisputes.length ? 'stat-delta warn' : 'stat-delta dim'}>{openDisputes.length ? `${openDisputes.length} raised` : 'none'}</div></div>
            )
          })()}
          <div className="stat"><div className="stat-k mono">NET · MTD</div><div className="stat-v">${netMtd.toFixed(2)}</div><div className={netMtdTone}>after fees</div></div>
        </div>
        <div className="sect-head"><h3>Fee breakdown by period</h3></div>
        <table className="dt"><thead><tr><th>Period</th><th className="right">Gross volume</th><th className="right">Fees</th><th className="right">Net</th><th className="right">Effective rate</th></tr></thead><tbody>
          {FEES.map(f => (
            <tr key={f.period}>
              <td className="mono">{f.period}</td>
              <td className="right mono">${f.gross.toFixed(2)}</td>
              <td className="right mono">${f.fees.toFixed(2)}</td>
              <td className="right mono strong">${f.net.toFixed(2)}</td>
              <td className="right mono dim">{(f.eff * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  // PAYOUTS (default)
  // IN FLIGHT was hardcoded "$8,420.14 · arrives 04/24" but every PAYOUTS row
  // has `status: 'paid'` — that money has already landed in the bank, nothing
  // is actually in flight. The hardcoded number happened to match the most
  // recent (already-paid) payout, which is misleading. Derive from PAYOUTS
  // rows whose status is not yet `paid` so the tile stays correct as new
  // pending/in_transit payouts come through.
  const inFlightPayouts = PAYOUTS.filter(p => p.status !== 'paid')
  const inFlightTotal = inFlightPayouts.reduce((s, p) => s + p.amount, 0)
  const earliestArrival = inFlightPayouts
    .map(p => p.arrival)
    .sort()[0]
  const earliestArrivalLabel = earliestArrival
    ? `arrives ${earliestArrival.slice(5).replace('-', '/')}`
    : 'none in transit'
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">LAST 30D</div><div className="stat-v">${last30Total.toFixed(2)}</div><div className={delta30Tone}>{delta30Label}</div></div>
        <div className="stat"><div className="stat-k mono">IN FLIGHT</div><div className="stat-v">${inFlightTotal.toFixed(2)}</div><div className={inFlightPayouts.length ? 'stat-delta dim mono' : 'stat-delta dim'}>{earliestArrivalLabel}</div></div>
        <div className="stat"><div className="stat-k mono">FEES · 30D</div><div className="stat-v">${feesTotal.toFixed(2)}</div><div className="stat-delta dim">{effRate.toFixed(1)}% eff.</div></div>
        {/* Mirror the BALANCES sub-tab fix one tile above: "instant OK" is
           a label not a metric, and `stat-delta pos` lies green when the
           Available bucket is $0 (nothing to pay out is not a positive
           state). Tone pos only when there's a non-zero available
           balance; else go dim with "no balance". */}
        <div className="stat"><div className="stat-k mono">AVAILABLE</div><div className="stat-v">${(STRIPE_BALANCE.find(b => b.bucket === 'Available')?.amount ?? 0).toFixed(2)}</div><div className={(STRIPE_BALANCE.find(b => b.bucket === 'Available')?.amount ?? 0) > 0 ? 'stat-delta pos' : 'stat-delta dim'}>{(STRIPE_BALANCE.find(b => b.bucket === 'Available')?.amount ?? 0) > 0 ? 'instant-payout eligible' : 'no balance'}</div></div>
      </div>
      <div className="sect-head"><h3>Recent payouts</h3><span className="mono dim">{PAYOUTS.length}</span></div>
      <table className="dt"><thead><tr><th>Payout ID</th><th>Date</th><th className="right">Amount</th><th className="right">Fees</th><th className="right">Txns</th><th>Status</th><th>Arrives</th></tr></thead><tbody>
        {PAYOUTS.map(p => (
          <tr key={p.id}>
            <td className="mono">{p.id}</td>
            <td className="mono dim">{p.date}</td>
            <td className="right mono strong">${p.amount.toFixed(2)}</td>
            <td className="right mono dim">${p.fees.toFixed(2)}</td>
            <td className="right mono">{p.count}</td>
            <td><Badge kind="ok">{p.status.toUpperCase()}</Badge></td>
            <td className="mono dim">{p.arrival}</td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

export function ExpensesView({ subTab = 0 }: { subTab?: number }) {
  const total = EXPENSES.reduce((s, e) => s + e.amount, 0)
  const byCat: Record<string, number> = {}
  EXPENSES.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount })

  if (subTab === 1) {
    // CATEGORIES
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1])
    const budget: Record<string, number> = { Fuel: 3200, Maintenance: 4500, Insurance: 1200, Hangar: 2800, Parts: 800 }
    // OVER BUDGET was hardcoded "0 · YTD" but the byCat and budget objects
    // sitting right next to it already have everything needed to compute it.
    // The tile would have stayed at "0" forever even if Maintenance ran past
    // its $4,500 cap. Derive the count from category-vs-budget so the tile
    // moves the moment a category trips its budget. Flip tone to warn when
    // anything is over.
    const overBudgetCats = cats.filter(([k, v]) => budget[k] !== undefined && v > budget[k])
    // TOP · MAINT subtitle was hardcoded "72% of budget" but the byCat and
    // budget objects sitting right above already have everything needed to
    // compute it. The hardcoded value happens to roughly match today
    // (3250 / 4500 ≈ 72.2%), but it would stay stuck at "72%" forever even
    // as Maintenance spend climbs toward (or past) the $4,500 cap. Derive
    // the % so the subtitle moves with the actual data, and flip the tone
    // to warn/neg only when it crosses thresholds that matter.
    const maintSpend = byCat.Maintenance ?? 0
    const maintBudget = budget.Maintenance ?? 0
    const maintPct = maintBudget > 0
      ? Math.round((maintSpend / maintBudget) * 100)
      : 0
    const maintTone = maintPct >= 100 ? 'stat-delta neg'
      : maintPct >= 80 ? 'stat-delta warn'
      : 'stat-delta dim'
    // UNCATEGORIZED was hardcoded "0" with subtitle "clean" — that happens
    // to be true today (every EXPENSES row has a real category), but the
    // tile would stay stuck at "0" forever even if a row was added with
    // category === '' or category === 'Uncategorized'. The whole point of
    // an UNCATEGORIZED tile is to surface bookkeeping cleanup work, so it
    // must move with the data. Derive it from EXPENSES so a missing /
    // empty / "Uncategorized" category trips the tile, and flip the tone
    // to warn when anything needs reclassifying.
    const uncategorizedCount = EXPENSES.filter(e => {
      const c = (e.category ?? '').trim().toLowerCase()
      return c === '' || c === 'uncategorized' || c === 'other'
    }).length
    const uncategorizedTone = uncategorizedCount > 0 ? 'stat-delta warn' : 'stat-delta pos'
    const uncategorizedLabel = uncategorizedCount > 0
      ? `${uncategorizedCount === 1 ? 'entry' : 'entries'} need cat.`
      : 'clean'
    // CATEGORIES tile previously hardcoded `stat-delta dim` with subtitle
    // "tracked" — same dishonest-label / never-moves-with-data pattern as
    // the recently-fixed Aircraft UTILIZATION "avg across fleet" /
    // Syllabus AVG DURATION "flight time" / Endorsements ACTIVE "all
    // current" / Payouts TOTAL BALANCE "all buckets" tiles. The "tracked"
    // label just restated that cats.length counts categories — whether
    // the value was 1 or 12, whether every category had a budget set or
    // none did, the subtitle stayed identical and added no signal. The
    // actually useful disclosure here is *budget coverage*: how many of
    // the categories that have appeared in EXPENSES actually have a
    // budget defined in the `budget` map sitting two lines above. The
    // moment a new EXPENSES row introduces a category that wasn't pre-
    // budgeted (e.g. a one-off Avionics spend), this tile flags the gap
    // — exactly the kind of bookkeeping disclosure the page is meant to
    // surface, the same shape of "X of Y" sub already used by ACTIVE
    // LEARNERS / TOTAL BALANCE / IN PROGRESS. Empty roster dims to "—"
    // so a "0" doesn't claim 0-of-0 budget coverage as if a real ratio
    // were computed.
    const budgetedCats = cats.filter(([k]) => budget[k] !== undefined).length
    const categoriesSub = cats.length === 0
      ? '—'
      : `${budgetedCats} of ${cats.length} budgeted`
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">CATEGORIES</div><div className="stat-v">{cats.length}</div><div className="stat-delta dim">{categoriesSub}</div></div>
          <div className="stat"><div className="stat-k mono">TOP · MAINT</div><div className="stat-v">${maintSpend.toFixed(0)}</div><div className={maintTone}>{maintBudget > 0 ? `${maintPct}% of budget` : 'no budget set'}</div></div>
          <div className="stat"><div className="stat-k mono">OVER BUDGET</div><div className="stat-v">{overBudgetCats.length}</div><div className={overBudgetCats.length > 0 ? 'stat-delta warn' : 'stat-delta pos'}>{overBudgetCats.length > 0 ? `${overBudgetCats.map(([k]) => k).join(', ')}` : 'YTD'}</div></div>
          <div className="stat"><div className="stat-k mono">UNCATEGORIZED</div><div className="stat-v">{uncategorizedCount}</div><div className={uncategorizedTone}>{uncategorizedLabel}</div></div>
        </div>
        <div className="sect-head"><h3>Spend by category</h3></div>
        <table className="dt"><thead><tr><th>Category</th><th className="right">YTD</th><th className="right">Budget</th><th>Utilization</th><th className="right">% of spend</th></tr></thead><tbody>
          {cats.map(([k, v]) => {
            const b = budget[k] || v
            const u = Math.min(1, v / b)
            return (
              <tr key={k}>
                <td className="strong">{k}</td>
                <td className="right mono">${v.toFixed(2)}</td>
                <td className="right mono dim">${b.toFixed(0)}</td>
                <td><div className="progress"><div className="progress-fill" style={{ width: `${u * 100}%` }} /><span className="progress-txt mono">{Math.round(u * 100)}%</span></div></td>
                <td className="right mono">{Math.round(v / total * 100)}%</td>
              </tr>
            )
          })}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 2) {
    // VENDORS
    type VenAgg = { count: number; total: number; last: string; cat: string }
    const VEN: Record<string, VenAgg> = {}
    EXPENSES.forEach(e => {
      if (!VEN[e.vendor]) VEN[e.vendor] = { count: 0, total: 0, last: e.date, cat: e.category }
      VEN[e.vendor].count++
      VEN[e.vendor].total += e.amount
      if (e.date > VEN[e.vendor].last) VEN[e.vendor].last = e.date
    })
    const vendors = Object.entries(VEN).sort((a, b) => b[1].total - a[1].total)
    // ACTIVE VENDORS subtitle was hardcoded "30-day window" but the count
    // above (`vendors.length`) is computed from *every* EXPENSES row with
    // no date filter at all. Today every seed expense happens to fall
    // within the last 30 days, so the count and the subtitle accidentally
    // line up — but adding a single older expense (or letting the seed
    // dates roll past 30 days) would leave the tile claiming a 30-day
    // window for a number that's actually all-time. Compute a real 30-day
    // count alongside the all-time count and surface both, so the tile's
    // value and its subtitle stay in agreement as data ages.
    const dayMs = 86_400_000
    const cutoff30 = Date.now() - 30 * dayMs
    const vendorsLast30 = new Set(
      EXPENSES.filter(e => new Date(e.date).getTime() >= cutoff30).map(e => e.vendor)
    )
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE VENDORS</div><div className="stat-v">{vendorsLast30.size}</div><div className="stat-delta dim">30-day window · {vendors.length} all-time</div></div>
          <div className="stat"><div className="stat-k mono">TOP VENDOR</div><div className="stat-v">{vendors[0]?.[0] ?? '—'}</div><div className="stat-delta dim mono">${vendors[0]?.[1].total.toFixed(0) ?? 0}</div></div>
          {/* NET-30 OUTSTANDING was hardcoded "$2,800.00 · Mather Field". The
             $2,800 happens to equal the EX-3304 Hangar/Mather Field expense,
             but EXPENSES rows carry no payment status, due date, or A/P
             metadata — that hangar charge could already be paid. We have no
             way to know what is actually outstanding. Show an honest dash
             until an A/P feed is wired up (same pattern as the STORAGE tile
             on the Receipts subtab below). */}
          <div className="stat"><div className="stat-k mono">NET-30 OUTSTANDING</div><div className="stat-v">—</div><div className="stat-delta dim">no A/P feed</div></div>
          {/* 1099 ELIGIBLE was hardcoded "2 · W-9 on file" but EXPENSES rows
             carry no W-9 / 1099 metadata anywhere. Pure fabrication — same
             honest-dash pattern as STORAGE / NET-30 above. */}
          <div className="stat"><div className="stat-k mono">1099 ELIGIBLE</div><div className="stat-v">—</div><div className="stat-delta dim">no W-9 records</div></div>
        </div>
        <div className="sect-head"><h3>Vendor ledger</h3></div>
        <table className="dt"><thead><tr><th>Vendor</th><th>Category</th><th className="right">Invoices</th><th className="right">YTD</th><th>Last charge</th><th></th></tr></thead><tbody>
          {vendors.map(([k, v]) => (
            <tr key={k}>
              <td className="strong">{k}</td>
              <td className="dim">{v.cat}</td>
              <td className="right mono">{v.count}</td>
              <td className="right mono strong">${v.total.toFixed(2)}</td>
              <td className="mono dim">{v.last}</td>
              <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Vendor: ${k}`)}>Open ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 3) {
    // RECEIPTS
    return (
      <div className="view-pad">
        <div className="stat-grid">
          {/* ATTACHED was hardcoded "{EXPENSES.length}/{EXPENSES.length}" with
             a green "100% covered" subtitle. Two issues. First, the value
             was a tautology — N/N for every N — so it ALWAYS rendered as
             "5/5 · 100% covered" no matter what the real receipt-attachment
             state was, the worst kind of dishonest-tile failure (it can't
             ever be wrong about itself, only about reality). Second, EXPENSES
             rows in data.ts carry no `receipt` / `attached` / file metadata —
             same fragility class as STORAGE / OCR · PENDING / FLAGGED in
             this same row, which were already cleaned up to the honest "no
             feed" / "no review queue" treatment. Until an attachments feed
             is wired up there is no truthful coverage number to show. Mirror
             the neighbour tiles' dim "no feed" pattern. */}
          <div className="stat"><div className="stat-k mono">ATTACHED</div><div className="stat-v">—</div><div className="stat-delta dim">no attachment feed</div></div>
          {/* OCR · PENDING was hardcoded "0 · processed" and FLAGGED was
             hardcoded "0 · —", but EXPENSES rows carry no OCR status or
             flag fields (see data.ts) — every receipt row in the table
             below is also rendered with a static "PARSED" badge regardless
             of state. Until an OCR pipeline is wired up there is no real
             pending/flagged count to show. Mirror the STORAGE tile's
             honest "no feed" treatment. */}
          <div className="stat"><div className="stat-k mono">OCR · PENDING</div><div className="stat-v">—</div><div className="stat-delta dim">no OCR feed</div></div>
          <div className="stat"><div className="stat-k mono">FLAGGED</div><div className="stat-v">—</div><div className="stat-delta dim">no review queue</div></div>
          {/* STORAGE was hardcoded "42 MB · S3 · encrypted" but EXPENSES rows
             carry no file-size or storage metadata — every receipt filename
             below is also synthesized from the expense id at render time. We
             have no real bytes-on-disk number to show. Show an honest dash
             until a storage feed is wired up. */}
          <div className="stat"><div className="stat-k mono">STORAGE</div><div className="stat-v">—</div><div className="stat-delta dim">no storage feed</div></div>
        </div>
        <div className="sect-head"><h3>Receipt archive</h3></div>
        <table className="dt"><thead><tr><th>Expense</th><th>Vendor</th><th className="right">Amount</th><th>Date</th><th>File</th><th>OCR status</th><th></th></tr></thead><tbody>
          {EXPENSES.map(e => (
            <tr key={e.id}>
              <td className="mono">{e.id}</td>
              <td>{e.vendor}</td>
              <td className="right mono">${e.amount.toFixed(2)}</td>
              <td className="mono dim">{e.date}</td>
              <td className="mono dim">receipt_{e.id.toLowerCase()}.pdf</td>
              <td><Badge kind="ok">PARSED</Badge></td>
              <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Downloading receipt_${e.id.toLowerCase()}.pdf`, 'ok')}>Download ›</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    )
  }

  // LEDGER (default)
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">YTD</div><div className="stat-v">${total.toFixed(2)}</div><div className="stat-delta dim">{EXPENSES.length} entries</div></div>
        {Object.entries(byCat).slice(0, 3).map(([k, v]) => (
          <div key={k} className="stat"><div className="stat-k mono">{k.toUpperCase()}</div><div className="stat-v">${v.toFixed(0)}</div><div className="stat-delta dim mono">{Math.round(v / total * 100)}%</div></div>
        ))}
      </div>
      <div className="sect-head"><h3>Ledger</h3></div>
      <table className="dt"><thead><tr><th>ID</th><th>Category</th><th>Vendor</th><th className="right">Amount</th><th>Date</th><th></th></tr></thead><tbody>
        {EXPENSES.map(e => (
          <tr key={e.id}>
            <td className="mono dim">{e.id}</td>
            <td>{e.category}</td>
            <td className="dim">{e.vendor}</td>
            <td className="right mono strong">${e.amount.toFixed(2)}</td>
            <td className="mono dim">{e.date}</td>
            <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Opening receipt for ${e.id}`)}>Receipt</button></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

export function DebriefsView({ bookings = [] }: { bookings?: Booking[] }) {
  // Debriefs are tied to flights that have actually occurred. "Pending" =
  // landed/completed but not yet signed off; "in progress" = airborne now.
  // Counts are derived from the bookings passed in so this view reflects the
  // current day's real state instead of the old hardcoded "42 debriefs" copy.
  const completed = bookings.filter(b => b.status === 'completed')
  const inFlight = bookings.filter(b => b.status === 'in_flight')
  const total = completed.length + inFlight.length
  if (total === 0) {
    return (
      <div className="view-pad">
        <EmptyState
          icon="book"
          title="No debriefs to review"
          sub="No flights have landed or are airborne for this date."
          cta={<button className="btn-primary" onClick={() => window.__toast?.('Generating weekly debrief report', 'ok')}>Generate weekly report</button>}
        />
      </div>
    )
  }
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">LANDED · SIGNED</div><div className="stat-v">{completed.length}</div><div className="stat-delta dim">debriefs complete</div></div>
        <div className="stat"><div className="stat-k mono">IN FLIGHT</div><div className="stat-v">{inFlight.length}</div><div className="stat-delta dim">awaiting landing</div></div>
        <div className="stat"><div className="stat-k mono">TOTAL TODAY</div><div className="stat-v">{total}</div><div className="stat-delta dim">flights tracked</div></div>
        <div className="stat"><div className="stat-k mono">ASSIGNED CFIS</div><div className="stat-v">{new Set([...completed, ...inFlight].map(b => b.cfi).filter(Boolean)).size}</div><div className="stat-delta dim">with debriefs</div></div>
      </div>
      <div className="sect-head"><h3>Debriefs</h3><span className="mono dim">{total} active today</span></div>
      <table className="dt"><thead><tr><th>Booking</th><th>Student</th><th>Tail</th><th>Lesson</th><th>CFI</th><th>Status</th><th></th></tr></thead><tbody>
        {[...inFlight, ...completed].map(b => {
          const cfi = INSTRUCTORS.find(c => c.id === b.cfi) || null
          return (
            <tr key={b.id}>
              <td className="mono">{b.code || b.id}</td>
              <td className="strong">{b.student}</td>
              <td className="mono">{b.tail}</td>
              <td className="dim">{b.lesson}</td>
              <td>{cfi ? <span className="cfi-chip"><Avatar cfi={cfi} /> {cfi.name}</span> : <span className="dim">—</span>}</td>
              <td>
                {b.status === 'in_flight' && <Badge kind="info">IN FLIGHT</Badge>}
                {b.status === 'completed' && <Badge kind="ok">SIGNED</Badge>}
              </td>
              <td className="right"><button className="btn-ghost" onClick={() => window.__toast?.(`Opening debrief for ${b.student}`)}>Debrief ›</button></td>
            </tr>
          )
        })}
      </tbody></table>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Schedule sub-views (Timeline / Calendar / Capacity)
// ═══════════════════════════════════════════════════════════════

function slotToTime(s: number): string {
  const mins = s * 30 + 7 * 60
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

// Per-CFI swimlane timeline — each CFI is a row, bookings laid out by time.
export function ScheduleTimeline({ bookings }: { bookings: Booking[] }) {
  const TICK_PX = 44
  const LABEL_W = 168
  const ROW_H = 58
  const assignedCount = bookings.filter(b => b.cfi || b.cfiInitials).length

  return (
    <div className="view-pad">
      <div className="sect-head"><h3>Instructor timeline</h3><span className="mono dim">{assignedCount} assigned</span></div>
      <div className="canvas-wrap">
        <div className="canvas-scroll">
          <div className="board">
            <div className="board-header">
              <div className="board-corner" style={{ width: LABEL_W }}><span className="mono dim">INSTRUCTOR / TIME</span></div>
              <div className="board-ticks">
                {TICKS.map((t, i) => (
                  <div key={i} className={`tick ${i % 2 === 0 ? 'tick-major' : 'tick-minor'}`} style={{ width: TICK_PX }}>
                    <span className="mono">{i % 2 === 0 ? t : ''}</span>
                  </div>
                ))}
              </div>
            </div>
            {INSTRUCTORS.map(cfi => {
              const rows = bookings
                .filter(b => b.cfi === cfi.id || b.cfiInitials === cfi.initials)
                .slice()
                .sort((a, b) => a.start - b.start)
              const hours = rows.reduce((acc, b) => acc + (b.end - b.start) / 2, 0)
              return (
                <div key={cfi.id} className="board-row" style={{ height: ROW_H }}>
                  <div className="row-label" style={{ width: LABEL_W }}>
                    <div className="row-label-top">
                      <Avatar cfi={cfi} />
                      <span className="mono row-tail">{cfi.name}</span>
                    </div>
                    <div className="row-label-bot mono dim">{cfi.ratings.join(' · ')} · {hours.toFixed(1)}h today</div>
                  </div>
                  <div className="row-track" style={{ position: 'relative' }}>
                    {TICKS.slice(0, -1).map((_, i) => <div key={i} className={`cell ${i % 2 === 0 ? 'cell-major' : ''}`} style={{ width: TICK_PX }} />)}
                    {rows.map(b => {
                      const s = STATUS[b.status]
                      return (
                        <div key={b.id} className="bk-chip"
                          style={{ left: b.start * TICK_PX, width: (b.end - b.start) * TICK_PX - 2, background: s.fill, borderColor: s.stroke, color: s.text }}
                          title={`${b.code ?? b.id} · ${b.student}`}>
                          <div className="bk-id mono">{b.code ?? b.id}</div>
                          <div className="bk-student">{b.student}</div>
                          <div className="bk-lesson mono">{b.lesson}</div>
                        </div>
                      )
                    })}
                    {rows.length === 0 && <div className="lane-empty mono">— no lessons assigned —</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Week view — 7 days × 12 hours, viewDate is highlighted as "today".
export function ScheduleCalendar({ bookings, viewDate }: { bookings: Booking[]; viewDate?: Date }) {
  const today = viewDate || new Date()
  // Monday of the viewed week.
  const monday = new Date(today)
  const dow = (today.getDay() + 6) % 7 // 0 = Mon
  monday.setDate(today.getDate() - dow)
  monday.setHours(0, 0, 0, 0)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const DAYS = DAY_NAMES.map((name, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const isToday = d.toDateString() === today.toDateString()
    return { key: name.toLowerCase(), name, date: `${MONTHS[d.getMonth()]} ${d.getDate()}`, today: isToday, dateObj: d }
  })

  // Week view only fetches today's bookings right now — week-wide schedule
  // fetch isn't wired yet. Previously this view invented a hardcoded weekday
  // distribution (mon=11, tue=14, …) and rendered fake placeholder booking
  // rectangles on non-today columns, which displayed plausible-looking but
  // entirely fabricated counts in the header ("84 bookings this week") and
  // grid. We now show only today's live bookings and leave other days blank
  // until week-wide data is available, so the header count and per-day tally
  // remain honest.
  const HOUR_PX = 36
  const START_H = 7
  const END_H = 19
  const HOURS = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i)
  const todayBookingCount = bookings.length
  const weekLabel = `Week of ${MONTHS[monday.getMonth()]} ${monday.getDate()}, ${monday.getFullYear()}`

  return (
    <div className="view-pad">
      <div className="sect-head">
        <h3>{weekLabel}</h3>
        <span className="mono dim">{todayBookingCount} booking{todayBookingCount === 1 ? '' : 's'} today</span>
      </div>
      <div className="cal-wrap">
        <div className="cal-head">
          <div className="cal-gutter" />
          {DAYS.map(d => (
            <div key={d.key} className={`cal-day-head ${d.today ? 'today' : ''}`}>
              <div className="cal-day-name mono">{d.name}</div>
              <div className="cal-day-date">{d.date}</div>
              <div className="cal-day-count mono dim">{d.today ? `${todayBookingCount} booking${todayBookingCount === 1 ? '' : 's'}` : '—'}</div>
            </div>
          ))}
        </div>
        <div className="cal-grid" style={{ height: HOURS.length * HOUR_PX }}>
          <div className="cal-gutter">
            {HOURS.map(h => (
              <div key={h} className="cal-hr mono" style={{ height: HOUR_PX }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {DAYS.map(d => (
            <div key={d.key} className={`cal-col ${d.today ? 'today' : ''}`}>
              {HOURS.map(h => <div key={h} className="cal-cell" style={{ height: HOUR_PX }} />)}
              {d.today && bookings.map(b => {
                const startMin = b.start * 30 + 7 * 60
                const endMin = b.end * 30 + 7 * 60
                const top = ((startMin - START_H * 60) / 60) * HOUR_PX
                const height = ((endMin - startMin) / 60) * HOUR_PX - 2
                const s = STATUS[b.status]
                const initials = b.cfiInitials || INSTRUCTORS.find(c => c.id === b.cfi)?.initials
                return (
                  <div key={b.id} className="cal-bk" style={{ top, height, background: s.fill, borderColor: s.stroke, color: s.text }}>
                    <div className="cal-bk-time mono">{slotToTime(b.start)}</div>
                    <div className="cal-bk-student">{b.student}</div>
                    <div className="cal-bk-meta mono">{b.tail}{initials ? ` · ${initials}` : ''}</div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Utilization per aircraft + per-hour heat-strip.
export function ScheduleCapacity({ bookings, aircraft }: { bookings: Booking[]; aircraft: Aircraft[] }) {
  const HOURS = 12 // 07:00-19:00
  const SLOTS = 24
  const acRows = aircraft.map(ac => {
    const bk = bookings.filter(b => b.tail === ac.tail)
    const slotsBooked = bk.reduce((a, b) => a + (b.end - b.start), 0)
    return { ac, bk, util: Math.min(1, slotsBooked / SLOTS), hours: slotsBooked / 2 }
  })
  const hourDemand = Array.from({ length: HOURS }, (_, h) => {
    const startSlot = h * 2
    const endSlot = startSlot + 2
    return bookings.filter(b => b.start < endSlot && b.end > startSlot).length
  })
  const maxDemand = Math.max(...hourDemand, 1)
  const cfiRows = INSTRUCTORS.map(cfi => {
    const bk = bookings.filter(b => b.cfi === cfi.id || b.cfiInitials === cfi.initials)
    const hours = bk.reduce((a, b) => a + (b.end - b.start) / 2, 0)
    return { cfi, bk, hours, util: Math.min(1, hours / 8) }
  })
  const fleetUtil = acRows.length > 0 ? Math.round(acRows.reduce((a, r) => a + r.util, 0) / acRows.length * 100) : 0
  const peakIdx = hourDemand.indexOf(maxDemand)
  const groundHours = ((aircraft.length * SLOTS - acRows.reduce((a, r) => a + r.bk.reduce((x, y) => x + (y.end - y.start), 0), 0)) / 2)

  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">FLEET UTILIZATION</div><div className="stat-v">{fleetUtil}%</div><div className="stat-delta dim">avg across {acRows.length} aircraft</div></div>
        <div className="stat"><div className="stat-k mono">PEAK HOUR</div><div className="stat-v">{String(7 + peakIdx).padStart(2, '0')}:00</div><div className="stat-delta dim">{maxDemand} concurrent</div></div>
        <div className="stat"><div className="stat-k mono">CFI HOURS</div><div className="stat-v">{cfiRows.reduce((a, r) => a + r.hours, 0).toFixed(1)}h</div><div className="stat-delta dim">across {cfiRows.length} instructors</div></div>
        <div className="stat"><div className="stat-k mono">UNASSIGNED</div><div className="stat-v">{bookings.filter(b => !b.cfi && !b.cfiInitials && b.status !== 'maint').length}</div><div className="stat-delta dim">bookings without CFI</div></div>
        <div className="stat"><div className="stat-k mono">GROUND TIME</div><div className="stat-v">{groundHours.toFixed(1)}h</div><div className="stat-delta dim">available capacity</div></div>
      </div>

      <div className="sect-head"><h3>Aircraft utilization</h3><span className="mono dim">07:00 – 19:00</span></div>
      <div className="cap-table">
        {acRows.map(({ ac, bk, util, hours }) => (
          <div key={ac.tail} className="cap-row">
            <div className="cap-label">
              <div className="mono strong">{ac.tail}</div>
              <div className="mono dim">{ac.model}</div>
            </div>
            <div className="cap-bar-wrap">
              <div className="cap-strip">
                {Array.from({ length: SLOTS }).map((_, s) => {
                  const booked = bk.find(b => s >= b.start && s < b.end)
                  const stat = booked ? STATUS[booked.status] : null
                  return <div key={s} className="cap-slot" style={{ background: stat ? stat.fill : 'transparent', borderColor: stat ? stat.stroke : 'var(--line-1)' }} />
                })}
              </div>
              <div className="cap-meta">
                <span className="mono">{hours.toFixed(1)}h · {bk.length} bookings</span>
                <span className="mono strong">{Math.round(util * 100)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sect-head"><h3>Hourly demand</h3><span className="mono dim">Concurrent bookings per hour</span></div>
      <div className="cap-heat">
        {hourDemand.map((d, h) => (
          <div key={h} className="heat-col">
            <div className="heat-bar-wrap">
              <div className="heat-bar" style={{ height: `${(d / maxDemand) * 100}%`, background: d >= maxDemand ? 'var(--accent)' : d >= maxDemand * 0.6 ? 'var(--teal-1)' : 'var(--bg-3)' }} />
            </div>
            <div className="heat-label mono">{String(7 + h).padStart(2, '0')}</div>
            <div className="heat-val mono dim">{d}</div>
          </div>
        ))}
      </div>
    </div>
  )
}


function RequestsFilters() {
  const FILTERS = [
    { id: 'f_01', name: 'PPL · Not yet soloed', scope: 'Student', active: true, hits: 24 },
    { id: 'f_02', name: 'Instrument-rated · dual only', scope: 'Lesson', active: true, hits: 8 },
    { id: 'f_03', name: 'Preferred AM (07:00–11:00)', scope: 'Time', active: false, hits: 17 },
    { id: 'f_04', name: 'Requires tailwheel endorsement', scope: 'Rating', active: true, hits: 2 },
    { id: 'f_05', name: 'CFII-only (Isaac, Darius)', scope: 'CFI', active: false, hits: 11 },
    { id: 'f_06', name: 'New students · first 5 lessons', scope: 'Student', active: true, hits: 6 },
  ]
  return (
    <div className="view-pad">
      <div className="sect-head"><h3>Saved filters</h3><button className="btn-primary"><I name="plus" /> New filter</button></div>
      <table className="dt"><thead><tr><th>Name</th><th>Scope</th><th className="right">Matches</th><th>Status</th><th></th></tr></thead><tbody>
        {FILTERS.map(f => (
          <tr key={f.id}>
            <td className="strong">{f.name}</td>
            <td><Badge kind="muted">{f.scope}</Badge></td>
            <td className="right mono">{f.hits}</td>
            <td>{f.active ? <Badge kind="ok">ACTIVE</Badge> : <Badge kind="muted">OFF</Badge>}</td>
            <td className="right"><button className="btn-ghost">Edit ›</button></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

function RequestsRules() {
  const RULES = [
    { id: 'r_01', name: 'Auto-approve renewal lessons',           trigger: 'on:create',   action: 'approve if student.hours > 40',  runs: 142, enabled: true },
    { id: 'r_02', name: 'Alert CFI when preferred slot unavail',  trigger: 'on:conflict', action: 'notify cfi.pref',                 runs: 38,  enabled: true },
    { id: 'r_03', name: 'Escalate stale > 48h',                   trigger: 'schedule',    action: 'tag urgent + email dispatch',     runs: 11,  enabled: true },
    { id: 'r_04', name: 'Decline if aircraft in MX window',       trigger: 'on:create',   action: 'decline + suggest alternates',    runs: 4,   enabled: false },
    { id: 'r_05', name: 'Block student balance < $0',             trigger: 'on:create',   action: 'hold + route to billing',         runs: 2,   enabled: true },
  ]
  return (
    <div className="view-pad">
      <div className="sect-head"><h3>Approval rules</h3><button className="btn-primary"><I name="plus" /> New rule</button></div>
      <table className="dt"><thead><tr><th>Rule</th><th>Trigger</th><th>Action</th><th className="right">Runs</th><th>Status</th><th></th></tr></thead><tbody>
        {RULES.map(r => (
          <tr key={r.id}>
            <td className="strong">{r.name}</td>
            <td className="mono dim">{r.trigger}</td>
            <td className="dim">{r.action}</td>
            <td className="right mono">{r.runs}</td>
            <td>{r.enabled ? <Badge kind="ok">ON</Badge> : <Badge kind="muted">OFF</Badge>}</td>
            <td className="right"><button className="btn-ghost">Edit ›</button></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

function RequestsArchive() {
  const ARCHIVE = [
    { id: 'SR-2201', student: 'Chen Park',    outcome: 'approved' as const,  ts: '22 Apr 08:14', cfi: 'Isaac M.',  lesson: 'PPL-11' },
    { id: 'SR-2202', student: 'Hana Kim',     outcome: 'approved' as const,  ts: '22 Apr 07:02', cfi: 'Reena N.',  lesson: 'CPL-02' },
    { id: 'SR-2203', student: 'J. Whitaker',  outcome: 'declined' as const,  ts: '21 Apr 19:40', cfi: 'Darius P.', lesson: 'IR-04' },
    { id: 'SR-2204', student: 'L. Petrov',    outcome: 'expired' as const,   ts: '21 Apr 14:00', cfi: '—',         lesson: 'Discovery' },
    { id: 'SR-2205', student: 'M. Ortiz',     outcome: 'approved' as const,  ts: '21 Apr 09:55', cfi: 'Reena N.',  lesson: 'PPL-12' },
    { id: 'SR-2206', student: 'T. Okafor',    outcome: 'approved' as const,  ts: '20 Apr 16:22', cfi: 'Darius P.', lesson: 'PPL-18' },
    { id: 'SR-2207', student: 'Priya Rao',    outcome: 'declined' as const,  ts: '20 Apr 11:08', cfi: 'Isaac M.',  lesson: 'PPL-14' },
  ]
  const badge = (o: 'approved' | 'declined' | 'expired') =>
    o === 'approved' ? <Badge kind="ok">APPROVED</Badge>
    : o === 'declined' ? <Badge kind="error">DECLINED</Badge>
    : <Badge kind="muted">EXPIRED</Badge>
  // 30-DAY APPROVED was hardcoded "142 · 94% approval" but the ARCHIVE
  // array right below has the actual outcomes — only ~5 approvals are
  // visible. Derive the count + approval% from ARCHIVE so the tile stays
  // honest as rows are added/removed.
  const approvedCount = ARCHIVE.filter(a => a.outcome === 'approved').length
  const approvalPct = ARCHIVE.length > 0
    ? Math.round((approvedCount / ARCHIVE.length) * 100)
    : 0
  // 30-DAY DECLINED was hardcoded "6" but ARCHIVE only has 2 declined rows
  // visible (SR-2203, SR-2207). The number was already lying about its own
  // table directly beneath. Derive from ARCHIVE so the tile and the archive
  // table can never disagree, matching the APPROVED tile next to it.
  const declinedCount = ARCHIVE.filter(a => a.outcome === 'declined').length
  const declinedPct = ARCHIVE.length > 0
    ? Math.round((declinedCount / ARCHIVE.length) * 100)
    : 0
  // EXPIRED was hardcoded "3" with subtitle "▴ 1 this week" but the ARCHIVE
  // array right beneath only has 1 expired row (SR-2204) — the tile was
  // already lying about its own table. The "▴ 1 this week" subtitle implies
  // a week-over-week delta that isn't backed by any data here. Mirror the
  // APPROVED / DECLINED tiles next to it: derive the count from ARCHIVE and
  // express the subtitle as a "% of total" so the trio stays consistent and
  // can never desync as rows are added/removed.
  const expiredCount = ARCHIVE.filter(a => a.outcome === 'expired').length
  const expiredPct = ARCHIVE.length > 0
    ? Math.round((expiredCount / ARCHIVE.length) * 100)
    : 0
  // AVG TIME TO APPROVE was hardcoded "12m" with subtitle "▾ 4m since
  // last week" — both the value and the delta were fabricated. ARCHIVE
  // rows carry only an outcome timestamp (`ts`); there is no
  // request-created timestamp anywhere in scope, so a real "time to
  // approve" cannot be derived from this data. Replace the tile with a
  // metric we actually CAN derive from ARCHIVE: the share of rows with
  // a CFI assigned. The expired Discovery row (SR-2204) has cfi === '—'
  // and the rest carry a CFI name, so this tile reflects real CFI
  // coverage of the archive and stays in sync as rows are added/removed.
  // Same shape (count + "% of total") as the APPROVED/DECLINED/EXPIRED
  // tiles next to it, so the four-tile grid stays internally consistent.
  const withCfiCount = ARCHIVE.filter(a => a.cfi && a.cfi !== '—').length
  const withCfiPct = ARCHIVE.length > 0
    ? Math.round((withCfiCount / ARCHIVE.length) * 100)
    : 0
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">30-DAY APPROVED</div><div className="stat-v">{approvedCount}</div><div className={approvalPct >= 80 ? 'stat-delta pos' : 'stat-delta dim'}>{ARCHIVE.length > 0 ? `${approvalPct}% approval` : '—'}</div></div>
        <div className="stat"><div className="stat-k mono">30-DAY DECLINED</div><div className="stat-v">{declinedCount}</div><div className={declinedCount > 0 ? 'stat-delta dim' : 'stat-delta pos'}>{ARCHIVE.length > 0 ? `${declinedPct}% of total` : '—'}</div></div>
        <div className="stat"><div className="stat-k mono">EXPIRED</div><div className="stat-v">{expiredCount}</div><div className={expiredCount > 0 ? 'stat-delta dim' : 'stat-delta pos'}>{ARCHIVE.length > 0 ? `${expiredPct}% of total` : '—'}</div></div>
        <div className="stat"><div className="stat-k mono">WITH CFI</div><div className="stat-v">{withCfiCount}</div><div className={withCfiCount === ARCHIVE.length ? 'stat-delta pos' : 'stat-delta dim'}>{ARCHIVE.length > 0 ? `${withCfiPct}% of total` : '—'}</div></div>
      </div>
      <div className="sect-head"><h3>Archive · last 30 days</h3></div>
      <table className="dt"><thead><tr><th>ID</th><th>Student</th><th>Lesson</th><th>CFI</th><th>Outcome</th><th className="right">Timestamp</th><th></th></tr></thead><tbody>
        {ARCHIVE.map(a => (
          <tr key={a.id}>
            <td className="mono">{a.id}</td>
            <td className="strong">{a.student}</td>
            <td className="dim">{a.lesson}</td>
            <td className="dim">{a.cfi}</td>
            <td>{badge(a.outcome)}</td>
            <td className="right mono dim">{a.ts}</td>
            <td className="right"><button className="btn-ghost">Restore ›</button></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}


function IntegrityRules() {
  const RULES = [
    { id: 'INT-01', name: 'Paid but unbooked > 24h',         sev: 'warn'  as const, fires: 14, enabled: true  },
    { id: 'INT-02', name: 'Booked but unpaid at T-24h',      sev: 'warn'  as const, fires: 38, enabled: true  },
    { id: 'INT-03', name: 'Aircraft double-booked',          sev: 'error' as const, fires: 2,  enabled: true  },
    { id: 'INT-04', name: 'CFI double-booked',               sev: 'error' as const, fires: 3,  enabled: true  },
    { id: 'INT-05', name: 'Webhook delivery failure',        sev: 'error' as const, fires: 11, enabled: true  },
    { id: 'INT-06', name: 'CalDAV drift > 5 min',            sev: 'warn'  as const, fires: 4,  enabled: true  },
    { id: 'INT-07', name: 'Pending slot > 48h',              sev: 'info'  as const, fires: 22, enabled: true  },
    { id: 'INT-08', name: 'Tach regression (clock rollback)', sev: 'error' as const, fires: 0,  enabled: false },
    { id: 'INT-09', name: 'Student balance < –$100',          sev: 'warn'  as const, fires: 5,  enabled: true  },
    { id: 'INT-10', name: 'Endorsement expires < 30d',        sev: 'info'  as const, fires: 9,  enabled: true  },
  ]
  const sevBadge = (s: 'error' | 'warn' | 'info') =>
    s === 'error' ? <Badge kind="error">ERROR</Badge>
    : s === 'warn' ? <Badge kind="warn">WARN</Badge>
    : <Badge kind="info">INFO</Badge>
  const enabledCount = RULES.filter(r => r.enabled).length
  return (
    <div className="view-pad">
      <div className="sect-head"><h3>Integrity rules</h3><span className="mono dim">{RULES.length} rules · {enabledCount} enabled</span></div>
      <table className="dt"><thead><tr><th>ID</th><th>Rule</th><th>Severity</th><th className="right">Fires (30d)</th><th>Status</th><th></th></tr></thead><tbody>
        {RULES.map(r => (
          <tr key={r.id}>
            <td className="mono">{r.id}</td>
            <td className="strong">{r.name}</td>
            <td>{sevBadge(r.sev)}</td>
            <td className="right mono">{r.fires}</td>
            <td>{r.enabled ? <Badge kind="ok">ON</Badge> : <Badge kind="muted">OFF</Badge>}</td>
            <td className="right"><button className="btn-ghost">Configure ›</button></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

function IntegrityRuns() {
  const RUNS = [
    { id: 'run_9142', ts: '22 Apr 09:12', dur: 840,  checks: 10, fired: 5, status: 'ok'    as const },
    { id: 'run_9141', ts: '22 Apr 09:00', dur: 812,  checks: 10, fired: 4, status: 'ok'    as const },
    { id: 'run_9140', ts: '22 Apr 08:48', dur: 790,  checks: 10, fired: 6, status: 'ok'    as const },
    { id: 'run_9139', ts: '22 Apr 08:36', dur: 901,  checks: 10, fired: 4, status: 'slow'  as const },
    { id: 'run_9138', ts: '22 Apr 08:24', dur: 804,  checks: 10, fired: 3, status: 'ok'    as const },
    { id: 'run_9137', ts: '22 Apr 08:12', dur: 2140, checks: 10, fired: 3, status: 'error' as const },
    { id: 'run_9136', ts: '22 Apr 08:00', dur: 815,  checks: 10, fired: 3, status: 'ok'    as const },
    { id: 'run_9135', ts: '22 Apr 07:48', dur: 798,  checks: 10, fired: 2, status: 'ok'    as const },
    { id: 'run_9134', ts: '22 Apr 07:36', dur: 802,  checks: 10, fired: 2, status: 'ok'    as const },
    { id: 'run_9133', ts: '22 Apr 07:24', dur: 850,  checks: 10, fired: 1, status: 'ok'    as const },
  ]
  const statusBadge = (s: 'ok' | 'slow' | 'error') =>
    s === 'ok' ? <Badge kind="ok">OK</Badge>
    : s === 'slow' ? <Badge kind="warn">SLOW</Badge>
    : <Badge kind="error">ERROR</Badge>
  // AVG DURATION was hardcoded "847ms · ▾ 40ms vs yesterday" but the RUNS
  // array right below this tile has real `dur` values for each run — and
  // the actual mean across the 10 visible runs is ~955ms, not 847ms. Derive
  // it from RUNS so it stays correct as runs are added/removed.
  const avgDur = RUNS.length > 0
    ? Math.round(RUNS.reduce((s, r) => s + r.dur, 0) / RUNS.length)
    : 0
  // RUNS TODAY was hardcoded "46" with subtitle "every 12 min" but the
  // RUNS array right beneath only renders 10 rows — "46" was a fabricated
  // total with no data backing it, and the cadence "every 12 min" was
  // also a magic number. Derive the in-scope count from RUNS.length and
  // compute the cadence from the average gap between consecutive run
  // timestamps so the tile and the table can never desync. We also
  // relabel the tile from "RUNS TODAY" to "RUNS · IN SCOPE" because the
  // RUNS array is 10 entries spanning a ~108 min window, not a full day,
  // and we don't have any data outside that window to honestly call it
  // "today" against.
  const parseHM = (ts: string) => {
    const m = ts.match(/(\d{1,2}):(\d{2})\s*$/)
    if (!m) return null
    return Number(m[1]) * 60 + Number(m[2])
  }
  const runMinutes = RUNS.map(r => parseHM(r.ts)).filter((m): m is number => m !== null)
  const gaps: number[] = []
  for (let i = 0; i < runMinutes.length - 1; i++) {
    const diff = runMinutes[i] - runMinutes[i + 1]
    if (diff > 0) gaps.push(diff)
  }
  const avgGap = gaps.length > 0
    ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length)
    : 0
  const cadenceLabel = gaps.length > 0 ? `every ~${avgGap} min` : '—'
  // SUCCESS RATE was hardcoded "97.8% · 1 error in last 50" but the table
  // below only renders the 10 RUNS in this array — there is no "last 50"
  // anywhere in scope. Of those 10, one is `error` and one is `slow`, so the
  // real non-error rate is 90%, not 97.8%. Subtitle was also fabricated
  // ("1 error in last 50"). Derive both from RUNS so the tile stays honest
  // as runs are added or removed.
  const errorRuns = RUNS.filter(r => r.status === 'error').length
  const successRate = RUNS.length > 0
    ? ((RUNS.length - errorRuns) / RUNS.length) * 100
    : 0
  const successSub = RUNS.length === 0
    ? '—'
    : `${errorRuns} ${errorRuns === 1 ? 'error' : 'errors'} in last ${RUNS.length}`
  // ALERTS GENERATED was hardcoded "32 · today" but the RUNS array beneath
  // carries a `fired` count per run — sum of those is 33, not 32, so the
  // tile was already off-by-one against its own table. Subtitle "today" was
  // also wrong: the runs span 07:24→09:12, not a full day. Derive the alert
  // total from RUNS.fired and label the window by the run-count actually in
  // scope, matching the AVG DURATION / SUCCESS RATE tiles next to it.
  const totalFired = RUNS.reduce((s, r) => s + r.fired, 0)
  const firedSub = RUNS.length === 0
    ? '—'
    : `across last ${RUNS.length} run${RUNS.length === 1 ? '' : 's'}`
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">RUNS · IN SCOPE</div><div className="stat-v">{RUNS.length}</div><div className="stat-delta dim">{cadenceLabel}</div></div>
        <div className="stat"><div className="stat-k mono">AVG DURATION</div><div className="stat-v">{avgDur}ms</div><div className="stat-delta dim">across {RUNS.length} runs</div></div>
        <div className="stat"><div className="stat-k mono">SUCCESS RATE</div><div className="stat-v">{successRate.toFixed(1)}%</div><div className={errorRuns > 0 ? 'stat-delta warn' : 'stat-delta pos'}>{successSub}</div></div>
        <div className="stat"><div className="stat-k mono">ALERTS GENERATED</div><div className="stat-v">{totalFired}</div><div className="stat-delta dim">{firedSub}</div></div>
      </div>
      <div className="sect-head"><h3>Recent runs</h3></div>
      <table className="dt"><thead><tr><th>Run ID</th><th className="right">When</th><th className="right">Duration</th><th className="right">Checks</th><th className="right">Fired</th><th>Status</th><th></th></tr></thead><tbody>
        {RUNS.map(r => (
          <tr key={r.id}>
            <td className="mono">{r.id}</td>
            <td className="right mono dim">{r.ts}</td>
            <td className="right mono">{r.dur}ms</td>
            <td className="right mono">{r.checks}</td>
            <td className="right mono">{r.fired}</td>
            <td>{statusBadge(r.status)}</td>
            <td className="right"><button className="btn-ghost">Trace ›</button></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

function IntegritySnapshots() {
  const SNAPS = [
    { id: 'snap_224', ts: '22 Apr 09:00', kind: 'Daily',  size: '412 KB', records: 1482, verified: true },
    { id: 'snap_223', ts: '22 Apr 00:00', kind: 'Daily',  size: '408 KB', records: 1480, verified: true },
    { id: 'snap_222', ts: '21 Apr 00:00', kind: 'Daily',  size: '401 KB', records: 1471, verified: true },
    { id: 'snap_221', ts: '20 Apr 00:00', kind: 'Daily',  size: '395 KB', records: 1464, verified: true },
    { id: 'snap_220', ts: '19 Apr 21:42', kind: 'Manual', size: '392 KB', records: 1460, verified: true },
    { id: 'snap_219', ts: '19 Apr 00:00', kind: 'Daily',  size: '388 KB', records: 1454, verified: true },
    { id: 'snap_218', ts: '18 Apr 00:00', kind: 'Daily',  size: '380 KB', records: 1441, verified: true },
    { id: 'snap_217', ts: '17 Apr 00:00', kind: 'Daily',  size: '372 KB', records: 1428, verified: false },
  ]
  return (
    <div className="view-pad">
      <div className="sect-head">
        <h3>System snapshots</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost"><I name="check" /> Verify chain</button>
          <button className="btn-primary"><I name="plus" /> Snapshot now</button>
        </div>
      </div>
      <table className="dt"><thead><tr><th>ID</th><th className="right">Taken</th><th>Kind</th><th className="right">Records</th><th className="right">Size</th><th>Integrity</th><th></th></tr></thead><tbody>
        {SNAPS.map(s => (
          <tr key={s.id}>
            <td className="mono">{s.id}</td>
            <td className="right mono dim">{s.ts}</td>
            <td><Badge kind={s.kind === 'Manual' ? 'info' : 'muted'}>{s.kind.toUpperCase()}</Badge></td>
            <td className="right mono">{s.records}</td>
            <td className="right mono dim">{s.size}</td>
            <td>{s.verified ? <Badge kind="ok">VERIFIED</Badge> : <Badge kind="warn">UNVERIFIED</Badge>}</td>
            <td className="right"><button className="btn-ghost">Restore ›</button></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}
