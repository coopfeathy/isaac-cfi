import { NextRequest, NextResponse } from 'next/server'
import { requireCFI } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const authResult = await requireCFI(request)
  if ('error' in authResult) return authResult.error
  const { user } = authResult
  const db = getSupabaseAdmin()

  // Get students for this CFI so we can look up names
  const { data: students, error: studentsError } = await db
    .from('students')
    .select('user_id, full_name')
    .eq('instructor_id', user.id)

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 })
  }

  const studentMap = new Map(
    (students ?? []).map((s: { user_id: string; full_name: string }) => [s.user_id, s.full_name])
  )

  // Get completions where instructor_id = this CFI
  const { data, error } = await db
    .from('student_lesson_completions')
    .select('id, student_id, instructor_id, completed_at, notes')
    .eq('instructor_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = (data ?? []).map((row: {
    id: string
    student_id: string
    instructor_id: string
    completed_at: string
    notes: string | null
  }) => ({
    ...row,
    student_name: studentMap.get(row.student_id) ?? 'Unknown',
  }))

  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest) {
  const authResult = await requireCFI(request)
  if ('error' in authResult) return authResult.error
  const { user } = authResult
  const db = getSupabaseAdmin()

  const body = await request.json()
  const { student_id, hours, date, notes } = body

  // Validate required fields (per D-14, T-03-10)
  if (!student_id || typeof student_id !== 'string') {
    return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
  }
  if (!hours || typeof hours !== 'number' || hours <= 0 || hours > 24) {
    return NextResponse.json({ error: 'hours must be a number between 0.1 and 24' }, { status: 400 })
  }
  if (!date || typeof date !== 'string') {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  // SECURITY: Verify student is in this CFI's roster (per D-02, T-03-05)
  const { data: student, error: studentError } = await db
    .from('students')
    .select('id, user_id, full_name')
    .eq('user_id', student_id)
    .eq('instructor_id', user.id)
    .single()

  if (studentError || !student) {
    return NextResponse.json({ error: 'Student not found in your roster' }, { status: 403 })
  }

  // Step 1: Insert into student_lesson_completions (per D-13)
  // syllabus_lesson_id is nullable (03-01 migration)
  const { error: insertError } = await db
    .from('student_lesson_completions')
    .insert({
      student_id: student_id,
      instructor_id: user.id,
      completed_at: date,
      notes: notes || null,
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Step 2: Atomic increment of student hours via Postgres RPC (per D-13, T-03-08)
  // Uses SET dual_hours = dual_hours + $1 — no read-then-write race condition
  const { error: hoursError } = await db.rpc('increment_student_hours', {
    p_student_user_id: student_id,
    p_hours: hours,
  })

  if (hoursError) {
    return NextResponse.json({ error: 'Failed to update student hours' }, { status: 500 })
  }

  return NextResponse.json(
    { success: true, student_name: student.full_name, hours_logged: hours },
    { status: 201 }
  )
}
