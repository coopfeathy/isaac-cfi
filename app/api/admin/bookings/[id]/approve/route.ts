import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { id } = await params
  const supabaseAdmin = getSupabaseAdmin()

  // Fetch the booking with slot details
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select('id, status, user_id, slot_id, slots(start_time, end_time, type, description)')
    .eq('id', id)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status !== 'pending_approval') {
    return NextResponse.json(
      { error: `Booking is not pending approval (current status: ${booking.status})` },
      { status: 409 }
    )
  }

  // Update booking to confirmed
  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }

  // Mark slot as booked (was not set during pending_approval creation)
  await supabaseAdmin
    .from('slots')
    .update({ is_booked: true })
    .eq('id', booking.slot_id)

  // Fetch student email for confirmation
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .eq('id', booking.user_id)
    .single()

  // Send approval confirmation email via Resend (BOOK-03)
  if (profile?.email && process.env.RESEND_API_KEY) {
    const slot = booking.slots as any
    const startTime = slot?.start_time
      ? new Date(slot.start_time).toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: 'America/New_York',
        })
      : 'TBD'

    await resend.emails.send({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: profile.email,
      subject: `Booking Confirmed - ${slot?.description || 'Flight Lesson'}`,
      html: `
        <h2>Your booking has been approved!</h2>
        <p>Hi ${profile.full_name || 'there'},</p>
        <p>Your flight lesson booking has been confirmed:</p>
        <ul>
          <li><strong>Date/Time:</strong> ${startTime}</li>
          <li><strong>Type:</strong> ${slot?.type || 'Training'}</li>
          <li><strong>Details:</strong> ${slot?.description || 'Flight lesson'}</li>
        </ul>
        <p>See you at the airport!</p>
        <p>- Merlin Flight Training</p>
      `,
    })
  }

  return NextResponse.json({ approved: true, bookingId: id, status: 'confirmed' })
}
