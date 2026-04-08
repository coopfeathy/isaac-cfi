import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const normalizeEmail = (value: string | null | undefined) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const body = await request.json().catch(() => ({}))
    const studentRecordId = typeof body.studentRecordId === 'string' ? body.studentRecordId : ''

    if (!studentRecordId) {
      return NextResponse.json({ error: 'studentRecordId is required' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, user_id, email, full_name')
      .eq('id', studentRecordId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const email = normalizeEmail(student.email)
    if (!email) {
      return NextResponse.json({ error: 'Student record does not have an email address' }, { status: 400 })
    }

    if (student.user_id) {
      return NextResponse.json({
        success: true,
        linked: true,
        invited: false,
        message: 'Student already has a linked account',
      })
    }

    const usersResult = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const matchingAuthUser = (usersResult.data?.users || []).find((candidate) => normalizeEmail(candidate.email) === email)

    if (matchingAuthUser?.id) {
      const { error: linkError } = await supabaseAdmin
        .from('students')
        .update({
          user_id: matchingAuthUser.id,
          full_name: student.full_name || matchingAuthUser.user_metadata?.full_name || email,
          email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id)

      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        linked: true,
        invited: false,
        message: 'Existing account linked successfully',
      })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    const redirectTo = siteUrl ? `${siteUrl.replace(/\/$/, '')}/login?setup=1` : undefined

    const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        full_name: student.full_name || null,
      },
    })

    if (inviteResult.error) {
      return NextResponse.json({ error: inviteResult.error.message }, { status: 400 })
    }

    const invitedUserId = inviteResult.data.user?.id || null
    if (invitedUserId) {
      const { error: linkError } = await supabaseAdmin
        .from('students')
        .update({
          user_id: invitedUserId,
          full_name: student.full_name || email,
          email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id)

      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: true,
      linked: Boolean(invitedUserId),
      invited: true,
      message: 'Account setup invite sent',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
