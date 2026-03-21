import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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
      .select('user_id')
      .not('user_id', 'is', null)

    const existingUserIds = new Set((students || []).map((row) => row.user_id).filter(Boolean))
    const missingUserIds = enrolledUserIds.filter((id) => !existingUserIds.has(id))

    if (missingUserIds.length === 0) {
      return NextResponse.json({ success: true, created: 0 })
    }

    const usersResult = await supabaseAdmin.auth.admin.listUsers()
    const usersById = new Map((usersResult.data?.users || []).map((u) => [u.id, u]))

    const inserts = missingUserIds.map((id) => {
      const authUser = usersById.get(id)
      const first = String(authUser?.user_metadata?.first_name || '').trim()
      const last = String(authUser?.user_metadata?.last_name || '').trim()
      const full = String(authUser?.user_metadata?.full_name || `${first} ${last}`.trim()).trim()

      return {
        user_id: id,
        full_name: full || authUser?.email || 'Student',
        email: authUser?.email || null,
        status: 'active',
      }
    })

    const { error: insertError } = await supabaseAdmin.from('students').insert(inserts)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, created: inserts.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
