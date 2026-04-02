import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
})

function getEventContext(event: Stripe.Event): { bookingId: string | null; slotId: string | null } {
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    return {
      bookingId: intent.metadata?.bookingId || null,
      slotId: intent.metadata?.slotId || null,
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    return {
      bookingId: session.metadata?.bookingId || null,
      slotId: session.metadata?.slotId || null,
    }
  }

  return { bookingId: null, slotId: null }
}

async function sendBookingEmail(to: string, payload: {
  bookingId: string
  slotLabel: string
  startTime: string
  endTime: string
  amountDollars: string
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return

  const subject = `Booking Confirmed - ${payload.slotLabel}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
      <h2 style="margin-bottom: 8px;">Your booking is confirmed.</h2>
      <p style="color: #4B5563;">Thank you for booking with Merlin Flight Training.</p>
      <div style="margin-top: 16px; padding: 16px; border: 1px solid #E5E7EB; border-radius: 8px;">
        <p style="margin: 4px 0;"><strong>Booking ID:</strong> ${payload.bookingId}</p>
        <p style="margin: 4px 0;"><strong>Session:</strong> ${payload.slotLabel}</p>
        <p style="margin: 4px 0;"><strong>Start:</strong> ${new Date(payload.startTime).toLocaleString()}</p>
        <p style="margin: 4px 0;"><strong>End:</strong> ${new Date(payload.endTime).toLocaleString()}</p>
        <p style="margin: 4px 0;"><strong>Paid:</strong> $${payload.amountDollars}</p>
      </div>
      <p style="margin-top: 16px; color: #6B7280;">You can view your booking any time from the bookings page.</p>
    </div>
  `

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: [to],
      subject,
      html,
    }),
  })
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing Stripe signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: 'Missing STRIPE_WEBHOOK_SECRET' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let event: Stripe.Event

  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Invalid webhook payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { bookingId, slotId } = getEventContext(event)

  const { data: existingEvent } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('id, status')
    .eq('event_id', event.id)
    .maybeSingle()

  if (existingEvent?.status === 'processed') {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (existingEvent?.id) {
    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({
        event_type: event.type,
        booking_id: bookingId,
        slot_id: slotId,
        status: 'processing',
        error_message: null,
        payload: event as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingEvent.id)
  } else {
    await supabaseAdmin
      .from('stripe_webhook_events')
      .insert([
        {
          event_id: event.id,
          event_type: event.type,
          booking_id: bookingId,
          slot_id: slotId,
          status: 'processing',
          payload: event as any,
        },
      ])
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent
      const developerDestination = intent.metadata?.connect_developer_destination_account
      const developerPayoutCents = Number(intent.metadata?.connect_developer_payout_cents || 0)

      if (
        developerDestination &&
        Number.isFinite(developerPayoutCents) &&
        developerPayoutCents > 0
      ) {
        const chargeId =
          typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id

        if (chargeId) {
          await stripe.transfers.create(
            {
              amount: Math.round(developerPayoutCents),
              currency: intent.currency,
              destination: developerDestination,
              source_transaction: chargeId,
              description: `Developer payout for PaymentIntent ${intent.id}`,
              metadata: {
                payment_intent_id: intent.id,
                event_id: event.id,
                transaction_type: intent.metadata?.transaction_type || '',
              },
            },
            {
              idempotencyKey: `dev-transfer-${intent.id}-${event.id}`,
            }
          )
        }
      }

      const bookingId = intent.metadata?.bookingId
      const slotId = intent.metadata?.slotId
      const userId = intent.metadata?.userId

      if (!bookingId || !slotId) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const { data: existingBooking, error: existingBookingError } = await supabaseAdmin
        .from('bookings')
        .select('id, slot_id, user_id, status')
        .eq('id', bookingId)
        .single()

      if (existingBookingError || !existingBooking) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const alreadyPaid = ['paid', 'confirmed', 'completed'].includes(existingBooking.status)

      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'paid' })
        .eq('id', bookingId)
        .select('id, slot_id, user_id')
        .single()

      if (bookingError) throw bookingError

      const { error: slotError } = await supabaseAdmin
        .from('slots')
        .update({ is_booked: true })
        .eq('id', slotId)

      if (slotError) throw slotError

      const { data: slotData } = await supabaseAdmin
        .from('slots')
        .select('start_time, end_time, type, description, price')
        .eq('id', slotId)
        .single()

      const recipientEmail = intent.receipt_email || null

      if (!alreadyPaid && recipientEmail && booking?.id && slotData) {
        const slotLabel = slotData.description || (slotData.type === 'tour' ? 'Discovery Flight' : 'Flight Training Session')
        await sendBookingEmail(recipientEmail, {
          bookingId: booking.id,
          slotLabel,
          startTime: slotData.start_time,
          endTime: slotData.end_time,
          amountDollars: (slotData.price / 100).toFixed(2),
        })
      } else if (!alreadyPaid && userId && booking?.id && slotData) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
        const fallbackEmail = authUser?.user?.email
        if (fallbackEmail) {
          const slotLabel = slotData.description || (slotData.type === 'tour' ? 'Discovery Flight' : 'Flight Training Session')
          await sendBookingEmail(fallbackEmail, {
            bookingId: booking.id,
            slotLabel,
            startTime: slotData.start_time,
            endTime: slotData.end_time,
            amountDollars: (slotData.price / 100).toFixed(2),
          })
        }
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.bookingId
      const slotId = session.metadata?.slotId

      if (bookingId && slotId) {
        const { data: existingBooking } = await supabaseAdmin
          .from('bookings')
          .select('status')
          .eq('id', bookingId)
          .single()

        const alreadyPaid = ['paid', 'confirmed', 'completed'].includes(existingBooking?.status || '')

        const { error: bookingError } = await supabaseAdmin
          .from('bookings')
          .update({ status: 'paid' })
          .eq('id', bookingId)

        if (bookingError) throw bookingError

        const { error: slotError } = await supabaseAdmin
          .from('slots')
          .update({ is_booked: true })
          .eq('id', slotId)

        if (slotError) throw slotError

        if (alreadyPaid) {
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
    }

    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({
        event_type: event.type,
        booking_id: bookingId,
        slot_id: slotId,
        status: 'processed',
        error_message: null,
        processed_at: new Date().toISOString(),
        payload: event as any,
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', event.id)

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({
        event_type: event.type,
        booking_id: bookingId,
        slot_id: slotId,
        status: 'failed',
        error_message: error?.message || 'Webhook processing failed',
        processed_at: new Date().toISOString(),
        payload: event as any,
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', event.id)

    return new Response(JSON.stringify({ error: error?.message || 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
