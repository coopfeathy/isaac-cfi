import { NextRequest, NextResponse } from 'next/server'

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
Email: ${email}
Phone: ${phone}
${aircraft ? `Regarding: ${aircraft}` : ''}

Message:
${message || 'No message provided'}

---
This message was sent from the Merlin Flight Training website contact form.
Reply directly to this email to respond to the inquiry.
    `.trim()

    // For now, we'll use a simple mailto link approach by returning the data
    // In production, you'd integrate with SendGrid, Resend, or another email service
    
    // Option 1: Use Netlify Forms (if you have Netlify)
    // Option 2: Use a service like Resend, SendGrid, etc.
    
    // For a simple solution, we can use fetch to send to a serverless email service
    // Here's an example using Resend (you'd need to set up RESEND_API_KEY in env)
    
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const TO_EMAIL = process.env.CONTACT_EMAIL || 'MerlinFlightTraining@gmail.com'

    if (RESEND_API_KEY) {
      // Use Resend if API key is available
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
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
        message: 'Email sent successfully' 
      })
    } else {
      // Fallback: Log the contact and return success
      // In production, you should set up proper email sending
      console.log('=== NEW CONTACT FORM SUBMISSION ===')
      console.log('To:', TO_EMAIL)
      console.log('Subject:', subject)
      console.log('From:', `${name} <${email}>`)
      console.log('Phone:', phone)
      console.log('Message:', message)
      console.log('===================================')
      
      // You could also save to Supabase here for tracking
      
      return NextResponse.json({ 
        success: true, 
        message: 'Contact received - email service not configured, logged to server',
        note: 'Set RESEND_API_KEY environment variable to enable email sending'
      })
    }

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
