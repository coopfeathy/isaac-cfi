/**
 * ============================================================================
 *  MERLIN FLIGHT TRAINING — SCHEDULER CONFIG
 * ============================================================================
 *
 *  This is the SINGLE SOURCE OF TRUTH for the in-house "Book a Lesson"
 *  scheduler (formerly a Calendly embed). It's a plain TypeScript file
 *  on purpose — you can open it in any editor, tweak the values below,
 *  redeploy, and the website updates. No third-party dashboard required.
 *
 *  Things you can change here without touching any UI code:
 *   - Which days of the week you take lessons
 *   - Start / end hours per day
 *   - Lesson length (in minutes)
 *   - Buffer between lessons
 *   - A list of one-off blocked dates (holidays, personal days, etc.)
 *   - A list of "already booked" slots (if you want to hard-block one
 *     before an admin panel is wired up)
 *   - Locations shown in the "which airfield?" dropdown
 *
 *  Days of week: 0 = Sunday, 1 = Monday, ... 6 = Saturday
 *  Times are in 24h local time ("HH:MM").
 * ============================================================================
 */

export interface WeekdayAvailability {
  /** 0=Sun ... 6=Sat */
  weekday: number
  /** First bookable slot start time, "HH:MM" */
  start: string
  /** Last slot MUST END by this time, "HH:MM" */
  end: string
}

export interface SchedulerConfig {
  /** Minutes per lesson slot (Apple-Calendar-style hourly rows still render regardless). */
  slotMinutes: number
  /** Buffer between back-to-back lessons (minutes). */
  bufferMinutes: number
  /** How many days in advance a student can book. */
  maxDaysAhead: number
  /** Minimum notice required before a new booking (hours). */
  minLeadHours: number
  /** Recurring weekly availability. */
  weekly: WeekdayAvailability[]
  /** Specific ISO dates (YYYY-MM-DD) that are fully blocked. */
  blockedDates: string[]
  /**
   * Specific ISO datetime strings (YYYY-MM-DDTHH:MM, local) that are already
   * booked or blocked. The week-view will render these as taken.
   */
  blockedSlots: string[]
  /** Training locations shown in the booking modal. */
  locations: { value: string; label: string }[]
}

// ----------------------------------------------------------------------------
// EDIT ME 👇  — everything below this line is safe to tweak.
// ----------------------------------------------------------------------------

export const schedulerConfig: SchedulerConfig = {
  slotMinutes: 60,
  bufferMinutes: 15,
  maxDaysAhead: 60,
  minLeadHours: 12,

  weekly: [
    // Monday – Friday: 9am to 5pm
    { weekday: 1, start: '09:00', end: '17:00' },
    { weekday: 2, start: '09:00', end: '17:00' },
    { weekday: 3, start: '09:00', end: '17:00' },
    { weekday: 4, start: '09:00', end: '17:00' },
    { weekday: 5, start: '09:00', end: '17:00' },
    // Saturday: 10am to 3pm
    { weekday: 6, start: '10:00', end: '15:00' },
    // Sunday closed — omit it from the list to close the day entirely.
  ],

  blockedDates: [
    // Add any closed days here, e.g. '2026-07-04'
  ],

  blockedSlots: [
    // Add already-booked or hard-blocked slots, e.g. '2026-04-14T10:00'
  ],

  locations: [
    { value: 'lumberton', label: 'Lumberton, NJ (N14)' },
    { value: 'long-island', label: 'Long Island, NY (FRG)' },
    { value: 'warwick', label: 'Warwick, NY (N72)' },
  ],
}

// ----------------------------------------------------------------------------
// Helpers (used by the calendar UI). You probably don't need to touch these.
// ----------------------------------------------------------------------------

/** Returns the Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun
  const diff = (day + 6) % 7 // days since Monday
  d.setDate(d.getDate() - diff)
  return d
}

/** "2026-04-14" for a local Date (no timezone drift). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** "2026-04-14T10:00" for a local Date + HH:MM time. */
export function toIsoDateTime(d: Date, hhmm: string): string {
  return `${toIsoDate(d)}T${hhmm}`
}

/** Parse "HH:MM" into total minutes from midnight. */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Format total minutes from midnight as "HH:MM". */
export function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Pretty "9 AM" style label for a minutes-from-midnight value. */
export function prettyHourLabel(totalMin: number): string {
  const h24 = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}

/** Returns all bookable slot start times (HH:MM) for the given date. */
export function getSlotsForDate(date: Date, config: SchedulerConfig = schedulerConfig): string[] {
  const iso = toIsoDate(date)
  if (config.blockedDates.includes(iso)) return []

  const rule = config.weekly.find((w) => w.weekday === date.getDay())
  if (!rule) return []

  const startMin = minutesOf(rule.start)
  const endMin = minutesOf(rule.end)
  const step = config.slotMinutes + config.bufferMinutes
  const slots: string[] = []
  for (let t = startMin; t + config.slotMinutes <= endMin; t += step) {
    slots.push(formatMinutes(t))
  }
  return slots
}

/** Is this slot (Date + HH:MM) selectable by a student right now? */
export function isSlotAvailable(
  date: Date,
  hhmm: string,
  config: SchedulerConfig = schedulerConfig,
): boolean {
  const iso = toIsoDateTime(date, hhmm)
  if (config.blockedSlots.includes(iso)) return false

  const slotDate = new Date(date)
  const [h, m] = hhmm.split(':').map(Number)
  slotDate.setHours(h, m, 0, 0)

  const now = new Date()
  const leadMs = config.minLeadHours * 60 * 60 * 1000
  if (slotDate.getTime() - now.getTime() < leadMs) return false

  const maxAhead = new Date(now)
  maxAhead.setDate(maxAhead.getDate() + config.maxDaysAhead)
  if (slotDate > maxAhead) return false

  return getSlotsForDate(date, config).includes(hhmm)
}
