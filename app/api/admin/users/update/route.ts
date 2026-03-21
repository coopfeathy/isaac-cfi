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

    const { userId, email, firstName, lastName, phone } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const fullName = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim()
    const supabaseAdmin = getSupabaseAdmin()

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email,
      user_metadata: {
        full_name: fullName || null,
        first_name: firstName || null,
        last_name: lastName || null,
      },
    })

    if (authUpdateError) {
      return NextResponse.json({ error: authUpdateError.message }, { status: 500 })
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName || null,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
      })
      .eq('id', userId)

    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message }, { status: 500 })
    }

    // Keep students table aligned when this auth user is tracked as a student.
    await supabaseAdmin
      .from('students')
      .update({
        full_name: fullName || email,
        email,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
