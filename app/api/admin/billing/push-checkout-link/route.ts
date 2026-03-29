import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { sendTwilioMessage } from '@/lib/twilio'

type CheckoutItemSelection = {
  itemId: string
  quantity: number
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })
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

async function sendCheckoutEmail(params: {
  to: string
  studentName: string
  checkoutUrl: string
  totalCents: number
  currency: string
}) {
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: params.currency.toUpperCase(),
  }).format(params.totalCents / 100)

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2 style="margin-bottom: 8px;">Complete Your Lesson Checkout</h2>
      <p style="margin-top: 0; color: #4B5563;">Hi ${params.studentName}, your instructor sent a secure payment link for your training checkout.</p>
      <p style="font-size: 16px;"><strong>Total Due:</strong> ${amount}</p>
      <p>
        <a href="${params.checkoutUrl}" style="display: inline-block; background: #C59A2A; color: #111827; text-decoration: none; font-weight: 700; border-radius: 8px; padding: 10px 14px;">
          Open Secure Checkout
        </a>
      </p>
      <p style="font-size: 13px; color: #6B7280;">If the button does not work, copy and paste this URL in your browser:</p>
      <p style="font-size: 13px; word-break: break-all; color: #1F2937;">${params.checkoutUrl}</p>
    </div>
  `

  const { error } = await resend.emails.send({
    from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
    to: [params.to],
    subject: 'Your Merlin Flight Training Checkout Link',
    html,
  })

  if (error) {
    throw new Error(error.message || 'Unable to send email')
  }
}

async function sendCheckoutText(params: { to: string; checkoutUrl: string; totalCents: number; currency: string }) {
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: params.currency.toUpperCase(),
  }).format(params.totalCents / 100)

  const body = `Merlin Flight Training: Your checkout link is ready for ${amount}. Complete payment here: ${params.checkoutUrl}`

  await sendTwilioMessage({
    to: params.to,
    body,
  })
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))

    const studentId = typeof body.studentId === 'string' ? body.studentId : ''
    const currencyInput = typeof body.currency === 'string' ? body.currency.trim().toLowerCase() : 'usd'
    const note = typeof body.note === 'string' ? body.note.trim() : ''
    const deliveryMethod = body.deliveryMethod === 'text'
      ? 'text'
      : body.deliveryMethod === 'copy'
        ? 'copy'
        : 'email'
    const itemSelections: CheckoutItemSelection[] = Array.isArray(body.itemSelections)
      ? body.itemSelections
          .map((selection: any) => ({
            itemId: String(selection?.itemId || ''),
            quantity: Number(selection?.quantity || 0),
          }))
          .filter((selection: CheckoutItemSelection) => selection.itemId && Number.isFinite(selection.quantity) && selection.quantity > 0)
      : []

    if (!studentId || itemSelections.length === 0) {
      return NextResponse.json({ error: 'Select a student and at least one training item' }, { status: 400 })
    }

    if (!/^[a-z]{3}$/.test(currencyInput)) {
      return NextResponse.json({ error: 'Currency must be a valid ISO 3-letter code' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, user_id, full_name, email, phone, preferred_currency, stripe_customer_id')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const itemIds = Array.from(new Set(itemSelections.map((selection) => selection.itemId)))
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('id, name, rate_cents, is_active')
      .in('id', itemIds)
      .eq('is_active', true)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 })
    }

    const itemById = new Map((items || []).map((item: any) => [item.id, item]))

    const lineItems = itemSelections
      .map((selection) => {
        const item = itemById.get(selection.itemId)
        if (!item || typeof item.rate_cents !== 'number') return null
        return {
          itemId: item.id,
          name: item.name,
          quantity: selection.quantity,
          unitAmountCents: item.rate_cents,
          totalCents: item.rate_cents * selection.quantity,
        }
      })
      .filter(Boolean) as Array<{
      itemId: string
      name: string
      quantity: number
      unitAmountCents: number
      totalCents: number
    }>

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'No billable training items selected' }, { status: 400 })
    }

    const subtotalCents = lineItems.reduce((sum, line) => sum + line.totalCents, 0)
    const processingFeeCents = Math.round(subtotalCents * 0.035)
    const totalCents = subtotalCents + processingFeeCents

    let customer: Stripe.Customer | null = null

    if (student.stripe_customer_id) {
      try {
        const retrieved = await stripe.customers.retrieve(student.stripe_customer_id)
        if (!('deleted' in retrieved) || !retrieved.deleted) {
          customer = retrieved as Stripe.Customer
        }
      } catch {
        customer = null
      }
    }

    if (!customer && student.email) {
      const search = await stripe.customers.list({ email: student.email, limit: 1 })
      customer = search.data[0] || null
    }

    if (!customer) {
      customer = await stripe.customers.create({
        email: student.email || undefined,
        name: student.full_name,
        metadata: {
          studentId: student.id,
        },
      })
    }

    if (customer.id !== student.stripe_customer_id) {
      await supabaseAdmin
        .from('students')
        .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
        .eq('id', student.id)
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
    if (!siteUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_SITE_URL is required to generate checkout links' }, { status: 500 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customer.id,
      success_url: `${siteUrl}/bookings?checkout=success`,
      cancel_url: `${siteUrl}/bookings?checkout=cancelled`,
      line_items: [
        ...lineItems.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: currencyInput,
            unit_amount: line.unitAmountCents,
            product_data: {
              name: line.name,
            },
          },
        })),
        {
          quantity: 1,
          price_data: {
            currency: currencyInput,
            unit_amount: processingFeeCents,
            product_data: {
              name: 'Card processing fee (3.5%)',
            },
          },
        },
      ],
      metadata: {
        studentId: student.id,
        subtotal_cents: String(subtotalCents),
        processing_fee_cents: String(processingFeeCents),
        items_count: String(lineItems.length),
        admin_note: note,
        created_by: adminCheck.user.id,
      },
      payment_intent_data: {
        description: `Lesson checkout for ${student.full_name}`,
        receipt_email: student.email || undefined,
        metadata: {
          studentId: student.id,
          subtotal_cents: String(subtotalCents),
          processing_fee_cents: String(processingFeeCents),
          items_count: String(lineItems.length),
          created_by: adminCheck.user.id,
        },
      },
    })

    const checkoutUrl = session.url
    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }

    if (deliveryMethod === 'email') {
      if (!student.email) {
        return NextResponse.json({ error: 'Student does not have an email address on file' }, { status: 400 })
      }

      await sendCheckoutEmail({
        to: student.email,
        studentName: student.full_name,
        checkoutUrl,
        totalCents,
        currency: currencyInput,
      })
    } else if (deliveryMethod === 'text') {
      if (!student.phone) {
        return NextResponse.json({ error: 'Student does not have a phone number on file' }, { status: 400 })
      }

      await sendCheckoutText({
        to: student.phone,
        checkoutUrl,
        totalCents,
        currency: currencyInput,
      })
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
      deliveryMethod,
      totalCents,
      currency: currencyInput,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
