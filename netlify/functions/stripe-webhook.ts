// Merlin Flight Training - Stripe Webhook Handler
// Handles Stripe events (payment success, failures, etc.)

import type { Handler } from "@netlify/functions"
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createCalendarEvent } from '../../lib/google-calendar'

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

  const stripeSignature = event.headers['stripe-signature']
  
  if (!stripeSignature) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing Stripe signature' })
    }
  }

  try {
    // Verify webhook signature
    const webhookEvent = stripe.webhooks.constructEvent(
      event.body!,
      stripeSignature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    console.log('Webhook event type:', webhookEvent.type)

    // Handle successful payment (Payment Intents API)
    if (webhookEvent.type === 'payment_intent.succeeded') {
      const paymentIntent = webhookEvent.data.object as Stripe.PaymentIntent
      const slotId = paymentIntent.metadata.slotId

      if (!slotId) {
        console.error('Missing slotId in payment intent metadata:', paymentIntent.id)
        return { statusCode: 200, body: 'OK' }
      }

      // Get booking details
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*, slots(*), profiles(full_name, email, phone)')
        .eq('slot_id', slotId)
        .eq('status', 'pending')
        .single()

      if (fetchError || !booking) {
        console.error('Error fetching booking:', fetchError)
        return { statusCode: 200, body: 'OK' }
      }

      // Update booking status to paid
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'paid' })
        .eq('id', booking.id)

      if (bookingError) {
        console.error('Error updating booking:', bookingError)
      }

      // Mark slot as booked
      const { error: slotError } = await supabase
        .from('slots')
        .update({ is_booked: true })
        .eq('id', slotId)

      if (slotError) {
        console.error('Error updating slot:', slotError)
      }

      // Create Google Calendar event
      if (booking.slots && booking.profiles) {
        await createCalendarEvent({
          slotStartTime: booking.slots.start_time,
          slotEndTime: booking.slots.end_time,
          customerName: booking.profiles.full_name || 'Unknown',
          customerEmail: booking.profiles.email || '',
          customerPhone: booking.profiles.phone || '',
          slotType: booking.slots.type,
          slotDescription: booking.slots.description,
          notes: booking.notes,
        })
      }

      console.log('Successfully processed payment for payment intent:', paymentIntent.id)
    }

    // Handle successful checkout (legacy Checkout Sessions - keep for backwards compatibility)
    else if (webhookEvent.type === 'checkout.session.completed') {
      const session = webhookEvent.data.object as Stripe.Checkout.Session
      const { slotId, userId } = session.metadata || {}

      if (!slotId || !userId) {
        console.error('Missing metadata in session:', session.id)
        return { statusCode: 200, body: 'OK' }
      }

      // Update booking status to paid
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'paid' })
        .eq('stripe_session_id', session.id)

      if (bookingError) {
        console.error('Error updating booking:', bookingError)
      }

      // Mark slot as booked
      const { error: slotError } = await supabase
        .from('slots')
        .update({ is_booked: true })
        .eq('id', slotId)

      if (slotError) {
        console.error('Error updating slot:', slotError)
      }

      console.log('Successfully processed payment for session:', session.id)
    }

    // Handle expired sessions
    else if (webhookEvent.type === 'checkout.session.expired') {
      const session = webhookEvent.data.object as Stripe.Checkout.Session
      
      // Delete pending booking for expired session
      await supabase
        .from('bookings')
        .delete()
        .eq('stripe_session_id', session.id)
        .eq('status', 'pending')

      console.log('Cleaned up expired session:', session.id)
    }

    // Handle payment failures
    else if (webhookEvent.type === 'payment_intent.payment_failed') {
      const paymentIntent = webhookEvent.data.object as Stripe.PaymentIntent
      console.log('Payment failed:', paymentIntent.id)
      // Could notify admin or user here
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    }

  } catch (error) {
    console.error('Webhook error:', error)
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Webhook verification failed' 
      })
    }
  }
}

export { handler }
