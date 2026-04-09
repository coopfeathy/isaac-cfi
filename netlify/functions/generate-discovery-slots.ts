/**
 * generate-discovery-slots
 *
 * Netlify scheduled function that runs daily and maintains a rolling window
 * of discovery flight slots in Supabase, driven entirely by env variables.
 *
 * Required env vars:
 *   DISCOVERY_SLOT_ACTIVE_WEEKDAYS      – comma-separated day-of-week numbers (0=Sun … 6=Sat)
 *                                         e.g. "0,6" for Saturday & Sunday
 *   DISCOVERY_SLOT_TEMPLATE_TIMES       – comma-separated HH:MM times (24hr, Eastern)
 *                                         e.g. "10:00,14:00" for two slots per active day
 *   DISCOVERY_SLOT_DURATION_MINUTES     – length of each slot in minutes, e.g. "90"
 *   DISCOVERY_SLOT_PRICE_CENTS          – price in cents, e.g. "25000" for $250.00
 *   DISCOVERY_SLOT_GENERATION_DAYS_AHEAD – total days ahead to keep slots filled, e.g. "30"
 *   DISCOVERY_SLOT_MIN_DAYS_OUT         – minimum days in the future before creating a slot, e.g. "2"
 */

import type { Config, Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Runs every day at 07:00 UTC to keep slots filled
export const config: Config = {
  schedule: '0 7 * * *',
}

/**
 * Convert a local wall-clock time in `timezone` to a UTC ms timestamp.
 * Works correctly across DST transitions.
 */
function localToUtcMs(
  year: number,
  month: number, // 1-based
  day: number,
  hour: number,
  minute: number,
  timezone: string,
): number {
  // Step 1: treat the desired local time as if it were UTC to get an approximate baseline
  const approxUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0)

  // Step 2: find what local time that UTC moment maps to in the target timezone
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })
  const parts = dtf.formatToParts(new Date(approxUtcMs))
  const p: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') p[part.type] = parseInt(part.value, 10)
  }

  // Normalize midnight represented as hour=24
  const localH = p.hour === 24 ? 0 : p.hour
  const approxLocalMs = Date.UTC(p.year, p.month - 1, p.day, localH, p.minute, p.second ?? 0)

  // Step 3: compute the UTC offset for this particular moment (handles DST)
  const offsetMs = approxLocalMs - approxUtcMs

  // Step 4: desired UTC = desired local (treated as UTC) minus the offset
  return approxUtcMs - offsetMs
}

function normalizeToMinute(isoString: string): string {
  const d = new Date(isoString)
  d.setSeconds(0, 0)
  return d.toISOString()
}

const handler: Handler = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[generate-discovery-slots] Missing Supabase environment variables')
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase environment variables' }),
    }
  }

  // ── Read configuration from existing Netlify env vars ─────────────────────
  const rawWeekdays = (process.env.DISCOVERY_SLOT_ACTIVE_WEEKDAYS || '').trim()
  const rawTimes = (process.env.DISCOVERY_SLOT_TEMPLATE_TIMES || '').trim()
  const durationMinutes = Math.max(1, parseInt(process.env.DISCOVERY_SLOT_DURATION_MINUTES || '90', 10))
  const priceCents = Math.max(0, parseInt(process.env.DISCOVERY_SLOT_PRICE_CENTS || '25000', 10))
  const daysAhead = Math.max(1, parseInt(process.env.DISCOVERY_SLOT_GENERATION_DAYS_AHEAD || '30', 10))
  const minDaysOut = Math.max(0, parseInt(process.env.DISCOVERY_SLOT_MIN_DAYS_OUT || '1', 10))
  // Timezone is Eastern — hardcoded to match existing slot config
  const timezone = 'America/New_York'

  if (!rawWeekdays) {
    console.log('[generate-discovery-slots] DISCOVERY_SLOT_ACTIVE_WEEKDAYS not set — skipping')
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'DISCOVERY_SLOT_ACTIVE_WEEKDAYS not configured, nothing to do' }),
    }
  }

  if (!rawTimes) {
    console.log('[generate-discovery-slots] DISCOVERY_SLOT_TEMPLATE_TIMES not set — skipping')
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'DISCOVERY_SLOT_TEMPLATE_TIMES not configured, nothing to do' }),
    }
  }

  // Parse weekdays e.g. "0,6" or "1,2,3,4,5"
  const slotDays = rawWeekdays
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d) && d >= 0 && d <= 6)

  // Parse times e.g. "10:00" or "09:00,13:00,16:00"
  const slotTimes = rawTimes
    .split(',')
    .map((t) => {
      const parts = t.trim().split(':').map(Number)
      return { hour: parts[0] ?? 10, minute: parts[1] ?? 0 }
    })

  if (slotDays.length === 0 || slotTimes.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'No valid days or times parsed from env vars' }),
    }
  }

  console.log('[generate-discovery-slots] Config:', {
    slotDays,
    slotTimes,
    durationMinutes,
    priceCents,
    daysAhead,
    minDaysOut,
    timezone,
  })

  // ── Connect to Supabase ────────────────────────────────────────────────────
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const now = new Date()
  // minDaysOut: don't create slots sooner than this many days from now
  const windowStart = new Date(now.getTime() + minDaysOut * 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  // ── Fetch existing tour slots in the window to avoid duplicates ──────────
  const { data: existingSlots, error: fetchError } = await supabase
    .from('slots')
    .select('start_time')
    .eq('type', 'tour')
    .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString())

  if (fetchError) {
    console.error('[generate-discovery-slots] Error fetching existing slots:', fetchError)
    return { statusCode: 500, body: JSON.stringify({ error: fetchError.message }) }
  }

  const existingSet = new Set(
    (existingSlots ?? []).map((s) => normalizeToMinute(s.start_time)),
  )

  // ── Build list of slots to create ─────────────────────────────────────────
  type NewSlot = {
    start_time: string
    end_time: string
    type: string
    price: number
    description: string
  }
  const slotsToCreate: NewSlot[] = []

  // Iterate day-by-day across the window
  const cursor = new Date(windowStart)
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= windowEnd) {
    if (slotDays.includes(cursor.getDay())) {
      const y = cursor.getFullYear()
      const m = cursor.getMonth() + 1
      const d = cursor.getDate()

      for (const { hour, minute } of slotTimes) {
        const startUtcMs = localToUtcMs(y, m, d, hour, minute, timezone)
        const startDate = new Date(startUtcMs)
        const endDate = new Date(startUtcMs + durationMinutes * 60 * 1000)

        // Must be strictly after the windowStart (handles same-day edge case)
        if (startDate >= windowStart) {
          const key = normalizeToMinute(startDate.toISOString())
          if (!existingSet.has(key)) {
            slotsToCreate.push({
              start_time: startDate.toISOString(),
              end_time: endDate.toISOString(),
              type: 'tour',
              price: priceCents,
              description: 'Discovery Flight',
            })
            existingSet.add(key)
          }
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  if (slotsToCreate.length === 0) {
    console.log('[generate-discovery-slots] All slots already exist in window')
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'All slots already exist', created: 0 }),
    }
  }

  // ── Insert new slots ───────────────────────────────────────────────────────
  const { data: inserted, error: insertError } = await supabase
    .from('slots')
    .insert(slotsToCreate)
    .select('id, start_time')

  if (insertError) {
    console.error('[generate-discovery-slots] Insert error:', insertError)
    return { statusCode: 500, body: JSON.stringify({ error: insertError.message }) }
  }

  const createdCount = (inserted ?? []).length
  console.log(`[generate-discovery-slots] Created ${createdCount} new discovery flight slots`)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Created ${createdCount} discovery flight slot${createdCount !== 1 ? 's' : ''}`,
      created: createdCount,
      slots: (inserted ?? []).map((s) => ({ id: s.id, start_time: s.start_time })),
    }),
  }
}

export { handler }
