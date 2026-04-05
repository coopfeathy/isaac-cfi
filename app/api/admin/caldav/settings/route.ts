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

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user }
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('caldav_settings')
      .select('id, user_id, apple_id, calendar_url, last_sync_at, sync_in_progress, is_active, created_at, updated_at')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data || null })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const body = await request.json().catch(() => ({}))
    const appleId = typeof body.apple_id === 'string' ? body.apple_id.trim() : ''
    const calendarUrl = typeof body.calendar_url === 'string' && body.calendar_url.trim() ? body.calendar_url.trim() : null
    const isActive = typeof body.is_active === 'boolean' ? body.is_active : false

    if (!appleId) {
      return NextResponse.json({ error: 'Apple ID is required' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Check if settings already exist
    const { data: existing } = await supabaseAdmin
      .from('caldav_settings')
      .select('id')
      .limit(1)
      .single()

    if (existing) {
      // Update existing
      const { error: updateError } = await supabaseAdmin
        .from('caldav_settings')
        .update({
          apple_id: appleId,
          calendar_url: calendarUrl,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      // Create new
      const { error: insertError } = await supabaseAdmin
        .from('caldav_settings')
        .insert({
          user_id: adminCheck.user.id,
          apple_id: appleId,
          calendar_url: calendarUrl,
          is_active: isActive,
        })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
