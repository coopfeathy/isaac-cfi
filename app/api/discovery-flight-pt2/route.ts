import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const {
      englishFirstLanguage,
      flightInstructorInterest,
      medicalConcerns,
      pilotCertificates,
      heightFeet,
      heightInches,
      weight,
      email
    } = await request.json()

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required to update form' },
        { status: 400 }
      )
    }

    // Update the onboarding_funnel record for this email
    const { error } = await supabase
      .from('onboarding_funnel')
      .update({
        english_proficient: englishFirstLanguage,
        interested_in_instructing: flightInstructorInterest,
        medical_concerns: medicalConcerns,
        current_certificates: pilotCertificates,
        height_feet: heightFeet ? parseInt(heightFeet) : null,
        height_inches: heightInches ? parseInt(heightInches) : null,
        weight_lbs: weight ? parseInt(weight) : null,
        current_step: 2,
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
