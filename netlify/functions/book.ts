// Merlin Flight Training - Create Free Booking (no payment)
// Netlify Function for free introductory lessons

import type { Handler } from "@netlify/functions"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" }
  }

  try {
    const { slotId, userId, notes } = JSON.parse(event.body || "{}")

    if (!slotId || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: slotId and userId' })
      }
    }

    // Verify slot is available
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
        body: JSON.stringify({ error: 'Slot is already booked' })
      }
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        slot_id: slotId,
        user_id: userId,
        status: 'confirmed',
        notes
      }])
      .select()
      .single()

    if (bookingError) {
      console.error('Booking error:', bookingError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create booking' })
      }
    }

    // Mark slot as booked
    await supabase
      .from('slots')
      .update({ is_booked: true })
      .eq('id', slotId)

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, booking })
    }

  } catch (error) {
    console.error("Error in book function:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "An error occurred while booking" })
    }
  }
}

export { handler }


