import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
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

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bookingId: insertedBooking.id,
        slotId,
        userId,
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
