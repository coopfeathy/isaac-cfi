import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

// Email templates
export const emailTemplates = {
  // Welcome email for new students
  welcome: (name: string) => ({
    subject: 'Welcome to Merlin Flight Training!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e3a8a;">Welcome Aboard, ${name}! ✈️</h1>
        <p>Thank you for joining Merlin Flight Training. We're excited to help you achieve your aviation dreams!</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Schedule your discovery flight</li>
          <li>Browse our aircraft fleet</li>
          <li>Review our training programs</li>
          <li>Meet our instructors</li>
        </ul>
        <p>If you have any questions, feel free to reply to this email.</p>
        <p>Blue skies ahead,<br/>The Merlin Flight Training Team</p>
      </div>
    `,
  }),

  // Flight reminder
  flightReminder: (name: string, date: string, time: string) => ({
    subject: 'Flight Reminder - Merlin Flight Training',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e3a8a;">Flight Reminder ✈️</h1>
        <p>Hi ${name},</p>
        <p>This is a reminder about your upcoming flight:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${time}</p>
        </div>
        <p>Please arrive 15 minutes early for pre-flight briefing.</p>
        <p>See you soon!<br/>Merlin Flight Training</p>
      </div>
    `,
  }),

  // Generic broadcast template
  broadcast: (subject: string, message: string) => ({
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="https://isaac-cfi.netlify.app/images/logo.png" alt="Merlin Flight Training" style="max-width: 200px; margin-bottom: 20px;" />
        <div style="white-space: pre-wrap;">${message}</div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 14px;">
          You're receiving this email because you're part of the Merlin Flight Training community.
        </p>
      </div>
    `,
  }),
}
