import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { sendTwilioMessage } from '@/lib/twilio'
import {
  resolveStripeConnectChargePlan,
  StripeConnectConfigError,
} from '@/lib/stripe-connect'

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
  lineItems: Array<{ name: string; quantity: number; unitAmountCents: number; totalCents: number }>
  processingFeeCents: number
}) {
  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: params.currency.toUpperCase() }).format(cents / 100)

  const brand = {
    gold: '#FFBF00',
    dark: '#0B0B0B',
    lightBg: '#F9FAFB',
    borderColor: '#E5E7EB',
    mutedText: '#6B7280',
    logoUrl: 'https://isaac-cfi.netlify.app/merlin-logo.png',
    font: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  }

  const lineItemRows = params.lineItems
    .map(
      (item, i) => `
      <tr style="background: ${i % 2 === 0 ? brand.lightBg : '#FFFFFF'};">
        <td style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid ${brand.borderColor};">
          ${item.name}${item.quantity > 1 ? ` <span style="color:${brand.mutedText};">x${item.quantity}</span>` : ''}
        </td>
        <td style="padding: 10px 14px; font-size: 14px; font-weight: 600; text-align: right; color: ${brand.dark}; border-bottom: 1px solid ${brand.borderColor};">
          ${fmt(item.totalCents)}
        </td>
      </tr>`
    )
    .join('')

  const html = `
    <div style="font-family: ${brand.font}; max-width: 640px; margin: 0 auto; background: #FFFFFF; color: ${brand.dark};">

      <!-- Header -->
      <div style="background: ${brand.dark}; padding: 12px 32px; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: space-between;">
        <div style="flex: 1; text-align: center; padding-right: 80px;">
          <p style="margin: 0; color: #FFFFFF; font-family: ${brand.font}; font-size: 28px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Merlin Flight Training</p>
          <p style="margin: 4px 0 0 0; color: ${brand.gold}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Pilot Flight Instruction</p>
        </div>
        <img src="${brand.logoUrl}" alt="Merlin Flight Training" style="width: 140px; height: 140px; object-fit: contain; flex-shrink: 0; align-self: center; margin-top: 25px;" />
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">Complete Your Checkout</h1>
        <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px; border-radius: 2px;"></div>

        <p style="font-size: 14px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
          Hi <strong>${params.studentName}</strong>, your instructor has sent you a secure payment link for your flight training.
          Please complete your checkout at your earliest convenience.
        </p>

        <!-- Payment Summary -->
        <div style="background: ${brand.dark}; border-radius: 8px; overflow: hidden; margin: 0 0 24px 0;">
          <div style="padding: 14px 16px; border-bottom: 1px solid #1F2937;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: ${brand.gold}; font-weight: 700;">Payment Summary</p>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            ${lineItemRows}
            <tr style="background: #F9FAFB;">
              <td style="padding: 10px 14px; font-size: 14px; color: ${brand.mutedText}; border-bottom: 1px solid ${brand.borderColor};">Card Processing Fee (3.5%)</td>
              <td style="padding: 10px 14px; font-size: 14px; font-weight: 600; text-align: right; color: ${brand.mutedText}; border-bottom: 1px solid ${brand.borderColor};">${fmt(params.processingFeeCents)}</td>
            </tr>
            <tr style="background: ${brand.dark};">
              <td style="padding: 14px 16px; font-size: 15px; font-weight: 700; color: #FFFFFF;">Total Due</td>
              <td style="padding: 14px 16px; font-size: 16px; font-weight: 700; text-align: right; color: ${brand.gold};">${fmt(params.totalCents)}</td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${params.checkoutUrl}"
             style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; letter-spacing: 0.3px;">
            Open Secure Checkout &rarr;
          </a>
        </div>

        <!-- Security note -->
        <p style="font-size: 12px; color: ${brand.mutedText}; text-align: center; margin: 0 0 16px 0;">&#128274; Payments are secured and processed by Stripe</p>

        <!-- Fallback URL -->
        <p style="font-size: 12px; color: ${brand.mutedText}; text-align: center; margin: 0;">If the button does not work, copy and paste this URL into your browser:</p>
        <p style="font-size: 12px; word-break: break-all; color: #374151; text-align: center; margin: 4px 0 0 0;">${params.checkoutUrl}</p>
      </div>

      <!-- Footer -->
      <div style="background: ${brand.lightBg}; padding: 20px 32px; border-top: 1px solid ${brand.borderColor}; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="margin: 0; color: ${brand.mutedText}; font-size: 12px;">Merlin Flight Training &bull; Professional Flight Instruction</p>
      </div>

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
    const existingPaymentIntentId = typeof body.existingPaymentIntentId === 'string' ? body.existingPaymentIntentId.trim() : ''
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

    // Cancel the existing PaymentIntent (created by "Create Checkout") and remove its transaction records
    // so we don't end up with two payment objects and duplicate cash deductions
    let existingCashAlreadyDeducted = false
    if (existingPaymentIntentId && existingPaymentIntentId.startsWith('pi_')) {
      try {
        const existingPI = await stripe.paymentIntents.retrieve(existingPaymentIntentId)
        const cancelableStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing']
        if (cancelableStatuses.includes(existingPI.status)) {
          await stripe.paymentIntents.cancel(existingPaymentIntentId)
        }
      } catch {
        // PI may already be canceled or not found — safe to ignore
      }

      // Remove transaction records created by the original checkout endpoint
      if (student.user_id) {
        const { data: existingTxRows } = await supabaseAdmin
          .from('transactions')
          .select('id, description')
          .eq('user_id', student.user_id)
          .like('description', `%PI:${existingPaymentIntentId}%`)

        if (existingTxRows && existingTxRows.length > 0) {
          const hasCashTx = existingTxRows.some((row: any) =>
            (row.description || '').startsWith('CASH:')
          )
          if (hasCashTx) existingCashAlreadyDeducted = false // cash tx removed, so re-deduct with the new session

          await supabaseAdmin
            .from('transactions')
            .delete()
            .in('id', existingTxRows.map((row: any) => row.id))
        }
      }
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

    // Look up cash credit for this student
    let cashCreditCents = 0
    if (student.user_id) {
      const { data: allTx } = await supabaseAdmin
        .from('transactions')
        .select('amount_cents, description')
        .eq('user_id', student.user_id)

      if (allTx) {
        cashCreditCents = allTx.reduce((sum: number, row: any) => {
          const desc = (row.description || '') as string
          const isCash =
            desc.startsWith('CASH:') ||
            desc.startsWith('[CASH]') ||
            desc.startsWith('Partial cash payment')
          return isCash ? sum + Number(row.amount_cents || 0) : sum
        }, 0)
      }
    }

    const cashAppliedCents = Math.min(cashCreditCents, subtotalCents)
    const afterCashCents = subtotalCents - cashAppliedCents
    const processingFeeCents = Math.round(afterCashCents * 0.035)
    const totalCents = Math.max(afterCashCents + processingFeeCents, 50)

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

    // Create a one-time Stripe coupon for cash credit if applicable
    let discounts: Array<{ coupon: string }> = []
    if (cashAppliedCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: cashAppliedCents,
        currency: currencyInput,
        name: 'Cash payment credit',
        duration: 'once',
      })
      discounts = [{ coupon: coupon.id }]
    }

    const hasDiscoveryItem = lineItems.some((line) => line.name.trim().toLowerCase() === 'discovery flight')
    const transactionType = hasDiscoveryItem ? 'discovery_flight' : 'website_transaction'

    const chargePlan = await resolveStripeConnectChargePlan({
      supabaseAdmin,
      source: 'admin_checkout',
      currency: currencyInput,
      totalAmountCents: totalCents,
      subtotalCents,
      processingFeeCents,
      transactionType,
      lineItems: lineItems.map((line) => ({
        itemId: line.itemId,
        totalCents: line.totalCents,
      })),
    })

    const connectConfig = chargePlan.connectConfig
    const developerCommission = chargePlan.developerCommission
    const finalApplicationFeeAmount =
      chargePlan.mode === 'destination_charge' ? chargePlan.finalApplicationFeeAmount : undefined

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customer.id,
      success_url: `${siteUrl}/bookings?checkout=success`,
      cancel_url: `${siteUrl}/bookings?checkout=cancelled`,
      discounts,
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
        cash_applied_cents: String(cashAppliedCents),
        items_count: String(lineItems.length),
        admin_note: note,
        created_by: adminCheck.user.id,
        connect_payout_mode: chargePlan.mode,
        connect_payout_plan_v1:
          chargePlan.mode === 'split_transfers' ? chargePlan.serializedSplitPlan : '',
        connect_destination_account: connectConfig.enabled ? connectConfig.destinationAccount : '',
        connect_application_fee_cents: connectConfig.enabled
          ? String(finalApplicationFeeAmount || 0)
          : '',
        connect_rule_source: connectConfig.enabled ? connectConfig.matchSource : '',
        connect_rule_id: connectConfig.enabled && connectConfig.matchedRuleId ? connectConfig.matchedRuleId : '',
        transaction_type: transactionType,
        connect_developer_destination_account:
          chargePlan.mode === 'destination_charge' &&
          developerCommission.enabled &&
          developerCommission.destinationAccount
            ? developerCommission.destinationAccount
            : '',
        connect_developer_payout_cents:
          chargePlan.mode === 'destination_charge' && developerCommission.enabled
          ? String(developerCommission.amountCents)
          : '',
      },
      payment_intent_data: {
        description: `Lesson checkout for ${student.full_name}`,
        receipt_email: student.email || undefined,
        ...(chargePlan.mode === 'destination_charge' && connectConfig.enabled
          ? {
              application_fee_amount: finalApplicationFeeAmount,
              transfer_data: {
                destination: connectConfig.destinationAccount,
              },
            }
          : {}),
        metadata: {
          studentId: student.id,
          subtotal_cents: String(subtotalCents),
          processing_fee_cents: String(processingFeeCents),
          cash_applied_cents: String(cashAppliedCents),
          items_count: String(lineItems.length),
          created_by: adminCheck.user.id,
          connect_payout_mode: chargePlan.mode,
          connect_payout_plan_v1:
            chargePlan.mode === 'split_transfers' ? chargePlan.serializedSplitPlan : '',
          connect_destination_account: connectConfig.enabled ? connectConfig.destinationAccount : '',
          connect_application_fee_cents: connectConfig.enabled
            ? String(finalApplicationFeeAmount || 0)
            : '',
          connect_rule_source: connectConfig.enabled ? connectConfig.matchSource : '',
          connect_rule_id: connectConfig.enabled && connectConfig.matchedRuleId ? connectConfig.matchedRuleId : '',
          transaction_type: transactionType,
          connect_developer_destination_account:
            chargePlan.mode === 'destination_charge' &&
            developerCommission.enabled &&
            developerCommission.destinationAccount
              ? developerCommission.destinationAccount
              : '',
          connect_developer_payout_cents:
            chargePlan.mode === 'destination_charge' && developerCommission.enabled
            ? String(developerCommission.amountCents)
            : '',
        },
      },
    })

    const checkoutUrl = session.url
    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }

    if (cashAppliedCents > 0 && student.user_id) {
      await supabaseAdmin.from('transactions').insert([
        {
          user_id: student.user_id,
          amount_cents: -cashAppliedCents,
          type: 'charge',
          description: `CASH: Cash applied to checkout | Student:${student.full_name} | Session:${session.id}`,
          created_by: adminCheck.user.id,
        },
      ])
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
        lineItems,
        processingFeeCents,
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
    if (error instanceof StripeConnectConfigError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'stripe_connect_rule_conflict',
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
