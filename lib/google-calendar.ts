import { google } from 'googleapis'

export async function createCalendarEvent(eventDetails: {
  slotStartTime: string
  slotEndTime: string
  customerName: string
  customerEmail: string
  customerPhone: string
  slotType: string
  slotDescription?: string
  notes?: string
}) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    const calendar = google.calendar({ version: 'v3', auth })

    const eventType = eventDetails.slotType === 'tour' ? 'Flight Tour' : 'Flight Training'
    const description = `
${eventType} - ${eventDetails.slotDescription || ''}

Customer Details:
- Name: ${eventDetails.customerName}
- Email: ${eventDetails.customerEmail}
- Phone: ${eventDetails.customerPhone}

${eventDetails.notes ? `Notes: ${eventDetails.notes}` : ''}

This booking was automatically created via the website.
    `.trim()

    const event = {
      summary: `${eventType} - ${eventDetails.customerName}`,
      description,
      start: {
        dateTime: eventDetails.slotStartTime,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: eventDetails.slotEndTime,
        timeZone: 'America/New_York',
      },
      attendees: [
        { email: eventDetails.customerEmail, displayName: eventDetails.customerName },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'email', minutes: 60 }, // 1 hour before
        ],
      },
    }

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      requestBody: event,
      sendUpdates: 'all', // Send email invitations to attendees
    })

    console.log('Calendar event created:', response.data.id)
    return { success: true, eventId: response.data.id }
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return { success: false, error }
  }
}
