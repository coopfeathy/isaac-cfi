import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { computeWeekAvailability } from '@/lib/availability-engine'

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
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

  const week = request.nextUrl.searchParams.get('week')
  if (!week || !WEEK_RE.test(week)) {
    return NextResponse.json({ error: 'week query parameter is required in YYYY-MM-DD format' }, { status: 400 })
  }

  const weekStart = new Date(week)
  if (isNaN(weekStart.getTime())) {
    return NextResponse.json({ error: 'Invalid date for week parameter' }, { status: 400 })
  }

  const durationParam = request.nextUrl.searchParams.get('duration')
  const slotDurationMinutes = durationParam ? parseInt(durationParam, 10) : 120

  try {
    const availability = await computeWeekAvailability(week, slotDurationMinutes)
    return NextResponse.json(availability)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
