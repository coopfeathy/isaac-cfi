import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

/**
 * GET /api/student/slots
 *
 * Returns available (unbooked) lesson slots for the given date range.
 * Public endpoint — no authentication required per BOOK-01.
 *
 * Query params:
 *   start  ISO 8601 datetime (defaults to now)
 *   end    ISO 8601 datetime (defaults to 14 days from now)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start') || new Date().toISOString()
  const endDate = searchParams.get('end') || new Date(Date.now() + 14 * 86400000).toISOString()

  const { data: slots, error } = await supabase
    .from('slots')
    .select('id, start_time, end_time, type, description, price, is_booked, instructor_id')
    .eq('is_booked', false)
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .order('start_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ slots })
}
