import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createCalDAVClient, pushEventToCalendar } from '@/lib/caldav'
import { Resend } from 'resend'
import { emailTemplates } from '@/lib/resend'

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const body = await request.json().catch(() => ({}))
    const studentUserId = typeof body.studentUserId === 'string' ? body.studentUserId : ''
    const startTime = typeof body.startTime === 'string' ? body.startTime : ''
    const endTime = typeof body.endTime === 'string' ? body.endTime : ''
    const type = body.type === 'tour' ? 'tour' : 'training'
    const price = Number.parseInt(String(body.price ?? ''), 10)
    const description = typeof body.description === 'string' && body.description.trim().length > 0 ? body.description.trim() : null
    const syllabusLessonId = typeof body.syllabusLessonId === 'string' && body.syllabusLessonId.trim().length > 0 ? body.syllabusLessonId.trim() : null

    if (!studentUserId || !startTime || !endTime || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: studentUser, error: studentError } = await supabaseAdmin.auth.admin.getUserById(studentUserId)
    if (studentError || !studentUser.user) {
      return NextResponse.json({ error: 'Student account not found' }, { status: 404 })
    }

    const { data: overlappingSlots, error: overlapError } = await supabaseAdmin
      .from('slots')
      .select('id')
      .lt('start_time', endDate.toISOString())
      .gt('end_time', startDate.toISOString())

    if (overlapError) {
      return NextResponse.json({ error: overlapError.message }, { status: 500 })
    }

    if ((overlappingSlots || []).length > 0) {
      return NextResponse.json({ error: 'That time overlaps an existing slot' }, { status: 409 })
    }

    const { data: createdSlot, error: slotError } = await supabaseAdmin
      .from('slots')
      .insert([
        {
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          type,
          price,
          description,
          is_booked: true,
        },
      ])
      .select('id')
      .single()

    if (slotError || !createdSlot) {
      return NextResponse.json({ error: slotError?.message || 'Failed to create slot' }, { status: 500 })
    }

    const { data: createdBooking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([
        {
          slot_id: createdSlot.id,
          user_id: studentUserId,
          status: 'confirmed',
          notes: 'Created from admin flight planner',
          ...(syllabusLessonId ? { syllabus_lesson_id: syllabusLessonId } : {}),
        },
      ])
      .select('id')
      .single()

    if (bookingError || !createdBooking) {
      await supabaseAdmin.from('slots').delete().eq('id', createdSlot.id)
      return NextResponse.json({ error: bookingError?.message || 'Failed to create booking' }, { status: 500 })
    }

    // Fire-and-forget: CalDAV push + email notification
    // These must never block or fail the booking
    const backgroundTasks = async () => {
      try {
        // Get student name for calendar event
        const { data: studentProfile } = await supabaseAdmin
          .from('students')
          .select('full_name, email')
          .eq('user_id', studentUserId)
          .single()

        const studentName = studentProfile?.full_name || 'Student'
        const studentEmail = studentProfile?.email || studentUser.user.email || ''

        // Get syllabus lesson title if linked
        let lessonTitle: string | undefined
        let lessonData: { title?: string; ground_topics?: string[]; flight_maneuvers?: string[] } | null = null
        if (syllabusLessonId) {
          const { data } = await supabaseAdmin
            .from('syllabus_lessons')
            .select('title, ground_topics, flight_maneuvers')
            .eq('id', syllabusLessonId)
            .single()
          lessonData = data
          lessonTitle = data?.title || undefined
        }

        // CalDAV push
        const { data: caldavSettings } = await supabaseAdmin
          .from('caldav_settings')
          .select('apple_id, calendar_url, is_active')
          .single()

        if (caldavSettings?.is_active && caldavSettings?.apple_id) {
          try {
            const client = await createCalDAVClient(caldavSettings.apple_id)
            const slot = {
              id: createdSlot.id,
              start_time: startDate.toISOString(),
              end_time: endDate.toISOString(),
              description,
            }
            const result = await pushEventToCalendar(
              client,
              caldavSettings.calendar_url,
              slot as any,
              studentName,
              lessonTitle,
            )
            if (result.url || result.etag) {
              await supabaseAdmin
                .from('slots')
                .update({
                  caldav_uid: `${createdSlot.id}@merlinflight.com`,
                  caldav_etag: result.etag || null,
                  sync_status: 'synced',
                  last_synced_at: new Date().toISOString(),
                })
                .eq('id', createdSlot.id)
            }
          } catch (caldavErr) {
            console.error('[manual-booking] CalDAV push failed (non-blocking):', caldavErr)
            await supabaseAdmin
              .from('slots')
              .update({ sync_status: 'pending_push' })
              .eq('id', createdSlot.id)
          }
        }

        // Email notification
        if (studentEmail) {
          try {
            const resendKey = process.env.RESEND_API_KEY
            if (resendKey) {
              const resend = new Resend(resendKey)
              const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              const timeStr = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const template = emailTemplates.lessonScheduled({
                studentName,
                lessonTitle,
                date: dateStr,
                time: timeStr,
                groundTopics: lessonData?.ground_topics,
                flightManeuvers: lessonData?.flight_maneuvers,
              })
              await resend.emails.send({
                from: 'Merlin Flight Training <noreply@merlinflight.com>',
                to: studentEmail,
                subject: template.subject,
                html: template.html,
              })
            }
          } catch (emailErr) {
            console.error('[manual-booking] Email notification failed (non-blocking):', emailErr)
          }
        }
      } catch (bgErr) {
        console.error('[manual-booking] Background tasks failed (non-blocking):', bgErr)
      }
    }

    // Don't await — fire and forget
    void backgroundTasks()

    return NextResponse.json({
      success: true,
      slotId: createdSlot.id,
      bookingId: createdBooking.id,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
