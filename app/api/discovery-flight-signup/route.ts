import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailTemplates } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    let supabase
    try {
      supabase = getSupabaseAdmin()
    } catch {
      console.error('Supabase admin client failed to initialize — SUPABASE_SERVICE_ROLE_KEY may be missing in environment')
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

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
      const name = email.split('@')[0]
      const { error: insertError } = await supabase
        .from('prospects')
        .insert([
          {
            email,
            full_name: name,
            source: 'discovery_flight',
            lead_stage: 'new',
            status: 'active',
            sequence_step: 0,
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

      // Day-0 confirmation email — per D-09: email failure must NOT affect response
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
          to: [email],
          subject: emailTemplates.prospectWelcome(name).subject,
          html: emailTemplates.prospectWelcome(name).html,
        })
        await supabase.from('prospects').update({ sequence_step: 1 }).eq('email', email)
      } catch (emailErr) {
        console.error('Day-0 email failed (prospect saved):', emailErr)
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
