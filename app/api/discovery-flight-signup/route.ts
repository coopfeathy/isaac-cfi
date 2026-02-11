import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Save to Supabase discovery_flight_signups table
    const { error } = await supabase
      .from('discovery_flight_signups')
      .insert([
        {
          email,
          created_at: new Date().toISOString(),
        },
      ])

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Email saved successfully' },
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
