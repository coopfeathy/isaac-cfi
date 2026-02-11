import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Save to Supabase discovery_flight_pt3 table
    const { error } = await supabase
      .from('discovery_flight_pt3')
      .insert([
        {
          selected_location: data.selectedLocation,
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
