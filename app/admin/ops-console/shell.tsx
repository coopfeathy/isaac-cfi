'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { I, Badge, Avatar, StatusLights } from './primitives'
import { TREE, VIEW_META, AIRCRAFT, INSTRUCTORS, STUDENTS, STATUS, TICKS, type TreeNodeData } from './data'

type Booking = {
  id: string; code?: string; tail: string; start: number; end: number; student: string;
  studentId?: string | null; aircraftId?: string | null;
  cfi: string | null; cfiInitials?: string | null; lesson: string; status: string; paid: boolean | null;
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

// ────────── Live clock + region ──────────
// Ticks every 15s so the header clock feels live without wasting renders.
// Returns `null` on the first render (SSR) so the text doesn't mismatch between
// server and client; callers show a stable fallback until mount.
export function useNow(intervalMs = 15_000): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

// Best-effort map from IANA timezone → AWS-style region code. Falls back to
// `us-west-2` so the UI keeps showing something sensible if the browser
// returns a zone we don't know.
function regionFromTimeZone(tz: string): string {
  const t = tz.toLowerCase()
  if (t.startsWith('america/')) {
    if (t.includes('new_york') || t.includes('detroit') || t.includes('toronto') || t.includes('montreal') || t.includes('indianapolis')) return 'us-east-1'
    if (t.includes('chicago') || t.includes('mexico_city') || t.includes('winnipeg') || t.includes('regina')) return 'us-east-2'
    if (t.includes('denver') || t.includes('edmonton') || t.includes('boise')) return 'us-west-1'
    if (t.includes('los_angeles') || t.includes('vancouver') || t.includes('tijuana') || t.includes('phoenix')) return 'us-west-2'
    if (t.includes('anchorage') || t.includes('juneau')) return 'us-west-2'
    return 'us-west-2'
  }
  if (t.startsWith('europe/')) {
    if (t.includes('london') || t.includes('dublin') || t.includes('lisbon')) return 'eu-west-1'
    return 'eu-central-1'
  }
  if (t.startsWith('asia/')) {
    if (t.includes('tokyo')) return 'ap-northeast-1'
    if (t.includes('singapore') || t.includes('kuala_lumpur')) return 'ap-southeast-1'
    return 'ap-southeast-1'
  }
  if (t.startsWith('australia/')) return 'ap-southeast-2'
  return 'us-west-2'
}

function useLocale() {
  const [locale, setLocale] = useState<{ tz: string; region: string } | null>(null)
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    setLocale({ tz, region: regionFromTimeZone(tz) })
  }, [])
  return locale
}

function formatClock(now: Date, tz: string): string {
  // Build "22 Apr 2026 · 09:30 PDT" in the user's local timezone.
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, day: '2-digit', month: 'short', year: 'numeric',
  }).formatToParts(now)
  const day = dateParts.find(p => p.type === 'day')?.value ?? ''
  const mon = dateParts.find(p => p.type === 'month')?.value ?? ''
  const yr  = dateParts.find(p => p.type === 'year')?.value ?? ''
  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short',
  }).formatToParts(now)
  const hh = timeParts.find(p => p.type === 'hour')?.value ?? ''
  const mm = timeParts.find(p => p.type === 'minute')?.value ?? ''
  const zone = timeParts.find(p => p.type === 'timeZoneName')?.value ?? ''
  return `${day} ${mon} ${yr} · ${hh}:${mm} ${zone}`
}

function formatTimeShort(now: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short',
  }).formatToParts(now)
  const hh = parts.find(p => p.type === 'hour')?.value ?? ''
  const mm = parts.find(p => p.type === 'minute')?.value ?? ''
  const zone = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
  return `${hh}:${mm} ${zone}`
}

// ────────── Nearest-airport detection ──────────
// A small curated list of US GA/training airports with their lat/lng. This
// powers the default ICAO used for weather etc. when the user allows
// geolocation; otherwise we fall back to a timezone-based guess, and
// ultimately to KPNE (the home base).
const AIRPORTS: Array<{ icao: string; lat: number; lng: number }> = [
  { icao: 'KPNE', lat: 40.0819, lng: -75.0106 }, // Northeast Philadelphia
  { icao: 'KTEB', lat: 40.8501, lng: -74.0608 }, // Teterboro
  { icao: 'KHPN', lat: 41.0670, lng: -73.7076 }, // Westchester County
  { icao: 'KFRG', lat: 40.7288, lng: -73.4134 }, // Republic
  { icao: 'KBED', lat: 42.4700, lng: -71.2890 }, // Hanscom Field
  { icao: 'KMHT', lat: 42.9326, lng: -71.4357 }, // Manchester NH
  { icao: 'KBWI', lat: 39.1754, lng: -76.6683 },
  { icao: 'KIAD', lat: 38.9531, lng: -77.4565 },
  { icao: 'KRDU', lat: 35.8776, lng: -78.7875 },
  { icao: 'KCLT', lat: 35.2140, lng: -80.9431 },
  { icao: 'KATL', lat: 33.6407, lng: -84.4277 },
  { icao: 'KPDK', lat: 33.8756, lng: -84.3020 }, // Atlanta DeKalb-Peachtree
  { icao: 'KMCO', lat: 28.4312, lng: -81.3081 },
  { icao: 'KMIA', lat: 25.7959, lng: -80.2870 },
  { icao: 'KTPA', lat: 27.9755, lng: -82.5332 },
  { icao: 'KDPA', lat: 41.9078, lng: -88.2485 }, // Chicago DuPage
  { icao: 'KPWK', lat: 42.1142, lng: -87.9015 }, // Chicago Exec
  { icao: 'KORD', lat: 41.9742, lng: -87.9073 },
  { icao: 'KMSP', lat: 44.8848, lng: -93.2223 },
  { icao: 'KSTL', lat: 38.7487, lng: -90.3700 },
  { icao: 'KAPA', lat: 39.5701, lng: -104.8493 }, // Denver Centennial
  { icao: 'KDEN', lat: 39.8561, lng: -104.6737 },
  { icao: 'KSDL', lat: 33.6229, lng: -111.9108 }, // Scottsdale
  { icao: 'KPHX', lat: 33.4343, lng: -112.0116 },
  { icao: 'KLAS', lat: 36.0800, lng: -115.1522 },
  { icao: 'KVNY', lat: 34.2098, lng: -118.4900 }, // Van Nuys
  { icao: 'KSMO', lat: 34.0158, lng: -118.4513 }, // Santa Monica
  { icao: 'KLAX', lat: 33.9416, lng: -118.4085 },
  { icao: 'KSJC', lat: 37.3626, lng: -121.9290 },
  { icao: 'KPAO', lat: 37.4611, lng: -122.1150 }, // Palo Alto
  { icao: 'KRHV', lat: 37.3329, lng: -121.8197 }, // Reid-Hillview
  { icao: 'KOAK', lat: 37.7213, lng: -122.2207 },
  { icao: 'KSFO', lat: 37.6189, lng: -122.3750 },
  { icao: 'KPDX', lat: 45.5887, lng: -122.5975 },
  { icao: 'KSEA', lat: 47.4502, lng: -122.3088 },
  { icao: 'KBFI', lat: 47.5300, lng: -122.3020 }, // Boeing Field
  { icao: 'KMHR', lat: 38.5539, lng: -121.2975 }, // Sacramento Mather
  { icao: 'KSAC', lat: 38.5125, lng: -121.4929 },
  { icao: 'KDFW', lat: 32.8998, lng: -97.0403 },
  { icao: 'KHOU', lat: 29.6454, lng: -95.2789 },
  { icao: 'KADS', lat: 32.9684, lng: -96.8356 }, // Dallas Addison
]

// Haversine distance in kilometers (we only need "which is smallest", but
// proper km keeps the math readable and is cheap).
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function nearestIcao(lat: number, lng: number): string {
  let best = AIRPORTS[0]
  let bestD = haversineKm(lat, lng, best.lat, best.lng)
  for (let i = 1; i < AIRPORTS.length; i++) {
    const d = haversineKm(lat, lng, AIRPORTS[i].lat, AIRPORTS[i].lng)
    if (d < bestD) { best = AIRPORTS[i]; bestD = d }
  }
  return best.icao
}

// Rough fallback when geolocation is denied: map the browser's IANA timezone
// to a reasonable regional training airport. Ultimately falls back to KPNE
// so the UI always has something to show.
function icaoFromTimeZone(tz: string): string {
  const t = tz.toLowerCase()
  if (t.includes('new_york') || t.includes('toronto') || t.includes('montreal')) return 'KPNE'
  if (t.includes('chicago') || t.includes('winnipeg')) return 'KPWK'
  if (t.includes('denver') || t.includes('edmonton') || t.includes('boise')) return 'KAPA'
  if (t.includes('los_angeles') || t.includes('vancouver') || t.includes('tijuana')) return 'KVNY'
  if (t.includes('phoenix')) return 'KSDL'
  if (t.includes('anchorage')) return 'PANC'
  if (t.includes('honolulu')) return 'PHNL'
  return 'KPNE'
}

// Returns the user's nearest airport ICAO. Tries browser geolocation first
// (quick timeout; no retry), then falls back to timezone-based guess. The
// result is cached in localStorage so we don't re-prompt on every load.
export function useNearestAirport(fallback = 'KPNE'): string {
  const [icao, setIcao] = useState<string>(fallback)
  useEffect(() => {
    // Cache check.
    try {
      const cached = localStorage.getItem('ops-console:nearest-icao')
      if (cached) { setIcao(cached); }
    } catch { /* ignore */ }

    // Always refresh in the background so stale cache self-heals.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const tzGuess = icaoFromTimeZone(tz)
    if (!navigator.geolocation) {
      setIcao(prev => prev || tzGuess)
      try { localStorage.setItem('ops-console:nearest-icao', tzGuess) } catch {}
      return
    }
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return
        const found = nearestIcao(pos.coords.latitude, pos.coords.longitude)
        setIcao(found)
        try { localStorage.setItem('ops-console:nearest-icao', found) } catch {}
      },
      () => {
        if (cancelled) return
        // Permission denied or error — use timezone guess.
        setIcao(prev => prev && prev !== fallback ? prev : tzGuess)
        try { localStorage.setItem('ops-console:nearest-icao', tzGuess) } catch {}
      },
      { timeout: 5000, maximumAge: 24 * 60 * 60 * 1000 },
    )
    return () => { cancelled = true }
  }, [fallback])
  return icao
}

// ────────── Live METAR weather (NOAA Aviation Weather Center) ──────────
// Polls the public AWC JSON endpoint every ~10 minutes. The endpoint supports
// CORS, so we can call it straight from the browser.
type Metar = {
  station: string
  flightCategory: string | null
  windDir: number | 'VRB' | null
  windSpd: number | null
  visibility: string | null
  tempC: number | null
}

export function useMetar(icao: string, intervalMs = 10 * 60 * 1000): Metar | null {
  const [metar, setMetar] = useState<Metar | null>(null)
  useEffect(() => {
    let cancelled = false
    setMetar(null) // reset when the station changes so stale data doesn't linger
    const load = async () => {
      try {
        // Go through our own API route — calling aviationweather.gov directly
        // from the browser can hit CORS/corporate-network issues. Our proxy
        // normalizes the response and attaches a short cache-control.
        const res = await fetch(`/api/metar?icao=${encodeURIComponent(icao)}`, { cache: 'no-store' })
        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.warn('[metar] proxy returned', res.status, 'for', icao)
          return
        }
        const data = await res.json()
        if (cancelled) return
        if (!Array.isArray(data) || data.length === 0) {
          // eslint-disable-next-line no-console
          console.warn('[metar] empty payload for', icao)
          return
        }
        const d = data[0] as Record<string, unknown>
        const wdirRaw = d.wdir
        const wdir: number | 'VRB' | null =
          typeof wdirRaw === 'number' ? wdirRaw : wdirRaw === 'VRB' ? 'VRB' : null
        setMetar({
          station: typeof d.icaoId === 'string' ? d.icaoId : icao,
          flightCategory: typeof d.fltCat === 'string' ? d.fltCat : null,
          windDir: wdir,
          windSpd: typeof d.wspd === 'number' ? d.wspd : null,
          visibility:
            typeof d.visib === 'string' ? d.visib :
            typeof d.visib === 'number' ? String(d.visib) : null,
          tempC: typeof d.temp === 'number' ? d.temp : null,
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[metar] fetch failed:', err)
      }
    }
    load()
    const id = setInterval(load, intervalMs)
    return () => { cancelled = true; clearInterval(id) }
  }, [icao, intervalMs])
  return metar
}

export function formatMetar(m: Metar | null, fallbackIcao: string): string {
  if (!m) return `${fallbackIcao} · —`
  const parts: string[] = [m.station]
  if (m.flightCategory) parts.push(m.flightCategory)
  if (m.windDir != null && m.windSpd != null) {
    const dir = m.windDir === 'VRB' ? 'VRB' : String(m.windDir).padStart(3, '0')
    parts.push(`${dir}°/${String(m.windSpd).padStart(2, '0')}`)
  }
  if (m.visibility) parts.push(`${m.visibility}SM`)
  if (m.tempC != null) parts.push(`${Math.round(m.tempC)}°C`)
  return parts.join(' · ')
}

function FilterPanel({ filters, setFilters, onClose, aircraft, instructors }: {
  filters: Filters; setFilters: (updater: (f: Filters) => Filters) => void; onClose: () => void;
  // Live fleet + instructor lists (DB-backed). Falls back to the seed arrays if
  // not provided so the filter chips always render something sensible even
  // before the first Supabase fetch resolves.
  aircraft?: Array<{ tail: string }>;
  instructors?: Array<{ id: string; name: string }>;
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
  const acList = (aircraft && aircraft.length > 0) ? aircraft : AIRCRAFT
  const cfiList = (instructors && instructors.length > 0) ? instructors : INSTRUCTORS
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
            {acList.map(a => (
              <button key={a.tail} className={`fp-chip mono ${filters.aircraft.includes(a.tail) ? 'act' : ''}`} onClick={() => toggle('aircraft', a.tail)}>{a.tail}</button>
            ))}
          </div>
        </div>
        <div className="fp-group">
          <div className="fp-label mono">Instructor</div>
          <div className="fp-chips">
            {cfiList.map(c => (
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
  const isLink = node.kind === 'link' && !!node.href
  const ico = node.kind === 'aircraft' ? 'plane'
    : node.kind === 'student' ? 'user'
    : node.kind === 'link' ? 'chev-r'
    : node.id === 'schedule' ? 'cal'
    : node.id === 'syllabus' ? 'book'
    : node.id === 'billing' || node.id === 'payouts' || node.id === 'expenses' ? 'wallet'
    : node.id === 'integrity' ? 'alert'
    : 'dot'
  const rowInner = (
    <>
      <span className="tree-chev">{hasChildren ? <I name={isOpen ? 'chev-d' : 'chev-r'} /> : <span style={{ width: 12, display: 'inline-block' }} />}</span>
      <span className="tree-ico"><I name={ico} /></span>
      <span className="tree-label">{node.label}</span>
      {node.sub && <span className="tree-sub">{node.sub}</span>}
      {node.badge && <Badge kind={node.badgeKind || 'muted'}>{node.badge}</Badge>}
      {node.count != null && !node.badge && <span className="tree-count">{node.count}</span>}
    </>
  )
  return (
    <div className="tree-node">
      {isLink ? (
        <Link
          href={node.href!}
          className={`tree-row tree-row-link ${isSelected ? 'sel' : ''}`}
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          {rowInner}
        </Link>
      ) : (
        <div
          className={`tree-row ${isSelected ? 'sel' : ''}`}
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => { if (hasChildren) toggleExpand(node.id); onSelect(node) }}
        >
          {rowInner}
        </div>
      )}
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

export function Sidebar({ selected, onSelect, filters, setFilters, onSync, aircraft, students, instructors }: {
  selected: string | null;
  onSelect: (n: TreeNodeData) => void;
  filters: Filters;
  setFilters: (updater: (f: Filters) => Filters) => void;
  onSync: () => void;
  // Live fleet from the DB. The `fleet-g` group's aircraft children are rebuilt
  // from this list so the dropdown reflects exactly what's in Supabase.
  aircraft?: Array<{ tail: string; model: string; status: string }>;
  // Live student roster. Same pattern — rebuild `students-g` children from the
  // live list so newly-added students appear in the tree without reload.
  students?: Array<{ id: string; name: string; phase: string }>;
  // Live instructor directory. Threaded down into FilterPanel so the CFI filter
  // chips reflect actual instructors instead of the seed trio.
  instructors?: Array<{ id: string; name: string }>;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [q, setQ] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const activeCount = filterActiveCount(filters)
  const locale = useLocale()
  const toggleExpand = (id: string) => setExpanded(e => ({
    ...e,
    [id]: e[id] == null ? !(TREE.find(n => n.id === id)?.open) : !e[id],
  }))
  // Replace the static fleet aircraft + student children in TREE with the
  // live lists so adding/removing rows in the DB flows straight into the
  // sidebar.
  const liveTree = useMemo<TreeNodeData[]>(() => {
    const acList = aircraft ?? []
    const fleetChildren: TreeNodeData[] = acList.map(a => ({
      id: `ac_${a.tail}`,
      label: a.tail,
      sub: a.model,
      kind: 'aircraft',
      badge: a.status === 'ground' ? 'AOG' : a.status === 'squawk' ? 'SQK' : null,
      badgeKind: a.status === 'ground' ? 'error' : a.status === 'squawk' ? 'warn' : null,
    }))
    const stuList = students ?? []
    const studentChildren: TreeNodeData[] = stuList.map(s => ({
      id: s.id,
      label: s.name,
      sub: s.phase,
      kind: 'student',
    }))
    return TREE.map(n => {
      if (n.id === 'fleet-g') {
        const nonAircraft = (n.children || []).filter(c => c.kind !== 'aircraft')
        return { ...n, count: acList.length, children: [...nonAircraft, ...fleetChildren] }
      }
      if (n.id === 'students-g') {
        const nonStudent = (n.children || []).filter(c => c.kind !== 'student')
        return { ...n, count: stuList.length, children: [...nonStudent, ...studentChildren] }
      }
      return n
    })
  }, [aircraft, students])
  const filtered = useMemo(() => {
    if (!q) return liveTree
    const ql = q.toLowerCase()
    return liveTree
      .map(g => ({ ...g, children: (g.children || []).filter(c => c.label.toLowerCase().includes(ql) || (c.sub || '').toLowerCase().includes(ql)) }))
      .filter(g => g.children.length > 0)
  }, [q, liveTree])
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
        <div className="sidebar-sub">KPNE · Northeast Philadelphia · Ops Console</div>
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
        {showFilter && <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilter(false)} aircraft={aircraft} instructors={instructors} />}
      </div>
      <nav className="tree">
        {filtered.length === 0 && <div className="tree-empty mono dim">no matches</div>}
        {filtered.map(n => (
          <TreeNode key={n.id} node={n} depth={0} selected={selected} onSelect={onSelect} expanded={expanded} toggleExpand={toggleExpand} />
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="foot-row"><span className="foot-k">Session</span><span className="foot-v mono">isaac@merlin.cfi</span></div>
        <div className="foot-row"><span className="foot-k">Region</span><span className="foot-v mono">{locale?.region ?? 'us-west-2'}</span></div>
        <div className="foot-row"><span className="foot-k">Build</span><span className="foot-v mono">v2.14.0 · main@a8f2c1e</span></div>
      </div>
    </aside>
  )
}

export function TopBar({ view, theme, onToggleTheme }: { view: string; theme: string; onToggleTheme: () => void }) {
  const title = VIEW_META[view]?.title || 'Ops Console'
  const now = useNow()
  const locale = useLocale()
  const region = locale?.region ?? 'us-west-2'
  const clock = now && locale ? formatClock(now, locale.tz) : '— — —'
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
        <span className="env-pill">PROD · {region}</span>
        <span className="mono tb-time">{clock}</span>
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

export function DocNav({ view, docOverride }: { view: string; docOverride?: string }) {
  const meta = VIEW_META[view] || { title: view, doc: '', tabs: [] }
  const doc = docOverride ?? meta.doc
  return (
    <div className="doc-nav">
      <div className="doc-crumbs mono">
        <span className="dim">workspace</span>
        <span className="crumb-sep">›</span>
        <span className="dim">merlin-prod</span>
        <span className="crumb-sep">›</span>
        <span>{meta.title}</span>
      </div>
      <div className="doc-spacer" />
      <span className="doc-meta mono dim">{doc}</span>
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

export function Toolbar({ zoom, onZoom, dateLabel, onPrevDay, onNextDay, onToday, onNewSlot }: {
  zoom: number; onZoom: (z: number) => void;
  dateLabel: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onNewSlot: () => void;
}) {
  return (
    <div className="toolbar">
      <div className="tb-date">
        <button className="btn-ghost icon" onClick={onPrevDay} title="Previous day" aria-label="Previous day">‹</button>
        <span className="mono">{dateLabel}</span>
        <button className="btn-ghost icon" onClick={onNextDay} title="Next day" aria-label="Next day">›</button>
        <button className="btn-ghost" onClick={onToday}>Today</button>
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

export function Inspector({ bookings, bookingId, aircraft, instructors, students, onClear, onEditBooking, onReassign, onCancel }: {
  bookings: Booking[]; bookingId: string | null;
  aircraft?: Array<{ id?: string; tail: string; model: string; status?: string }>;
  instructors?: Array<{ id: string; name: string; initials: string }>;
  students?: Array<{ id: string; name: string }>;
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
  // Prefer live-prop lookups (Supabase-backed) with seed-data fallback so that
  // real bookings — whose UUIDs don't match the seed ids — still resolve.
  const liveAc = aircraft?.find(a => (b.aircraftId && a.id === b.aircraftId) || a.tail === b.tail)
  const ac = liveAc ?? AIRCRAFT.find(a => a.tail === b.tail)
  const liveCfi = instructors?.find(c => c.id === b.cfi)
  const cfi = liveCfi
    ? { id: liveCfi.id, name: liveCfi.name, ratings: [] as string[] }
    : INSTRUCTORS.find(c => c.id === b.cfi)
  const cfiDisplay = liveCfi
    ? liveCfi.name
    : cfi
      ? `${cfi.name}${cfi.ratings.length ? ` (${cfi.ratings.join('/')})` : ''}`
      : b.cfiInitials
        ? `CFI ${b.cfiInitials}`
        : '—'
  const liveStu = students?.find(s => (b.studentId && s.id === b.studentId) || s.name === b.student)
  const stu = liveStu ?? STUDENTS.find(s => s.name === b.student)
  const studentIdDisplay = b.studentId || stu?.id || '—'
  const cfiIdDisplay = b.cfi || cfi?.id || '—'
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
        <div className="hero-id mono">{b.code ?? b.id}</div>
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
      <Field label="Student ID" value={studentIdDisplay} mono />
      <Field label="Instructor" value={cfiDisplay} />
      <Field label="CFI ID" value={cfiIdDisplay} mono />
      <SectionHead>BILLING</SectionHead>
      <Field label="Rate" value="$215.00 / hr" mono />
      <Field label="Est. total" value={`$${(215 * (b.end - b.start) * 0.5).toFixed(2)}`} mono />
      <Field
        label="Invoice"
        value={b.paid === true ? 'INV-7712 · paid' : b.paid === false ? 'INV-7718 · open' : 'not invoiced'}
        mono
        kind={b.paid === true ? 'pos' : b.paid === false ? 'warn' : 'dim'}
      />
      <Field
        label="Deposit"
        value={b.paid === true ? '$100.00' : b.paid === false ? '$0.00' : '—'}
        mono
      />
      <SectionHead>SYSTEM</SectionHead>
      <Field label="Source" value="web · booking flow" mono />
      <Field label="Created" value="2026-04-18 14:22 PDT" mono />
      <Field label="CalDAV" value="synced · iCloud" mono kind="pos" />
      <Field
        label="Stripe"
        value={b.paid === true ? 'pi_3Oq…xR7' : b.paid === false ? 'awaiting charge' : '—'}
        mono
      />
      <div className="ins-actions">
        <button className="btn-ghost" onClick={() => onReassign(b)}>Reassign</button>
        <button className="btn-danger" onClick={() => onCancel(b)}>Cancel</button>
        <button className="btn-primary"><I name="check" /> Saved</button>
      </div>
    </aside>
  )
}

// ────────── Ops Pulse ──────────
export function OpsPulse({ alerts, bookings, aircraftCount, airportIcao = 'KPNE', onSelBooking, onJumpView }: {
  alerts: AlertRow[]; bookings: Booking[]; aircraftCount?: number; airportIcao?: string;
  onSelBooking: (id: string) => void; onJumpView: (v: string) => void;
}) {
  const now = useNow()
  const locale = useLocale()
  const liveTime = now && locale ? formatTimeShort(now, locale.tz) : '— —'
  const metar = useMetar(airportIcao)
  const weatherLine = formatMetar(metar, airportIcao)
  // Current tick index on the 07:00 → 19:00 / 30-min grid. Falls back to tick 5
  // (09:30) on first paint before `useNow` resolves, so SSR/hydration matches.
  const currentTick = useMemo(() => {
    if (!now) return 5
    const mins = now.getHours() * 60 + now.getMinutes()
    return Math.max(0, Math.min(TICKS.length - 1, (mins - 7 * 60) / 30))
  }, [now])
  const inFlight = bookings.filter(b => b.status === 'in_flight')
  const nextUp = bookings
    // Next 2 hours = 4 half-hour ticks from the real current time.
    .filter(b => b.status === 'booked' && b.start >= currentTick && b.start <= currentTick + 4)
    .sort((a, b) => a.start - b.start)
    .slice(0, 3)
  const openAlerts = alerts.filter(a => !a.resolved)
  const errorCt = openAlerts.filter(a => a.sev === 'error').length
  const warnCt = openAlerts.filter(a => a.sev === 'warn').length

  // Route an alert to whichever workspace is best suited to resolve it, based
  // on its code prefix. Everything else falls back to the Integrity view.
  const viewForAlert = (code?: string): string => {
    if (!code) return 'integrity'
    if (code.startsWith('BI-1')) return 'billing'
    if (code.startsWith('SR-') || code.startsWith('BI-118')) return 'requests'
    if (code.startsWith('ONB-')) return 'onboarding'
    if (code.startsWith('CAL-')) return 'schedule'
    return 'integrity'
  }

  // Build the "NEEDS ATTENTION" feed from live data rather than a hardcoded
  // list, so resolving an alert / paying an invoice actually removes it here.
  // Order: errors first, then unpaid active bookings, then warn/info alerts.
  const unpaidBookings = bookings.filter(b => b.paid === false && b.status !== 'cancelled')
  const actions: Array<{ kind: string; label: string; view: string }> = []
  openAlerts
    .filter(a => a.sev === 'error')
    .forEach(a => actions.push({ kind: 'error', label: a.msg || a.code, view: viewForAlert(a.code) }))
  if (unpaidBookings.length > 0) {
    const b = unpaidBookings[0]
    const extra = unpaidBookings.length > 1 ? ` (+${unpaidBookings.length - 1} more)` : ''
    actions.push({
      kind: 'warn',
      label: `${b.code || b.id} unpaid · ${b.student}${extra}`,
      view: 'billing',
    })
  }
  openAlerts
    .filter(a => a.sev === 'warn')
    .forEach(a => actions.push({ kind: 'warn', label: a.msg || a.code, view: viewForAlert(a.code) }))
  openAlerts
    .filter(a => a.sev === 'info')
    .forEach(a => actions.push({ kind: 'info', label: a.msg || a.code, view: viewForAlert(a.code) }))
  const visibleActions = actions.slice(0, 4)

  return (
    <div className="timeline pulse">
      <div className="pulse-head">
        <span className="mono pulse-title">OPS PULSE</span>
        <span className="mono dim">LIVE · {liveTime}</span>
        <span className="pulse-health">
          <span className="sl sl-green" /><span className="mono dim">{Math.max(0, (aircraftCount ?? 1) - errorCt)}/{aircraftCount ?? 1} AIRCRAFT</span>
          <span className="pulse-sep">·</span>
          <span className="mono"><b className={errorCt ? 'neg' : 'dim'}>{errorCt}</b> ERR</span>
          <span className="mono"><b className={warnCt ? 'warn' : 'dim'}>{warnCt}</b> WRN</span>
        </span>
        <span className="pulse-right mono dim">{weatherLine}</span>
      </div>
      <div className="pulse-body">
        <div className="pulse-col">
          <div className="pulse-col-h mono">AIRBORNE · {inFlight.length}</div>
          {inFlight.length === 0 && <div className="pulse-empty mono dim">— no aircraft in flight —</div>}
          {inFlight.map(b => {
            const cfi = INSTRUCTORS.find(c => c.id === b.cfi) || null
            const eta = TICKS[b.end]
            const elapsed = (currentTick - b.start) * 30
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
            const minsOut = Math.max(0, Math.round((b.start - currentTick) * 30))
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
          {visibleActions.length === 0 && <div className="pulse-empty mono dim">— all clear —</div>}
          {visibleActions.map((a, i) => (
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

export type TweakState = {
  accentHue: number
  density: 'compact' | 'default' | 'comfortable'
  dataFont: 'mono' | 'sans'
  showGrid: boolean
}

export const TWEAK_DEFAULTS: TweakState = /*EDITMODE-BEGIN*/{
  accentHue: 260,
  density: 'comfortable',
  dataFont: 'mono',
  showGrid: true,
}/*EDITMODE-END*/

export function Tweaks({ tweaks, setTweaks, theme, onToggleTheme, onClose }: {
  tweaks: TweakState
  setTweaks: (updater: (t: TweakState) => TweakState) => void
  theme: string
  onToggleTheme: () => void
  onClose: () => void
}) {
  const setK = <K extends keyof TweakState>(k: K, v: TweakState[K]) => {
    setTweaks(t => ({ ...t, [k]: v }))
    // Bridge back to the host (Edit Mode frame) so external tools see the change.
    if (window.parent !== window) {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*')
    }
  }
  return (
    <div className="tweaks">
      <div className="tweaks-head">
        <span className="tweaks-title mono">TWEAKS</span>
        <button className="btn-ghost icon" onClick={onClose}><I name="x-oct" /></button>
      </div>
      <div className="tweaks-body">
        <div className="tw-row">
          <label>Theme</label>
          <div className="tw-seg">
            <button className={theme === 'dark' ? 'act' : ''} onClick={onToggleTheme}>dark</button>
            <button className={theme === 'light' ? 'act' : ''} onClick={onToggleTheme}>light</button>
          </div>
        </div>
        <div className="tw-row">
          <label>Accent hue</label>
          <input className="tw-slider" type="range" min={0} max={360} step={5} value={tweaks.accentHue} onChange={e => setK('accentHue', +e.target.value)} />
        </div>
        <div className="tw-row">
          <label>Density</label>
          <div className="tw-seg">
            {(['compact', 'default', 'comfortable'] as const).map(d => (
              <button key={d} className={tweaks.density === d ? 'act' : ''} onClick={() => setK('density', d)}>{d}</button>
            ))}
          </div>
        </div>
        <div className="tw-row">
          <label>Data labels</label>
          <div className="tw-seg">
            <button className={tweaks.dataFont === 'mono' ? 'act' : ''} onClick={() => setK('dataFont', 'mono')}>mono</button>
            <button className={tweaks.dataFont === 'sans' ? 'act' : ''} onClick={() => setK('dataFont', 'sans')}>sans</button>
          </div>
        </div>
        <div className="tw-row">
          <label>Grid lines</label>
          <div className="tw-seg">
            <button className={tweaks.showGrid ? 'act' : ''} onClick={() => setK('showGrid', true)}>on</button>
            <button className={!tweaks.showGrid ? 'act' : ''} onClick={() => setK('showGrid', false)}>off</button>
          </div>
        </div>
      </div>
    </div>
  )
}
