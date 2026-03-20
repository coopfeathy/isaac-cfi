import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { email } = await request.json()

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check if prospect already exists
    const { data: existingProspect } = await supabase
      .from('prospects')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProspect) {
      // Prospect exists, just update timestamp
      const { error: updateError } = await supabase
        .from('prospects')
        .update({ updated_at: new Date().toISOString() })
        .eq('email', email)

      if (updateError) {
        console.error('Supabase error:', updateError)
        return NextResponse.json(
          { error: updateError.message || 'Failed to update email' },
          { status: 500 }
        )
      }
    } else {
      // Create new prospect
      const { error: insertError } = await supabase
        .from('prospects')
        .insert([
          {
            email,
            full_name: email.split('@')[0], // Use email prefix as placeholder name
            source: 'onboarding_funnel',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ])

      if (insertError) {
        console.error('Supabase error:', insertError)
        return NextResponse.json(
          { error: insertError.message || 'Failed to save email' },
          { status: 500 }
        )
      }
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
