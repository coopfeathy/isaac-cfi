/**
 * =============================================================================
 *  POST /api/book-lesson
 * =============================================================================
 *
 *  Receives a submission from the in-house scheduler at /book-lesson and:
 *    1. Validates the payload
 *    2. Upserts the prospect into Supabase (so the lesson shows up in the CRM
 *       the same way /start-training submissions do)
 *    3. Sends an email to both the student and Isaac via Resend
 *
 *  This deliberately does NOT create a row in a dedicated "bookings" table —
 *  we piggyback on the existing `prospects` table and append a labeled
 *  "Lesson Booking" section to the notes field. If you later want a real
 *  bookings table, you can migrate this to write there instead.
 * =============================================================================
 */
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { applyRateLimit } from '@/lib/ratelimit'

interface BookLessonPayload {
  slot?: string // "YYYY-MM-DDTHH:MM"
  name?: string
  email?: string
  phone?: string
  location?: string
  notes?: string
}

function mergeSection(
  existingNotes: string | null,
  sectionTitle: string,
  sectionBody: string,
): string {
  const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sectionPattern = new RegExp(
    `--- ${escapedTitle} ---[\\s\\S]*?(?=\\n\\n--- |$)`,
    'm',
  )
  const nextSection = `--- ${sectionTitle} ---\n${sectionBody.trim()}`

  if (!existingNotes || !existingNotes.trim()) return nextSection
  if (sectionPattern.test(existingNotes)) {
    return existingNotes.replace(sectionPattern, nextSection)
  }
  return `${existingNotes.trim()}\n\n${nextSection}`
}

function prettySlot(slot: string): string {
  // slot format: YYYY-MM-DDTHH:MM (local)
  const [datePart, timePart] = slot.split('T')
  if (!datePart || !timePart) return slot
  const [y, m, d] = datePart.split('-').map(Number)
  const [h, mm] = timePart.split(':').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1, h || 0, mm || 0)
  return date.toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export async function POST(request: NextRequest) {
  // ---- Rate limit ---------------------------------------------------------
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  // ---- Parse + validate ---------------------------------------------------
  let payload: BookLessonPayload
  try {
    payload = (await request.json()) as BookLessonPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { slot, name, email, phone, location, notes } = payload

  if (!slot || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(slot)) {
    return NextResponse.json({ error: 'A valid time slot is required' }, { status: 400 })
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
  }
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  }
  if (!location) {
    return NextResponse.json({ error: 'Training location is required' }, { status: 400 })
  }

  const friendlySlot = prettySlot(slot)

  // ---- Supabase upsert (best-effort — don't block booking on DB errors) --
  try {
    const supabase = getSupabaseAdmin()

    const sectionBody = [
      `Submitted: ${new Date().toISOString()}`,
      `Requested Slot: ${slot} (${friendlySlot})`,
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      `Location: ${location}`,
      notes?.trim() ? `Student notes: ${notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const { data: existing } = await supabase
      .from('prospects')
      .select('id, notes')
      .eq('email', email)
      .maybeSingle()

    const mergedNotes = mergeSection(existing?.notes ?? null, 'Lesson Booking', sectionBody)

    if (existing) {
      await supabase
        .from('prospects')
        .update({
          full_name: name.trim(),
          phone: phone.trim(),
          meeting_location: location,
          notes: mergedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)
    } else {
      await supabase.from('prospects').insert([
        {
          email,
          full_name: name.trim(),
          phone: phone.trim(),
          meeting_location: location,
          source: 'book_lesson_page',
          lead_stage: 'booked_lesson',
          status: 'active',
          sequence_step: 0,
          notes: mergedNotes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
    }
  } catch (dbErr) {
    console.error('book-lesson: Supabase write failed (booking will still proceed):', dbErr)
  }

  // ---- Email confirmations (best-effort) ---------------------------------
  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)

      // Student confirmation
      await resend.emails.send({
        from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
        to: [email],
        subject: `Your lesson is booked — ${friendlySlot}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
            <h1 style="margin: 0 0 12px; font-size: 22px;">You're on the schedule, ${name.trim()}!</h1>
            <p style="font-size: 15px; line-height: 1.55;">
              We have you down for a flight lesson on
              <strong>${friendlySlot}</strong> at our <strong>${location}</strong> location.
            </p>
            <p style="font-size: 15px; line-height: 1.55;">
              Your instructor will reach out within one business day to confirm details
              and share anything you need to review beforehand. If you need to change
              or cancel, just reply to this email.
            </p>
            ${notes?.trim()
              ? `<p style="font-size: 14px; color: #555;"><em>Your notes:</em> ${notes.trim()}</p>`
              : ''}
            <p style="font-size: 13px; color: #888; margin-top: 32px;">
              Blue skies,<br/>The Merlin Flight Training Team
            </p>
          </div>
        `,
      })

      // Instructor / ops notification
      const internalRecipient =
        process.env.BOOKING_NOTIFY_EMAIL || 'isaac.imp.prestwich@gmail.com'
      await resend.emails.send({
        from: 'Merlin Scheduler <noreply@merlinflighttraining.com>',
        to: [internalRecipient],
        subject: `New lesson booking: ${name.trim()} — ${friendlySlot}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px;">
            <h2 style="margin: 0 0 12px;">New lesson booking</h2>
            <ul style="font-size: 14px; line-height: 1.6; padding-left: 18px;">
              <li><strong>When:</strong> ${friendlySlot}</li>
              <li><strong>Who:</strong> ${name.trim()}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Phone:</strong> ${phone.trim()}</li>
              <li><strong>Location:</strong> ${location}</li>
              ${notes?.trim() ? `<li><strong>Notes:</strong> ${notes.trim()}</li>` : ''}
            </ul>
          </div>
        `,
      })
    }
  } catch (emailErr) {
    console.error('book-lesson: email failed (booking already saved):', emailErr)
  }

  return NextResponse.json(
    {
      message: 'Lesson booked',
      slot,
      friendlySlot,
    },
    { status: 200 },
  )
}
