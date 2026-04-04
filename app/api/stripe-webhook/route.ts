import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
})

type SplitPayoutPlan = {
  v: 1
  m: 'split'
  b: Array<{ d: string; a: number; r: string | null }>
  dev: { d: string; a: number; bps: number } | null
}

function parseSplitPayoutPlan(raw: string | undefined): SplitPayoutPlan | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as SplitPayoutPlan
    if (parsed?.v !== 1 || parsed?.m !== 'split' || !Array.isArray(parsed.b)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

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

async function sendPaymentConfirmationEmail(to: string, payload: {
  studentName: string
  amountDollars: string
  currency: string
  description: string | null
  itemsCount: number
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return

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
      <div style="background: ${brand.dark}; padding: 12px 32px; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: space-between;">
        <div style="flex: 1; text-align: center; padding-right: 80px;">
          <p style="margin: 0; color: #FFFFFF; font-family: ${brand.font}; font-size: 28px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Merlin Flight Training</p>
          <p style="margin: 4px 0 0 0; color: ${brand.gold}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Pilot Flight Instruction</p>
        </div>
        <img src="${brand.logoUrl}" alt="Merlin Flight Training" style="width: 140px; height: 140px; object-fit: contain; flex-shrink: 0; align-self: center; margin-top: 25px;" />
      </div>
      <div style="padding: 32px;">
        <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Payment Confirmed</h1>
        <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px; border-radius: 2px;"></div>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Hi <strong>${payload.studentName}</strong>, your payment has been successfully processed.
        </p>
        <div style="background: ${brand.dark}; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: ${brand.gold}; font-weight: 700;">Payment Receipt</p>
          <p style="margin: 0 0 6px 0; font-size: 16px; color: #FFFFFF;"><strong>Amount Paid:</strong> <span style="color: ${brand.gold}; font-weight: 700;">$${payload.amountDollars}</span></p>
          ${payload.itemsCount > 0 ? `<p style="margin: 0 0 6px 0; font-size: 14px; color: #D1D5DB;">${payload.itemsCount} training item${payload.itemsCount !== 1 ? 's' : ''}</p>` : ''}
          <p style="margin: 0; font-size: 14px; color: #D1D5DB;">Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          A receipt from Stripe has also been sent to your email. If you have any questions about this charge, please contact your instructor.
        </p>
        <p style="margin-top: 24px; color: ${brand.mutedText}; font-size: 13px; text-align: center;">Thank you for training with Merlin Flight Training.</p>
      </div>
      <div style="background: ${brand.lightBg}; padding: 20px 32px; border-top: 1px solid ${brand.borderColor}; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="margin: 0; color: ${brand.mutedText}; font-size: 12px;">Merlin Flight Training &bull; Professional Flight Instruction</p>
      </div>
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
      subject: `Payment Confirmed - $${payload.amountDollars} - Merlin Flight Training`,
      html,
    }),
  })
}

async function sendPaymentDeclinedEmail(to: string, payload: {
  studentName: string
  amountDollars: string
  declineReason: string
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return

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
      <div style="background: ${brand.dark}; padding: 12px 32px; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: space-between;">
        <div style="flex: 1; text-align: center; padding-right: 80px;">
          <p style="margin: 0; color: #FFFFFF; font-family: ${brand.font}; font-size: 28px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Merlin Flight Training</p>
          <p style="margin: 4px 0 0 0; color: ${brand.gold}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Pilot Flight Instruction</p>
        </div>
        <img src="${brand.logoUrl}" alt="Merlin Flight Training" style="width: 140px; height: 140px; object-fit: contain; flex-shrink: 0; align-self: center; margin-top: 25px;" />
      </div>
      <div style="padding: 32px;">
        <h1 style="color: #DC2626; margin: 0 0 8px 0; font-size: 24px;">Payment Declined</h1>
        <div style="width: 40px; height: 3px; background: #DC2626; margin-bottom: 20px; border-radius: 2px;"></div>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Hi <strong>${payload.studentName}</strong>, unfortunately your payment of <strong>$${payload.amountDollars}</strong> was not able to be processed.
        </p>
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
          <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #991B1B; font-weight: 700;">Reason</p>
          <p style="margin: 0; font-size: 15px; color: #991B1B; font-weight: 600;">${payload.declineReason}</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Please try again with a different payment method or contact your bank for more information. You can also reach out to your instructor for assistance.
        </p>
        <p style="margin-top: 24px; color: ${brand.mutedText}; font-size: 13px; text-align: center;">Merlin Flight Training</p>
      </div>
      <div style="background: ${brand.lightBg}; padding: 20px 32px; border-top: 1px solid ${brand.borderColor}; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="margin: 0; color: ${brand.mutedText}; font-size: 12px;">Merlin Flight Training &bull; Professional Flight Instruction</p>
      </div>
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
      subject: `Payment Declined - Merlin Flight Training`,
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
      const chargeId =
        typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id
      const payoutMode = intent.metadata?.connect_payout_mode || ''
      const splitPlan = parseSplitPayoutPlan(intent.metadata?.connect_payout_plan_v1)

      if (payoutMode === 'split_transfers' && splitPlan && chargeId) {
        const { data: existingTransfers } = await supabaseAdmin
          .from('stripe_connect_payout_ledger')
          .select('id')
          .eq('payment_intent_id', intent.id)
          .not('transfer_id', 'is', null)

        if (!existingTransfers || existingTransfers.length === 0) {
          for (const [index, bucket] of splitPlan.b.entries()) {
            if (!Number.isFinite(bucket.a) || bucket.a <= 0 || !bucket.d) continue

            const transfer = await stripe.transfers.create(
              {
                amount: Math.round(bucket.a),
                currency: intent.currency,
                destination: bucket.d,
                source_transaction: chargeId,
                description: `Split payout for PaymentIntent ${intent.id}`,
                metadata: {
                  payment_intent_id: intent.id,
                  event_id: event.id,
                  payout_mode: 'split_transfers',
                  payout_rule_id: bucket.r || '',
                },
              },
              {
                idempotencyKey: `split-transfer-${intent.id}-${index}-${event.id}`,
              }
            )

            await supabaseAdmin.from('stripe_connect_payout_ledger').insert([
              {
                payment_intent_id: intent.id,
                charge_id: chargeId,
                destination_account: bucket.d,
                amount_cents: Math.round(bucket.a),
                currency: intent.currency,
                rule_id: bucket.r,
                transfer_id: transfer.id,
                transfer_kind: 'primary',
                status: 'transferred',
                reversed_amount_cents: 0,
                metadata: {
                  event_id: event.id,
                  payout_mode: 'split_transfers',
                },
              },
            ])
          }

          if (splitPlan.dev?.d && Number.isFinite(splitPlan.dev.a) && splitPlan.dev.a > 0) {
            const developerTransfer = await stripe.transfers.create(
              {
                amount: Math.round(splitPlan.dev.a),
                currency: intent.currency,
                destination: splitPlan.dev.d,
                source_transaction: chargeId,
                description: `Developer payout for PaymentIntent ${intent.id}`,
                metadata: {
                  payment_intent_id: intent.id,
                  event_id: event.id,
                  payout_mode: 'split_transfers',
                  transaction_type: intent.metadata?.transaction_type || '',
                },
              },
              {
                idempotencyKey: `split-dev-transfer-${intent.id}-${event.id}`,
              }
            )

            await supabaseAdmin.from('stripe_connect_payout_ledger').insert([
              {
                payment_intent_id: intent.id,
                charge_id: chargeId,
                destination_account: splitPlan.dev.d,
                amount_cents: Math.round(splitPlan.dev.a),
                currency: intent.currency,
                rule_id: null,
                transfer_id: developerTransfer.id,
                transfer_kind: 'developer',
                status: 'transferred',
                reversed_amount_cents: 0,
                metadata: {
                  event_id: event.id,
                  payout_mode: 'split_transfers',
                  applied_bps: splitPlan.dev.bps,
                },
              },
            ])
          }
        }
      }

      const developerDestination = intent.metadata?.connect_developer_destination_account
      const developerPayoutCents = Number(intent.metadata?.connect_developer_payout_cents || 0)

      if (
        payoutMode !== 'split_transfers' &&
        developerDestination &&
        Number.isFinite(developerPayoutCents) &&
        developerPayoutCents > 0 &&
        chargeId
      ) {
        const developerTransfer = await stripe.transfers.create(
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

        await supabaseAdmin.from('stripe_connect_payout_ledger').insert([
          {
            payment_intent_id: intent.id,
            charge_id: chargeId,
            destination_account: developerDestination,
            amount_cents: Math.round(developerPayoutCents),
            currency: intent.currency,
            rule_id: null,
            transfer_id: developerTransfer.id,
            transfer_kind: 'developer',
            status: 'transferred',
            reversed_amount_cents: 0,
            metadata: {
              event_id: event.id,
              payout_mode: intent.metadata?.connect_payout_mode || 'destination_charge',
              transaction_type: intent.metadata?.transaction_type || '',
            },
          },
        ])
      }

      const bookingId = intent.metadata?.bookingId
      const slotId = intent.metadata?.slotId
      const userId = intent.metadata?.userId

      if (!bookingId || !slotId) {
        // Admin checkout payment (no booking) — send payment confirmation email
        const studentMetaId = intent.metadata?.studentId
        const recipientEmail = intent.receipt_email || null
        const itemsCount = Number(intent.metadata?.items_count || 0)

        if (studentMetaId && recipientEmail) {
          const { data: studentRow } = await supabaseAdmin
            .from('students')
            .select('full_name')
            .eq('id', studentMetaId)
            .single()

          await sendPaymentConfirmationEmail(recipientEmail, {
            studentName: studentRow?.full_name || 'Student',
            amountDollars: (intent.amount / 100).toFixed(2),
            currency: intent.currency,
            description: intent.description,
            itemsCount,
          })
        } else if (studentMetaId && !recipientEmail) {
          // Fallback: look up student email
          const { data: studentRow } = await supabaseAdmin
            .from('students')
            .select('full_name, email')
            .eq('id', studentMetaId)
            .single()

          if (studentRow?.email) {
            await sendPaymentConfirmationEmail(studentRow.email, {
              studentName: studentRow.full_name || 'Student',
              amountDollars: (intent.amount / 100).toFixed(2),
              currency: intent.currency,
              description: intent.description,
              itemsCount,
            })
          }
        }

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

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId =
        typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id

      if (paymentIntentId && charge.amount > 0 && charge.amount_refunded > 0) {
        const { data: ledgerRows } = await supabaseAdmin
          .from('stripe_connect_payout_ledger')
          .select('id, transfer_id, amount_cents, reversed_amount_cents, status')
          .eq('payment_intent_id', paymentIntentId)
          .not('transfer_id', 'is', null)
          .in('status', ['transferred', 'partially_reversed'])

        for (const row of ledgerRows || []) {
          const transferId = row.transfer_id as string | null
          const amountCents = Number(row.amount_cents || 0)
          const alreadyReversed = Number(row.reversed_amount_cents || 0)
          if (!transferId || amountCents <= 0) continue

          const desiredReversed = Math.min(
            amountCents,
            Math.round((amountCents * charge.amount_refunded) / charge.amount)
          )

          const delta = desiredReversed - alreadyReversed
          if (delta <= 0) continue

          await stripe.transfers.createReversal(
            transferId,
            {
              amount: delta,
              metadata: {
                charge_id: charge.id,
                event_id: event.id,
                payment_intent_id: paymentIntentId,
              },
            },
            {
              idempotencyKey: `transfer-reversal-${transferId}-${event.id}`,
            }
          )

          const nextReversed = alreadyReversed + delta
          await supabaseAdmin
            .from('stripe_connect_payout_ledger')
            .update({
              reversed_amount_cents: nextReversed,
              status: nextReversed >= amountCents ? 'reversed' : 'partially_reversed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id)
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

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent
      const studentMetaId = intent.metadata?.studentId
      const lastError = intent.last_payment_error

      const declineReason = lastError?.message
        || lastError?.decline_code?.replace(/_/g, ' ')
        || 'Your card was declined. Please try a different payment method.'

      if (studentMetaId) {
        const { data: studentRow } = await supabaseAdmin
          .from('students')
          .select('full_name, email')
          .eq('id', studentMetaId)
          .single()

        const recipientEmail = intent.receipt_email || studentRow?.email || null

        if (recipientEmail) {
          await sendPaymentDeclinedEmail(recipientEmail, {
            studentName: studentRow?.full_name || 'Student',
            amountDollars: (intent.amount / 100).toFixed(2),
            declineReason,
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
