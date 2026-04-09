import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resolveDeveloperCommissionConfig, resolveStripeConnectConfig } from '@/lib/stripe-connect'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export async function POST(req: Request) {
  try {
    const { amount, slotId, userId, email, name, phone, notes } = await req.json()

    if (!amount || !slotId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, slotId, userId' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: slot, error: slotError } = await supabaseAdmin
      .from('slots')
      .select('id, is_booked, type, description, price, start_time, end_time')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      return new Response(JSON.stringify({ error: 'Slot not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (slot.is_booked) {
      return new Response(JSON.stringify({ error: 'Slot is already booked' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const bookingNotes = [
      notes ? String(notes).trim() : null,
      name ? `Name: ${String(name).trim()}` : null,
      phone ? `Phone: ${String(phone).trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    // Keep only one pending booking for this user + slot pair.
    await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('slot_id', slotId)
      .eq('user_id', userId)
      .eq('status', 'pending')

    const { data: insertedBooking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([
        {
          slot_id: slotId,
          user_id: userId,
          status: 'pending',
          notes: bookingNotes || null,
        },
      ])
      .select('id')
      .single()

    if (bookingError || !insertedBooking) {
      return new Response(
        JSON.stringify({ error: bookingError?.message || 'Failed to create pending booking' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const baseAmount = Number(amount)
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const processingFee = Math.round(baseAmount * 0.035)
    const totalAmount = baseAmount + processingFee

    const lowerDescription = (slot.description || '').toLowerCase()
    const transactionType =
      slot.type === 'tour' || lowerDescription.includes('discovery')
        ? 'discovery_flight'
        : 'website_transaction'

    const connectConfig = await resolveStripeConnectConfig({
      supabaseAdmin,
      source: 'slot_booking',
      currency: 'usd',
      totalAmountCents: totalAmount,
      slotType: slot.type,
      transactionType,
    })

    const developerCommission = connectConfig.enabled && !connectConfig.allowDeveloperCommission
      ? {
          enabled: false,
          destinationAccount: null,
          amountCents: 0,
          appliedBps: 0,
        }
      : resolveDeveloperCommissionConfig({
          totalAmountCents: totalAmount,
          transactionType,
        })

    const finalApplicationFeeAmount = connectConfig.enabled
      ? Math.min(
          totalAmount,
          connectConfig.applicationFeeAmount +
            (developerCommission.enabled ? developerCommission.amountCents : 0)
        )
      : undefined

    // Optional Stripe Connect destination charge routing for automatic payouts.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      ...(connectConfig.enabled
        ? {
            application_fee_amount: finalApplicationFeeAmount,
            transfer_data: {
              destination: connectConfig.destinationAccount,
            },
          }
        : {}),
      metadata: {
        bookingId: insertedBooking.id,
        slotId,
        userId,
        base_amount_cents: String(baseAmount),
        processing_fee_cents: String(processingFee),
        connect_destination_account: connectConfig.enabled ? connectConfig.destinationAccount : '',
        connect_application_fee_cents:
          connectConfig.enabled
            ? String(finalApplicationFeeAmount || 0)
            : '',
        connect_rule_source: connectConfig.enabled ? connectConfig.matchSource : '',
        connect_rule_id: connectConfig.enabled && connectConfig.matchedRuleId ? connectConfig.matchedRuleId : '',
        transaction_type: transactionType,
        connect_developer_destination_account:
          developerCommission.enabled && developerCommission.destinationAccount
            ? developerCommission.destinationAccount
            : '',
        connect_developer_payout_cents: developerCommission.enabled
          ? String(developerCommission.amountCents)
          : '',
      },
      receipt_email: email || undefined,
    })

    await supabaseAdmin
      .from('bookings')
      .update({ stripe_session_id: paymentIntent.id })
      .eq('id', insertedBooking.id)

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        bookingId: insertedBooking.id,
        subtotalCents: baseAmount,
        processingFeeCents: processingFee,
        totalCents: totalAmount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
