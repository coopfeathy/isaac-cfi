import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const paymentIntentId = typeof body.paymentIntentId === 'string' ? body.paymentIntentId : ''
    const studentId = typeof body.studentId === 'string' ? body.studentId : ''

    if (!paymentIntentId || !studentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId or studentId' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, email')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!student.email) {
      return NextResponse.json({ error: 'Student does not have an email address on file' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status === 'succeeded') {
      return NextResponse.json({ error: 'This payment has already been completed' }, { status: 400 })
    }

    if (paymentIntent.status === 'canceled') {
      return NextResponse.json({ error: 'This payment has been canceled' }, { status: 400 })
    }

    const amountCents = paymentIntent.amount
    const currency = paymentIntent.currency

    const fmt = (cents: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)

    const brand = {
      gold: '#FFBF00',
      dark: '#0B0B0B',
      lightBg: '#F9FAFB',
      borderColor: '#E5E7EB',
      mutedText: '#6B7280',
      logoUrl: 'https://isaac-cfi.netlify.app/merlin-logo.png',
      font: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    }

    const html = `
      <div style="font-family: ${brand.font}; max-width: 640px; margin: 0 auto; background: #FFFFFF; color: ${brand.dark};">
        <div style="background: ${brand.dark}; padding: 12px 32px; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: space-between;">
          <div style="flex: 1; text-align: center; padding-right: 80px;">
            <p style="margin: 0; color: #FFFFFF; font-family: ${brand.font}; font-size: 28px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Merlin Flight Training</p>
            <p style="margin: 4px 0 0 0; color: ${brand.gold}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Pilot Flight Instruction</p>
          </div>
          <img src="${brand.logoUrl}" alt="Merlin Flight Training" style="width: 140px; height: 140px; object-fit: contain; flex-shrink: 0; align-self: center; margin-top: 25px;" />
        </div>
        <div style="padding: 32px;">
          <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Payment Reminder</h1>
          <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px; border-radius: 2px;"></div>

          <p style="font-size: 14px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
            Hi <strong>${student.full_name}</strong>, this is a friendly reminder that you have an outstanding payment of
            <strong style="color: ${brand.dark};">${fmt(amountCents)}</strong> with Merlin Flight Training.
          </p>

          <div style="background: ${brand.dark}; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: ${brand.gold}; font-weight: 700;">Amount Due</p>
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${brand.gold};">${fmt(amountCents)}</p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #374151;">
            Please contact your instructor to complete this payment at your earliest convenience.
            If you have already made this payment, please disregard this reminder.
          </p>

          <p style="margin-top: 24px; color: ${brand.mutedText}; font-size: 13px; text-align: center;">Thank you for training with Merlin Flight Training.</p>
        </div>
        <div style="background: ${brand.lightBg}; padding: 20px 32px; border-top: 1px solid ${brand.borderColor}; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: ${brand.mutedText}; font-size: 12px;">Merlin Flight Training &bull; Professional Flight Instruction</p>
        </div>
      </div>
    `

    const { error: emailError } = await resend.emails.send({
      from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
      to: [student.email],
      subject: `Payment Reminder - ${fmt(amountCents)} - Merlin Flight Training`,
      html,
    })

    if (emailError) {
      return NextResponse.json({ error: emailError.message || 'Unable to send reminder email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, sentTo: student.email })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
