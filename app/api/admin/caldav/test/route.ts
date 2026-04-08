import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createCalDAVClient, fetchCalendars } from '@/lib/caldav'

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
