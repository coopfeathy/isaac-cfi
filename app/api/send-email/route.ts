import { NextRequest, NextResponse } from 'next/server'
import { resend, emailTemplates } from '@/lib/resend'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { type, recipients, subject, message, name, date, time } = await request.json()

    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    let emailData
    let emailTo: string | string[]

    switch (type) {
      case 'welcome':
        if (!recipients || !name) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        emailData = emailTemplates.welcome(name)
        emailTo = recipients
        break

      case 'flight_reminder':
        if (!recipients || !name || !date || !time) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        emailData = emailTemplates.flightReminder(name, date, time)
        emailTo = recipients
        break

      case 'broadcast':
        if (!recipients || !subject || !message) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        emailData = emailTemplates.broadcast(subject, message)
        emailTo = Array.isArray(recipients) ? recipients : [recipients]
        break

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'Merlin Flight Training <noreply@isaac-cfi.netlify.app>',
      to: emailTo,
      subject: emailData.subject,
      html: emailData.html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Failed to send email', details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
