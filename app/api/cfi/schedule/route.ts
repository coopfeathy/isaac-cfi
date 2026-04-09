import { NextRequest, NextResponse } from 'next/server'
import { requireCFI } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const authCheck = await requireCFI(request)
  if ('error' in authCheck) return authCheck.error

  const { user } = authCheck
  const db = getSupabaseAdmin()

  // Step 1: Get students assigned to this CFI
  const { data: students, error: studentsError } = await db
    .from('students')
    .select('user_id, full_name, email')
    .eq('instructor_id', user.id)

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 })
  }

  if (!students || students.length === 0) {
    return NextResponse.json([])
  }

  const studentUserIds = students.map((s: { user_id: string }) => s.user_id)

  // Step 2: Compute date window (today through 7 days from now, UTC)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const sevenDaysLater = new Date(today)
  sevenDaysLater.setUTCDate(sevenDaysLater.getUTCDate() + 7)

  // Step 3: Get bookings with joined slot info for those students
  const { data: bookings, error: bookingsError } = await db
    .from('bookings')
    .select('id, status, notes, user_id, created_at, slots(start_time, end_time, type)')
    .in('user_id', studentUserIds)
    .in('status', ['pending', 'confirmed', 'completed'])
    .gte('slots.start_time', today.toISOString())
    .lte('slots.start_time', sevenDaysLater.toISOString())
    .order('slots(start_time)', { ascending: true })

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 })
  }

  // Step 4: Attach student name to each booking
  const studentMap = new Map(students.map((s: { user_id: string; full_name: string }) => [s.user_id, s.full_name]))

  const enriched = (bookings ?? [])
    .filter((b: { slots: unknown }) => b.slots !== null)
    .map((b: {
      id: string
      status: string
      notes: string | null
      user_id: string
      created_at: string
      slots: { start_time: string; end_time: string; type: string } | null
    }) => ({
      ...b,
      student_name: studentMap.get(b.user_id) ?? 'Unknown',
    }))

  return NextResponse.json(enriched)
}
