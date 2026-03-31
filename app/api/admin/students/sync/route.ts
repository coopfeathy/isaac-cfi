import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const normalizeEmail = (value: string | null | undefined) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const deriveNameFromEmail = (email: string | null | undefined) => {
  const normalized = normalizeEmail(email)
  if (!normalized) return 'Student'
  const localPart = normalized.split('@')[0] || ''
  const words = localPart
    .replace(/[^a-z0-9._-]/gi, '')
    .split(/[._-]+/)
    .filter(Boolean)

  if (words.length === 0) return 'Student'

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const supabaseAdmin = getSupabaseAdmin()

    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('student_id')

    const enrolledUserIds = Array.from(new Set((enrollments || []).map((row) => row.student_id).filter(Boolean)))

    if (enrolledUserIds.length === 0) {
      return NextResponse.json({ success: true, created: 0 })
    }

    const { data: students } = await supabaseAdmin
      .from('students')
      .select('id, user_id, email, full_name, status')

    const existingUserIds = new Set((students || []).map((row) => row.user_id).filter(Boolean))
    const missingUserIds = enrolledUserIds.filter((id) => !existingUserIds.has(id))

    const usersResult = await supabaseAdmin.auth.admin.listUsers()
    const usersById = new Map((usersResult.data?.users || []).map((u) => [u.id, u]))

    const studentsByEmail = new Map(
      (students || [])
        .map((row) => ({ ...row, normalizedEmail: normalizeEmail(row.email) }))
        .filter((row) => row.normalizedEmail)
        .map((row) => [row.normalizedEmail, row])
    )

    const updates: Array<{
      id: string
      user_id?: string
      email?: string | null
      full_name?: string
      status?: string
      updated_at: string
    }> = []

    const inserts: Array<{
      user_id: string
      full_name: string
      email: string | null
      status: string
    }> = []

    missingUserIds.forEach((id) => {
      const authUser = usersById.get(id)
      const authEmail = normalizeEmail(authUser?.email)
      const first = String(authUser?.user_metadata?.first_name || '').trim()
      const last = String(authUser?.user_metadata?.last_name || '').trim()
      const full = String(authUser?.user_metadata?.full_name || `${first} ${last}`.trim()).trim()

      const matchingEmailStudent = authEmail ? studentsByEmail.get(authEmail) : null
      const resolvedName = full || deriveNameFromEmail(authUser?.email)

      if (matchingEmailStudent?.id) {
        updates.push({
          id: matchingEmailStudent.id,
          user_id: id,
          email: authUser?.email || matchingEmailStudent.email || null,
          full_name: resolvedName,
          status: matchingEmailStudent.status || 'active',
          updated_at: new Date().toISOString(),
        })
        return
      }

      inserts.push({
        user_id: id,
        full_name: resolvedName,
        email: authUser?.email || null,
        status: 'active',
      })
    })

    let updated = 0
    for (const update of updates) {
      const { id, ...payload } = update
      const { error: updateError } = await supabaseAdmin
        .from('students')
        .update(payload)
        .eq('id', id)

      if (!updateError) {
        updated += 1
      }
    }

    if (inserts.length === 0) {
      return NextResponse.json({ success: true, created: 0, updated })
    }

    const dedupedInserts = inserts.filter((row, index) => {
      const firstIndex = inserts.findIndex((candidate) => candidate.user_id === row.user_id)
      return firstIndex === index
    })

    const { error: insertError } = await supabaseAdmin.from('students').insert(dedupedInserts)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, created: dedupedInserts.length, updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
