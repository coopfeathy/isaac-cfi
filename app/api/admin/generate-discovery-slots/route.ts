import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function localToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
): number {
  const approxUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0)
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
  const localH = p.hour === 24 ? 0 : p.hour
  const approxLocalMs = Date.UTC(p.year, p.month - 1, p.day, localH, p.minute, p.second ?? 0)
  const offsetMs = approxLocalMs - approxUtcMs
  return approxUtcMs - offsetMs
}

function normalizeToMinute(isoString: string): string {
  const d = new Date(isoString)
  d.setSeconds(0, 0)
  return d.toISOString()
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Read config from discovery_slot_config table first, fall back to env vars
  const { data: dbConfig } = await supabaseAdmin
    .from('discovery_slot_config')
    .select('*')
    .limit(1)
    .single()

  const rawWeekdays = (dbConfig?.active_weekdays || process.env.DISCOVERY_SLOT_ACTIVE_WEEKDAYS || '').trim()
  const rawTimes = (dbConfig?.template_times || process.env.DISCOVERY_SLOT_TEMPLATE_TIMES || '').trim()
  const durationMinutes = Math.max(1, dbConfig?.duration_minutes || parseInt(process.env.DISCOVERY_SLOT_DURATION_MINUTES || '90', 10))
  const priceCents = Math.max(0, dbConfig?.price_cents || parseInt(process.env.DISCOVERY_SLOT_PRICE_CENTS || '25000', 10))
  const daysAhead = Math.max(1, dbConfig?.generation_days_ahead || parseInt(process.env.DISCOVERY_SLOT_GENERATION_DAYS_AHEAD || '30', 10))
  const minDaysOut = Math.max(0, dbConfig?.min_days_out !== undefined ? dbConfig.min_days_out : parseInt(process.env.DISCOVERY_SLOT_MIN_DAYS_OUT || '1', 10))
  const timezone = 'America/New_York'

  if (!rawWeekdays || !rawTimes) {
    return NextResponse.json(
      { error: 'No schedule configuration found. Set DISCOVERY_SLOT_ACTIVE_WEEKDAYS and DISCOVERY_SLOT_TEMPLATE_TIMES in env vars or configure the schedule in the admin Slots tab.' },
      { status: 400 },
    )
  }

  const slotDays = rawWeekdays
    .split(',')
    .map((d: string) => parseInt(d.trim(), 10))
    .filter((d: number) => !isNaN(d) && d >= 0 && d <= 6)

  const slotTimes = rawTimes
    .split(',')
    .map((t: string) => {
      const parts = t.trim().split(':').map(Number)
      return { hour: parts[0] ?? 10, minute: parts[1] ?? 0 }
    })

  const now = new Date()
  const windowStart = new Date(now.getTime() + minDaysOut * 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const { data: existingSlots, error: fetchError } = await supabaseAdmin
    .from('slots')
    .select('start_time')
    .eq('type', 'tour')
    .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString())

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const existingSet = new Set(
    (existingSlots ?? []).map((s) => normalizeToMinute(s.start_time)),
  )

  type NewSlot = {
    start_time: string
    end_time: string
    type: string
    price: number
    description: string
  }
  const slotsToCreate: NewSlot[] = []

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
    return NextResponse.json({ message: 'All slots already exist in window', created: 0 })
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('slots')
    .insert(slotsToCreate)
    .select('id, start_time')

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: `Created ${inserted?.length ?? 0} discovery flight slots`,
    created: inserted?.length ?? 0,
  })
}
