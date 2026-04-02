import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { resolveDeveloperCommissionConfig, resolveStripeConnectConfig } from '@/lib/stripe-connect'

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
      .select('id, user_id, full_name, email, preferred_currency, stripe_customer_id')
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

    const hasDiscoveryItem = lineItems.some((line) => line.name.trim().toLowerCase() === 'discovery flight')
    const transactionType = hasDiscoveryItem ? 'discovery_flight' : 'website_transaction'

    const connectConfig = await resolveStripeConnectConfig({
      supabaseAdmin,
      source: 'admin_checkout',
      currency: currencyInput,
      totalAmountCents: totalCents,
      transactionType,
      lineItems: lineItems.map((line) => ({
        itemId: line.itemId,
        totalCents: line.totalCents,
      })),
    })

    const developerCommission = connectConfig.enabled && !connectConfig.allowDeveloperCommission
      ? {
          enabled: false,
          destinationAccount: null,
          amountCents: 0,
          appliedBps: 0,
        }
      : resolveDeveloperCommissionConfig({
          totalAmountCents: totalCents,
          transactionType,
        })

    const finalApplicationFeeAmount = connectConfig.enabled
      ? Math.min(
          totalCents,
          connectConfig.applicationFeeAmount +
            (developerCommission.enabled ? developerCommission.amountCents : 0)
        )
      : undefined

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: currencyInput,
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      ...(connectConfig.enabled
        ? {
            application_fee_amount: finalApplicationFeeAmount,
            transfer_data: {
              destination: connectConfig.destinationAccount,
            },
          }
        : {}),
      description: `Lesson checkout for ${student.full_name}`,
      receipt_email: student.email || undefined,
      metadata: {
        studentId: student.id,
        subtotal_cents: String(subtotalCents),
        processing_fee_cents: String(processingFeeCents),
        cash_applied_cents: String(cashAppliedCents),
        items_count: String(lineItems.length),
        connect_destination_account: connectConfig.enabled ? connectConfig.destinationAccount : '',
        connect_application_fee_cents: connectConfig.enabled
          ? String(finalApplicationFeeAmount || 0)
          : '',
        connect_rule_source: connectConfig.enabled ? connectConfig.matchSource : '',
        connect_rule_id: connectConfig.enabled && connectConfig.matchedRuleId ? connectConfig.matchedRuleId : '',
        transaction_type: transactionType,
        connect_developer_destination_account:
          developerCommission.enabled && developerCommission.destinationAccount
            ? developerCommission.destinationAccount
            : '',
        connect_developer_payout_cents: developerCommission.enabled
          ? String(developerCommission.amountCents)
          : '',
      },
    })

    if (student.user_id) {
      const txInserts: Array<Record<string, any>> = [
        {
          user_id: student.user_id,
          amount_cents: totalCents,
          type: 'charge',
          description: `Admin lesson checkout (${lineItems.length} item(s), processing fee included) | PI:${paymentIntent.id}${note ? ` - ${note}` : ''}`,
          created_by: adminCheck.user.id,
        },
      ]

      if (cashAppliedCents > 0) {
        txInserts.push({
          user_id: student.user_id,
          amount_cents: -cashAppliedCents,
          type: 'charge',
          description: `CASH: Cash applied to checkout | Student:${student.full_name} | PI:${paymentIntent.id}`,
          created_by: adminCheck.user.id,
        })
      }

      await supabaseAdmin.from('transactions').insert(txInserts)
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      studentId: student.id,
      currency: currencyInput,
      lineItems,
      subtotalCents,
      processingFeeCents,
      cashAppliedCents,
      totalCents,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
