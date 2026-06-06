import { NextRequest, NextResponse } from 'next/server'
import { requireCFI } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const authCheck = await requireCFI(request)
  if ('error' in authCheck) return authCheck.error

  const { user } = authCheck

  let body: {
    student_user_id: string
    start_time: string
    end_time: string
    type: string
    notes?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { student_user_id, start_time, end_time, type, notes } = body

  if (!student_user_id || !start_time || !end_time || !type) {
    return NextResponse.json(
      { error: 'student_user_id, start_time, end_time, and type are required' },
      { status: 400 }
    )
  }

  if (new Date(start_time) >= new Date(end_time)) {
    return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 })
  }

  const db = getSupabaseAdmin()

  // Confirm the student belongs to this CFI
  const { data: student, error: studentErr } = await db
    .from('students')
    .select('user_id, full_name')
    .eq('user_id', student_user_id)
    .eq('instructor_id', user.id)
    .single()

  if (studentErr || !student) {
    return NextResponse.json({ error: 'Student not found or not assigned to you' }, { status: 404 })
  }

  // Create slot
  const { data: slot, error: slotErr } = await db
    .from('slots')
    .insert({
      start_time,
      end_time,
      type,
      instructor_id: user.id,
    })
    .select('id, start_time, end_time, type')
    .single()

  if (slotErr || !slot) {
    return NextResponse.json({ error: slotErr?.message ?? 'Could not create slot' }, { status: 500 })
  }

  // Create booking
  const { data: booking, error: bookingErr } = await db
    .from('bookings')
    .insert({
      slot_id: slot.id,
      user_id: student_user_id,
      status: 'pending',
      notes: notes ?? null,
    })
    .select('id, status, notes, user_id, created_at')
    .single()

  if (bookingErr || !booking) {
    // Best effort cleanup of slot
    await db.from('slots').delete().eq('id', slot.id)
    return NextResponse.json({ error: bookingErr?.message ?? 'Could not create booking' }, { status: 500 })
  }

  return NextResponse.json({
    lesson: {
      id: booking.id,
      student_user_id: booking.user_id,
      student_name: student.full_name,
      start_time: slot.start_time,
      end_time: slot.end_time,
      type: slot.type,
      status: booking.status,
      notes: booking.notes,
    },
  })
}
