import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, message, aircraft } = body

    // Validate required fields
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Build the email content
    const subject = aircraft
      ? `New Inquiry from ${name} - ${aircraft}`
      : `New Inquiry from ${name}`

    const emailBody = `
New Contact Form Submission
============================

Name: ${name}
${aircraft ? `Regarding: ${aircraft}` : ''}

Message:
${message || 'No message provided'}

---
This message was sent from the Merlin Flight Training website contact form.
Reply directly to this email to respond to the inquiry.
    `.trim()

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const TO_EMAIL = process.env.CONTACT_EMAIL || 'merlinflighttraining@gmail.com'

    if (RESEND_API_KEY) {
      // Use Resend if API key is available
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
          to: [TO_EMAIL],
          reply_to: email,
          subject: subject,
          text: emailBody,
        }),
      })

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json()
        console.error('Resend API error:', errorData)
        return NextResponse.json(
          { error: 'Failed to send email' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
      })
    } else {
      // Fallback: save to DB when email service is unavailable (D-15)
      try {
        const supabaseAdmin = getSupabaseAdmin()
        await supabaseAdmin.from('contact_submissions').insert({
          name,
          email,
          phone: phone || null,
          message: message || null,
          subject: subject || null,
        })
      } catch (dbError) {
        // Log without PII — DB fallback itself failed
        console.error('Failed to save contact submission to database')
      }
      return NextResponse.json(
        { error: 'Email service unavailable' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
