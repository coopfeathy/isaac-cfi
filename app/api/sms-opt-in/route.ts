import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/ratelimit'

/**
 * SMS Opt-In API Route
 *
 * Records an end-user's consent to receive SMS text messages from
 * Merlin Flight Training. The consent record is delivered to the
 * school via email (Resend, if configured) so we have a durable
 * audit trail of the name, email, phone, consent text, and timestamp.
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      phoneDigits,
      consent,
      consentText,
      consentTimestamp,
      pageUrl,
    } = body as {
      name?: string
      email?: string
      phone?: string
      phoneDigits?: string
      consent?: boolean
      consentText?: string
      consentTimestamp?: string
      pageUrl?: string
    }

    // Required fields
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, email, and mobile phone number are required.' },
        { status: 400 }
      )
    }

    // Consent MUST be explicit
    if (consent !== true) {
      return NextResponse.json(
        { error: 'You must agree to the SMS consent statement to subscribe.' },
        { status: 400 }
      )
    }

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 })
    }

    // Phone number must be a valid 10-digit US number
    const digits = (phoneDigits || phone).replace(/\D/g, '')
    if (digits.length !== 10) {
      return NextResponse.json(
        { error: 'Please provide a valid 10-digit U.S. mobile number.' },
        { status: 400 }
      )
    }

    // Build notification email for the flight school so they have
    // a written record of the consent.
    const timestamp = consentTimestamp || new Date().toISOString()
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const subject = `New SMS Opt-In: ${name}`
    const emailBody = `
New SMS Opt-In Submission
=========================

Name:  ${name}
Email: ${email}
Phone: ${phone} (+1${digits})

Consent Statement (user agreed to the following):
"${
      consentText ||
      'I agree to receive SMS text messages from Merlin Flight Training at the phone number provided above. I understand that message and data rates may apply, message frequency varies, and I can opt out at any time by replying STOP.'
    }"

Consent recorded at: ${timestamp}
Source page:         ${pageUrl || 'https://merlinflighttraining.com/sms-opt-in'}
IP address:          ${ipAddress}
User agent:          ${userAgent}

Message types disclosed to the user:
- Lesson reminders
- Schedule changes
- Weather cancellations
- Training updates
- Account notifications

The user may revoke consent at any time by replying STOP to any
message or by contacting Merlin Flight Training directly.

---
This message was generated automatically by the SMS opt-in form
at merlinflighttraining.com/sms-opt-in.
`.trim()

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const TO_EMAIL = process.env.CONTACT_EMAIL || 'merlinflighttraining@gmail.com'

    if (RESEND_API_KEY) {
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
          subject,
          text: emailBody,
        }),
      })

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json().catch(() => ({}))
        console.error('Resend API error (sms-opt-in):', errorData)
        return NextResponse.json(
          { error: 'Unable to record your opt-in right now. Please try again later.' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'SMS opt-in recorded successfully.',
      })
    }

    // Fallback: log it server-side when Resend is not configured.
    console.log('=== NEW SMS OPT-IN (email service not configured) ===')
    console.log(emailBody)
    console.log('======================================================')

    return NextResponse.json({
      success: true,
      message:
        'SMS opt-in received. Email service is not configured, so the record has been logged on the server.',
    })
  } catch (error) {
    console.error('SMS opt-in error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
