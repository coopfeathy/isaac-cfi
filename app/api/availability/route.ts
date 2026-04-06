import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const db = getSupabaseAdmin()

  const { data: template, error: tErr } = await db
    .from('instructor_availability')
    .select('*')
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time')

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 })
  }

  const { data: overrides, error: oErr } = await db
    .from('availability_overrides')
    .select('*')
    .gte('override_date', week)
    .lte('override_date', weekEndStr)
    .order('override_date')

  if (oErr) {
    return NextResponse.json({ error: oErr.message }, { status: 500 })
  }

  return NextResponse.json({ template, overrides })
}
