import { requireUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/student/bookings
 *
 * Returns booking history for the authenticated user, ordered newest first.
 * Each booking includes the associated slot data.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireUser(request)
  if ('error' in authResult) return authResult.error

  const { user } = authResult
  const supabaseAdmin = getSupabaseAdmin()

  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      status,
      created_at,
      notes,
      slot_id,
      slots (
        id,
        start_time,
        end_time,
        type,
        description,
        price
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bookings })
}

/**
 * POST /api/student/bookings
 *
 * Creates a booking request for the authenticated user.
 *
 * Body: { slotId: string }
 *
 * - Discovery/tour slots: auto-confirmed (status: 'confirmed'), slot marked as booked (BOOK-08)
 * - Training slots: pending admin approval (status: 'pending_approval'), slot NOT marked as booked yet
 *
 * Emails:
 * - Tour: booking confirmation email
 * - Training: "request received" email explaining pending approval
 *
 * Security (T-04-01, T-04-06): user_id is set from server-verified auth token, never from client body.
 * Security (T-04-02): slot existence and is_booked=false checked before insert.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireUser(request)
  if ('error' in authResult) return authResult.error

  const { user } = authResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { slotId } = body as { slotId?: unknown }

  // Validate slotId is a non-empty string (T-04-02)
  if (!slotId || typeof slotId !== 'string' || slotId.trim() === '') {
    return NextResponse.json({ error: 'slotId is required and must be a non-empty string' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Verify slot exists and is still available (T-04-02)
  const { data: slot, error: slotError } = await supabaseAdmin
    .from('slots')
    .select('id, start_time, end_time, type, description, price, is_booked')
    .eq('id', slotId)
    .single()

  if (slotError || !slot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  }

  if (slot.is_booked) {
    return NextResponse.json({ error: 'Slot is no longer available' }, { status: 409 })
  }

  const isTour = slot.type === 'tour'
  const bookingStatus = isTour ? 'confirmed' : 'pending_approval'

  // Insert the booking
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .insert({
      slot_id: slotId,
      user_id: user.id,
      status: bookingStatus,
      created_at: new Date().toISOString(),
    })
    .select('id, status, slot_id')
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: bookingError?.message || 'Failed to create booking' }, { status: 500 })
  }

  // For tour slots: mark as booked immediately (BOOK-08 auto-confirm)
  if (isTour) {
    const { error: slotUpdateError } = await supabaseAdmin
      .from('slots')
      .update({ is_booked: true })
      .eq('id', slotId)

    if (slotUpdateError) {
      // Non-fatal: booking exists, but slot flag not updated — log and continue
      console.error('[bookings POST] Failed to mark slot as booked:', slotUpdateError.message)
    }
  }

  // Send email notification
  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey) {
    const slotLabel = slot.description || (isTour ? 'Discovery Flight' : 'Flight Training Lesson')
    const startFormatted = new Date(slot.start_time).toLocaleString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
    const endFormatted = new Date(slot.end_time).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    })

    const emailPayload = isTour
      ? {
          subject: `Booking Confirmed - ${slotLabel}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
              <h2 style="margin-bottom: 8px;">Your discovery flight is confirmed!</h2>
              <p style="color: #4B5563;">Thank you for booking with Merlin Flight Training. We can't wait to take you up!</p>
              <div style="margin-top: 16px; padding: 16px; border: 1px solid #E5E7EB; border-radius: 8px;">
                <p style="margin: 4px 0;"><strong>Booking ID:</strong> ${booking.id}</p>
                <p style="margin: 4px 0;"><strong>Session:</strong> ${slotLabel}</p>
                <p style="margin: 4px 0;"><strong>Date &amp; Time:</strong> ${startFormatted} – ${endFormatted}</p>
                <p style="margin: 4px 0;"><strong>Location:</strong> Republic Airport (FRG), Farmingdale, NY</p>
              </div>
              <p style="margin-top: 16px; color: #6B7280;">
                Please arrive 15 minutes early. Wear comfortable clothing and closed-toe shoes.
              </p>
              <p style="color: #6B7280;">Questions? Reply to this email or visit <a href="https://merlinflighttraining.com">merlinflighttraining.com</a>.</p>
            </div>
          `,
        }
      : {
          subject: 'Booking Request Received - Merlin Flight Training',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
              <h2 style="margin-bottom: 8px;">We received your booking request!</h2>
              <p style="color: #4B5563;">Thank you for requesting a lesson with Merlin Flight Training.</p>
              <div style="margin-top: 16px; padding: 16px; border: 1px solid #E5E7EB; border-radius: 8px;">
                <p style="margin: 4px 0;"><strong>Request ID:</strong> ${booking.id}</p>
                <p style="margin: 4px 0;"><strong>Session:</strong> ${slotLabel}</p>
                <p style="margin: 4px 0;"><strong>Requested Time:</strong> ${startFormatted} – ${endFormatted}</p>
              </div>
              <p style="margin-top: 16px; color: #4B5563;">
                Your request is <strong>pending review</strong> by your instructor. You'll receive a confirmation email
                once it's approved — typically within 24 hours.
              </p>
              <p style="color: #6B7280;">Questions? Reply to this email or visit <a href="https://merlinflighttraining.com">merlinflighttraining.com</a>.</p>
            </div>
          `,
        }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
        to: [user.email!],
        subject: emailPayload.subject,
        html: emailPayload.html,
      }),
    }).catch(err => {
      // Non-fatal: booking succeeded even if email fails
      console.error('[bookings POST] Failed to send email:', err)
    })
  }

  return NextResponse.json({ booking }, { status: 201 })
}
