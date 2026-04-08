import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const body = await request.json().catch(() => ({}))
    const targetCourseId = typeof body?.targetCourseId === 'string' ? body.targetCourseId : ''
    const sourceCourseIds = Array.isArray(body?.sourceCourseIds)
      ? body.sourceCourseIds.filter((value: unknown) => typeof value === 'string' && value !== targetCourseId)
      : []

    if (!targetCourseId || sourceCourseIds.length === 0) {
      return NextResponse.json(
        { error: 'targetCourseId and at least one sourceCourseId are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: sourceEnrollments, error: sourceError } = await supabaseAdmin
      .from('enrollments')
      .select('course_id, student_id, assigned_at, started_at, completed_at')
      .in('course_id', sourceCourseIds)
      .order('assigned_at', { ascending: true })

    if (sourceError) {
      return NextResponse.json({ error: sourceError.message }, { status: 400 })
    }

    if (!sourceEnrollments || sourceEnrollments.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, skipped: 0, message: 'No source enrollments found' })
    }

    const { data: targetEnrollments, error: targetError } = await supabaseAdmin
      .from('enrollments')
      .select('student_id')
      .eq('course_id', targetCourseId)

    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 400 })
    }

    const existingStudentIds = new Set((targetEnrollments || []).map((row: any) => row.student_id).filter(Boolean))

    const enrollmentByStudentId = new Map<string, any>()
    sourceEnrollments.forEach((row: any) => {
      if (!row?.student_id) return
      if (!enrollmentByStudentId.has(row.student_id)) {
        enrollmentByStudentId.set(row.student_id, row)
      }
    })

    const inserts = Array.from(enrollmentByStudentId.values())
      .filter((row: any) => !existingStudentIds.has(row.student_id))
      .map((row: any) => ({
        course_id: targetCourseId,
        student_id: row.student_id,
        assigned_at: row.assigned_at || new Date().toISOString(),
        started_at: row.started_at || null,
        completed_at: row.completed_at || null,
      }))

    if (inserts.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, skipped: enrollmentByStudentId.size, message: 'All students already enrolled on target course' })
    }

    const { error: insertError } = await supabaseAdmin.from('enrollments').insert(inserts)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      inserted: inserts.length,
      skipped: Math.max(0, enrollmentByStudentId.size - inserts.length),
      sourceCourseIds,
      targetCourseId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
