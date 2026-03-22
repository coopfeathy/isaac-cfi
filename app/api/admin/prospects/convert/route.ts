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

    const { prospectId } = await request.json()
    if (!prospectId) return NextResponse.json({ error: 'Missing prospectId' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()

    const { data: prospect, error: prospectError } = await supabaseAdmin
      .from('prospects')
      .select('id, full_name, email, phone, notes, status')
      .eq('id', prospectId)
      .single()

    if (prospectError || !prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    const existingStudentQuery = prospect.email
      ? supabaseAdmin.from('students').select('id').eq('email', prospect.email).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any)

    const existingStudent = await existingStudentQuery
    const normalizedEmail = prospect.email?.trim().toLowerCase() || null
    const authUsers = normalizedEmail ? await supabaseAdmin.auth.admin.listUsers() : null
    const matchingAuthUser = normalizedEmail
      ? authUsers?.data?.users?.find((candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail) || null
      : null

    if (existingStudent?.data?.id) {
      const { error: updateStudentError } = await supabaseAdmin
        .from('students')
        .update({
          user_id: matchingAuthUser?.id,
          full_name: prospect.full_name,
          phone: prospect.phone,
          notes: prospect.notes,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingStudent.data.id)

      if (updateStudentError) {
        return NextResponse.json({ error: updateStudentError.message }, { status: 500 })
      }
    } else {
      const { error: insertStudentError } = await supabaseAdmin.from('students').insert([
        {
          user_id: matchingAuthUser?.id || null,
          full_name: prospect.full_name || prospect.email || 'New Student',
          email: prospect.email,
          phone: prospect.phone,
          notes: prospect.notes,
          status: 'active',
        },
      ])

      if (insertStudentError) {
        return NextResponse.json({ error: insertStudentError.message }, { status: 500 })
      }
    }

    const { error: updateProspectError } = await supabaseAdmin
      .from('prospects')
      .update({
        status: 'converted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', prospectId)

    if (updateProspectError) {
      return NextResponse.json({ error: updateProspectError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
