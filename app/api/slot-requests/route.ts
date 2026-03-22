import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function combineDateAndTime(date: string, time: string): Date | null {
  if (!date || !time) return null
  const combined = new Date(`${date}T${time}:00`)
  return Number.isNaN(combined.getTime()) ? null : combined
}

async function sendSlotRequestAlertEmail(payload: {
  recipient: string
  fullName: string
  email: string
  phone: string
  requestedStartIso: string
  requestedEndIso: string
  notes: string
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return false

  const subject = 'New Discovery Flight Slot Request'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="margin-bottom: 8px;">New Discovery Flight Slot Request</h2>
      <p style="color: #4B5563; margin-top: 0;">A customer requested a custom discovery flight time.</p>
      <div style="margin-top: 16px; padding: 16px; border: 1px solid #E5E7EB; border-radius: 8px;">
        <p style="margin: 4px 0;"><strong>Name:</strong> ${payload.fullName}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${payload.email}</p>
        <p style="margin: 4px 0;"><strong>Phone:</strong> ${payload.phone}</p>
        <p style="margin: 4px 0;"><strong>Requested Start:</strong> ${new Date(payload.requestedStartIso).toLocaleString()}</p>
        <p style="margin: 4px 0;"><strong>Requested End:</strong> ${new Date(payload.requestedEndIso).toLocaleString()}</p>
        <p style="margin: 4px 0;"><strong>Notes:</strong> ${payload.notes || 'None'}</p>
      </div>
    </div>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: [payload.recipient],
      subject,
      html,
    }),
  })

  return response.ok
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const fullName = String(body.fullName || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = String(body.phone || '').trim()
    const preferredDate = String(body.preferredDate || '').trim()
    const preferredStartTime = String(body.preferredStartTime || '').trim()
    const durationMinutes = Number.parseInt(String(body.durationMinutes || '90'), 10)
    const notes = String(body.notes || '').trim()
    const userId = body.userId ? String(body.userId) : null

    if (!fullName || !email || !phone || !preferredDate || !preferredStartTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes < 30 || durationMinutes > 180) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
    }

    const requestedStart = combineDateAndTime(preferredDate, preferredStartTime)
    if (!requestedStart) {
      return NextResponse.json({ error: 'Invalid requested date/time' }, { status: 400 })
    }

    const requestedEnd = new Date(requestedStart.getTime() + durationMinutes * 60 * 1000)

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('slot_requests')
      .insert([
        {
          user_id: userId,
          full_name: fullName,
          email,
          phone,
          preferred_start_time: requestedStart.toISOString(),
          preferred_end_time: requestedEnd.toISOString(),
          notes: notes || null,
          status: 'pending',
          source: 'schedule_page',
        },
      ])

    if (error) throw error

    const alertRecipient = process.env.ALERT_RECIPIENT_EMAIL || process.env.ADMIN_EMAIL || ''
    if (alertRecipient) {
      await sendSlotRequestAlertEmail({
        recipient: alertRecipient,
        fullName,
        email,
        phone,
        requestedStartIso: requestedStart.toISOString(),
        requestedEndIso: requestedEnd.toISOString(),
        notes,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit slot request' }, { status: 500 })
  }
}
