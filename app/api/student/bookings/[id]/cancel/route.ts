import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
})

/**
 * Charge-or-flag logic extracted for testability.
 *
 * If the student has a Stripe customer with a saved card, charges $50 off-session.
 * If no card is on file — or if the charge fails — inserts a cancellation_fee_flags
 * record for admin follow-up.
 *
 * Returns { fee: 'charged' | 'flagged', amount_cents: 5000 }
 */
export async function processCancellationFee({
  stripeCustomerId,
  bookingId,
  studentId,
  stripe: stripeClient,
  supabaseAdmin,
}: {
  stripeCustomerId: string | null
  bookingId: string
  studentId: string
  stripe: Stripe
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
}): Promise<{ fee: 'charged' | 'flagged'; amount_cents: 5000 }> {
  if (stripeCustomerId) {
    const paymentMethods = await stripeClient.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    })

    if (paymentMethods.data.length > 0) {
      try {
        await stripeClient.paymentIntents.create({
          amount: 5000,
          currency: 'usd',
          customer: stripeCustomerId,
          payment_method: paymentMethods.data[0].id,
          confirm: true,
          off_session: true,
          description: `Cancellation fee - booking ${bookingId}`,
          metadata: { bookingId, type: 'cancellation_fee' },
        })
        return { fee: 'charged', amount_cents: 5000 }
      } catch (chargeError: unknown) {
        // Charge failed (e.g., authentication_required, insufficient_funds).
        // Fall through to flag the fee rather than failing the cancellation.
        console.error('[cancel] Cancellation charge failed, flagging instead:', chargeError)
      }
    }
  }

  // No card on file or charge failed — flag the fee for admin resolution
  await supabaseAdmin.from('cancellation_fee_flags').insert({
    student_id: studentId,
    booking_id: bookingId,
    amount_cents: 5000,
    reason: stripeCustomerId ? 'Charge failed at cancellation' : 'No card on file at cancellation',
  })
  return { fee: 'flagged', amount_cents: 5000 }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Authenticate the requesting user
  const authCheck = await requireUser(request)
  if ('error' in authCheck) return authCheck.error

  const { id } = params
  const supabaseAdmin = getSupabaseAdmin()

  // 2. Atomically cancel the booking and release the slot via RPC.
  //    The RPC validates ownership (p_user_id must match bookings.user_id).
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('cancel_booking_atomic', {
    p_booking_id: id,
    p_user_id: authCheck.user.id,
  })

  if (rpcError) {
    console.error('[cancel] RPC error:', rpcError)
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }

  const result = rpcResult as { ok?: boolean; error?: string; status?: string }

  if (result?.error === 'booking_not_found') {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (result?.error === 'booking_not_cancellable') {
    return NextResponse.json(
      { error: 'Booking cannot be canceled', current_status: result.status },
      { status: 409 }
    )
  }

  if (!result?.ok) {
    return NextResponse.json({ error: 'Unexpected cancellation error' }, { status: 500 })
  }

  // 3. Look up the student record to find their Stripe customer ID
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, stripe_customer_id, email, full_name')
    .eq('user_id', authCheck.user.id)
    .single()

  // 4. Check 24-hour grace period — only charge a cancellation fee for late cancellations.
  const LATE_CANCEL_HOURS = 24
  const slotId = (result as any).slot_id as string | undefined

  if (slotId) {
    const { data: slotRow } = await supabaseAdmin
      .from('slots')
      .select('start_time')
      .eq('id', slotId)
      .single()

    if (slotRow?.start_time) {
      const hoursUntil = (new Date(slotRow.start_time).getTime() - Date.now()) / 3600000
      if (hoursUntil >= LATE_CANCEL_HOURS) {
        return NextResponse.json({ canceled: true, fee: 'waived', amount_cents: 0 }, { status: 200 })
      }
    }
  }

  // 5. Attempt to charge $50 or flag the fee (late cancellation — within 24 hours)
  const feeResult = await processCancellationFee({
    stripeCustomerId: student?.stripe_customer_id ?? null,
    bookingId: id,
    studentId: student?.id ?? authCheck.user.id,
    stripe,
    supabaseAdmin,
  })

  return NextResponse.json({ canceled: true, ...feeResult }, { status: 200 })
}
