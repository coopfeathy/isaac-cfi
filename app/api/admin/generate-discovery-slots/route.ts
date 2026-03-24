import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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

export async function POST() {
  // Verify admin session
  const cookieStore = await cookies()
  const supabaseClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    },
  )

  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Read config from env vars (same as the scheduled function)
  const rawWeekdays = (process.env.DISCOVERY_SLOT_ACTIVE_WEEKDAYS || '').trim()
  const rawTimes = (process.env.DISCOVERY_SLOT_TEMPLATE_TIMES || '').trim()
  const durationMinutes = Math.max(1, parseInt(process.env.DISCOVERY_SLOT_DURATION_MINUTES || '90', 10))
  const priceCents = Math.max(0, parseInt(process.env.DISCOVERY_SLOT_PRICE_CENTS || '25000', 10))
  const daysAhead = Math.max(1, parseInt(process.env.DISCOVERY_SLOT_GENERATION_DAYS_AHEAD || '30', 10))
  const minDaysOut = Math.max(0, parseInt(process.env.DISCOVERY_SLOT_MIN_DAYS_OUT || '1', 10))
  const timezone = 'America/New_York'

  if (!rawWeekdays || !rawTimes) {
    return NextResponse.json(
      { error: 'DISCOVERY_SLOT_ACTIVE_WEEKDAYS and DISCOVERY_SLOT_TEMPLATE_TIMES must be set in environment variables' },
      { status: 400 },
    )
  }

  const slotDays = rawWeekdays
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d) && d >= 0 && d <= 6)

  const slotTimes = rawTimes
    .split(',')
    .map((t) => {
      const parts = t.trim().split(':').map(Number)
      return { hour: parts[0] ?? 10, minute: parts[1] ?? 0 }
    })

  const now = new Date()
  const windowStart = new Date(now.getTime() + minDaysOut * 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const { data: existingSlots, error: fetchError } = await supabase
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

  const { data: inserted, error: insertError } = await supabase
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
