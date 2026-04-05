import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createCalDAVClient, fetchCalendars } from '@/lib/caldav'

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
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('caldav_settings')
      .select('apple_id, calendar_url')
      .limit(1)
      .single()

    if (settingsError || !settings?.apple_id) {
      return NextResponse.json({ error: 'CalDAV settings not configured. Save your Apple ID first.' }, { status: 400 })
    }

    const client = await createCalDAVClient(settings.apple_id)
    const calendars = await fetchCalendars(client)

    return NextResponse.json({
      connected: true,
      calendars: calendars.map(cal => ({
        displayName: cal.displayName,
        url: cal.url,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      error: error.message || 'Failed to connect to iCloud Calendar',
    }, { status: 200 })
  }
}
