import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireCFI } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emailTemplates } from '@/lib/resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type ContractRow = {
  id: string
  cfi_id: string
  recipient_name: string
  recipient_email: string
  template_id: string
  template_name: string
  personal_note: string | null
  status: 'sent' | 'viewed' | 'signed'
  sent_at: string
  signed_at: string | null
}

function templateBlurb(templateId: string): string {
  switch (templateId) {
    case 'new_student_onboarding':
      return `
        <p>To get you fully set up for training, please review and sign the onboarding packet. It covers our training agreement, payment terms, and what to expect for your first few lessons.</p>
        <ul>
          <li>Training agreement &amp; FAA records consent</li>
          <li>Payment terms and cancellation policy</li>
          <li>What to bring on your first lesson</li>
        </ul>
      `
    case 'training_agreement':
      return `
        <p>Please review and sign our training agreement before your next lesson. It covers liability, syllabus expectations, and consent to share training records with the FAA when needed.</p>
      `
    case 'rental_agreement':
      return `
        <p>Now that you&rsquo;re cleared to rent, please review and sign our aircraft rental agreement. It outlines insurance coverage, fuel responsibility, and aircraft return condition.</p>
      `
    default:
      return `<p>Please review and sign the attached document at your earliest convenience.</p>`
  }
}

export async function GET(request: NextRequest) {
  const authCheck = await requireCFI(request)
  if ('error' in authCheck) return authCheck.error

  const { user } = authCheck
  const db = getSupabaseAdmin()

  try {
    const { data, error } = await db
      .from('cfi_contracts')
      .select('*')
      .eq('cfi_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(50)
    if (error) {
      return NextResponse.json({ contracts: [] })
    }
    return NextResponse.json({ contracts: (data ?? []) as ContractRow[] })
  } catch {
    return NextResponse.json({ contracts: [] })
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await requireCFI(request)
  if ('error' in authCheck) return authCheck.error

  const { user } = authCheck

  let body: {
    recipient_name: string
    recipient_email: string
    template_id: string
    template_name: string
    personal_note?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { recipient_name, recipient_email, template_id, template_name, personal_note } = body

  if (!recipient_name || !recipient_email || !template_id) {
    return NextResponse.json({ error: 'recipient_name, recipient_email, and template_id are required' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient_email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const db = getSupabaseAdmin()

  // Record the contract send (best effort)
  let contract: ContractRow | null = null
  try {
    const { data, error } = await db
      .from('cfi_contracts')
      .insert({
        cfi_id: user.id,
        recipient_name,
        recipient_email,
        template_id,
        template_name,
        personal_note: personal_note ?? null,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (!error && data) contract = data as ContractRow
  } catch {
    // table not present yet
  }

  if (!contract) {
    contract = {
      id: `temp-${Date.now()}`,
      cfi_id: user.id,
      recipient_name,
      recipient_email,
      template_id,
      template_name,
      personal_note: personal_note ?? null,
      status: 'sent',
      sent_at: new Date().toISOString(),
      signed_at: null,
    }
  }

  // Send the email
  const firstName = recipient_name.split(' ')[0] || recipient_name
  const noteHtml = personal_note
    ? `<div style="background:#F9FAFB;border-left:4px solid #FFBF00;padding:14px 18px;border-radius:0 8px 8px 0;margin:18px 0;color:#0B0B0B;">${String(personal_note).replace(/[<>]/g, '')}</div>`
    : ''

  const html = `
    <h2 style="margin:0 0 8px;color:#0B0B0B;">${template_name}</h2>
    <div style="width:40px;height:3px;background:#FFBF00;margin-bottom:16px;"></div>
    <p>Hi ${firstName},</p>
    ${noteHtml}
    ${templateBlurb(template_id)}
    <p style="margin-top:18px;">
      <a href="https://merlinflighttraining.com/onboarding?contract=${encodeURIComponent(template_id)}&id=${encodeURIComponent(contract.id)}"
         style="background:#FFBF00;color:#0B0B0B;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">
        Review &amp; sign →
      </a>
    </p>
    <p style="margin-top:24px;color:#6B7280;font-size:13px;">It takes about two minutes. Reply if you have any questions before signing.</p>
    <p style="margin-top:18px;">Welcome aboard,<br/>Merlin Flight Training</p>
  `

  const template = emailTemplates.broadcast(template_name, html)

  try {
    await resend.emails.send({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: recipient_email,
      subject: template.subject,
      html: template.html,
    })
  } catch {
    // email failure — record stays in 'sent' state; surface no error to the client
  }

  return NextResponse.json({ contract })
}
