import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { 
      isForSomeoneElse,
      citizenship, 
      firstName, 
      lastName, 
      phoneNumber, 
      dateOfBirth, 
      trainingObjective, 
      trainingStart,
      agreeToSMS,
      email 
    } = await request.json()

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber || !dateOfBirth || !citizenship || !trainingObjective || !trainingStart || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Save to Supabase onboarding_funnel table
    const { error } = await supabase
      .from('onboarding_funnel')
      .update({
        citizenship: citizenship,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        dob: dateOfBirth,
        training_objective: trainingObjective,
        training_start_timeframe: trainingStart,
        current_step: 1,
      })
      .eq('email', email)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save form data' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Form data saved successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
