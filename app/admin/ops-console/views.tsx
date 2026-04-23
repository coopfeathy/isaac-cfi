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
          {aircraft.length} aircraft · {bookings.length} bookings · {bookings.filter(b => !b.paid && b.status !== 'maint' && b.status !== 'aog').length} unpaid · sync {now ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '—:—'}
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">IN SHOP</div><div className="stat-v">{MAINT_EVENTS.filter(m => m.status === 'in_shop' || m.status === 'awaiting_parts').length}</div><div className="stat-delta neg">1 AOG</div></div>
          <div className="stat"><div className="stat-k mono">DUE · 14 DAYS</div><div className="stat-v">{MAINT_EVENTS.filter(m => m.status === 'upcoming').length}</div><div className="stat-delta warn">schedule now</div></div>
          <div className="stat"><div className="stat-k mono">MTD · SPEND</div><div className="stat-v">$3,736.20</div><div className="stat-delta dim mono">2 events</div></div>
          <div className="stat"><div className="stat-k mono">UPTIME · 30D</div><div className="stat-v">94.1%</div><div className="stat-delta pos">▴ 2.3 pp</div></div>
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
    const deltas = [11.4, 8.2, 0.0, 9.6, 0.0]
    const untils: Array<number | string> = [49.7, 30.4, '—', 21.9, '—']
    const utils = [0.82, 0.58, 0.0, 0.71, 0.0]
    // Derive TOP UTILIZED / IDLE from the live fleet so deleted or newly-added
    // aircraft are reflected. TOP = highest hobbs among non-grounded aircraft;
    // IDLE = any grounded (AOG) aircraft, else the lowest-hobbs aircraft.
    const nonGrounded = aircraft.filter(a => a.status !== 'ground')
    const topAircraft = nonGrounded.reduce<Aircraft | null>(
      (top, a) => (!top || a.hobbs > top.hobbs) ? a : top, null
    )
    const topIdx = topAircraft ? aircraft.findIndex(a => a.tail === topAircraft.tail) : -1
    const topWeeklyHrs = topIdx >= 0 && deltas[topIdx] != null ? deltas[topIdx] : null
    const aog = aircraft.find(a => a.status === 'ground')
    const idleAircraft = aog || aircraft.reduce<Aircraft | null>(
      (lo, a) => (!lo || a.hobbs < lo.hobbs) ? a : lo, null
    )
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">FLEET TOTAL</div><div className="stat-v">{aircraft.reduce((s, a) => s + a.hobbs, 0).toFixed(1)} h</div><div className="stat-delta pos">+36.4 MTD</div></div>
          <div className="stat"><div className="stat-k mono">UTILIZATION · 7D</div><div className="stat-v">62%</div><div className="stat-delta pos">▴ 4 pp</div></div>
          <div className="stat">
            <div className="stat-k mono">TOP UTILIZED</div>
            <div className="stat-v">{topAircraft?.tail || '—'}</div>
            <div className="stat-delta dim mono">{topWeeklyHrs != null && topWeeklyHrs > 0 ? `${topWeeklyHrs.toFixed(1)} h · wk` : '—'}</div>
          </div>
          <div className="stat">
            <div className="stat-k mono">IDLE · 14D</div>
            <div className="stat-v">{idleAircraft?.tail || '—'}</div>
            <div className={`stat-delta ${aog ? 'neg' : 'dim'}`}>{aog ? 'AOG' : (idleAircraft ? 'low hours' : '—')}</div>
          </div>
        </div>
        <div className="sect-head"><h3>Hobbs by aircraft</h3></div>
        <table className="dt"><thead><tr><th>Tail</th><th>Model</th><th className="right">Hobbs</th><th className="right">Last flight</th><th className="right">Δ · 7d</th><th>Until next insp.</th><th>Utilization</th></tr></thead><tbody>
          {aircraft.map((a, i) => {
            const delta = deltas[i]
            const until = untils[i]
            const util = utils[i]
            return (
              <tr key={a.tail}>
                <td><span className="mono strong">{a.tail}</span></td>
                <td className="dim">{a.model}</td>
                <td className="right mono strong">{a.hobbs.toFixed(1)}</td>
                <td className="right mono dim">{delta > 0 ? `2026-04-${22 - (i % 3)}` : '—'}</td>
                <td className={`right mono ${delta > 0 ? 'pos' : 'dim'}`}>{delta > 0 ? `+${delta.toFixed(1)}` : '—'}</td>
                <td className="mono dim">{typeof until === 'number' ? `${until.toFixed(1)} h` : until}</td>
                <td><div className="progress"><div className="progress-fill" style={{ width: `${util * 100}%` }} /><span className="progress-txt mono">{Math.round(util * 100)}%</span></div></td>
              </tr>
            )
          })}
        </tbody></table>
      </div>
    )
  }

  if (subTab === 3) {
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">OPEN</div><div className="stat-v">{SQUAWKS.filter(s => s.status === 'open').length}</div><div className="stat-delta warn">1 major</div></div>
          <div className="stat"><div className="stat-k mono">DEFERRED</div><div className="stat-v">{SQUAWKS.filter(s => s.status === 'deferred').length}</div><div className="stat-delta dim">within MEL</div></div>
          <div className="stat"><div className="stat-k mono">RESOLVED · 30D</div><div className="stat-v">14</div><div className="stat-delta pos">avg 2.1d</div></div>
          <div className="stat"><div className="stat-k mono">MTBF · FLEET</div><div className="stat-v">86 h</div><div className="stat-delta pos">▴ 12 h</div></div>
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
    const avgPct = students.length === 0 ? 0 : Math.round(students.reduce((t, s) => t + s.progress, 0) / students.length * 100)
    const nextUpBank = ['PPL-15 XC Dual', 'PPL-13 Night', 'PPL-18 Ckr', 'PPL-10 Stalls', 'IR-05 Holds', 'PPL-22 Flight Test', 'CPL-03 Complex', 'Disc Intro', 'IR-08 ILS']
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE LEARNERS</div><div className="stat-v">{students.filter(s => s.status === 'active').length}</div><div className="stat-delta pos">▴ 1 this week</div></div>
          <div className="stat"><div className="stat-k mono">AVG COMPLETION</div><div className="stat-v">{avgPct}%</div><div className="stat-delta pos">▴ 3 pp</div></div>
          <div className="stat"><div className="stat-k mono">CHECKRIDE READY</div><div className="stat-v">1</div><div className="stat-delta dim">T. Okafor</div></div>
          <div className="stat"><div className="stat-k mono">STALLED &gt; 14D</div><div className="stat-v">2</div><div className="stat-delta warn">need outreach</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">SOLO-CLEARED</div><div className="stat-v">3</div><div className="stat-delta pos">all valid</div></div>
          <div className="stat"><div className="stat-k mono">PRE-SOLO</div><div className="stat-v">2</div><div className="stat-delta dim">stage checks active</div></div>
          <div className="stat"><div className="stat-k mono">ENDORSE EXPIRES &lt; 30D</div><div className="stat-v">0</div><div className="stat-delta pos">clear</div></div>
          <div className="stat"><div className="stat-k mono">XC ENDORSE VALID</div><div className="stat-v">3/3</div><div className="stat-delta pos">current</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE HOLDS</div><div className="stat-v">{HOLDS.length}</div><div className="stat-delta neg">1 blocking dispatch</div></div>
          <div className="stat"><div className="stat-k mono">BALANCE HOLDS</div><div className="stat-v">{HOLDS.filter(h => h.sev === 'error').length}</div><div className="stat-delta warn">$1,240.00</div></div>
          <div className="stat"><div className="stat-k mono">DOC HOLDS</div><div className="stat-v">{HOLDS.filter(h => h.reason.toLowerCase().includes('medical')).length}</div><div className="stat-delta dim">medicals</div></div>
          <div className="stat"><div className="stat-k mono">RESOLVED · 7D</div><div className="stat-v">5</div><div className="stat-delta pos">avg 1.8 d</div></div>
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

export function IntegrityView({ alerts, subTab = 0, onResolve }: { alerts: AlertRow[]; subTab?: number; onResolve: (id: string) => void }) {
  if (subTab === 1) return <IntegrityRules />
  if (subTab === 2) return <IntegrityRuns />
  if (subTab === 3) return <IntegritySnapshots />
  const open = alerts.filter(a => !a.resolved)
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">STALE PENDING</div><div className="stat-v">3</div><div className="stat-delta pos">▾ 2 since 06:00</div></div>
        <div className="stat"><div className="stat-k mono">PAID / UNBOOKED</div><div className="stat-v">1</div><div className="stat-delta neg">▴ 1 since 00:00</div></div>
        <div className="stat"><div className="stat-k mono">BOOKED / UNPAID</div><div className="stat-v">2</div><div className="stat-delta dim">no change</div></div>
        <div className="stat"><div className="stat-k mono">WEBHOOK FAILURES</div><div className="stat-v">2</div><div className="stat-delta neg">▴ 2 since 08:00</div></div>
        <div className="stat"><div className="stat-k mono">CALDAV SYNC</div><div className="stat-v">OK</div><div className="stat-delta dim mono">last 09:12</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">IN BRIEF</div><div className="stat-v">{PREFLIGHT.filter(p => p.stage === 'brief').length}</div><div className="stat-delta dim">active CFI time</div></div>
          <div className="stat"><div className="stat-k mono">READY · TO LAUNCH</div><div className="stat-v">{PREFLIGHT.filter(p => p.stage === 'ready').length}</div><div className="stat-delta pos">on time</div></div>
          <div className="stat"><div className="stat-k mono">PREP</div><div className="stat-v">{PREFLIGHT.filter(p => p.stage === 'prep').length}</div><div className="stat-delta warn">2 items open</div></div>
          <div className="stat"><div className="stat-k mono">AVG BRIEF</div><div className="stat-v">22 min</div><div className="stat-delta dim">trailing 7d</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">TODAY · LANDED</div><div className="stat-v">{POSTFLIGHT.length}</div><div className="stat-delta pos">+1 vs yday</div></div>
          <div className="stat"><div className="stat-k mono">FUEL BURN</div><div className="stat-v">{POSTFLIGHT.reduce((s, p) => s + p.fuelBurn, 0).toFixed(1)} gal</div><div className="stat-delta dim">avg 9.3 g/h</div></div>
          <div className="stat"><div className="stat-k mono">TACH · TOTAL</div><div className="stat-v">{POSTFLIGHT.reduce((s, p) => s + p.tach, 0).toFixed(1)} h</div><div className="stat-delta dim">4 flights</div></div>
          <div className="stat"><div className="stat-k mono">DEBRIEFS PENDING</div><div className="stat-v">1</div><div className="stat-delta warn">&gt;24h</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">TODAY · NEW</div><div className="stat-v">2</div><div className="stat-delta warn">from line</div></div>
          <div className="stat"><div className="stat-k mono">BLOCKING LAUNCH</div><div className="stat-v">1</div><div className="stat-delta neg">N733MF · EGT</div></div>
          <div className="stat"><div className="stat-k mono">HANDED TO MX</div><div className="stat-v">3</div><div className="stat-delta pos">work orders open</div></div>
          <div className="stat"><div className="stat-k mono">DEFER-ELIGIBLE</div><div className="stat-v">1</div><div className="stat-delta dim">within MEL</div></div>
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
    const activeMrr = SUBSCRIPTIONS.filter(s => s.status === 'active').reduce((t, s) => t + s.mrr, 0)
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE</div><div className="stat-v">{SUBSCRIPTIONS.filter(s => s.status === 'active').length}</div><div className="stat-delta pos">+1 this week</div></div>
          <div className="stat"><div className="stat-k mono">MRR</div><div className="stat-v">${activeMrr.toFixed(2)}</div><div className="stat-delta pos">▴ 8.2%</div></div>
          <div className="stat"><div className="stat-k mono">PAST DUE</div><div className="stat-v">{SUBSCRIPTIONS.filter(s => s.status === 'past_due').length}</div><div className="stat-delta neg mono">$49.00</div></div>
          <div className="stat"><div className="stat-k mono">CHURN · 30D</div><div className="stat-v">1</div><div className="stat-delta dim">2.4%</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">OUTSTANDING</div><div className="stat-v">${totalCredit.toFixed(2)}</div><div className="stat-delta dim">{CREDITS.length} accounts</div></div>
          <div className="stat"><div className="stat-k mono">ISSUED · MTD</div><div className="stat-v">$962.50</div><div className="stat-delta pos">▴ 12%</div></div>
          <div className="stat"><div className="stat-k mono">REDEEMED · MTD</div><div className="stat-v">$487.00</div><div className="stat-delta dim">6 uses</div></div>
          <div className="stat"><div className="stat-k mono">EXPIRED · 30D</div><div className="stat-v">$0.00</div><div className="stat-delta dim">—</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">OPEN</div><div className="stat-v">{DISPUTES.filter(d => d.status === 'needs_response').length}</div><div className="stat-delta neg">needs response</div></div>
          <div className="stat"><div className="stat-k mono">UNDER REVIEW</div><div className="stat-v">{DISPUTES.filter(d => d.status === 'under_review').length}</div><div className="stat-delta dim">Stripe processing</div></div>
          <div className="stat"><div className="stat-k mono">AT RISK</div><div className="stat-v">${totalExposed.toFixed(2)}</div><div className="stat-delta warn">respond by 04/26</div></div>
          <div className="stat"><div className="stat-k mono">WIN RATE · 90D</div><div className="stat-v">67%</div><div className="stat-delta pos">2 of 3</div></div>
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

  const totalOpen = INVOICES.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total - i.paid), 0)
  const totalPaid = INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.paid, 0)
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">OPEN A/R</div><div className="stat-v">${totalOpen.toFixed(2)}</div><div className="stat-delta dim">4 invoices</div></div>
        <div className="stat"><div className="stat-k mono">COLLECTED · MTD</div><div className="stat-v">${totalPaid.toFixed(2)}</div><div className="stat-delta pos">▴ 18% vs last</div></div>
        <div className="stat"><div className="stat-k mono">OVERDUE</div><div className="stat-v">1</div><div className="stat-delta neg">$645.00</div></div>
        <div className="stat"><div className="stat-k mono">AUTOPAY</div><div className="stat-v">62%</div><div className="stat-delta pos mono">+3 this week</div></div>
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

export function SyllabusView({ subTab = 0 }: { subTab?: number }) {
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">TOTAL LESSONS</div><div className="stat-v">80</div><div className="stat-delta dim">4 courses</div></div>
          <div className="stat"><div className="stat-k mono">IN PROGRESS</div><div className="stat-v">{LESSONS.filter(l => l.active > 0).length}</div><div className="stat-delta pos">across fleet</div></div>
          <div className="stat"><div className="stat-k mono">AVG DURATION</div><div className="stat-v">1.6 h</div><div className="stat-delta dim">flight time</div></div>
          <div className="stat"><div className="stat-k mono">GROUND · RATIO</div><div className="stat-v">0.43</div><div className="stat-delta dim">hrs per flight hr</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">THIS WEEK</div><div className="stat-v">{DEB.length}</div><div className="stat-delta pos">+2 vs prev</div></div>
          <div className="stat"><div className="stat-k mono">MEETS / EXCEEDS</div><div className="stat-v">{DEB.filter(d => d.grade === 'MP').length}</div><div className="stat-delta pos">{Math.round(DEB.filter(d => d.grade === 'MP').length / DEB.length * 100)}%</div></div>
          <div className="stat"><div className="stat-k mono">UNSATISFACTORY</div><div className="stat-v">{DEB.filter(d => d.grade === 'UP').length}</div><div className="stat-delta warn">repeat scheduled</div></div>
          <div className="stat"><div className="stat-k mono">AVG TIME-TO-SIGN</div><div className="stat-v">4 h</div><div className="stat-delta pos">SLA ≤ 24h</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE</div><div className="stat-v">{END.filter(e => e.status === 'active').length}</div><div className="stat-delta pos">all current</div></div>
          <div className="stat"><div className="stat-k mono">EXPIRE &lt; 30D</div><div className="stat-v">0</div><div className="stat-delta pos">clear</div></div>
          <div className="stat"><div className="stat-k mono">EXPIRED</div><div className="stat-v">{END.filter(e => e.status === 'expired').length}</div><div className="stat-delta dim">archived</div></div>
          <div className="stat"><div className="stat-k mono">ISSUED · MTD</div><div className="stat-v">4</div><div className="stat-delta pos">▴ 1 vs avg</div></div>
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
  return (
    <div className="view-pad">
      <div className="syl-grid">
        {SYLLABUS.map(s => (
          <div key={s.id} className="syl-card">
            <div className="syl-head">
              <span className="mono dim">{s.id}</span>
              <span className="mono">{s.students} active</span>
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
        ))}
      </div>
    </div>
  )
}

export function OnboardingView() {
  return (
    <div className="view-pad">
      <table className="dt"><thead><tr><th>ID</th><th>Prospect</th><th>Stage</th><th>Progress</th><th>Started</th><th>Notes</th><th></th></tr></thead><tbody>
        {ONBOARDING.map(o => (
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
            <td className="right"><button className="btn-ghost">Convert ›</button></td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

export function PayoutsView({ subTab = 0 }: { subTab?: number }) {
  const total = PAYOUTS.reduce((s, p) => s + p.amount, 0)

  if (subTab === 1) {
    // BALANCES
    const BAL = [
      { bucket: 'Available',       amount: 1204.22, currency: 'USD', note: 'Instant-payout eligible' },
      { bucket: 'Pending',         amount: 8420.14, currency: 'USD', note: 'Arrives 04/24 · T+2' },
      { bucket: 'In transit',      amount:  620.00, currency: 'USD', note: 'ACH rail · bank review' },
      { bucket: 'Reserve',         amount: 2500.00, currency: 'USD', note: 'Platform reserve · 30d rolling' },
      { bucket: 'Disputed (held)', amount:  645.00, currency: 'USD', note: 'INV-7709 · Sofia Haddad' },
    ]
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">TOTAL BALANCE</div><div className="stat-v">${BAL.reduce((t, b) => t + b.amount, 0).toFixed(2)}</div><div className="stat-delta dim">all buckets</div></div>
          <div className="stat"><div className="stat-k mono">AVAILABLE</div><div className="stat-v">${BAL[0].amount.toFixed(2)}</div><div className="stat-delta pos">instant OK</div></div>
          <div className="stat"><div className="stat-k mono">PENDING</div><div className="stat-v">${BAL[1].amount.toFixed(2)}</div><div className="stat-delta dim">T+2</div></div>
          <div className="stat"><div className="stat-k mono">HELD</div><div className="stat-v">${(BAL[3].amount + BAL[4].amount).toFixed(2)}</div><div className="stat-delta warn">reserve + dispute</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">IN TRANSIT</div><div className="stat-v">${TRA.filter(t => t.status === 'in_transit').reduce((s, t) => s + t.amount, 0).toFixed(2)}</div><div className="stat-delta dim">1 transfer</div></div>
          <div className="stat"><div className="stat-k mono">INSTANT · MTD</div><div className="stat-v">$500.00</div><div className="stat-delta dim">1 transfer</div></div>
          <div className="stat"><div className="stat-k mono">FAILED · 30D</div><div className="stat-v">0</div><div className="stat-delta pos">—</div></div>
          <div className="stat"><div className="stat-k mono">AVG SETTLE</div><div className="stat-v">2.1 d</div><div className="stat-delta pos">ACH</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">FEES · MTD</div><div className="stat-v">${FEES[0].fees.toFixed(2)}</div><div className="stat-delta dim">3.02% eff.</div></div>
          <div className="stat"><div className="stat-k mono">FEES · YTD</div><div className="stat-v">${FEES.reduce((s, f) => s + f.fees, 0).toFixed(2)}</div><div className="stat-delta dim">4 periods</div></div>
          <div className="stat"><div className="stat-k mono">DISPUTES · MTD</div><div className="stat-v">$30.00</div><div className="stat-delta warn">2 raised</div></div>
          <div className="stat"><div className="stat-k mono">REFUND · COST</div><div className="stat-v">$0.30</div><div className="stat-delta pos">minimal</div></div>
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
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">LAST 30D</div><div className="stat-v">${total.toFixed(2)}</div><div className="stat-delta pos">▴ $2,420 vs prev</div></div>
        <div className="stat"><div className="stat-k mono">IN FLIGHT</div><div className="stat-v">$8,420.14</div><div className="stat-delta dim mono">arrives 04/24</div></div>
        <div className="stat"><div className="stat-k mono">FEES · 30D</div><div className="stat-v">$962.03</div><div className="stat-delta dim">3.0% eff.</div></div>
        <div className="stat"><div className="stat-k mono">AVAILABLE</div><div className="stat-v">$1,204.22</div><div className="stat-delta pos">instant OK</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">CATEGORIES</div><div className="stat-v">{cats.length}</div><div className="stat-delta dim">tracked</div></div>
          <div className="stat"><div className="stat-k mono">TOP · MAINT</div><div className="stat-v">${byCat.Maintenance?.toFixed(0) ?? 0}</div><div className="stat-delta neg">72% of budget</div></div>
          <div className="stat"><div className="stat-k mono">OVER BUDGET</div><div className="stat-v">0</div><div className="stat-delta pos">YTD</div></div>
          <div className="stat"><div className="stat-k mono">UNCATEGORIZED</div><div className="stat-v">0</div><div className="stat-delta pos">clean</div></div>
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">ACTIVE VENDORS</div><div className="stat-v">{vendors.length}</div><div className="stat-delta dim">30-day window</div></div>
          <div className="stat"><div className="stat-k mono">TOP VENDOR</div><div className="stat-v">{vendors[0]?.[0] ?? '—'}</div><div className="stat-delta dim mono">${vendors[0]?.[1].total.toFixed(0) ?? 0}</div></div>
          <div className="stat"><div className="stat-k mono">NET-30 OUTSTANDING</div><div className="stat-v">$2,800.00</div><div className="stat-delta dim">Mather Field</div></div>
          <div className="stat"><div className="stat-k mono">1099 ELIGIBLE</div><div className="stat-v">2</div><div className="stat-delta dim">W-9 on file</div></div>
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
          <div className="stat"><div className="stat-k mono">ATTACHED</div><div className="stat-v">{EXPENSES.length}/{EXPENSES.length}</div><div className="stat-delta pos">100% covered</div></div>
          <div className="stat"><div className="stat-k mono">OCR · PENDING</div><div className="stat-v">0</div><div className="stat-delta pos">processed</div></div>
          <div className="stat"><div className="stat-k mono">FLAGGED</div><div className="stat-v">0</div><div className="stat-delta dim">—</div></div>
          <div className="stat"><div className="stat-k mono">STORAGE</div><div className="stat-v">42 MB</div><div className="stat-delta dim">S3 · encrypted</div></div>
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

export function DebriefsView() {
  return (
    <div className="view-pad">
      <EmptyState
        icon="book"
        title="No recent debriefs flagged"
        sub="All 42 debriefs in the last 30 days are complete."
        cta={<button className="btn-primary">Generate weekly report</button>}
      />
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

  // Simple deterministic fake distribution for non-today days until week-wide
  // schedule fetch lands.
  const fakeCounts: Record<string, number> = { mon: 11, tue: 14, wed: bookings.length, thu: 12, fri: 15, sat: 18, sun: 9 }
  DAYS.forEach(d => { if (d.today) fakeCounts[d.key] = bookings.length })
  const HOUR_PX = 36
  const START_H = 7
  const END_H = 19
  const HOURS = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i)
  const totalBookings = Object.values(fakeCounts).reduce((a, b) => a + b, 0)
  const weekLabel = `Week of ${MONTHS[monday.getMonth()]} ${monday.getDate()}, ${monday.getFullYear()}`

  return (
    <div className="view-pad">
      <div className="sect-head">
        <h3>{weekLabel}</h3>
        <span className="mono dim">{totalBookings} bookings this week</span>
      </div>
      <div className="cal-wrap">
        <div className="cal-head">
          <div className="cal-gutter" />
          {DAYS.map(d => (
            <div key={d.key} className={`cal-day-head ${d.today ? 'today' : ''}`}>
              <div className="cal-day-name mono">{d.name}</div>
              <div className="cal-day-date">{d.date}</div>
              <div className="cal-day-count mono dim">{fakeCounts[d.key]} bookings</div>
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
              {!d.today && (
                <div className="cal-fake-layer">
                  {Array.from({ length: fakeCounts[d.key] }).map((_, i) => {
                    const top = 20 + (i * 28) % (HOURS.length * HOUR_PX - 60)
                    const height = 40 + (i * 13) % 40
                    const left = 4 + (i % 2) * 4
                    return <div key={i} className="cal-fake-bk" style={{ top, height, left, right: left + 8 }} />
                  })}
                </div>
              )}
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
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">30-DAY APPROVED</div><div className="stat-v">142</div><div className="stat-delta pos">94% approval</div></div>
        <div className="stat"><div className="stat-k mono">30-DAY DECLINED</div><div className="stat-v">6</div><div className="stat-delta dim">—</div></div>
        <div className="stat"><div className="stat-k mono">EXPIRED</div><div className="stat-v">3</div><div className="stat-delta neg">▴ 1 this week</div></div>
        <div className="stat"><div className="stat-k mono">AVG TIME TO APPROVE</div><div className="stat-v">12m</div><div className="stat-delta pos">▾ 4m since last week</div></div>
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
  return (
    <div className="view-pad">
      <div className="stat-grid">
        <div className="stat"><div className="stat-k mono">RUNS TODAY</div><div className="stat-v">46</div><div className="stat-delta dim">every 12 min</div></div>
        <div className="stat"><div className="stat-k mono">AVG DURATION</div><div className="stat-v">847ms</div><div className="stat-delta pos">▾ 40ms vs yesterday</div></div>
        <div className="stat"><div className="stat-k mono">SUCCESS RATE</div><div className="stat-v">97.8%</div><div className="stat-delta dim">1 error in last 50</div></div>
        <div className="stat"><div className="stat-k mono">ALERTS GENERATED</div><div className="stat-v">32</div><div className="stat-delta dim">today</div></div>
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
