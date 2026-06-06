import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireCFI } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emailTemplates } from '@/lib/resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const authCheck = await requireCFI(request)
  if ('error' in authCheck) return authCheck.error

  const { user } = authCheck

  let body: {
    block_id: string
    aircraft_id: string
    start_time: string
    end_time: string
    target_cfi_id: string | null
    reason: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { block_id, aircraft_id, start_time, end_time, target_cfi_id, reason } = body

  if (!block_id || !aircraft_id || !start_time || !end_time || !target_cfi_id || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getSupabaseAdmin()

  // Look up the requesting CFI and target CFI
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, email')
    .in('id', [user.id, target_cfi_id])

  const requester = profiles?.find((p) => p.id === user.id)
  const target = profiles?.find((p) => p.id === target_cfi_id)

  if (!target?.email) {
    return NextResponse.json({ error: 'Target CFI not found' }, { status: 404 })
  }

  // Record the request (best effort — table may not exist yet)
  try {
    await db.from('aircraft_override_requests').insert({
      block_id,
      aircraft_id,
      requested_by: user.id,
      target_cfi: target_cfi_id,
      start_time,
      end_time,
      reason,
      status: 'pending',
    })
  } catch {
    // table not present yet — fine, still send the email
  }

  // Send notification email
  const start = new Date(start_time).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
  const end = new Date(end_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })

  const requesterName = requester?.full_name || requester?.email || 'A Merlin instructor'

  const html = `
    <h2 style="margin:0 0 12px;color:#0B0B0B;">Aircraft override request</h2>
    <p><strong>${requesterName}</strong> is requesting your aircraft slot:</p>
    <p style="font-family:'Courier New',monospace;background:#F9FAFB;border:1px solid #E5E7EB;padding:12px;border-radius:6px;">
      ${start} – ${end}
    </p>
    <p><strong>Reason:</strong> ${reason.replace(/[<>]/g, '')}</p>
    <p>If you accept, the booking will be reassigned to them. If you decline or do not respond within 24 hours, you keep the slot.</p>
    <p style="margin-top:18px;">
      <a href="https://merlinflighttraining.com/cfi/aircraft" style="background:#FFBF00;color:#0B0B0B;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:600;">
        Review in CFI Portal →
      </a>
    </p>
  `

  const wrapped = emailTemplates.broadcast('Aircraft override request', html).html

  try {
    await resend.emails.send({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: target.email,
      subject: `Aircraft override request from ${requesterName}`,
      html: wrapped,
    })
  } catch {
    // Email failure shouldn't block the request being recorded
    return NextResponse.json({ ok: true, emailed: false })
  }

  return NextResponse.json({ ok: true, emailed: true })
}
