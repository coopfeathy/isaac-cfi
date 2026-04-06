import { resend } from '@/lib/resend'
import { sendTwilioMessage } from '@/lib/twilio'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// ── Types ──────────────────────────────────────────────────────────────────

export type CalendarNotificationType =
  | 'request_submitted'
  | 'request_approved'
  | 'request_denied'
  | 'payment_link'
  | 'booking_confirmed'
  | 'reminder_24h'
  | 'cancellation_confirmed'
  | 'cancellation_alert'

interface NotificationData {
  requestId?: string
  slotRequestType?: 'training' | 'discovery_flight'
  date?: string
  time?: string
  startTime?: string
  endTime?: string
  studentName?: string
  adminActionUrl?: string
  denialReason?: string
  paymentUrl?: string
  cancellationReason?: string
  isLateCancellation?: boolean
}

interface SendCalendarNotificationParams {
  type: CalendarNotificationType
  recipientUserId?: string
  recipientEmail?: string
  recipientPhone?: string
  data: NotificationData
}

// ── Constants ──────────────────────────────────────────────────────────────

const FROM_EMAIL = 'Merlin Flight Training <noreply@merlinflighttraining.com>'
const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://merlinflighttraining.com'
const ADMIN_EMAIL = () => process.env.ALERT_RECIPIENT_EMAIL || process.env.ADMIN_EMAIL || ''
const ADMIN_PHONE_NUMBER = () => process.env.ADMIN_PHONE || ''

const ADMIN_NOTIFICATION_TYPES: CalendarNotificationType[] = ['request_submitted', 'cancellation_alert']

// ── Brand ──────────────────────────────────────────────────────────────────

const brand = {
  gold: '#FFBF00',
  dark: '#0B0B0B',
  lightBg: '#F9FAFB',
  borderColor: '#E5E7EB',
  mutedText: '#6B7280',
  logoUrl: 'https://isaac-cfi.netlify.app/merlin-logo.png',
  font: "'Inter', 'Helvetica Neue', Arial, sans-serif",
}

const emailWrapper = (content: string) => `
  <div style="font-family: ${brand.font}; max-width: 640px; margin: 0 auto; background: #FFFFFF; color: ${brand.dark};">
    <div style="background: ${brand.dark}; padding: 12px 32px; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: space-between;">
      <div style="flex: 1; text-align: center; padding-right: 80px;">
        <p style="margin: 0; color: #FFFFFF; font-family: ${brand.font}; font-size: 28px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Merlin Flight Training</p>
        <p style="margin: 4px 0 0 0; color: ${brand.gold}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Pilot Flight Instruction</p>
      </div>
      <img src="${brand.logoUrl}" alt="Merlin Flight Training" style="width: 140px; height: 140px; object-fit: contain; flex-shrink: 0; align-self: center; margin-top: 25px;" />
    </div>
    <div style="padding: 32px;">
      ${content}
    </div>
    <div style="background: ${brand.lightBg}; padding: 20px 32px; border-top: 1px solid ${brand.borderColor}; border-radius: 0 0 8px 8px; text-align: center;">
      <p style="margin: 0; color: ${brand.mutedText}; font-size: 12px;">Merlin Flight Training &bull; Professional Flight Instruction</p>
    </div>
  </div>
`

// ── Helpers ─────────────────────────────────────────────────────────────────

export function formatDateTime(isoString: string): { date: string; time: string } {
  const d = new Date(isoString)
  const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
  return { date, time }
}

function requestTypeLabel(type?: 'training' | 'discovery_flight'): string {
  return type === 'discovery_flight' ? 'Discovery Flight' : 'Training'
}

async function getUserNotificationPrefs(userId: string): Promise<{ email: boolean; sms: boolean }> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('notification_preferences')
    .select('email_enabled, sms_enabled')
    .eq('user_id', userId)
    .single()

  if (!data) return { email: true, sms: true }
  return { email: data.email_enabled, sms: data.sms_enabled }
}

async function resolveRecipient(params: SendCalendarNotificationParams): Promise<{
  email: string | null
  phone: string | null
  name: string | null
  prefs: { email: boolean; sms: boolean }
}> {
  if (params.recipientUserId) {
    const supabase = getSupabaseAdmin()
    const [profileResult, authResult, prefs] = await Promise.all([
      supabase.from('profiles').select('full_name, phone').eq('id', params.recipientUserId).single(),
      supabase.auth.admin.getUserById(params.recipientUserId),
      getUserNotificationPrefs(params.recipientUserId),
    ])

    return {
      email: authResult.data?.user?.email ?? params.recipientEmail ?? null,
      phone: profileResult.data?.phone ?? params.recipientPhone ?? null,
      name: profileResult.data?.full_name ?? params.data.studentName ?? null,
      prefs,
    }
  }

  return {
    email: params.recipientEmail ?? null,
    phone: params.recipientPhone ?? null,
    name: params.data.studentName ?? null,
    prefs: { email: true, sms: true },
  }
}

// ── Email Templates ─────────────────────────────────────────────────────────

function detailBlock(date?: string, time?: string): string {
  return `
    <div style="background: ${brand.lightBg}; border-left: 4px solid ${brand.gold}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      ${date ? `<p style="margin: 0;"><strong>Date:</strong> ${date}</p>` : ''}
      ${time ? `<p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${time}</p>` : ''}
    </div>`
}

function buttonLink(url: string, label: string): string {
  return `
    <div style="margin-top: 28px; text-align: center;">
      <a href="${url}" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px;">${label}</a>
    </div>`
}

function getEmailContent(type: CalendarNotificationType, data: NotificationData, recipientName: string | null): { subject: string; html: string } {
  const label = requestTypeLabel(data.slotRequestType)
  const name = recipientName || 'there'

  switch (type) {
    case 'request_submitted':
      return {
        subject: `New ${label} Flight Request`,
        html: emailWrapper(`
          <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">New ${label} Flight Request</h1>
          <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
          <p><strong>${data.studentName || 'A student'}</strong> has submitted a new ${label.toLowerCase()} request.</p>
          ${detailBlock(data.date, data.time)}
          ${data.adminActionUrl ? buttonLink(data.adminActionUrl, 'Review Request') : ''}
          <p style="margin-top: 20px; color: ${brand.mutedText}; font-size: 13px;">Please review and approve or deny this request.</p>
        `),
      }

    case 'request_approved':
      return {
        subject: 'Your Flight Request is Approved!',
        html: emailWrapper(`
          <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Request Approved!</h1>
          <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
          <p>Hi ${name},</p>
          <p>Your instructor has approved your ${label.toLowerCase()} request.</p>
          ${detailBlock(data.date, data.time)}
          <p>Check your email for payment details and next steps.</p>
          <p>Blue skies,<br/>Merlin Flight Training</p>
        `),
      }

    case 'request_denied':
      return {
        subject: 'Flight Request Update',
        html: emailWrapper(`
          <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Flight Request Update</h1>
          <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
          <p>Hi ${name},</p>
          <p>Unfortunately, the requested time could not be accommodated.</p>
          ${detailBlock(data.date, data.time)}
          ${data.denialReason ? `<p><strong>Reason:</strong> ${data.denialReason}</p>` : ''}
          <p>Please feel free to submit a new request for a different time.</p>
          ${buttonLink(SITE_URL() + '/schedule', 'View Available Times')}
          <p style="margin-top: 20px;">Blue skies,<br/>Merlin Flight Training</p>
        `),
      }

    case 'payment_link':
      return {
        subject: 'Payment Required — Your Flight Lesson',
        html: emailWrapper(`
          <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Payment Required</h1>
          <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
          <p>Hi ${name},</p>
          <p>Your flight request has been approved! Please complete payment to confirm your booking.</p>
          ${detailBlock(data.date, data.time)}
          ${data.paymentUrl ? buttonLink(data.paymentUrl, 'Complete Payment') : ''}
          <p style="margin-top: 20px; color: ${brand.mutedText}; font-size: 13px;">Your booking will be confirmed once payment is received.</p>
        `),
      }

    case 'booking_confirmed':
      return {
        subject: 'Flight Booking Confirmed!',
        html: emailWrapper(`
          <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Booking Confirmed!</h1>
          <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
          <p>Hi ${name},</p>
          <p>Your payment has been received and your flight is confirmed.</p>
          ${detailBlock(data.date, data.time)}
          <p>Please arrive 15 minutes early for your pre-flight briefing.</p>
          ${buttonLink(SITE_URL() + '/dashboard', 'View Your Dashboard')}
          <p style="margin-top: 20px;">Blue skies,<br/>Merlin Flight Training</p>
        `),
      }

    case 'reminder_24h':
      return {
        subject: `Flight Reminder - Tomorrow at ${data.time || 'your scheduled time'}`,
        html: emailWrapper(`
          <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Upcoming Flight Reminder</h1>
          <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
          <p>Hi ${name},</p>
          <p>This is a reminder about your upcoming flight:</p>
          ${detailBlock(data.date, data.time)}
          <p>Please arrive 15 minutes early for your pre-flight briefing.</p>
          <p>See you soon!<br/>Merlin Flight Training</p>
        `),
      }

    case 'cancellation_confirmed':
      return {
        subject: 'Booking Cancellation Confirmed',
        html: emailWrapper(`
          <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Cancellation Confirmed</h1>
          <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
          <p>Hi ${name},</p>
          <p>Your booking has been canceled.</p>
          ${detailBlock(data.date, data.time)}
          ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
          <p>If you'd like to reschedule, you can book a new time at any time.</p>
          ${buttonLink(SITE_URL() + '/schedule', 'Book a New Flight')}
          <p style="margin-top: 20px;">Blue skies,<br/>Merlin Flight Training</p>
        `),
      }

    case 'cancellation_alert':
      return {
        subject: `Student Cancellation Alert${data.isLateCancellation ? ' — Late Cancellation' : ''}`,
        html: emailWrapper(`
          <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Student Cancellation Alert</h1>
          <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
          ${data.isLateCancellation ? `<p style="color: #DC2626; font-weight: 700;">⚠️ Late Cancellation</p>` : ''}
          <p><strong>${data.studentName || 'A student'}</strong> has canceled their booking.</p>
          ${detailBlock(data.date, data.time)}
          ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
        `),
      }
  }
}

// ── SMS Templates ───────────────────────────────────────────────────────────

function getSmsContent(type: CalendarNotificationType, data: NotificationData): string | null {
  const label = requestTypeLabel(data.slotRequestType)

  switch (type) {
    case 'request_submitted':
      return `Merlin Flight Training: New ${label.toLowerCase()} request from ${data.studentName || 'a student'} for ${data.date || 'upcoming date'} ${data.time || ''}.`

    case 'request_approved':
      return `Merlin Flight Training: Your ${label.toLowerCase()} request for ${data.date || ''} ${data.time || ''} has been approved! Check your email for payment details.`

    case 'request_denied':
      return `Merlin Flight Training: Your flight request for ${data.date || ''} could not be accommodated. Check your email for details.`

    case 'payment_link':
      return data.paymentUrl
        ? `Merlin Flight Training: Payment required for your flight on ${data.date || ''}. Pay here: ${data.paymentUrl}`
        : null

    case 'booking_confirmed':
      return `Merlin Flight Training: Your flight on ${data.date || ''} ${data.time || ''} is confirmed! Arrive 15 min early.`

    case 'reminder_24h':
      return `Merlin Flight Training: Reminder - You have a flight tomorrow at ${data.time || 'your scheduled time'}. Arrive 15 min early.`

    case 'cancellation_confirmed':
      return `Merlin Flight Training: Your booking for ${data.date || ''} has been canceled successfully.`

    case 'cancellation_alert':
      return `Merlin Flight Training: ${data.studentName || 'Student'} canceled their ${data.date || ''} ${data.time || ''} booking.${data.isLateCancellation ? ' LATE CANCELLATION.' : ''}`
  }
}

// ── Main Function ───────────────────────────────────────────────────────────

export async function sendCalendarNotification(
  params: SendCalendarNotificationParams
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const isAdminNotification = ADMIN_NOTIFICATION_TYPES.includes(params.type)

  let emailSent = false
  let smsSent = false

  if (isAdminNotification) {
    const adminEmail = ADMIN_EMAIL()
    const adminPhone = ADMIN_PHONE_NUMBER()
    const emailContent = getEmailContent(params.type, params.data, null)
    const smsContent = getSmsContent(params.type, params.data)

    if (adminEmail) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: [adminEmail],
          subject: emailContent.subject,
          html: emailContent.html,
        })
        emailSent = true
      } catch (err) {
        console.error(`[notifications] Failed to send ${params.type} email to admin:`, err)
      }
    }

    if (adminPhone && smsContent) {
      try {
        await sendTwilioMessage({ to: adminPhone, body: smsContent })
        smsSent = true
      } catch (err) {
        console.error(`[notifications] Failed to send ${params.type} SMS to admin:`, err)
      }
    }

    return { emailSent, smsSent }
  }

  // Student/prospect notification
  const recipient = await resolveRecipient(params)
  const emailContent = getEmailContent(params.type, params.data, recipient.name)
  const smsContent = getSmsContent(params.type, params.data)

  if (recipient.email && recipient.prefs.email) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [recipient.email],
        subject: emailContent.subject,
        html: emailContent.html,
      })
      emailSent = true
    } catch (err) {
      console.error(`[notifications] Failed to send ${params.type} email:`, err)
    }
  }

  if (recipient.phone && recipient.prefs.sms && smsContent) {
    try {
      await sendTwilioMessage({ to: recipient.phone, body: smsContent })
      smsSent = true
    } catch (err) {
      console.error(`[notifications] Failed to send ${params.type} SMS:`, err)
    }
  }

  return { emailSent, smsSent }
}
