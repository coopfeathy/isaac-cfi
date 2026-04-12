'use client'

/**
 * =============================================================================
 *  BOOK A LESSON — IN-HOUSE SCHEDULER (Apple Calendar–style week view)
 * =============================================================================
 *
 *  This page replaces the old Calendly embed. Everything here is owned by
 *  Merlin Flight Training — no third-party script tags, no external widgets.
 *
 *  Shape of the UI (matches macOS / iOS Calendar's week view):
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  ‹  ›  Today                April 2026            Day Week Month +  │
 *   ├───────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐                   │
 *   │       │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │                   │
 *   │       │  13 │  14 │  15 │  16 │  17 │  18 │  19 │                   │
 *   ├───────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤                   │
 *   │  9 AM │     │     │     │     │     │     │     │                   │
 *   │ 10 AM │ ███ │     │     │ ███ │     │ ███ │     │  ← available     │
 *   │ 11 AM │ ░░░ │ ███ │     │     │     │     │     │  ← booked        │
 *   │  ...  │     │     │     │     │     │     │     │                   │
 *   └───────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘                   │
 *
 *  Clicking an available slot opens a small modal (name/email/phone/notes)
 *  which POSTs to /api/book-lesson. That route sends an email to Isaac and
 *  upserts the prospect in Supabase so the lesson shows up in your CRM.
 *
 *  Availability, lesson length, blocked dates, etc. all live in
 *  `scheduler-config.ts` — edit that file to change the calendar.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  formatMinutes,
  getSlotsForDate,
  isSlotAvailable,
  minutesOf,
  prettyHourLabel,
  schedulerConfig,
  startOfWeek,
  toIsoDate,
} from './scheduler-config'

// ---------- Visual constants (tweak to taste) ---------- //
const HOUR_HEIGHT = 56 // px per hour row — matches Apple Calendar's default density
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ---------- Types ---------- //
interface SelectedSlot {
  date: Date
  time: string // "HH:MM"
}

interface BookingPayload {
  slot: string // ISO-ish "YYYY-MM-DDTHH:MM"
  name: string
  email: string
  phone: string
  location: string
  notes: string
}

// =========================================================================
//  Page
// =========================================================================
export default function BookLessonPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [selected, setSelected] = useState<SelectedSlot | null>(null)
  const [now, setNow] = useState<Date>(() => new Date())

  // Tick every minute so the red "current time" indicator moves like Apple Calendar's.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Build the 7 dates for the currently displayed week.
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  // Compute the earliest / latest hours across the week so the grid
  // shows a tight range rather than a full 24h column.
  const { firstHour, lastHour } = useMemo(() => {
    let min = 24 * 60
    let max = 0
    for (const rule of schedulerConfig.weekly) {
      min = Math.min(min, minutesOf(rule.start))
      max = Math.max(max, minutesOf(rule.end))
    }
    // Snap to hour boundaries with a little padding.
    const first = Math.max(0, Math.floor(min / 60) - 0) * 60
    const last = Math.min(24 * 60, Math.ceil(max / 60) * 60)
    return { firstHour: first, lastHour: last }
  }, [])

  const hours = useMemo(() => {
    const list: number[] = []
    for (let t = firstHour; t < lastHour; t += 60) list.push(t)
    return list
  }, [firstHour, lastHour])

  const gridHeight = ((lastHour - firstHour) / 60) * HOUR_HEIGHT

  // Month label shown in the header (Apple shows the dominant month of the week).
  const headerLabel = useMemo(() => {
    const mid = weekDates[3] ?? weekDates[0]
    return mid.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }, [weekDates])

  const handleNavigate = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') {
      setWeekStart(startOfWeek(new Date()))
      return
    }
    const d = new Date(weekStart)
    d.setDate(d.getDate() + (dir === 'next' ? 7 : -7))
    setWeekStart(d)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* --------- Hero / breadcrumbs --------- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-golden/80 mb-3">
          <Link href="/start-training" className="hover:text-golden transition">
            ← Back to Start Training
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
            Book a Lesson
          </span>
        </h1>
        <p className="mt-2 text-gray-400 text-sm sm:text-base max-w-2xl">
          Pick a time that works for you. Open slots are highlighted in gold; dimmed
          blocks are already booked. You&apos;ll get a confirmation email within a
          few minutes of scheduling.
        </p>
      </div>

      {/* --------- Calendar card --------- */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 pb-24">
        <div
          className="
            relative overflow-hidden
            rounded-2xl
            border border-white/10
            bg-white/[0.04] backdrop-blur-xl
            shadow-2xl shadow-black/40
          "
        >
          {/* --- Apple-style title bar --- */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-1.5">
              <NavButton onClick={() => handleNavigate('prev')} ariaLabel="Previous week">
                <ChevronLeft />
              </NavButton>
              <button
                onClick={() => handleNavigate('today')}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition"
              >
                Today
              </button>
              <NavButton onClick={() => handleNavigate('next')} ariaLabel="Next week">
                <ChevronRight />
              </NavButton>
            </div>

            <div className="text-base sm:text-lg font-semibold tracking-tight">
              {headerLabel}
            </div>

            {/* Apple shows Day/Week/Month/Year toggles. We only support Week
                for now, but the pill UI is there so it reads correctly. */}
            <div className="hidden sm:flex items-center rounded-md bg-white/5 border border-white/10 p-0.5 text-xs">
              <ViewPill label="Day" />
              <ViewPill label="Week" active />
              <ViewPill label="Month" />
              <ViewPill label="Year" />
            </div>
          </div>

          {/* --- Day headers row --- */}
          <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-white/10 bg-white/[0.02]">
            <div /> {/* time gutter spacer */}
            {weekDates.map((d, i) => {
              const isToday = isSameDay(d, now)
              return (
                <div
                  key={i}
                  className="px-2 py-3 text-center border-l border-white/10 first:border-l-0"
                >
                  <div className="text-[10px] uppercase tracking-widest text-gray-400">
                    <span className="sm:hidden">{DAY_LETTERS[i]}</span>
                    <span className="hidden sm:inline">{DAY_LABELS[i]}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-center">
                    <span
                      className={
                        isToday
                          ? 'inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-semibold text-sm shadow'
                          : 'inline-flex items-center justify-center w-8 h-8 text-sm font-medium text-white'
                      }
                    >
                      {d.getDate()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* --- Time grid --- */}
          <div className="relative overflow-x-auto">
            <div
              className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] min-w-[700px]"
              style={{ height: gridHeight }}
            >
              {/* Left hour gutter */}
              <div className="relative border-r border-white/10">
                {hours.map((h, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 pr-2 text-right text-[10px] uppercase tracking-wide text-gray-500 -translate-y-1/2"
                    style={{ top: `${((h - firstHour) / 60) * HOUR_HEIGHT}px` }}
                  >
                    {h === firstHour ? '' : prettyHourLabel(h)}
                  </div>
                ))}
              </div>

              {/* 7 day columns */}
              {weekDates.map((d, colIdx) => (
                <DayColumn
                  key={colIdx}
                  date={d}
                  firstHour={firstHour}
                  hours={hours}
                  hourHeight={HOUR_HEIGHT}
                  now={now}
                  onSelectSlot={(time) => setSelected({ date: d, time })}
                />
              ))}
            </div>
          </div>

          {/* --- Footer hint --- */}
          <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-white/[0.02] text-[11px] text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
            <LegendSwatch className="bg-golden/80 border-golden" label="Available" />
            <LegendSwatch className="bg-white/10 border-white/20" label="Booked / blocked" />
            <LegendSwatch className="bg-red-500/80 border-red-400" label="Today" />
            <span className="ml-auto hidden sm:inline">
              Click an open slot to book it.
            </span>
          </div>
        </div>
      </div>

      {/* --------- Booking modal --------- */}
      {selected && (
        <BookingModal
          slot={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// =========================================================================
//  Day column
// =========================================================================
interface DayColumnProps {
  date: Date
  firstHour: number
  hours: number[]
  hourHeight: number
  now: Date
  onSelectSlot: (time: string) => void
}

function DayColumn({ date, firstHour, hours, hourHeight, now, onSelectSlot }: DayColumnProps) {
  const slots = getSlotsForDate(date)
  const isToday = isSameDay(date, now)
  const gridHeight = hours.length * hourHeight
  const slotHeight = (schedulerConfig.slotMinutes / 60) * hourHeight

  // Red "current time" line (Apple Calendar's hallmark detail).
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowOffset = ((nowMinutes - firstHour) / 60) * hourHeight
  const showNowLine =
    isToday && nowMinutes >= firstHour && nowMinutes <= firstHour + hours.length * 60

  return (
    <div
      className="relative border-l border-white/10 first:border-l-0"
      style={{ height: gridHeight }}
    >
      {/* Hour gridlines */}
      {hours.map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-white/5"
          style={{ top: `${i * hourHeight}px` }}
        />
      ))}
      {/* Half-hour dotted lines, subtle */}
      {hours.map((_, i) => (
        <div
          key={`h-${i}`}
          className="absolute left-0 right-0 border-t border-dashed border-white/[0.04]"
          style={{ top: `${i * hourHeight + hourHeight / 2}px` }}
        />
      ))}

      {/* Slots */}
      {slots.map((time) => {
        const top = ((minutesOf(time) - firstHour) / 60) * hourHeight
        const available = isSlotAvailable(date, time)
        return (
          <button
            key={time}
            disabled={!available}
            onClick={() => available && onSelectSlot(time)}
            className={
              'absolute left-1 right-1 rounded-md text-[11px] font-medium px-2 py-1 text-left transition ' +
              (available
                ? 'bg-golden/20 hover:bg-golden/40 border border-golden/60 text-golden hover:text-white cursor-pointer shadow-sm shadow-golden/10'
                : 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed')
            }
            style={{ top: `${top}px`, height: `${slotHeight - 3}px` }}
            aria-label={`${toIsoDate(date)} ${time} ${available ? 'available' : 'booked'}`}
          >
            <div className="truncate">
              {prettyHourLabel(minutesOf(time))}
            </div>
            <div className="truncate text-[10px] opacity-80">
              {available ? 'Open' : 'Booked'}
            </div>
          </button>
        )
      })}

      {/* Current time indicator */}
      {showNowLine && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: `${nowOffset}px` }}
        >
          <div className="relative">
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500 shadow" />
            <div className="border-t-2 border-red-500" />
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
//  Booking modal (name / email / phone / notes)
// =========================================================================
interface BookingModalProps {
  slot: SelectedSlot
  onClose: () => void
}

function BookingModal({ slot, onClose }: BookingModalProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: schedulerConfig.locations[0]?.value ?? '',
    notes: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const prettyDate = slot.date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const prettyTime = prettyHourLabel(minutesOf(slot.time))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setError('')
    try {
      const payload: BookingPayload = {
        slot: `${toIsoDate(slot.date)}T${slot.time}`,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        location: form.location,
        notes: form.notes.trim(),
      }
      const res = await fetch('/api/book-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let msg = `Server error (${res.status})`
        try {
          const data = await res.json()
          if (data?.error) msg = data.error
        } catch {
          // ignore
        }
        throw new Error(msg)
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-gray-900 to-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-golden">New Lesson</div>
            <div className="text-base font-semibold mt-0.5">{prettyDate}</div>
            <div className="text-sm text-gray-400">{prettyTime}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-golden/20 border border-golden/40 mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-golden">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-1">Lesson requested!</h3>
            <p className="text-sm text-gray-400 mb-5">
              We&apos;ve got you down for <strong>{prettyDate}</strong> at{' '}
              <strong>{prettyTime}</strong>. Your instructor will confirm by email shortly.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-golden text-black font-semibold hover:bg-yellow-500 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <Field label="Full name">
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Doe"
                className="input"
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@email.com"
                className="input"
              />
            </Field>
            <Field label="Phone">
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 555-5555"
                className="input"
              />
            </Field>
            <Field label="Training location">
              <select
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input"
              >
                {schedulerConfig.locations.map((loc) => (
                  <option key={loc.value} value={loc.value} className="bg-gray-900">
                    {loc.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes (optional)">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Anything your instructor should know?"
                className="input resize-none"
              />
            </Field>

            {status === 'error' && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/40 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="flex-1 py-2.5 rounded-lg bg-golden text-black font-semibold hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {status === 'submitting' ? 'Booking…' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        )}

        {/* Scoped input styles so we don't need a new Tailwind layer. */}
        <style jsx>{`
          .input {
            width: 100%;
            padding: 0.625rem 0.875rem;
            border-radius: 0.5rem;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: white;
            font-size: 0.875rem;
            outline: none;
            transition: border-color 0.15s ease, background 0.15s ease;
          }
          .input::placeholder {
            color: rgba(255, 255, 255, 0.35);
          }
          .input:focus {
            border-color: rgba(234, 179, 8, 0.7);
            background: rgba(255, 255, 255, 0.09);
          }
        `}</style>
      </div>
    </div>
  )
}

// =========================================================================
//  Small presentational helpers
// =========================================================================
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-1.5">{label}</div>
      {children}
    </label>
  )
}

function NavButton({
  onClick,
  children,
  ariaLabel,
}: {
  onClick: () => void
  children: React.ReactNode
  ariaLabel: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition"
    >
      {children}
    </button>
  )
}

function ViewPill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className={
        'px-3 py-1 rounded-[5px] ' +
        (active ? 'bg-white/15 text-white font-semibold' : 'text-gray-400')
      }
    >
      {label}
    </div>
  )
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-sm border ${className}`} />
      {label}
    </span>
  )
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
