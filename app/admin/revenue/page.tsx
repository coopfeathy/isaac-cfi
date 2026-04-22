'use client'

import { useEffect, useState, useReducer, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import AdminPageShell from '@/app/components/AdminPageShell'

/* ─── Types ─── */
type Tab = 'dashboard' | 'loans' | 'discovery' | 'rental' | 'supplies' | 'recurrency' | 'simulator'
type StreamKey = Exclude<Tab, 'dashboard'>

interface DbEntry {
  id: string
  stream: StreamKey
  date: string | null
  data: Record<string, string>
  created_at: string
  updated_at: string
}

interface Row {
  _id?: string          // Supabase UUID (undefined = new unsaved row)
  _dirty?: boolean      // needs save
  [key: string]: string | boolean | undefined
}

interface State {
  loans: Row[]
  discovery: Row[]
  rental: Row[]
  supplies: Row[]
  recurrency: Row[]
  simulator: Row[]
}

type Action =
  | { type: 'SET_STREAM'; stream: StreamKey; rows: Row[] }
  | { type: 'UPDATE_CELL'; stream: StreamKey; rowIdx: number; key: string; value: string }
  | { type: 'ADD_ROW'; stream: StreamKey }
  | { type: 'DELETE_ROW'; stream: StreamKey; rowIdx: number }
  | { type: 'MARK_SAVED'; stream: StreamKey; rowIdx: number; id: string }

/* ─── Constants ─── */
const APR = 0.16

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'loans', label: 'Student Loans', icon: '🎓' },
  { id: 'discovery', label: 'Discovery Flights', icon: '✈️' },
  { id: 'rental', label: 'Aircraft Rental', icon: '🛩️' },
  { id: 'supplies', label: 'Pilot Supplies', icon: '🧭' },
  { id: 'recurrency', label: 'Recurrency', icon: '🔄' },
  { id: 'simulator', label: 'Simulator', icon: '🖥️' },
]

const STREAM_KEYS: StreamKey[] = ['loans', 'discovery', 'rental', 'supplies', 'recurrency', 'simulator']

/* ─── Field shapes (for empty rows) ─── */
const EMPTY_SHAPES: Record<StreamKey, Record<string, string>> = {
  loans: { date: '', name: '', principal: '', payment: '', notes: '' },
  discovery: { date: '', client: '', email: '', phone: '', duration: '', rate: '', instructor: '', converted: '', notes: '' },
  rental: { date: '', tail: '', renter: '', hobbsStart: '', hobbsEnd: '', rate: '', fuel: '', type: '', notes: '' },
  supplies: { date: '', item: '', sku: '', stock: '', sold: '', cost: '', price: '', supplier: '', notes: '' },
  recurrency: { date: '', pilot: '', cert: '', type: '', groundHrs: '', flightHrs: '', groundRate: '', flightRate: '', endorsed: '', notes: '' },
  simulator: { date: '', client: '', device: '', hours: '', rate: '', objective: '', instructor: '', notes: '' },
}

/* ─── Helpers ─── */
const n = (v: string | undefined) => parseFloat(v || '') || 0
const fmt = (v: number) => v ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
const pct = (v: number) => `${(v * 100).toFixed(1)}%`

function rowToData(row: Row): Record<string, string> {
  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('_') || typeof v !== 'string') continue
    data[k] = v
  }
  return data
}

function rowIsEmpty(row: Row): boolean {
  return Object.entries(row).every(([k, v]) => k.startsWith('_') || !v)
}

/* ─── Reducer ─── */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STREAM':
      return { ...state, [action.stream]: action.rows }

    case 'UPDATE_CELL': {
      const rows = [...state[action.stream]]
      rows[action.rowIdx] = { ...rows[action.rowIdx], [action.key]: action.value, _dirty: true }
      return { ...state, [action.stream]: rows }
    }

    case 'ADD_ROW': {
      const shape = EMPTY_SHAPES[action.stream]
      return { ...state, [action.stream]: [...state[action.stream], { ...shape }] }
    }

    case 'DELETE_ROW': {
      const rows = [...state[action.stream]]
      rows.splice(action.rowIdx, 1)
      return { ...state, [action.stream]: rows }
    }

    case 'MARK_SAVED': {
      const rows = [...state[action.stream]]
      rows[action.rowIdx] = { ...rows[action.rowIdx], _id: action.id, _dirty: false }
      return { ...state, [action.stream]: rows }
    }

    default:
      return state
  }
}

const INIT: State = {
  loans: [], discovery: [], rental: [], supplies: [], recurrency: [], simulator: [],
}

/* ─── Revenue calculators ─── */
function calcStreamRevenues(state: State) {
  const loanRev = state.loans.reduce((s, r) => s + n(r.payment as string), 0)
  const discRev = state.discovery.reduce((s, r) => s + n(r.duration as string) * n(r.rate as string), 0)
  const rentalRev = state.rental.reduce((s, r) => {
    const hrs = n(r.hobbsEnd as string) - n(r.hobbsStart as string)
    return s + (hrs > 0 ? hrs * n(r.rate as string) : 0) + n(r.fuel as string)
  }, 0)
  const supplyRev = state.supplies.reduce((s, r) => s + n(r.sold as string) * n(r.price as string), 0)
  const recRev = state.recurrency.reduce((s, r) => s + n(r.groundHrs as string) * n(r.groundRate as string) + n(r.flightHrs as string) * n(r.flightRate as string), 0)
  const simRev = state.simulator.reduce((s, r) => s + n(r.hours as string) * n(r.rate as string), 0)
  return { loanRev, discRev, rentalRev, supplyRev, recRev, simRev, total: loanRev + discRev + rentalRev + supplyRev + recRev + simRev }
}

/* ═══════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════ */

function Cell({ value, onChange, placeholder = '', type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent px-3 py-2.5 text-sm text-darkText placeholder:text-slate-300 outline-none focus:bg-golden/5 transition-colors"
    />
  )
}

function DataTable({ columns, data, stream, dispatch, computedCols = {}, onDelete }: {
  columns: { key: string; label: string; placeholder?: string; type?: string; width?: string }[]
  data: Row[]
  stream: StreamKey
  dispatch: React.Dispatch<Action>
  computedCols?: Record<string, (row: Record<string, string>) => string>
  onDelete: (stream: StreamKey, idx: number, id?: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse" style={{ minWidth: columns.length * 140 + 50 }}>
        <thead>
          <tr>
            <th className="sticky top-0 z-10 bg-darkText px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-golden w-10">#</th>
            {columns.map((col) => (
              <th key={col.key} className="sticky top-0 z-10 bg-darkText px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-golden whitespace-nowrap">
                {col.label}
              </th>
            ))}
            <th className="sticky top-0 z-10 bg-darkText px-2 py-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr
              key={row._id || `new-${ri}`}
              className={`border-b border-slate-100 transition-colors hover:bg-golden/5 ${ri % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'} ${row._dirty ? 'border-l-2 border-l-golden' : ''}`}
            >
              <td className="px-2 py-2.5 text-center text-xs text-slate-400">{ri + 1}</td>
              {columns.map((col) => (
                <td key={col.key} className="p-0" style={{ minWidth: col.width || '120px' }}>
                  {computedCols[col.key] ? (
                    <span className="block px-3 py-2.5 text-sm font-semibold text-emerald-600">
                      {computedCols[col.key](row as unknown as Record<string, string>)}
                    </span>
                  ) : (
                    <Cell
                      value={(row[col.key] as string) || ''}
                      onChange={(v) => dispatch({ type: 'UPDATE_CELL', stream, rowIdx: ri, key: col.key, value: v })}
                      placeholder={col.placeholder}
                      type={col.type}
                    />
                  )}
                </td>
              ))}
              <td className="px-1 py-2.5 text-center">
                <button
                  onClick={() => onDelete(stream, ri, row._id as string | undefined)}
                  className="text-slate-300 hover:text-red-500 transition-colors text-lg leading-none"
                  title="Delete row"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={columns.length + 2} className="py-8 text-center text-sm text-slate-400">No entries yet. Click "Add Row" to start tracking.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`flex-1 min-w-[180px] rounded-2xl p-5 ${accent ? 'bg-darkText shadow-lg' : 'bg-white border border-slate-200 shadow-sm'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${accent ? 'text-white/50' : 'text-slate-400'}`}>{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-golden' : 'text-darkText'}`}>{value}</p>
      {sub && <p className={`mt-1 text-xs ${accent ? 'text-white/40' : 'text-slate-400'}`}>{sub}</p>}
    </div>
  )
}

function MiniBar({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-40 text-right text-sm font-medium text-darkText shrink-0">{item.label}</span>
          <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden">
            <div
              className="h-full rounded-md bg-gradient-to-r from-golden to-yellow-300 transition-all duration-500"
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%` }}
            />
          </div>
          <span className="w-24 text-sm font-semibold text-darkText shrink-0">{fmt(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Dashboard({ state }: { state: State }) {
  const rev = calcStreamRevenues(state)
  const convCount = state.discovery.filter((r) => (r.converted as string || '').toLowerCase() === 'yes').length
  const discTotal = state.discovery.filter((r) => r.client).length
  const convRate = discTotal > 0 ? convCount / discTotal : 0
  const totalHrs =
    state.rental.reduce((s, r) => s + Math.max(0, n(r.hobbsEnd as string) - n(r.hobbsStart as string)), 0) +
    state.simulator.reduce((s, r) => s + n(r.hours as string), 0)
  const supplyProfit = state.supplies.reduce((s, r) => s + n(r.sold as string) * (n(r.price as string) - n(r.cost as string)), 0)

  const streams = [
    { label: 'Student Loans', value: rev.loanRev },
    { label: 'Discovery Flights', value: rev.discRev },
    { label: 'Aircraft Rental', value: rev.rentalRev },
    { label: 'Pilot Supplies', value: rev.supplyRev },
    { label: 'Recurrency', value: rev.recRev },
    { label: 'Simulator', value: rev.simRev },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <MetricCard label="Total Revenue" value={fmt(rev.total)} sub="Across all streams" accent />
        <MetricCard label="Discovery Conversion" value={pct(convRate)} sub={`${convCount} of ${discTotal} converted`} />
        <MetricCard label="Total Flight + Sim Hours" value={totalHrs.toFixed(1)} sub="Rental + Simulator" />
        <MetricCard label="Supply Profit" value={fmt(supplyProfit)} sub="Revenue minus cost" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-base font-bold text-darkText">Revenue by Stream</h3>
        <MiniBar items={streams} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   Tab-specific column definitions
   ═══════════════════════════════════════ */

const loanCols = [
  { key: 'date', label: 'Date', placeholder: 'MM/DD/YYYY' },
  { key: 'name', label: 'Student', placeholder: 'Name' },
  { key: 'principal', label: 'Principal ($)', placeholder: '0.00', type: 'number' },
  { key: 'payment', label: 'Payment ($)', placeholder: '0.00', type: 'number' },
  { key: 'interest', label: 'Interest ($)' },
  { key: 'principalPaid', label: 'Principal Paid ($)' },
  { key: 'balance', label: 'Balance ($)' },
  { key: 'notes', label: 'Notes', placeholder: '…' },
]
const loanComputed: Record<string, (row: Record<string, string>) => string> = {
  interest: (row) => { const p = n(row.principal); return p ? fmt(p * APR / 12) : '—' },
  principalPaid: (row) => { const pay = n(row.payment); const int = n(row.principal) * APR / 12; return pay ? fmt(Math.max(0, pay - int)) : '—' },
  balance: (row) => { const p = n(row.principal); const pay = n(row.payment); const int = p * APR / 12; return p ? fmt(Math.max(0, p - Math.max(0, pay - int))) : '—' },
}

const discCols = [
  { key: 'date', label: 'Date', placeholder: 'MM/DD/YYYY' },
  { key: 'client', label: 'Client', placeholder: 'Name' },
  { key: 'email', label: 'Email', placeholder: 'email@…' },
  { key: 'phone', label: 'Phone', placeholder: '555-…' },
  { key: 'duration', label: 'Duration (hrs)', placeholder: '0.0', type: 'number' },
  { key: 'rate', label: 'Rate ($/hr)', placeholder: '0.00', type: 'number' },
  { key: 'revenue', label: 'Revenue ($)' },
  { key: 'instructor', label: 'Instructor', placeholder: 'Name' },
  { key: 'converted', label: 'Converted?', placeholder: 'Yes / No' },
  { key: 'notes', label: 'Notes', placeholder: '…' },
]
const discComputed: Record<string, (row: Record<string, string>) => string> = {
  revenue: (row) => { const v = n(row.duration) * n(row.rate); return v ? fmt(v) : '—' },
}

const rentalCols = [
  { key: 'date', label: 'Date', placeholder: 'MM/DD/YYYY' },
  { key: 'tail', label: 'Tail #', placeholder: 'N12345' },
  { key: 'renter', label: 'Renter', placeholder: 'Name' },
  { key: 'hobbsStart', label: 'Hobbs Start', placeholder: '0.0', type: 'number' },
  { key: 'hobbsEnd', label: 'Hobbs End', placeholder: '0.0', type: 'number' },
  { key: 'totalHours', label: 'Total Hours' },
  { key: 'rate', label: 'Rate ($/hr)', placeholder: '0.00', type: 'number' },
  { key: 'fuel', label: 'Fuel Surcharge ($)', placeholder: '0.00', type: 'number' },
  { key: 'totalRev', label: 'Revenue ($)' },
  { key: 'type', label: 'Flight Type', placeholder: 'Training / Rental' },
  { key: 'notes', label: 'Notes', placeholder: '…' },
]
const rentalComputed: Record<string, (row: Record<string, string>) => string> = {
  totalHours: (row) => { const h = n(row.hobbsEnd) - n(row.hobbsStart); return h > 0 ? h.toFixed(1) : '—' },
  totalRev: (row) => { const h = n(row.hobbsEnd) - n(row.hobbsStart); const v = (h > 0 ? h * n(row.rate) : 0) + n(row.fuel); return v > 0 ? fmt(v) : '—' },
}

const supplyCols = [
  { key: 'date', label: 'Date', placeholder: 'MM/DD/YYYY' },
  { key: 'item', label: 'Item', placeholder: 'Description' },
  { key: 'sku', label: 'SKU', placeholder: 'Part #' },
  { key: 'stock', label: 'In Stock', placeholder: '0', type: 'number' },
  { key: 'sold', label: 'Qty Sold', placeholder: '0', type: 'number' },
  { key: 'cost', label: 'Unit Cost ($)', placeholder: '0.00', type: 'number' },
  { key: 'price', label: 'Sale Price ($)', placeholder: '0.00', type: 'number' },
  { key: 'revenue', label: 'Revenue ($)' },
  { key: 'profit', label: 'Profit ($)' },
  { key: 'supplier', label: 'Supplier', placeholder: 'Name' },
  { key: 'notes', label: 'Notes', placeholder: '…' },
]
const supplyComputed: Record<string, (row: Record<string, string>) => string> = {
  revenue: (row) => { const v = n(row.sold) * n(row.price); return v ? fmt(v) : '—' },
  profit: (row) => { const v = n(row.sold) * (n(row.price) - n(row.cost)); return v ? fmt(v) : '—' },
}

const recCols = [
  { key: 'date', label: 'Date', placeholder: 'MM/DD/YYYY' },
  { key: 'pilot', label: 'Pilot', placeholder: 'Name' },
  { key: 'cert', label: 'Certificate', placeholder: 'PPL / IR / CPL' },
  { key: 'type', label: 'Training Type', placeholder: 'BFR / IPC / …' },
  { key: 'groundHrs', label: 'Ground Hrs', placeholder: '0.0', type: 'number' },
  { key: 'flightHrs', label: 'Flight Hrs', placeholder: '0.0', type: 'number' },
  { key: 'groundRate', label: 'Ground $/hr', placeholder: '0.00', type: 'number' },
  { key: 'flightRate', label: 'Flight $/hr', placeholder: '0.00', type: 'number' },
  { key: 'revenue', label: 'Revenue ($)' },
  { key: 'endorsed', label: 'Endorsed?', placeholder: 'Yes / No' },
  { key: 'notes', label: 'Notes', placeholder: '…' },
]
const recComputed: Record<string, (row: Record<string, string>) => string> = {
  revenue: (row) => { const v = n(row.groundHrs) * n(row.groundRate) + n(row.flightHrs) * n(row.flightRate); return v ? fmt(v) : '—' },
}

const simCols = [
  { key: 'date', label: 'Date', placeholder: 'MM/DD/YYYY' },
  { key: 'client', label: 'Client', placeholder: 'Name' },
  { key: 'device', label: 'Sim Device', placeholder: 'BATD / AATD' },
  { key: 'hours', label: 'Hours', placeholder: '0.0', type: 'number' },
  { key: 'rate', label: 'Rate ($/hr)', placeholder: '0.00', type: 'number' },
  { key: 'revenue', label: 'Revenue ($)' },
  { key: 'objective', label: 'Objective', placeholder: 'IFR / VFR …' },
  { key: 'instructor', label: 'Instructor', placeholder: 'Name' },
  { key: 'notes', label: 'Notes', placeholder: '…' },
]
const simComputed: Record<string, (row: Record<string, string>) => string> = {
  revenue: (row) => { const v = n(row.hours) * n(row.rate); return v ? fmt(v) : '—' },
}

const TAB_CONFIG: Record<string, { columns: typeof loanCols; computed: Record<string, (row: Record<string, string>) => string> }> = {
  loans: { columns: loanCols, computed: loanComputed },
  discovery: { columns: discCols, computed: discComputed },
  rental: { columns: rentalCols, computed: rentalComputed },
  supplies: { columns: supplyCols, computed: supplyComputed },
  recurrency: { columns: recCols, computed: recComputed },
  simulator: { columns: simCols, computed: simComputed },
}

/* ═══════════════════════════════════════
   Main page component
   ═══════════════════════════════════════ */

export default function RevenueTrackerPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [state, dispatch] = useReducer(reducer, INIT)
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
    else if (!authLoading && user && !isAdmin) router.push('/')
  }, [user, isAdmin, authLoading, router])

  // ── Load all entries from Supabase on mount ──
  useEffect(() => {
    if (!user || !isAdmin) return
    async function load() {
      setLoadingData(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const res = await fetch('/api/admin/revenue', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error('Failed to load')
        const { entries } = await res.json() as { entries: DbEntry[] }

        // Group by stream and convert to rows
        for (const stream of STREAM_KEYS) {
          const streamEntries = entries.filter((e) => e.stream === stream)
          const rows: Row[] = streamEntries.map((e) => ({
            _id: e.id,
            _dirty: false,
            ...EMPTY_SHAPES[stream],
            ...e.data,
            date: e.data.date || e.date || '',
          }))
          dispatch({ type: 'SET_STREAM', stream, rows })
        }
      } catch (err) {
        console.error('Failed to load revenue entries:', err)
      } finally {
        setLoadingData(false)
      }
    }
    load()
  }, [user, isAdmin])

  // ── Auto-save with debounce ──
  const saveAllDirty = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    setSaving(true)
    setSaveStatus('Saving...')
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    }

    try {
      for (const stream of STREAM_KEYS) {
        const rows = state[stream]
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          if (!row._dirty) continue
          if (rowIsEmpty(row) && !row._id) continue // skip empty new rows

          const data = rowToData(row)

          if (row._id) {
            // Update existing
            await fetch('/api/admin/revenue', {
              method: 'PUT',
              headers,
              body: JSON.stringify({ id: row._id, date: data.date || null, data }),
            })
            dispatch({ type: 'MARK_SAVED', stream, rowIdx: i, id: row._id })
          } else if (!rowIsEmpty(row)) {
            // Insert new
            const res = await fetch('/api/admin/revenue', {
              method: 'POST',
              headers,
              body: JSON.stringify({ stream, date: data.date || null, data }),
            })
            const { entries } = await res.json()
            if (entries?.[0]?.id) {
              dispatch({ type: 'MARK_SAVED', stream, rowIdx: i, id: entries[0].id })
            }
          }
        }
      }
      setSaveStatus('Saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } catch (err) {
      console.error('Save failed:', err)
      setSaveStatus('Save failed')
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setSaving(false)
    }
  }, [state])

  // Debounce: save 1.5s after last edit
  useEffect(() => {
    const hasDirty = STREAM_KEYS.some((s) => state[s].some((r) => r._dirty))
    if (!hasDirty) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveAllDirty()
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state, saveAllDirty])

  // ── Delete handler ──
  const handleDelete = useCallback(async (stream: StreamKey, idx: number, id?: string) => {
    if (id) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await fetch(`/api/admin/revenue?id=${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
      }
    }
    dispatch({ type: 'DELETE_ROW', stream, rowIdx: idx })
  }, [])

  const getTabTotal = useCallback((tabId: StreamKey) => {
    const rev = calcStreamRevenues(state)
    const map: Record<StreamKey, number> = {
      loans: rev.loanRev, discovery: rev.discRev, rental: rev.rentalRev,
      supplies: rev.supplyRev, recurrency: rev.recRev, simulator: rev.simRev,
    }
    return map[tabId] || 0
  }, [state])

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-golden border-t-transparent" />
          <p className="text-slate-500 text-sm">{authLoading ? 'Authenticating...' : 'Loading revenue data...'}</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <AdminPageShell
      title="Revenue Tracker"
      description="Track all Merlin Flight Training revenue streams. Changes auto-save to your database."
      backLinks={[{ href: '/admin', label: 'Back to Admin' }]}
      maxWidthClassName="max-w-[1400px]"
      actions={
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className={`text-sm font-medium ${saveStatus === 'Saved' ? 'text-emerald-600' : saveStatus === 'Save failed' ? 'text-red-500' : 'text-slate-500'}`}>
              {saveStatus === 'Saving...' && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-golden border-t-transparent mr-1.5 align-middle" />}
              {saveStatus}
            </span>
          )}
          <button
            onClick={saveAllDirty}
            disabled={saving}
            className="rounded-xl border border-[#E9D7A5] bg-white px-4 py-2 text-sm font-semibold text-darkText transition-colors hover:bg-[#FFF9EC] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Now'}
          </button>
        </div>
      }
    >
      {/* ── Tab bar ── */}
      <div className="mb-6 flex gap-0 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-1.5 whitespace-nowrap px-5 py-3.5 text-sm font-medium transition-all border-b-[3px]',
              activeTab === tab.id
                ? 'border-golden bg-golden/5 text-darkText font-semibold'
                : 'border-transparent text-slate-500 hover:text-darkText hover:bg-slate-50',
            ].join(' ')}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {activeTab === 'dashboard' ? (
        <Dashboard state={state} />
      ) : (
        <div className="space-y-4">
          {/* Total banner + add row */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <span className="text-sm font-semibold text-slate-500">
              {TABS.find((t) => t.id === activeTab)?.icon}{' '}
              {TABS.find((t) => t.id === activeTab)?.label}
              <span className="ml-2 text-xs text-slate-400">({state[activeTab as StreamKey].length} entries)</span>
            </span>
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-darkText">
                Total: <span className="text-emerald-600">{fmt(getTabTotal(activeTab as StreamKey))}</span>
              </span>
              <button
                onClick={() => dispatch({ type: 'ADD_ROW', stream: activeTab as StreamKey })}
                className="rounded-lg bg-golden px-4 py-2 text-sm font-bold text-darkText hover:bg-opacity-80 transition-colors"
              >
                + Add Row
              </button>
            </div>
          </div>

          {/* Data table */}
          <DataTable
            columns={TAB_CONFIG[activeTab].columns}
            data={state[activeTab as StreamKey]}
            stream={activeTab as StreamKey}
            dispatch={dispatch}
            computedCols={TAB_CONFIG[activeTab].computed}
            onDelete={handleDelete}
          />

          {/* Loan APR note */}
          {activeTab === 'loans' && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              Interest calculated at <strong>16% APR</strong> (1.333%/month). Balance shown is after each individual payment against the entered principal.
            </div>
          )}
        </div>
      )}
    </AdminPageShell>
  )
}
