import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { WeekAvailability, AvailableSlot } from '@/lib/types/calendar'

const TIMEZONE = 'America/New_York'

interface TimeRange {
  start: number // epoch ms
  end: number
}

/**
 * Convert a local time string ("HH:MM" or "HH:MM:SS") on a given date
 * to a UTC epoch timestamp, interpreting the time in America/New_York.
 */
function localTimeToUTC(date: string, time: string): number {
  // Build an ISO-like string and use the timezone offset approach
  const [h, m] = time.split(':').map(Number)
  // Create date at noon in UTC first. Then set hours in the target timezone.
  const dt = new Date(`${date}T12:00:00Z`)
  // Use Intl to find the UTC offset for this date in America/New_York
  const offset = getTimezoneOffsetMinutes(date)
  // Target: date at h:m in New_York = UTC + offset
  dt.setUTCHours(h, m, 0, 0)
  // Add offset to convert local → UTC (offset is minutes behind UTC, so add it)
  return dt.getTime() + offset * 60_000
}

/**
 * Get the UTC offset in minutes for America/New_York on a given date.
 * Positive means behind UTC (e.g., EDT = +240, EST = +300).
 */
function getTimezoneOffsetMinutes(dateStr: string): number {
  const dt = new Date(`${dateStr}T12:00:00Z`)
  // Format in target timezone and parse back to find offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(dt)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
  const localStr = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`
  const localAsUTC = new Date(localStr).getTime()
  // offset = UTC time - local time (in ms), convert to minutes
  return (dt.getTime() - localAsUTC) / 60_000
}

/**
 * Get the day_of_week (0=Sunday, 6=Saturday) for a date string.
 */
function getDayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay()
}

/**
 * Format date from epoch ms: "YYYY-MM-DD" in America/New_York timezone.
 */
function formatDateNY(epochMs: number): string {
  const dt = new Date(epochMs)
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE })
  return formatter.format(dt)
}

/**
 * Subtract a set of busy ranges from a single available range.
 * Returns the remaining free ranges, sorted.
 */
function subtractRanges(available: TimeRange, busy: TimeRange[]): TimeRange[] {
  // Sort busy by start time
  const sorted = [...busy].sort((a, b) => a.start - b.start)

  let ranges: TimeRange[] = [{ ...available }]

  for (const b of sorted) {
    const next: TimeRange[] = []
    for (const r of ranges) {
      if (b.end <= r.start || b.start >= r.end) {
        // No overlap
        next.push(r)
      } else {
        // Overlap — split
        if (b.start > r.start) {
          next.push({ start: r.start, end: b.start })
        }
        if (b.end < r.end) {
          next.push({ start: b.end, end: r.end })
        }
      }
    }
    ranges = next
  }

  return ranges
}

/**
 * Pure computation function (for testing without DB).
 * Takes pre-fetched data and returns availability.
 */
export function computeAvailabilityFromData(
  weekStart: string,
  template: Array<{ day_of_week: number; start_time: string; end_time: string }>,
  overrides: Array<{ override_date: string; is_available: boolean; start_time: string | null; end_time: string | null }>,
  busySlots: Array<{ start_time: string; end_time: string }>,
  slotDurationMinutes?: number
): AvailableSlot[] {
  const minDuration = (slotDurationMinutes ?? 0) * 60_000

  // Build date strings for Mon-Sun
  const dates: string[] = []
  const startDate = new Date(`${weekStart}T12:00:00Z`)
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setUTCDate(d.getUTCDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  // Index overrides by date
  const overridesByDate = new Map<string, typeof overrides>()
  for (const o of overrides) {
    const list = overridesByDate.get(o.override_date) ?? []
    list.push(o)
    overridesByDate.set(o.override_date, list)
  }

  // Convert busy slots to epoch ranges
  const busyRanges: TimeRange[] = busySlots.map(s => ({
    start: new Date(s.start_time).getTime(),
    end: new Date(s.end_time).getTime(),
  }))

  const result: AvailableSlot[] = []

  for (const dateStr of dates) {
    const dow = getDayOfWeek(dateStr)
    const dayOverrides = overridesByDate.get(dateStr) ?? []

    // Check if any override blocks the entire day
    const blocked = dayOverrides.some(o => !o.is_available)
    if (blocked) {
      // Still process additive overrides on blocked days? No — block takes precedence.
      continue
    }

    // Start with template ranges for this day_of_week
    const dayRanges: TimeRange[] = []

    for (const t of template) {
      if (t.day_of_week !== dow) continue
      const startMs = localTimeToUTC(dateStr, t.start_time)
      const endMs = localTimeToUTC(dateStr, t.end_time)
      // Handle end < start (across midnight) — clamp to midnight
      if (endMs <= startMs) {
        const midnightMs = localTimeToUTC(dateStr, '23:59')
        if (midnightMs > startMs) {
          dayRanges.push({ start: startMs, end: midnightMs })
        }
        continue
      }
      dayRanges.push({ start: startMs, end: endMs })
    }

    // Apply additive overrides
    for (const o of dayOverrides) {
      if (o.is_available && o.start_time && o.end_time) {
        const startMs = localTimeToUTC(dateStr, o.start_time)
        const endMs = localTimeToUTC(dateStr, o.end_time)
        if (endMs > startMs) {
          dayRanges.push({ start: startMs, end: endMs })
        }
      }
    }

    // Sort ranges by start
    dayRanges.sort((a, b) => a.start - b.start)

    // Find busy slots that fall on this day
    const dayStart = dayRanges.length > 0 ? dayRanges[0].start : 0
    const dayEnd = dayRanges.length > 0 ? dayRanges[dayRanges.length - 1].end : 0
    const dayBusy = busyRanges.filter(b => b.end > dayStart && b.start < dayEnd)

    // Subtract busy from each available range
    for (const avail of dayRanges) {
      const free = subtractRanges(avail, dayBusy)
      for (const f of free) {
        const duration = f.end - f.start
        if (minDuration > 0 && duration < minDuration) continue

        result.push({
          start: new Date(f.start).toISOString(),
          end: new Date(f.end).toISOString(),
          date: dateStr,
        })
      }
    }
  }

  return result
}

/**
 * Compute available time slots for a given week.
 * @param weekStart - Monday of the week (YYYY-MM-DD)
 * @param slotDurationMinutes - Minimum slot duration to return (120 for training, 90 for discovery)
 * @returns Available slots for the week
 */
export async function computeWeekAvailability(
  weekStart: string,
  slotDurationMinutes?: number
): Promise<WeekAvailability> {
  const weekEnd = new Date(`${weekStart}T12:00:00Z`)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  // Build ISO range for busy slot query
  const weekStartISO = new Date(`${weekStart}T00:00:00Z`).toISOString()
  const weekEndISO = new Date(`${weekEndStr}T23:59:59Z`).toISOString()

  const db = getSupabaseAdmin()

  const [templateRes, overridesRes, busyRes] = await Promise.all([
    db
      .from('instructor_availability')
      .select('day_of_week, start_time, end_time')
      .eq('is_active', true),
    db
      .from('availability_overrides')
      .select('override_date, is_available, start_time, end_time')
      .gte('override_date', weekStart)
      .lte('override_date', weekEndStr),
    db
      .from('slots')
      .select('start_time, end_time')
      .eq('is_booked', true)
      .gte('start_time', weekStartISO)
      .lte('end_time', weekEndISO),
  ])

  if (templateRes.error) throw new Error(templateRes.error.message)
  if (overridesRes.error) throw new Error(overridesRes.error.message)
  if (busyRes.error) throw new Error(busyRes.error.message)

  const availableSlots = computeAvailabilityFromData(
    weekStart,
    templateRes.data ?? [],
    overridesRes.data ?? [],
    busyRes.data ?? [],
    slotDurationMinutes
  )

  return {
    weekStart,
    weekEnd: weekEndStr,
    availableSlots,
  }
}
