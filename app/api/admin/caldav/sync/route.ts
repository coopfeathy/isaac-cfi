import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  createCalDAVClient,
  pullEventsFromCalendar,
  pushEventToCalendar,
  deleteCalendarEvent,
} from '@/lib/caldav'
import type { SyncResult } from '@/lib/caldav'

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const supabaseAdmin = getSupabaseAdmin()

    // Load settings
    const { data: settings } = await supabaseAdmin
      .from('caldav_settings')
      .select('id, apple_id, calendar_url, sync_token, is_active')
      .limit(1)
      .single()

    if (!settings?.is_active || !settings.apple_id || !settings.calendar_url) {
      return NextResponse.json({ error: 'CalDAV sync is not configured or not active' }, { status: 400 })
    }

    const result: SyncResult = { pushed: 0, pulled: 0, deleted: 0, conflicts: 0, errors: [] }
    const client = await createCalDAVClient(settings.apple_id)

    // 1. Push pending outbound changes
    const { data: pendingPush } = await supabaseAdmin
      .from('slots')
      .select('id, start_time, end_time, type, description, caldav_uid, caldav_etag')
      .eq('sync_status', 'pending_push')

    for (const slot of pendingPush || []) {
      try {
        // Get student name for event summary
        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .select('user_id, syllabus_lesson_id')
          .eq('slot_id', slot.id)
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

        const pushResult = await pushEventToCalendar(
          client,
          settings.calendar_url,
          slot,
          studentName,
          lessonTitle,
          slot.caldav_uid ? `${settings.calendar_url}${slot.id}.ics` : undefined,
          slot.caldav_etag ?? undefined
        )

        await supabaseAdmin
          .from('slots')
          .update({
            caldav_uid: `${slot.id}@merlinflight.com`,
            caldav_etag: pushResult.etag,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', slot.id)

        result.pushed++
      } catch (err: any) {
        result.errors.push(`Push failed for slot ${slot.id}: ${err.message}`)
      }
    }

    // 2. Handle pending deletes
    const { data: pendingDelete } = await supabaseAdmin
      .from('slots')
      .select('id, caldav_uid, caldav_etag')
      .eq('sync_status', 'pending_delete')

    for (const slot of pendingDelete || []) {
      try {
        if (slot.caldav_uid && slot.caldav_etag) {
          const eventUrl = `${settings.calendar_url}${slot.id}.ics`
          await deleteCalendarEvent(client, eventUrl, slot.caldav_etag)
        }
        await supabaseAdmin
          .from('slots')
          .update({ sync_status: 'synced', last_synced_at: new Date().toISOString() })
          .eq('id', slot.id)
        result.deleted++
      } catch (err: any) {
        result.errors.push(`Delete failed for slot ${slot.id}: ${err.message}`)
      }
    }

    // 3. Pull inbound changes
    try {
      const { events, newSyncToken } = await pullEventsFromCalendar(
        client,
        settings.calendar_url,
        settings.sync_token
      )

      for (const event of events) {
        // Extract slot ID from UID (format: {slotId}@merlinflight.com)
        const slotId = event.uid.replace('@merlinflight.com', '')

        const { data: existingSlot } = await supabaseAdmin
          .from('slots')
          .select('id, start_time, end_time, description, last_synced_at')
          .eq('id', slotId)
          .single()

        if (existingSlot) {
          // Update existing slot times if changed in calendar
          const calStart = new Date(event.start).toISOString()
          const calEnd = new Date(event.end).toISOString()

          if (existingSlot.start_time !== calStart || existingSlot.end_time !== calEnd) {
            await supabaseAdmin
              .from('slots')
              .update({
                start_time: calStart,
                end_time: calEnd,
                caldav_etag: event.etag,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', slotId)
            result.pulled++
          }
        }
      }

      // Update sync token
      if (newSyncToken) {
        await supabaseAdmin
          .from('caldav_settings')
          .update({
            sync_token: newSyncToken,
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', settings.id)
      }
    } catch (err: any) {
      result.errors.push(`Pull failed: ${err.message}`)
    }

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 })
  }
}
