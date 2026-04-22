'use client'

import type { ReactNode } from 'react'
import { I, Badge, Avatar } from './primitives'
import {
  AIRCRAFT, INSTRUCTORS, INITIAL_BOOKINGS, STUDENTS, SLOT_REQUESTS, DISPATCH,
  INVOICES, SYLLABUS, ONBOARDING, PAYOUTS, EXPENSES, SUBSCRIPTIONS, CREDITS,
  DISPUTES, SQUAWKS, MAINT_EVENTS, TICKS, STATUS,
} from './data'

type Booking = {
  id: string; tail: string; start: number; end: number; student: string;
  cfi: string | null; lesson: string; status: string; paid: boolean | null;
}
type AlertRow = { id: string; sev: string; code: string; msg: string; ts: string; resolved: boolean }

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

export function ScheduleBoard({ bookings, zoom, selBookingId, onSelBooking }: {
  bookings: Booking[]; zoom: number; selBookingId: string | null; onSelBooking: (id: string) => void;
}) {
  const TICK_PX = 44 * zoom
  const ROW_H = 62
  const LABEL_W = 168
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
          <div className="now-line" style={{ left: LABEL_W + 5 * TICK_PX - 1 }}>
            <div className="now-dot" />
            <div className="now-label mono">09:30 · NOW</div>
          </div>
          {AIRCRAFT.map(ac => {
            const rowBookings = bookings.filter(b => b.tail === ac.tail)
            return (
              <div key={ac.tail} className="board-row" style={{ height: ROW_H }}>
                <div className="row-label" style={{ width: LABEL_W }}>
                  <div className="row-label-top">
                    <I name="plane" />
                    <span className="mono row-tail">{ac.tail}</span>
                    {ac.status === 'ground' && <Badge kind="error">AOG</Badge>}
                    {ac.status === 'squawk' && <Badge kind="warn">SQK</Badge>}
                  </div>
                  <div className="row-label-bot"><span className="dim">{ac.model}</span></div>
                  <div className="row-label-meta mono dim">HOBBS {ac.hobbs.toFixed(1)}</div>
                </div>
                <div className="row-track">
                  {TICKS.slice(0, -1).map((_, i) => <div key={i} className={`cell ${i % 2 === 0 ? 'cell-major' : ''}`} style={{ width: TICK_PX }} />)}
                  {rowBookings.map(b => {
                    const s = STATUS[b.status]
                    const cfi = INSTRUCTORS.find(c => c.id === b.cfi) || null
                    const width = (b.end - b.start) * TICK_PX - 4
                    const left = b.start * TICK_PX + 2
                    const sel = selBookingId === b.id
                    return (
                      <div
                        key={b.id}
                        className={`block block-${b.status} ${sel ? 'block-sel' : ''}`}
                        style={{ left, width, background: s.fill, borderColor: s.stroke, color: s.text }}
                        onClick={() => onSelBooking(b.id)}
                      >
                        <div className="block-head">
                          <span className="mono block-id">{b.id}</span>
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
          5 aircraft · {bookings.length} bookings · {bookings.filter(b => !b.paid && b.status !== 'maint' && b.status !== 'aog').length} unpaid · sync 09:12
        </span>
      </div>
    </div>
  )
}

export function FleetView({ subTab = 0 }: { subTab?: number }) {
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
    return (
      <div className="view-pad">
        <div className="stat-grid">
          <div className="stat"><div className="stat-k mono">FLEET TOTAL</div><div className="stat-v">{AIRCRAFT.reduce((s, a) => s + a.hobbs, 0).toFixed(1)} h</div><div className="stat-delta pos">+36.4 MTD</div></div>
          <div className="stat"><div className="stat-k mono">UTILIZATION · 7D</div><div className="stat-v">62%</div><div className="stat-delta pos">▴ 4 pp</div></div>
          <div className="stat"><div className="stat-k mono">TOP UTILIZED</div><div className="stat-v">N428MF</div><div className="stat-delta dim mono">11.4 h · wk</div></div>
          <div className="stat"><div className="stat-k mono">IDLE · 14D</div><div className="stat-v">N219MF</div><div className="stat-delta neg">AOG</div></div>
        </div>
        <div className="sect-head"><h3>Hobbs by aircraft</h3></div>
        <table className="dt"><thead><tr><th>Tail</th><th>Model</th><th className="right">Hobbs</th><th className="right">Last flight</th><th className="right">Δ · 7d</th><th>Until next insp.</th><th>Utilization</th></tr></thead><tbody>
          {AIRCRAFT.map((a, i) => {
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
      <table className="dt"><thead><tr><th>Tail</th><th>Model</th><th className="right">Hobbs</th><th>Next Inspection</th><th>Status</th><th className="right">Today</th><th></th></tr></thead><tbody>
        {AIRCRAFT.map(a => {
          const today = INITIAL_BOOKINGS.filter(b => b.tail === a.tail).length
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
              <td className="right"><button className="btn-ghost">Open ›</button></td>
            </tr>
          )
        })}
      </tbody></table>
    </div>
  )
}

export function StudentsView() {
  return (
    <div className="view-pad">
      <table className="dt"><thead><tr><th>ID</th><th>Name</th><th>Phase</th><th>Progress</th><th className="right">Balance</th><th>Last lesson</th><th>Status</th></tr></thead><tbody>
        {STUDENTS.map(s => (
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
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

export function IntegrityView({ alerts, onResolve }: { alerts: AlertRow[]; onResolve: (id: string) => void }) {
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

export function RequestsView({ onConvert }: { onConvert: (r: typeof SLOT_REQUESTS[number]) => void }) {
  return (
    <div className="view-pad">
      <table className="dt"><thead><tr><th>ID</th><th>Student</th><th>Lesson</th><th>Preferred</th><th>Alt</th><th>CFI</th><th className="right">Age</th><th></th></tr></thead><tbody>
        {SLOT_REQUESTS.map(r => {
          const cfi = INSTRUCTORS.find(c => c.id === r.cfiPref) || null
          return (
            <tr key={r.id}>
              <td className="mono">{r.id}</td>
              <td className="strong">{r.student}</td>
              <td className="dim">{r.lesson}</td>
              <td className="mono">{r.preferred}</td>
              <td className="mono dim">{r.alt}</td>
              <td>{cfi ? <span className="cfi-chip"><Avatar cfi={cfi} /> {cfi.name}</span> : <span className="dim">any</span>}</td>
              <td className={`right mono ${r.ageH > 48 ? 'warn' : 'dim'}`}>{r.ageH}h</td>
              <td className="right">
                <button className="btn-ghost">Decline</button>
                <button className="btn-primary" onClick={() => onConvert(r)}>Approve ›</button>
              </td>
            </tr>
          )
        })}
      </tbody></table>
    </div>
  )
}

export function DispatchView() {
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
                <button className="btn-ghost">Brief</button>
                <button className="btn-primary">{d.eta === 'In flight' ? 'Close out' : 'Launch ›'}</button>
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

export function SyllabusView() {
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

export function PayoutsView() {
  const total = PAYOUTS.reduce((s, p) => s + p.amount, 0)
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

export function ExpensesView() {
  const total = EXPENSES.reduce((s, e) => s + e.amount, 0)
  const byCat: Record<string, number> = {}
  EXPENSES.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount })
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
            <td className="right"><button className="btn-ghost">Receipt</button></td>
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
