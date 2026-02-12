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

    // Save to Supabase onboarding_funnel table (Upsert to handle duplicates)
    const { error } = await supabase
      .from('onboarding_funnel')
      .upsert(
        {
          email,
          updated_at: new Date().toISOString(),
          // Only set created_at if it's a new record - unfortunately standard upsert updates it too if we provide it in the object
          // So we skip created_at here to rely on default, or we just accept updating it.
          // Better strategy: Let Postgres handle created_at default, only send email.
        },
        { onConflict: 'email' }
      )

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
