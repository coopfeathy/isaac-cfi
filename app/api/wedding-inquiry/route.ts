import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      coupleName,
      email,
      phone,
      weddingDate,
      guestCount,
      preferredAirport,
      packageInterest,
      message,
    } = body

    if (!coupleName || !email || !weddingDate) {
      return NextResponse.json(
        { error: 'Couple name, email, and wedding date are required.' },
        { status: 400 },
      )
    }

    // Send notification email to Isaac
    await resend.emails.send({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: 'isaac@merlinflighttraining.com',
      subject: `Wedding Inquiry from ${coupleName}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0B0B0B; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #FFBF00; margin: 0; font-size: 20px;">New Wedding Inquiry</h1>
          </div>
          <div style="background: #F9FAFB; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #E5E7EB;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Couple</td><td style="padding: 8px 0; font-weight: 600;">${coupleName}</td></tr>
              <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
              ${phone ? `<tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Phone</td><td style="padding: 8px 0;"><a href="tel:${phone}">${phone}</a></td></tr>` : ''}
              <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Wedding Date</td><td style="padding: 8px 0; font-weight: 600;">${weddingDate}</td></tr>
              ${guestCount ? `<tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Guest Flights</td><td style="padding: 8px 0;">${guestCount}</td></tr>` : ''}
              ${preferredAirport ? `<tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Preferred Airport</td><td style="padding: 8px 0;">${preferredAirport}</td></tr>` : ''}
              ${packageInterest ? `<tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Package</td><td style="padding: 8px 0;">${packageInterest}</td></tr>` : ''}
            </table>
            ${message ? `<div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #E5E7EB;"><p style="margin: 0 0 4px; color: #6B7280; font-size: 12px; text-transform: uppercase;">Message</p><p style="margin: 0; font-size: 14px;">${message}</p></div>` : ''}
          </div>
        </div>
      `,
    })

    // Send confirmation email to the couple
    await resend.emails.send({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: email,
      subject: "We Got Your Wedding Inquiry! ✈️",
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0B0B0B; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
            <img src="https://isaac-cfi.netlify.app/merlin-logo.png" alt="Merlin Flight Training" style="height: 60px; margin-bottom: 16px;" />
            <h1 style="color: #FFBF00; margin: 0; font-size: 22px;">Discovery Flight Weddings</h1>
          </div>
          <div style="background: #F9FAFB; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #E5E7EB;">
            <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 16px;">Hi ${coupleName.split('&')[0]?.trim() || 'there'},</p>
            <p style="font-size: 14px; color: #4B5563; line-height: 1.6; margin: 0 0 16px;">
              Thank you for reaching out about Discovery Flight Weddings! I received your inquiry and I'm excited to help make your wedding day truly unforgettable.
            </p>
            <p style="font-size: 14px; color: #4B5563; line-height: 1.6; margin: 0 0 24px;">
              I'll review your details and get back to you within 24 hours with a custom quote. In the meantime, congratulations on your upcoming wedding!
            </p>
            <p style="font-size: 14px; color: #4B5563; line-height: 1.6; margin: 0;">
              Clear skies,<br/>
              <strong>Isaac Prestwich, CFII</strong><br/>
              Merlin Flight Training
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Wedding inquiry error:', err)
    return NextResponse.json(
      { error: 'Failed to send inquiry. Please try again.' },
      { status: 500 },
    )
  }
}
