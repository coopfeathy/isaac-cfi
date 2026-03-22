import type { Config, Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

type TimeRange = {
  start: Date
  end: Date
}

export const config: Config = {
  // Every 6 hours.
  schedule: '0 */6 * * *',
}

const GENERATION_DAYS_AHEAD = Number(process.env.DISCOVERY_SLOT_GENERATION_DAYS_AHEAD || '45')
const MIN_DAYS_OUT = Number(process.env.DISCOVERY_SLOT_MIN_DAYS_OUT || '14')
const SLOT_DURATION_MINUTES = Number(process.env.DISCOVERY_SLOT_DURATION_MINUTES || '90')
const SLOT_PRICE_CENTS = Number(process.env.DISCOVERY_SLOT_PRICE_CENTS || '29900')
const SLOT_TIMES = String(process.env.DISCOVERY_SLOT_TEMPLATE_TIMES || '09:00,12:00,15:00')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const ACTIVE_WEEKDAYS = new Set(
  String(process.env.DISCOVERY_SLOT_ACTIVE_WEEKDAYS || '1,2,3,4,5,6')
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
)

function toDateOnlyIso(date: Date): string {
  return date.toISOString().split('T')[0]
}

function parseHourMinute(timeText: string): { hour: number; minute: number } | null {
  const [hourPart, minutePart] = timeText.split(':')
  const hour = Number.parseInt(hourPart || '', 10)
  const minute = Number.parseInt(minutePart || '', 10)

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

  return { hour, minute }
}

function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end
}

function unfoldIcsLines(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const unfolded: string[] = []

  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1)
    } else {
      unfolded.push(line)
    }
  }

  return unfolded
}

function parseIcsDateValue(value: string): Date | null {
  const compact = value.trim()

  if (/^\d{8}$/.test(compact)) {
    const year = Number.parseInt(compact.slice(0, 4), 10)
    const month = Number.parseInt(compact.slice(4, 6), 10)
    const day = Number.parseInt(compact.slice(6, 8), 10)
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  }

  if (/^\d{8}T\d{6}Z$/.test(compact)) {
    const year = Number.parseInt(compact.slice(0, 4), 10)
    const month = Number.parseInt(compact.slice(4, 6), 10)
    const day = Number.parseInt(compact.slice(6, 8), 10)
    const hour = Number.parseInt(compact.slice(9, 11), 10)
    const minute = Number.parseInt(compact.slice(11, 13), 10)
    const second = Number.parseInt(compact.slice(13, 15), 10)
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  }

  if (/^\d{8}T\d{6}$/.test(compact)) {
    const year = Number.parseInt(compact.slice(0, 4), 10)
    const month = Number.parseInt(compact.slice(4, 6), 10)
    const day = Number.parseInt(compact.slice(6, 8), 10)
    const hour = Number.parseInt(compact.slice(9, 11), 10)
    const minute = Number.parseInt(compact.slice(11, 13), 10)
    const second = Number.parseInt(compact.slice(13, 15), 10)
    return new Date(year, month - 1, day, hour, minute, second)
  }

  return null
}

function parseIcsBusyRanges(icsText: string): TimeRange[] {
  const lines = unfoldIcsLines(icsText)
  const events: TimeRange[] = []

  let dtStart: Date | null = null
  let dtEnd: Date | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      dtStart = null
      dtEnd = null
      continue
    }

    if (line === 'END:VEVENT') {
      if (dtStart && dtEnd && dtEnd > dtStart) {
        events.push({ start: dtStart, end: dtEnd })
      }
      dtStart = null
      dtEnd = null
      continue
    }

    if (line.startsWith('DTSTART')) {
      const [, rawValue] = line.split(':', 2)
      dtStart = rawValue ? parseIcsDateValue(rawValue) : null
      continue
    }

    if (line.startsWith('DTEND')) {
      const [, rawValue] = line.split(':', 2)
      dtEnd = rawValue ? parseIcsDateValue(rawValue) : null
    }
  }

  return events
}

async function getExternalBusyRanges(): Promise<TimeRange[]> {
  const icsUrl = process.env.APPLE_CALENDAR_ICS_URL
  if (!icsUrl) return []

  const response = await fetch(icsUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch APPLE_CALENDAR_ICS_URL: HTTP ${response.status}`)
  }

  const body = await response.text()
  return parseIcsBusyRanges(body)
}

const handler: Handler = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase environment variables' }),
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const now = new Date()
  const startBoundary = new Date(now)
  startBoundary.setDate(startBoundary.getDate() + MIN_DAYS_OUT)
  startBoundary.setHours(0, 0, 0, 0)

  const endBoundary = new Date(now)
  endBoundary.setDate(endBoundary.getDate() + GENERATION_DAYS_AHEAD)
  endBoundary.setHours(23, 59, 59, 999)

  try {
    const [{ data: existingSlots, error: existingSlotsError }, externalBusyRanges] = await Promise.all([
      supabaseAdmin
        .from('slots')
        .select('id, start_time, end_time, is_booked, type, description')
        .gte('start_time', startBoundary.toISOString())
        .lte('start_time', endBoundary.toISOString()),
      getExternalBusyRanges(),
    ])

    if (existingSlotsError) throw existingSlotsError

    const slotRanges = (existingSlots || []).map((slot) => ({
      id: slot.id,
      type: slot.type,
      description: slot.description,
      is_booked: slot.is_booked,
      start: new Date(slot.start_time),
      end: new Date(slot.end_time),
    }))

    const autoDiscoverySlots = slotRanges.filter((slot) => {
      const isDiscoveryType = slot.type === 'tour'
      const hasDiscoveryDescription = (slot.description || '').toLowerCase().includes('discovery flight')
      return isDiscoveryType && hasDiscoveryDescription
    })

    const staleAutoSlotIds = autoDiscoverySlots
      .filter((slot) => !slot.is_booked)
      .filter((slot) => externalBusyRanges.some((busy) => rangesOverlap(slot, busy)))
      .map((slot) => slot.id)

    let removedConflictingSlots = 0
    if (staleAutoSlotIds.length > 0) {
      const { data: removedRows, error: removeError } = await supabaseAdmin
        .from('slots')
        .delete()
        .in('id', staleAutoSlotIds)
        .select('id')

      if (removeError) throw removeError
      removedConflictingSlots = (removedRows || []).length
    }

    const blockedRanges: TimeRange[] = [
      ...slotRanges.filter((slot) => !staleAutoSlotIds.includes(slot.id)),
      ...externalBusyRanges,
    ]

    const inserts: Array<{
      start_time: string
      end_time: string
      type: 'tour'
      price: number
      description: string
      is_booked: boolean
    }> = []

    const cursor = new Date(startBoundary)
    while (cursor <= endBoundary) {
      if (!ACTIVE_WEEKDAYS.has(cursor.getDay())) {
        cursor.setDate(cursor.getDate() + 1)
        continue
      }

      for (const templateTime of SLOT_TIMES) {
        const parsed = parseHourMinute(templateTime)
        if (!parsed) continue

        const slotStart = new Date(cursor)
        slotStart.setHours(parsed.hour, parsed.minute, 0, 0)

        const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000)
        const candidateRange = { start: slotStart, end: slotEnd }

        const hasConflict = blockedRanges.some((range) => rangesOverlap(candidateRange, range))
        if (hasConflict) continue

        inserts.push({
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          type: 'tour',
          price: SLOT_PRICE_CENTS,
          description: 'Discovery Flight',
          is_booked: false,
        })

        blockedRanges.push(candidateRange)
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    let createdSlots = 0
    if (inserts.length > 0) {
      const { data: insertedRows, error: insertError } = await supabaseAdmin
        .from('slots')
        .insert(inserts)
        .select('id')

      if (insertError) throw insertError
      createdSlots = (insertedRows || []).length
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        createdSlots,
        removedConflictingSlots,
        fromDate: toDateOnlyIso(startBoundary),
        toDate: toDateOnlyIso(endBoundary),
      }),
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error?.message || 'Failed to auto-generate discovery slots',
      }),
    }
  }
}

export { handler }
