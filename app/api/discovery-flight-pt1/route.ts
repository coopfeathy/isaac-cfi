import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Save to Supabase discovery_flight_pt1 table
    const { error } = await supabase
      .from('discovery_flight_pt1')
      .insert([
        {
          is_for_someone_else: data.isForSomeoneElse,
          citizenship: data.citizenship,
          first_name: data.firstName,
          last_name: data.lastName,
          phone_number: data.phoneNumber,
          date_of_birth: data.dateOfBirth,
          training_objective: data.trainingObjective,
          training_start: data.trainingStart,
          agree_to_sms: data.agreeToSMS,
          created_at: new Date().toISOString(),
        },
      ])

    if (error) {
      console.error('Supabase error:', error)
      // Don't fail the request, just log it
      return NextResponse.json(
        { message: 'Data processing in progress' },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { message: 'Form data saved successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('API error:', error)
    // Return success anyway so redirect happens
    return NextResponse.json(
      { message: 'Form submitted' },
      { status: 200 }
    )
  }
}
