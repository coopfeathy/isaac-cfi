'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { I, Badge, Avatar, StatusLights } from './primitives'
import { TREE, VIEW_META, AIRCRAFT, INSTRUCTORS, STUDENTS, STATUS, TICKS, type TreeNodeData } from './data'

type Booking = {
  id: string; tail: string; start: number; end: number; student: string;
  cfi: string | null; lesson: string; status: string; paid: boolean | null;
}
type AlertRow = { id: string; sev: string; code: string; msg: string; ts: string; resolved: boolean }

export type Filters = {
  status: string[]
  aircraft: string[]
  cfi: string[]
  paid: boolean | null
}
export const EMPTY_FILTERS: Filters = { status: [], aircraft: [], cfi: [], paid: null }
export const filterActiveCount = (f: Filters) =>
  f.status.length + f.aircraft.length + f.cfi.length + (f.paid !== null ? 1 : 0)

function FilterPanel({ filters, setFilters, onClose }: {
  filters: Filters; setFilters: (updater: (f: Filters) => Filters) => void; onClose: () => void;
}) {
  const STATUSES: { k: string; label: string; color: string }[] = [
    { k: 'booked',    label: 'Booked',     color: 'var(--accent)' },
    { k: 'in_flight', label: 'In flight',  color: 'var(--teal-1)' },
    { k: 'completed', label: 'Completed',  color: 'var(--fg-2)' },
    { k: 'pending',   label: 'Pending',    color: 'var(--violet-1)' },
    { k: 'maint',     label: 'Maint',      color: 'var(--amber-1)' },
    { k: 'aog',       label: 'AOG',        color: 'var(--red-1)' },
  ]
  const toggle = (key: 'status' | 'aircraft' | 'cfi', v: string) => setFilters(f => ({
    ...f,
    [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v],
  }))
  const reset = () => setFilters(() => EMPTY_FILTERS)
  const total = filterActiveCount(filters)
  return (
    <div className="filter-pop" onClick={e => e.stopPropagation()}>
      <div className="filter-head">
        <span className="filter-title mono">FILTERS</span>
        <button className="btn-ghost icon" onClick={onClose}><I name="x-oct" /></button>
      </div>
      <div className="filter-body">
        <div className="fp-group">
          <div className="fp-label mono">Status</div>
          <div className="fp-chips">
            {STATUSES.map(s => (
              <button key={s.k} className={`fp-chip ${filters.status.includes(s.k) ? 'act' : ''}`} onClick={() => toggle('status', s.k)}>
                <span className="dot" style={{ background: s.color }} />{s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="fp-group">
          <div className="fp-label mono">Aircraft</div>
          <div className="fp-chips">
            {AIRCRAFT.map(a => (
              <button key={a.tail} className={`fp-chip mono ${filters.aircraft.includes(a.tail) ? 'act' : ''}`} onClick={() => toggle('aircraft', a.tail)}>{a.tail}</button>
            ))}
          </div>
        </div>
        <div className="fp-group">
          <div className="fp-label mono">Instructor</div>
          <div className="fp-chips">
            {INSTRUCTORS.map(c => (
              <button key={c.id} className={`fp-chip ${filters.cfi.includes(c.id) ? 'act' : ''}`} onClick={() => toggle('cfi', c.id)}>{c.name}</button>
            ))}
          </div>
        </div>
        <div className="fp-group">
          <div className="fp-label mono">Payment</div>
          <div className="fp-chips">
            <button className={`fp-chip ${filters.paid === true ? 'act' : ''}`} onClick={() => setFilters(f => ({ ...f, paid: f.paid === true ? null : true }))}>Paid</button>
            <button className={`fp-chip ${filters.paid === false ? 'act' : ''}`} onClick={() => setFilters(f => ({ ...f, paid: f.paid === false ? null : false }))}>Unpaid</button>
          </div>
        </div>
      </div>
      <div className="fp-foot">
        <span className="count mono">{total} active</span>
        <button className="btn-ghost" onClick={reset}>Reset</button>
      </div>
    </div>
  )
}

function TreeNode({ node, depth, selected, onSelect, expanded, toggleExpand }: {
  node: TreeNodeData; depth: number; selected: string | null;
  onSelect: (n: TreeNodeData) => void;
  expanded: Record<string, boolean>;
  toggleExpand: (id: string) => void;
}) {
  const hasChildren = !!(node.children && node.children.length > 0)
  const isOpen = expanded[node.id] ?? node.open ?? false
  const isSelected = selected === node.id
  const ico = node.kind === 'aircraft' ? 'plane'
    : node.kind === 'student' ? 'user'
    : node.id === 'schedule' ? 'cal'
    : node.id === 'syllabus' ? 'book'
    : node.id === 'billing' || node.id === 'payouts' || node.id === 'expenses' ? 'wallet'
    : node.id === 'integrity' ? 'alert'
    : 'dot'
  return (
    <div className="tree-node">
      <div
        className={`tree-row ${isSelected ? 'sel' : ''}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => { if (hasChildren) toggleExpand(node.id); onSelect(node) }}
      >
        <span className="tree-chev">{hasChildren ? <I name={isOpen ? 'chev-d' : 'chev-r'} /> : <span style={{ width: 12, display: 'inline-block' }} />}</span>
        <span className="tree-ico"><I name={ico} /></span>
        <span className="tree-label">{node.label}</span>
        {node.sub && <span className="tree-sub">{node.sub}</span>}
        {node.badge && <Badge kind={node.badgeKind || 'muted'}>{node.badge}</Badge>}
        {node.count != null && !node.badge && <span className="tree-count">{node.count}</span>}
      </div>
      {hasChildren && isOpen && (
        <div className="tree-children">
          {node.children!.map(ch => (
            <TreeNode key={ch.id} node={ch} depth={depth + 1} selected={selected} onSelect={onSelect} expanded={expanded} toggleExpand={toggleExpand} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ selected, onSelect, filters, setFilters, onSync }: {
  selected: string | null;
  onSelect: (n: TreeNodeData) => void;
  filters: Filters;
  setFilters: (updater: (f: Filters) => Filters) => void;
  onSync: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [q, setQ] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const activeCount = filterActiveCount(filters)
  const toggleExpand = (id: string) => setExpanded(e => ({
    ...e,
    [id]: e[id] == null ? !(TREE.find(n => n.id === id)?.open) : !e[id],
  }))
  const filtered = useMemo(() => {
    if (!q) return TREE
    const ql = q.toLowerCase()
    return TREE
      .map(g => ({ ...g, children: (g.children || []).filter(c => c.label.toLowerCase().includes(ql) || (c.sub || '').toLowerCase().includes(ql)) }))
      .filter(g => g.children.length > 0)
  }, [q])
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="sb-brand">
          <img src="/merlin-logo.png" className="sb-logo" alt="Merlin Flight Training" />
          <div className="sb-brand-text">
            <div className="sb-brand-name">MERLIN</div>
            <div className="sb-brand-tag mono">FLIGHT TRAINING</div>
          </div>
        </div>
        <div className="sidebar-sub">KMHR · Mather Field · Ops Console</div>
      </div>
      <div className="sidebar-search">
        <I name="search" />
        <input type="text" placeholder="Search fleet, students, bookings…" value={q} onChange={e => setQ(e.target.value)} />
        <kbd>⌘K</kbd>
      </div>
      <div className="sidebar-actions">
        <button className={`btn-ghost ${showFilter ? 'act' : ''}`} onClick={() => setShowFilter(s => !s)}>
          <I name="filter" /> Filter
          {activeCount > 0 && <span className="mono dim" style={{ marginLeft: 4 }}>· {activeCount}</span>}
        </button>
        <button className="btn-ghost" onClick={onSync}><I name="refresh" /> Sync</button>
        {showFilter && <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilter(false)} />}
      </div>
      <nav className="tree">
        {filtered.length === 0 && <div className="tree-empty mono dim">no matches</div>}
        {filtered.map(n => (
          <TreeNode key={n.id} node={n} depth={0} selected={selected} onSelect={onSelect} expanded={expanded} toggleExpand={toggleExpand} />
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="foot-row"><span className="foot-k">Session</span><span className="foot-v mono">isaac@merlin.cfi</span></div>
        <div className="foot-row"><span className="foot-k">Region</span><span className="foot-v mono">us-west-2</span></div>
        <div className="foot-row"><span className="foot-k">Build</span><span className="foot-v mono">v2.14.0 · main@a8f2c1e</span></div>
      </div>
    </aside>
  )
}

export function TopBar({ view, theme, onToggleTheme }: { view: string; theme: string; onToggleTheme: () => void }) {
  const title = VIEW_META[view]?.title || 'Ops Console'
  return (
    <header className="topbar">
      <div className="tb-brand">
        <img src="/merlin-logo.png" className="tb-logo" alt="Merlin" />
        <span className="tb-wordmark">MERLIN</span>
        <span className="tb-wordmark-sub mono">· OPS</span>
      </div>
      <div className="tb-path">
        <span className="mono">workspace / merlin-prod /</span> <b>{title}</b>
      </div>
      <div className="tb-right">
        <StatusLights />
        <span className="env-pill">PROD · us-west-2</span>
        <span className="mono tb-time">22 Apr 2026 · 09:30 PDT</span>
        <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">
          <I name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button className="icon-btn" title="Notifications"><I name="bell" /></button>
        <span className="avatar avatar-blue">IM</span>
      </div>
    </header>
  )
}

export function IconRail({ view, onView }: { view: string; onView: (v: string) => void }) {
  const items = [
    { k: 'home',     ico: 'home',   view: 'schedule',  title: 'Schedule' },
    { k: 'fleet',    ico: 'plane',  view: 'fleet',     title: 'Fleet' },
    { k: 'students', ico: 'users',  view: 'students',  title: 'Students' },
    { k: 'syllabus', ico: 'book',   view: 'syllabus',  title: 'Academy' },
    { k: 'billing',  ico: 'wallet', view: 'billing',   title: 'Finance' },
    { k: 'integ',    ico: 'alert',  view: 'integrity', title: 'Integrity' },
  ]
  return (
    <div className="icon-rail">
      {items.map(it => (
        <button key={it.k} className={`rail-btn ${view === it.view ? 'act' : ''}`} onClick={() => onView(it.view)} title={it.title}>
          <I name={it.ico} size={14} />
        </button>
      ))}
      <div className="rail-spacer" />
      <button className="rail-btn" title="Settings"><I name="settings" size={14} /></button>
    </div>
  )
}

export function DocNav({ view, draftIdx, draftCount, onPrevDraft, onNextDraft }: {
  view: string; draftIdx: number; draftCount: number; onPrevDraft: () => void; onNextDraft: () => void;
}) {
  const meta = VIEW_META[view] || { title: view, doc: '', tabs: [] }
  return (
    <div className="doc-nav">
      <div className="doc-crumbs mono">
        <span className="dim">workspace</span>
        <span className="crumb-sep">›</span>
        <span className="dim">merlin-prod</span>
        <span className="crumb-sep">›</span>
        <span>{meta.title}</span>
      </div>
      <div className="doc-draft">
        <button className="btn-ghost icon" onClick={onPrevDraft}><I name="chev-l" /></button>
        <span className="mono">Draft {draftIdx} of {draftCount}</span>
        <button className="btn-ghost icon" onClick={onNextDraft}><I name="chev-r" /></button>
      </div>
      <div className="doc-spacer" />
      <span className="doc-meta mono dim">{meta.doc}</span>
    </div>
  )
}

export function SubTabs({ view, active, onActive }: { view: string; active: number; onActive: (i: number) => void }) {
  const tabs = VIEW_META[view]?.tabs || []
  return (
    <div className="sub-tabs">
      {tabs.map((t, i) => (
        <button key={t} className={`sub-tab ${active === i ? 'act' : ''}`} onClick={() => onActive(i)}>{t}</button>
      ))}
      <div className="sub-tabs-spacer" />
      <button className="btn-ghost icon" title="More"><I name="more" /></button>
    </div>
  )
}

export function Toolbar({ zoom, onZoom, date, onNewSlot }: {
  zoom: number; onZoom: (z: number) => void; date: string; onNewSlot: () => void;
}) {
  return (
    <div className="toolbar">
      <div className="tb-date">
        <button className="btn-ghost icon">‹</button>
        <span className="mono">{date}</span>
        <button className="btn-ghost icon">›</button>
        <button className="btn-ghost">Today</button>
      </div>
      <div className="tb-divider" />
      <div className="tb-group mono dim">PDT · UTC-7</div>
      <div className="tb-spacer" />
      <div className="tb-group">
        <button className="btn-ghost icon" onClick={() => onZoom(Math.max(0.75, zoom - 0.15))}><I name="zoom-out" /></button>
        <span className="tb-zoom mono">{Math.round(zoom * 100)}%</span>
        <button className="btn-ghost icon" onClick={() => onZoom(Math.min(1.6, zoom + 0.15))}><I name="zoom-in" /></button>
      </div>
      <div className="tb-divider" />
      <button className="btn-primary" onClick={onNewSlot}><I name="plus" /> New Slot</button>
    </div>
  )
}

// ────────── Inspector ──────────
function Field({ label, value, mono = false, editable = false, onChange, kind }: {
  label: string; value: string; mono?: boolean; editable?: boolean;
  onChange?: (v: string) => void; kind?: string;
}) {
  return (
    <div className="f-row">
      <label className="f-label mono">{label}</label>
      {editable
        ? <input className={`f-input ${mono ? 'mono' : ''}`} value={value} onChange={e => onChange && onChange(e.target.value)} />
        : <div className={`f-val ${mono ? 'mono' : ''} ${kind || ''}`}>{value}</div>}
    </div>
  )
}

function SectionHead({ children }: { children: ReactNode }) {
  return <div className="ins-sect-head"><span className="mono">{children}</span></div>
}

export function Inspector({ bookings, bookingId, onClear, onEditBooking, onReassign, onCancel }: {
  bookings: Booking[]; bookingId: string | null;
  onClear: () => void;
  onEditBooking: (id: string, patch: Partial<Booking>) => void;
  onReassign: (b: Booking) => void;
  onCancel: (b: Booking) => void;
}) {
  const b = bookings.find(x => x.id === bookingId)
  if (!b) {
    return (
      <aside className="inspector">
        <div className="ins-head">
          <span className="mono">INSPECTOR</span>
          <span className="mono dim">— no selection —</span>
        </div>
        <div className="ins-empty">
          <div className="empty-state">
            <div className="empty-ico"><I name="square" size={22} /></div>
            <div className="empty-title">Select a booking</div>
            <div className="empty-sub mono dim">Click any block on the schedule board to inspect or edit.</div>
          </div>
          <div className="shortcut-hints mono">
            <div><kbd>j</kbd> / <kbd>k</kbd> next / prev booking</div>
            <div><kbd>Esc</kbd> clear selection</div>
            <div><kbd>N</kbd> new slot</div>
          </div>
        </div>
      </aside>
    )
  }
  const ac = AIRCRAFT.find(a => a.tail === b.tail)
  const cfi = INSTRUCTORS.find(c => c.id === b.cfi)
  const stu = STUDENTS.find(s => s.name === b.student)
  const s = STATUS[b.status]
  const parseT = (str: string) => {
    const [h, m] = str.split(':').map(Number)
    return (h * 60 + m - 7 * 60) / 30
  }
  return (
    <aside className="inspector">
      <div className="ins-head">
        <span className="mono">INSPECTOR · BOOKING</span>
        <button className="btn-ghost icon" onClick={onClear} title="Clear (Esc)"><I name="x-oct" /></button>
      </div>
      <div className="ins-hero">
        <div className="hero-id mono">{b.id}</div>
        <div className="hero-title">{b.student}</div>
        <div className="hero-sub mono dim">{b.lesson}</div>
        <div className="hero-chips">
          <span className="chip" style={{ background: s.fill, borderColor: s.stroke, color: s.text }}>
            <span className="chip-dot" style={{ background: s.stroke }} />{s.label}
          </span>
          <span className="chip chip-muted mono">{b.paid ? 'PAID' : 'UNPAID'}</span>
        </div>
      </div>
      <SectionHead>SCHEDULE</SectionHead>
      <Field label="Aircraft" value={b.tail} mono />
      <Field label="Model" value={ac?.model || '—'} />
      <Field label="Date" value="2026-04-22" mono />
      <Field
        label="Start"
        value={TICKS[b.start]}
        mono
        editable
        onChange={v => { const t = parseT(v); if (!isNaN(t) && t >= 0 && t < b.end) onEditBooking(b.id, { start: Math.round(t) }) }}
      />
      <Field
        label="End"
        value={TICKS[b.end]}
        mono
        editable
        onChange={v => { const t = parseT(v); if (!isNaN(t) && t > b.start && t <= 24) onEditBooking(b.id, { end: Math.round(t) }) }}
      />
      <Field label="Duration" value={`${((b.end - b.start) * 0.5).toFixed(1)} h`} mono />
      <SectionHead>PARTIES</SectionHead>
      <Field label="Student" value={b.student} />
      <Field label="Student ID" value={stu?.id || '—'} mono />
      <Field label="Instructor" value={cfi ? `${cfi.name} (${cfi.ratings.join('/')})` : '—'} />
      <Field label="CFI ID" value={cfi?.id || '—'} mono />
      <SectionHead>BILLING</SectionHead>
      <Field label="Rate" value="$215.00 / hr" mono />
      <Field label="Est. total" value={`$${(215 * (b.end - b.start) * 0.5).toFixed(2)}`} mono />
      <Field label="Invoice" value={b.paid ? 'INV-7712 · paid' : 'INV-7718 · open'} mono kind={b.paid ? 'pos' : 'warn'} />
      <Field label="Deposit" value={b.paid ? '$100.00' : '—'} mono />
      <SectionHead>SYSTEM</SectionHead>
      <Field label="Source" value="web · booking flow" mono />
      <Field label="Created" value="2026-04-18 14:22 PDT" mono />
      <Field label="CalDAV" value="synced · iCloud" mono kind="pos" />
      <Field label="Stripe" value={b.paid ? 'pi_3Oq…xR7' : '—'} mono />
      <div className="ins-actions">
        <button className="btn-ghost" onClick={() => onReassign(b)}>Reassign</button>
        <button className="btn-ghost" onClick={() => onCancel(b)}>Cancel</button>
        <button className="btn-primary"><I name="check" /> Saved</button>
      </div>
    </aside>
  )
}

// ────────── Ops Pulse ──────────
export function OpsPulse({ alerts, bookings, onSelBooking, onJumpView }: {
  alerts: AlertRow[]; bookings: Booking[];
  onSelBooking: (id: string) => void; onJumpView: (v: string) => void;
}) {
  const inFlight = bookings.filter(b => b.status === 'in_flight')
  const nextUp = bookings
    .filter(b => b.status === 'booked' && b.start >= 5 && b.start <= 10)
    .sort((a, b) => a.start - b.start)
    .slice(0, 3)
  const openAlerts = alerts.filter(a => !a.resolved)
  const errorCt = openAlerts.filter(a => a.sev === 'error').length
  const warnCt = openAlerts.filter(a => a.sev === 'warn').length

  const actions = [
    { kind: 'error', label: 'N219MF AOG · reassign 3 bookings for 24 Apr', view: 'integrity' },
    { kind: 'warn',  label: 'INV-7709 overdue · Sofia Haddad · $645.00',   view: 'billing' },
    { kind: 'warn',  label: 'SR-2214 stale >48h · L. Petrov',               view: 'requests' },
    { kind: 'info',  label: 'ONB-044 ready for first lesson · assign CFI',  view: 'onboarding' },
  ]

  return (
    <div className="timeline pulse">
      <div className="pulse-head">
        <span className="mono pulse-title">OPS PULSE</span>
        <span className="mono dim">LIVE · 09:30 PDT</span>
        <span className="pulse-health">
          <span className="sl sl-green" /><span className="mono dim">{5 - errorCt}/5 AIRCRAFT</span>
          <span className="pulse-sep">·</span>
          <span className="mono"><b className={errorCt ? 'neg' : 'dim'}>{errorCt}</b> ERR</span>
          <span className="mono"><b className={warnCt ? 'warn' : 'dim'}>{warnCt}</b> WRN</span>
        </span>
        <span className="pulse-right mono dim">KMHR · VFR · 240°/08 · 10SM · 18°C</span>
      </div>
      <div className="pulse-body">
        <div className="pulse-col">
          <div className="pulse-col-h mono">AIRBORNE · {inFlight.length}</div>
          {inFlight.length === 0 && <div className="pulse-empty mono dim">— no aircraft in flight —</div>}
          {inFlight.map(b => {
            const cfi = INSTRUCTORS.find(c => c.id === b.cfi) || null
            const eta = TICKS[b.end]
            const elapsed = (5 - b.start) * 30
            const totalMin = (b.end - b.start) * 30
            const pct = Math.min(100, Math.max(0, (elapsed / totalMin) * 100))
            return (
              <div key={b.id} className="pulse-flight" onClick={() => onSelBooking(b.id)}>
                <div className="pf-head">
                  <span className="mono pf-tail">{b.tail}</span>
                  <Avatar cfi={cfi} size={16} />
                  <span className="pf-student">{b.student}</span>
                  <span className="pf-eta mono">ETA {eta}</span>
                </div>
                <div className="pf-lesson mono dim">{b.lesson}</div>
                <div className="pf-progress"><div className="pf-progress-fill" style={{ width: `${pct}%` }} /></div>
              </div>
            )
          })}
        </div>

        <div className="pulse-col">
          <div className="pulse-col-h mono">NEXT DEPARTURES · 2H</div>
          {nextUp.length === 0 && <div className="pulse-empty mono dim">— no departures in window —</div>}
          {nextUp.map(b => {
            const cfi = INSTRUCTORS.find(c => c.id === b.cfi)
            const start = TICKS[b.start]
            const minsOut = (b.start - 5) * 30
            return (
              <div key={b.id} className="pulse-dep" onClick={() => onSelBooking(b.id)}>
                <div className="pd-time">
                  <span className="pd-clock mono">{start}</span>
                  <span className="pd-tminus mono dim">T-{minsOut}m</span>
                </div>
                <div className="pd-main">
                  <div className="pd-line1">
                    <span className="mono pd-tail">{b.tail}</span>
                    <span className="pd-student">{b.student}</span>
                  </div>
                  <div className="pd-line2 mono dim">
                    {cfi?.initials || '—'} · {b.lesson}
                  </div>
                </div>
                {!b.paid && <Badge kind="warn">UNPAID</Badge>}
              </div>
            )
          })}
        </div>

        <div className="pulse-col">
          <div className="pulse-col-h mono">NEEDS ATTENTION · {actions.length}</div>
          {actions.map((a, i) => (
            <div key={i} className={`pulse-action pa-${a.kind}`} onClick={() => onJumpView(a.view)}>
              <span className="pa-dot" />
              <span className="pa-label">{a.label}</span>
              <I name="chev-r" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
