// Merlin Flight Training - Create Stripe Checkout Session
// Netlify Function for paid bookings

import type { Handler } from "@netlify/functions"
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" }
  }

  try {
    const { slotId, userId, successUrl, cancelUrl } = JSON.parse(event.body || "{}")

    if (!slotId || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    // Fetch slot details from Supabase
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Slot not found' })
      }
    }

    if (slot.is_booked) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Slot already booked' })
      }
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: slot.type === 'tour' ? 'NYC Flight Tour' : 'Flight Training Lesson',
            description: `${slot.description || ''} - ${new Date(slot.start_time).toLocaleString()} to ${new Date(slot.end_time).toLocaleString()}`
          },
          unit_amount: slot.price
        },
        quantity: 1
      }],
      metadata: {
        slotId,
        userId
      },
      success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/schedule`
    })

    // Create pending booking in database
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        slot_id: slotId,
        user_id: userId,
        status: 'pending',
        stripe_session_id: session.id
      }])

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create booking record' })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    }

  } catch (error) {
    console.error("Error in create-checkout function:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred while creating checkout session' 
      })
    }
  }
}

export { handler }
