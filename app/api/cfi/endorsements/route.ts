import { NextRequest, NextResponse } from 'next/server'
import { requireCFI } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const VALID_ENDORSEMENT_TYPES = [
  'solo',
  'xc_solo',
  'night_solo',
  'checkride_prep',
  'instrument_proficiency_check',
  'flight_review',
  'other',
] as const

export async function GET(request: NextRequest) {
  const authResult = await requireCFI(request)
  if ('error' in authResult) return authResult.error
  const { user } = authResult
  const db = getSupabaseAdmin()

  const { data, error } = await db
    .from('student_endorsements')
    .select('*')
    .eq('instructor_id', user.id)
    .order('endorsed_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const authResult = await requireCFI(request)
  if ('error' in authResult) return authResult.error
  const { user } = authResult
  const db = getSupabaseAdmin()

  const body = await request.json()
  const { student_id, endorsement_type, notes } = body

  // Validate required fields
  if (!student_id || typeof student_id !== 'string') {
    return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
  }

  if (!endorsement_type || !VALID_ENDORSEMENT_TYPES.includes(endorsement_type)) {
    return NextResponse.json(
      { error: `endorsement_type must be one of: ${VALID_ENDORSEMENT_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  // SECURITY: Verify student is in this CFI's roster (per T-03-06)
  const { data: student, error: studentError } = await db
    .from('students')
    .select('id, user_id, full_name')
    .eq('user_id', student_id)
    .eq('instructor_id', user.id)
    .single()

  if (studentError || !student) {
    return NextResponse.json({ error: 'Student not found in your roster' }, { status: 403 })
  }

  // Insert endorsement (per D-15)
  // endorsed_at defaults to NOW() in Postgres
  const { data: endorsement, error: insertError } = await db
    .from('student_endorsements')
    .insert({
      student_id: student_id,
      instructor_id: user.id,
      endorsement_type: endorsement_type,
      notes: notes || null,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(endorsement, { status: 201 })
}
