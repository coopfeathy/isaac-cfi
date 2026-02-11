import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Save to Supabase discovery_flight_pt2 table
    const { error } = await supabase
      .from('discovery_flight_pt2')
      .insert([
        {
          english_first_language: data.englishFirstLanguage,
          flight_instructor_interest: data.flightInstructorInterest,
          medical_concerns: data.medicalConcerns,
          pilot_certificates: data.pilotCertificates,
          height_feet: data.heightFeet || null,
          height_inches: data.heightInches || null,
          weight: data.weight || null,
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
