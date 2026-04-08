import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createCalDAVClient, pushEventToCalendar } from '@/lib/caldav'

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const body = await request.json().catch(() => ({}))
    const slotId = typeof body.slot_id === 'string' ? body.slot_id : ''

    if (!slotId) {
      return NextResponse.json({ error: 'slot_id is required' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Load CalDAV settings
    const { data: settings } = await supabaseAdmin
      .from('caldav_settings')
      .select('apple_id, calendar_url, is_active')
      .limit(1)
      .single()

    if (!settings?.is_active || !settings.apple_id || !settings.calendar_url) {
      return NextResponse.json({ error: 'CalDAV sync is not configured or not active' }, { status: 400 })
    }

    // Load slot + booking + student info
    const { data: slot, error: slotError } = await supabaseAdmin
      .from('slots')
      .select('id, start_time, end_time, type, description, caldav_uid, caldav_etag')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, user_id, syllabus_lesson_id')
      .eq('slot_id', slotId)
      .in('status', ['confirmed', 'paid'])
      .limit(1)
      .single()

    let studentName = 'Student'
    let lessonTitle: string | null = null

    if (booking?.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', booking.user_id)
        .single()

      if (profile?.full_name) studentName = profile.full_name
    }

    if (booking?.syllabus_lesson_id) {
      const { data: lesson } = await supabaseAdmin
        .from('syllabus_lessons')
        .select('title, lesson_number')
        .eq('id', booking.syllabus_lesson_id)
        .single()

      if (lesson) lessonTitle = `Lesson ${lesson.lesson_number}: ${lesson.title}`
    }

    // Push to CalDAV
    const client = await createCalDAVClient(settings.apple_id)
    const result = await pushEventToCalendar(
      client,
      settings.calendar_url,
      slot,
      studentName,
      lessonTitle,
      slot.caldav_uid ? `${settings.calendar_url}${slot.id}.ics` : undefined,
      slot.caldav_etag ?? undefined
    )

    // Update slot sync metadata
    await supabaseAdmin
      .from('slots')
      .update({
        caldav_uid: `${slot.id}@merlinflight.com`,
        caldav_etag: result.etag,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', slot.id)

    return NextResponse.json({
      success: true,
      caldav_uid: `${slot.id}@merlinflight.com`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to push event' }, { status: 500 })
  }
}
