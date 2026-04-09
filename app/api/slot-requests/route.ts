import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { applyRateLimit } from '@/lib/ratelimit'

async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user }
}

function combineDateAndTime(date: string, time: string): Date | null {
  if (!date || !time) return null
  const combined = new Date(`${date}T${time}:00`)
  return Number.isNaN(combined.getTime()) ? null : combined
}

function formatForMailto(value: string): string {
  return encodeURIComponent(value)
}

async function sendSlotRequestAlertEmail(payload: {
  recipient: string
  requestId?: string | null
  fullName: string
  email: string
  phone: string
  requestedStartIso: string
  requestedEndIso: string
  notes: string
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return false

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://merlinflighttraining.com').replace(/\/$/, '')
  const confirmSlotUrl = payload.requestId
    ? `${siteUrl}/admin?tab=slots&requestId=${encodeURIComponent(payload.requestId)}`
    : `${siteUrl}/admin?tab=slots`
  const contactCustomerUrl = `mailto:${encodeURIComponent(payload.email)}?subject=${formatForMailto('Discovery Flight Slot Request Follow-Up')}`
  const suggestAlternativeUrl = `mailto:${encodeURIComponent(payload.email)}?subject=${formatForMailto('Alternative Discovery Flight Times')}&body=${formatForMailto(
    `Hi ${payload.fullName},\n\nThanks for your slot request. Your requested window was ${new Date(payload.requestedStartIso).toLocaleString()} to ${new Date(payload.requestedEndIso).toLocaleString()}.\n\nHere are a few alternative times we can offer:\n-\n-\n-\n\nPlease reply with your preferred option and we will confirm it.\n\nBest,\nMerlin Flight Training`
  )}`

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

      <div style="margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap;">
        <a href="${confirmSlotUrl}" style="background: #16A34A; color: #FFFFFF; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Confirm Slot</a>
        <a href="${contactCustomerUrl}" style="background: #2563EB; color: #FFFFFF; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Contact Customer</a>
        <a href="${suggestAlternativeUrl}" style="background: #C59A2A; color: #1F2937; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Suggest Alternative</a>
      </div>

      <p style="margin-top: 12px; font-size: 12px; color: #6B7280;">
        If buttons are not visible in your email client, use these links:<br />
        Confirm Slot: <a href="${confirmSlotUrl}">${confirmSlotUrl}</a><br />
        Contact Customer: <a href="${contactCustomerUrl}">Email ${payload.email}</a><br />
        Suggest Alternative: <a href="${suggestAlternativeUrl}">Open suggested reply</a>
      </p>
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
  const rateLimitResponse = await applyRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()

    // Detect new format by presence of preferred_start_time (ISO string)
    const isNewFormat = typeof body.preferred_start_time === 'string'

    if (isNewFormat) {
      return handleNewFormatRequest(request, body)
    }

    return handleLegacyRequest(body)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit slot request' }, { status: 500 })
  }
}

async function handleNewFormatRequest(request: NextRequest, body: Record<string, unknown>) {
  const preferredStart = String(body.preferred_start_time || '')
  const preferredEnd = String(body.preferred_end_time || '')
  const requestType = String(body.request_type || 'discovery_flight')
  const notes = String(body.notes || '').trim()

  if (!preferredStart || !preferredEnd) {
    return NextResponse.json({ error: 'Missing preferred_start_time or preferred_end_time' }, { status: 400 })
  }

  const startDate = new Date(preferredStart)
  const endDate = new Date(preferredEnd)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (requestType === 'training') {
    // Training requests require authentication
    const auth = await requireAuth(request)
    if ('error' in auth) return auth.error

    // Fetch profile for auto-population
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', auth.user.id)
      .single()

    const fullName = profile?.full_name || ''
    const email = profile?.email || ''
    const phone = profile?.phone || ''

    // Duplicate check: pending request overlapping same time window
    const { data: duplicates } = await supabaseAdmin
      .from('slot_requests')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('status', 'pending')
      .lt('preferred_start_time', endDate.toISOString())
      .gt('preferred_end_time', startDate.toISOString())

    if (duplicates && duplicates.length > 0) {
      return NextResponse.json(
        { error: 'You already have a pending request for this time period.', code: 'ERR_REQ_002' },
        { status: 409 },
      )
    }

    const { data: insertedRequest, error } = await supabaseAdmin
      .from('slot_requests')
      .insert([{
        user_id: auth.user.id,
        full_name: fullName,
        email,
        phone,
        preferred_start_time: startDate.toISOString(),
        preferred_end_time: endDate.toISOString(),
        notes: notes || null,
        status: 'pending',
        source: 'student_calendar',
        request_type: 'training',
      }])
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, id: insertedRequest?.id })
  }

  // discovery_flight — no auth required but need contact fields
  const fullName = String(body.full_name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const phone = String(body.phone || '').trim()
  const prospectId = body.prospect_id ? String(body.prospect_id) : null

  if (!fullName || !email || !phone) {
    return NextResponse.json({ error: 'Missing required fields (full_name, email, phone)' }, { status: 400 })
  }

  const { data: insertedRequest, error } = await supabaseAdmin
    .from('slot_requests')
    .insert([{
      full_name: fullName,
      email,
      phone,
      preferred_start_time: startDate.toISOString(),
      preferred_end_time: endDate.toISOString(),
      notes: notes || null,
      status: 'pending',
      source: 'schedule_page',
      request_type: 'discovery_flight',
      prospect_id: prospectId,
    }])
    .select('id')
    .single()

  if (error) throw error

  // Send alert email for discovery flights
  const alertRecipient = process.env.ALERT_RECIPIENT_EMAIL || process.env.ADMIN_EMAIL || ''
  if (alertRecipient) {
    await sendSlotRequestAlertEmail({
      recipient: alertRecipient,
      requestId: insertedRequest?.id || null,
      fullName,
      email,
      phone,
      requestedStartIso: startDate.toISOString(),
      requestedEndIso: endDate.toISOString(),
      notes,
    })
  }

  return NextResponse.json({ success: true, id: insertedRequest?.id })
}

async function handleLegacyRequest(body: Record<string, unknown>) {
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
  const { data: insertedRequest, error } = await supabaseAdmin
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
    .select('id')
    .single()

  if (error) throw error

  const alertRecipient = process.env.ALERT_RECIPIENT_EMAIL || process.env.ADMIN_EMAIL || ''
  if (alertRecipient) {
    await sendSlotRequestAlertEmail({
      recipient: alertRecipient,
      requestId: insertedRequest?.id || null,
      fullName,
      email,
      phone,
      requestedStartIso: requestedStart.toISOString(),
      requestedEndIso: requestedEnd.toISOString(),
      notes,
    })
  }

  return NextResponse.json({ success: true })
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if ('error' in auth) return auth.error

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('slot_requests')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load slot requests' }, { status: 500 })
  }
}
