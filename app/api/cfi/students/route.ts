import { NextRequest, NextResponse } from 'next/server'
import { requireCFI } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const authResult = await requireCFI(request)
  if ('error' in authResult) return authResult.error

  const { user } = authResult
  const db = getSupabaseAdmin()

  // Step 1: Get students assigned to this CFI
  const { data: students, error: studentsError } = await db
    .from('students')
    .select('id, user_id, full_name, email, dual_hours, total_hours, created_at')
    .eq('instructor_id', user.id)
    .order('full_name', { ascending: true })

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 })
  }

  if (!students || students.length === 0) {
    return NextResponse.json([])
  }

  // Step 2: Get endorsement counts per student (batch query)
  const studentUserIds = students.map((s: { user_id: string }) => s.user_id)
  const { data: endorsements } = await db
    .from('student_endorsements')
    .select('student_id')
    .in('student_id', studentUserIds)

  // Count endorsements per student
  const endorsementCounts: Record<string, number> = {}
  if (endorsements) {
    for (const e of endorsements) {
      endorsementCounts[e.student_id] = (endorsementCounts[e.student_id] || 0) + 1
    }
  }

  // Step 3: Enrich students with endorsement count
  const enrichedStudents = students.map((s: {
    id: string
    user_id: string
    full_name: string
    email: string
    dual_hours: number | null
    total_hours: number | null
    created_at: string
  }) => ({
    ...s,
    endorsement_count: endorsementCounts[s.user_id] || 0,
  }))

  return NextResponse.json(enrichedStudents)
}
