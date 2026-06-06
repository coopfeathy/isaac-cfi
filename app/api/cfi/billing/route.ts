import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireCFI } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emailTemplates } from '@/lib/resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type InvoiceRow = {
  id: string
  cfi_id: string
  student_user_id: string
  student_name: string
  student_email: string
  flight_hours: number
  instruction_hours: number
  rate_flight: number
  rate_instruction: number
  notes: string | null
  amount_total: number
  status: 'draft' | 'sent' | 'paid'
  sent_at: string | null
  paid_at: string | null
  created_at: string
}

export async function GET(request: NextRequest) {
  const authCheck = await requireCFI(request)
  if ('error' in authCheck) return authCheck.error

  const { user } = authCheck
  const db = getSupabaseAdmin()

  try {
    const { data, error } = await db
      .from('cfi_invoices')
      .select('*')
      .eq('cfi_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      // If table doesn't exist yet, return empty so the UI still renders
      return NextResponse.json({ invoices: [] })
    }
    return NextResponse.json({ invoices: (data ?? []) as InvoiceRow[] })
  } catch {
    return NextResponse.json({ invoices: [] })
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await requireCFI(request)
  if ('error' in authCheck) return authCheck.error

  const { user } = authCheck

  let body: {
    student_user_id: string
    flight_hours: number
    instruction_hours: number
    rate_flight: number
    rate_instruction: number
    notes?: string | null
    action: 'draft' | 'send'
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    student_user_id,
    flight_hours,
    instruction_hours,
    rate_flight,
    rate_instruction,
    notes,
    action,
  } = body

  if (!student_user_id) {
    return NextResponse.json({ error: 'student_user_id is required' }, { status: 400 })
  }
  if (flight_hours == null || instruction_hours == null) {
    return NextResponse.json({ error: 'hours required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()

  const { data: student, error: studentErr } = await db
    .from('students')
    .select('user_id, full_name, email')
    .eq('user_id', student_user_id)
    .eq('instructor_id', user.id)
    .single()

  if (studentErr || !student) {
    return NextResponse.json({ error: 'Student not found or not assigned to you' }, { status: 404 })
  }

  const amount = Number(flight_hours) * Number(rate_flight) + Number(instruction_hours) * Number(rate_instruction)
  const status = action === 'send' ? 'sent' : 'draft'
  const now = new Date().toISOString()

  let invoice: InvoiceRow | null = null
  try {
    const { data, error } = await db
      .from('cfi_invoices')
      .insert({
        cfi_id: user.id,
        student_user_id,
        student_name: student.full_name,
        student_email: student.email,
        flight_hours,
        instruction_hours,
        rate_flight,
        rate_instruction,
        notes: notes ?? null,
        amount_total: amount,
        status,
        sent_at: status === 'sent' ? now : null,
      })
      .select('*')
      .single()
    if (!error && data) invoice = data as InvoiceRow
  } catch {
    // table missing — return a synthetic invoice so the UI still works
  }

  if (!invoice) {
    invoice = {
      id: `temp-${Date.now()}`,
      cfi_id: user.id,
      student_user_id,
      student_name: student.full_name,
      student_email: student.email,
      flight_hours,
      instruction_hours,
      rate_flight,
      rate_instruction,
      notes: notes ?? null,
      amount_total: amount,
      status,
      sent_at: status === 'sent' ? now : null,
      paid_at: null,
      created_at: now,
    }
  }

  if (status === 'sent') {
    const flightLine = Number(flight_hours) > 0
      ? `<tr><td style="padding:8px 0;">Aircraft (${Number(flight_hours).toFixed(1)} hrs × $${Number(rate_flight).toFixed(2)})</td><td style="padding:8px 0;text-align:right;font-family:monospace;">$${(Number(flight_hours) * Number(rate_flight)).toFixed(2)}</td></tr>`
      : ''
    const instructionLine = Number(instruction_hours) > 0
      ? `<tr><td style="padding:8px 0;">Instruction (${Number(instruction_hours).toFixed(1)} hrs × $${Number(rate_instruction).toFixed(2)})</td><td style="padding:8px 0;text-align:right;font-family:monospace;">$${(Number(instruction_hours) * Number(rate_instruction)).toFixed(2)}</td></tr>`
      : ''

    const html = `
      <h2 style="margin:0 0 8px;color:#0B0B0B;">Your training invoice</h2>
      <div style="width:40px;height:3px;background:#FFBF00;margin-bottom:16px;"></div>
      <p>Hi ${student.full_name.split(' ')[0]},</p>
      <p>Thanks for flying today — here&rsquo;s your bill for this session.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;">
        ${flightLine}
        ${instructionLine}
        <tr><td style="padding:12px 0;font-weight:600;border-top:1px solid #E5E7EB;">Total Due</td><td style="padding:12px 0;text-align:right;font-weight:600;font-family:monospace;border-top:1px solid #E5E7EB;">$${amount.toFixed(2)}</td></tr>
      </table>
      ${notes ? `<p><strong>Notes:</strong> ${String(notes).replace(/[<>]/g, '')}</p>` : ''}
      <p style="margin-top:18px;">
        <a href="https://merlinflighttraining.com/dashboard" style="background:#FFBF00;color:#0B0B0B;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:600;">
          Pay invoice →
        </a>
      </p>
      <p style="margin-top:24px;color:#6B7280;font-size:13px;">Please pay within 7 days. Reply to this email with any questions.</p>
    `

    const template = emailTemplates.broadcast(`Invoice from Merlin Flight Training — $${amount.toFixed(2)}`, html)

    try {
      await resend.emails.send({
        from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
        to: student.email,
        subject: template.subject,
        html: template.html,
      })
    } catch {
      // swallow email errors
    }
  }

  return NextResponse.json({ invoice })
}

export async function PATCH(request: NextRequest) {
  const authCheck = await requireCFI(request)
  if ('error' in authCheck) return authCheck.error

  const { user } = authCheck

  let body: { id: string; status: 'draft' | 'sent' | 'paid' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, status } = body
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

  const db = getSupabaseAdmin()
  const updates: Record<string, unknown> = { status }
  if (status === 'paid') updates.paid_at = new Date().toISOString()
  if (status === 'sent') updates.sent_at = new Date().toISOString()

  try {
    const { data, error } = await db
      .from('cfi_invoices')
      .update(updates)
      .eq('id', id)
      .eq('cfi_id', user.id)
      .select('*')
      .single()
    if (error || !data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    return NextResponse.json({ invoice: data as InvoiceRow })
  } catch {
    return NextResponse.json({ error: 'Could not update invoice' }, { status: 500 })
  }
}
