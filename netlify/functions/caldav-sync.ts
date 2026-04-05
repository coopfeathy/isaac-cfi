import type { Config } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import {
  createCalDAVClient,
  pullEventsFromCalendar,
  pushEventToCalendar,
  deleteCalendarEvent,
} from '../../lib/caldav'
import { Resend } from 'resend'

export const config: Config = {
  schedule: '*/10 * * * *',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default async function handler() {
  const supabase = getSupabase()

  // Load active CalDAV settings
  const { data: settings, error: settingsError } = await supabase
    .from('caldav_settings')
    .select('id, apple_id, calendar_url, sync_token, is_active, sync_in_progress, last_sync_started_at')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (settingsError || !settings?.apple_id || !settings.calendar_url) {
    return { statusCode: 200, body: 'No active CalDAV settings' }
  }

  // Advisory lock — prevent concurrent sync runs
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data: lockResult } = await supabase
    .from('caldav_settings')
    .update({ sync_in_progress: true, last_sync_started_at: new Date().toISOString() })
    .eq('id', settings.id)
    .or(`sync_in_progress.eq.false,last_sync_started_at.lt.${fifteenMinAgo}`)
    .select('id')

  if (!lockResult || lockResult.length === 0) {
    console.log('CalDAV sync: another instance is running, skipping')
    return { statusCode: 200, body: 'Sync already in progress' }
  }

  const stats = { pushed: 0, pulled: 0, deleted: 0, errors: 0, emailsSent: 0 }

  try {
    const client = await createCalDAVClient(settings.apple_id)

    // 1. Push pending outbound changes
    const { data: pendingPush } = await supabase
      .from('slots')
      .select('id, start_time, end_time, type, description, caldav_uid, caldav_etag')
      .eq('sync_status', 'pending_push')

    for (const slot of pendingPush || []) {
      try {
        const { data: booking } = await supabase
          .from('bookings')
          .select('user_id, syllabus_lesson_id')
          .eq('slot_id', slot.id)
          .in('status', ['confirmed', 'paid'])
          .limit(1)
          .single()

        let studentName = 'Student'
        let lessonTitle: string | null = null

        if (booking?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', booking.user_id)
            .single()
          if (profile?.full_name) studentName = profile.full_name
        }

        if (booking?.syllabus_lesson_id) {
          const { data: lesson } = await supabase
            .from('syllabus_lessons')
            .select('title, lesson_number')
            .eq('id', booking.syllabus_lesson_id)
            .single()
          if (lesson) lessonTitle = `Lesson ${lesson.lesson_number}: ${lesson.title}`
        }

        const result = await pushEventToCalendar(
          client,
          settings.calendar_url,
          slot,
          studentName,
          lessonTitle,
          slot.caldav_uid ? `${settings.calendar_url}${slot.id}.ics` : undefined,
          slot.caldav_etag ?? undefined
        )

        await supabase
          .from('slots')
          .update({
            caldav_uid: `${slot.id}@merlinflight.com`,
            caldav_etag: result.etag,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', slot.id)

        stats.pushed++
      } catch (err) {
        console.error(`CalDAV push failed for slot ${slot.id}:`, err)
        stats.errors++
      }
    }

    // 2. Handle pending deletes
    const { data: pendingDelete } = await supabase
      .from('slots')
      .select('id, caldav_uid, caldav_etag')
      .eq('sync_status', 'pending_delete')

    for (const slot of pendingDelete || []) {
      try {
        if (slot.caldav_uid && slot.caldav_etag) {
          const eventUrl = `${settings.calendar_url}${slot.id}.ics`
          await deleteCalendarEvent(client, eventUrl, slot.caldav_etag)
        }
        await supabase
          .from('slots')
          .update({ sync_status: 'synced', last_synced_at: new Date().toISOString() })
          .eq('id', slot.id)
        stats.deleted++
      } catch (err) {
        console.error(`CalDAV delete failed for slot ${slot.id}:`, err)
        stats.errors++
      }
    }

    // 3. Pull inbound changes from iCloud
    try {
      const { events, newSyncToken } = await pullEventsFromCalendar(
        client,
        settings.calendar_url,
        settings.sync_token
      )

      for (const event of events) {
        const slotId = event.uid.replace('@merlinflight.com', '')

        const { data: existingSlot } = await supabase
          .from('slots')
          .select('id, start_time, end_time')
          .eq('id', slotId)
          .single()

        if (existingSlot) {
          // Update existing slot if times changed in calendar
          const calStart = new Date(event.start).toISOString()
          const calEnd = new Date(event.end).toISOString()

          if (existingSlot.start_time !== calStart || existingSlot.end_time !== calEnd) {
            await supabase
              .from('slots')
              .update({
                start_time: calStart,
                end_time: calEnd,
                caldav_etag: event.etag,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', slotId)
            stats.pulled++
          }
        } else {
          // New event from calendar — try to match student from summary
          // Format: "Flight Training - Student Name" or "Flight Training - Student Name | Lesson X: Title"
          const summaryMatch = event.summary.match(/(?:Flight Training|Discovery Flight)\s*-\s*(.+?)(?:\s*\|.*)?$/)
          const studentNameFromCal = summaryMatch?.[1]?.trim()

          let matchedUserId: string | null = null
          if (studentNameFromCal) {
            const { data: matchedProfile } = await supabase
              .from('profiles')
              .select('id')
              .ilike('full_name', studentNameFromCal)
              .limit(1)
              .single()
            matchedUserId = matchedProfile?.id ?? null
          }

          // Create slot
          const isTraining = !event.summary.toLowerCase().includes('discovery flight')
          const { data: newSlot } = await supabase
            .from('slots')
            .insert({
              id: slotId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? slotId : undefined,
              start_time: new Date(event.start).toISOString(),
              end_time: new Date(event.end).toISOString(),
              type: isTraining ? 'training' : 'tour',
              price: isTraining ? 20000 : 29900,
              description: event.summary,
              is_booked: !!matchedUserId,
              caldav_uid: event.uid,
              caldav_etag: event.etag,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            })
            .select('id')
            .single()

          if (newSlot && matchedUserId) {
            // Create booking for matched student
            await supabase
              .from('bookings')
              .insert({
                slot_id: newSlot.id,
                user_id: matchedUserId,
                status: 'confirmed',
                notes: 'Created from Apple Calendar sync',
              })

            stats.pulled++

            // Send email notification for new booking
            await sendLessonScheduledEmail(supabase, matchedUserId, newSlot.id)
            stats.emailsSent++
          } else if (newSlot) {
            stats.pulled++
            console.log(`CalDAV sync: created unassigned slot from calendar event ${event.uid}`)
          }
        }
      }

      // Update sync token
      if (newSyncToken) {
        await supabase
          .from('caldav_settings')
          .update({ sync_token: newSyncToken, last_sync_at: new Date().toISOString() })
          .eq('id', settings.id)
      }
    } catch (err) {
      console.error('CalDAV pull error:', err)
      stats.errors++
    }
  } catch (err) {
    console.error('CalDAV sync error:', err)
    stats.errors++
  } finally {
    // Release advisory lock
    await supabase
      .from('caldav_settings')
      .update({ sync_in_progress: false, last_sync_at: new Date().toISOString() })
      .eq('id', settings.id)
  }

  console.log('CalDAV sync complete:', stats)
  return { statusCode: 200, body: JSON.stringify(stats) }
}

// Send lesson scheduled email to student for new inbound bookings

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function sendLessonScheduledEmail(
  supabase: any,
  userId: string,
  slotId: string
) {
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    const email = authUser?.user?.email
    if (!email) return

    const { data: slot } = await supabase
      .from('slots')
      .select('start_time, end_time')
      .eq('id', slotId)
      .single()

    if (!slot) return

    const { data: booking } = await supabase
      .from('bookings')
      .select('syllabus_lesson_id')
      .eq('slot_id', slotId)
      .eq('user_id', userId)
      .limit(1)
      .single()

    let lessonTitle: string | null = null
    let groundTopics: string[] | null = null
    let flightManeuvers: string[] | null = null

    if (booking?.syllabus_lesson_id) {
      const { data: lesson } = await supabase
        .from('syllabus_lessons')
        .select('title, lesson_number, ground_topics, flight_maneuvers')
        .eq('id', booking.syllabus_lesson_id)
        .single()

      if (lesson) {
        lessonTitle = `Lesson ${lesson.lesson_number}: ${lesson.title}`
        groundTopics = lesson.ground_topics
        flightManeuvers = lesson.flight_maneuvers
      }
    }

    const startDate = new Date(slot.start_time)
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const timeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

    // Build email HTML inline (cannot import lib/resend.ts in Netlify function context)
    const brand = {
      gold: '#FFBF00',
      dark: '#0B0B0B',
      lightBg: '#F9FAFB',
      borderColor: '#E5E7EB',
      mutedText: '#6B7280',
      logoUrl: 'https://isaac-cfi.netlify.app/merlin-logo.png',
      font: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    }

    const html = `
      <div style="font-family: ${brand.font}; max-width: 640px; margin: 0 auto; background: #FFFFFF; color: ${brand.dark};">
        <div style="background: ${brand.dark}; padding: 12px 32px; border-radius: 8px 8px 0 0; text-align: center;">
          <p style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Merlin Flight Training</p>
          <p style="margin: 4px 0 0 0; color: ${brand.gold}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Pilot Flight Instruction</p>
        </div>
        <div style="padding: 32px;">
          <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Lesson Scheduled</h1>
          <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
          <p>Hi ${escapeHtml(profile?.full_name || 'Student')},</p>
          <p>A flight lesson has been scheduled for you:</p>
          <div style="background: ${brand.lightBg}; border-left: 4px solid ${brand.gold}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="margin: 0;"><strong>Date:</strong> ${dateStr}</p>
            <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${timeStr}</p>
            ${lessonTitle ? `<p style="margin: 10px 0 0 0;"><strong>Lesson:</strong> ${escapeHtml(lessonTitle)}</p>` : ''}
          </div>
          ${groundTopics && groundTopics.length > 0 ? `
          <h3 style="font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Ground Topics to Review</h3>
          <ul style="padding-left: 20px; line-height: 1.8;">${groundTopics.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
          ${flightManeuvers && flightManeuvers.length > 0 ? `
          <h3 style="font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brand.dark}; border-bottom: 2px solid ${brand.gold}; padding-bottom: 6px; display: inline-block;">Flight Maneuvers</h3>
          <ul style="padding-left: 20px; line-height: 1.8;">${flightManeuvers.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>` : ''}
          <div style="margin-top: 28px; text-align: center;">
            <a href="https://isaac-cfi.netlify.app/dashboard" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px;">View Your Dashboard</a>
          </div>
          <p style="margin-top: 20px;">Please arrive 15 minutes early for your pre-flight briefing.</p>
        </div>
        <div style="background: ${brand.lightBg}; padding: 20px 32px; border-top: 1px solid ${brand.borderColor}; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: ${brand.mutedText}; font-size: 12px;">Merlin Flight Training &bull; Professional Flight Instruction</p>
        </div>
      </div>
    `

    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: email,
      subject: `Your Flight Lesson is Scheduled — ${dateStr}`,
      html,
    })
  } catch (err) {
    console.error('CalDAV sync: failed to send lesson email:', err)
  }
}
