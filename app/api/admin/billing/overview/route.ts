import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type StudentRow = {
  id: string
  user_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  preferred_currency: string | null
  training_item_ids: string[] | null
  stripe_customer_id: string | null
}

type TransactionRow = {
  id: string
  user_id: string | null
  amount_cents: number
  type: string
  description: string | null
  created_at: string | null
}

type ItemRow = {
  id: string
  name: string
  description: string | null
  type: string
  rate_cents: number | null
  is_active: boolean
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

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const supabaseAdmin = getSupabaseAdmin()

    const [studentsResult, itemsResult] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, user_id, full_name, email, phone, preferred_currency, training_item_ids, stripe_customer_id')
        .order('full_name', { ascending: true }),
      supabaseAdmin
        .from('items')
        .select('id, name, description, type, rate_cents, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ])

    if (studentsResult.error) throw studentsResult.error
    if (itemsResult.error) throw itemsResult.error

    const students = (studentsResult.data || []) as StudentRow[]
    const items = (itemsResult.data || []) as ItemRow[]
    const userIds = Array.from(new Set(students.map((student) => student.user_id).filter(Boolean))) as string[]

    let cashPaidByUserId = new Map<string, number>()
    let cashTxByUserId = new Map<string, Array<{ id: string; amountCents: number; description: string; createdAt: string }>>()
    if (userIds.length > 0) {
      const transactionsResult = await supabaseAdmin
        .from('transactions')
        .select('id, user_id, amount_cents, type, description, created_at')
        .in('user_id', userIds)

      if (!transactionsResult.error) {
        ;((transactionsResult.data || []) as TransactionRow[]).forEach((row) => {
          if (!row.user_id) return
          const desc = (row.description || '') as string
          const isCash =
            desc.startsWith('CASH:') ||
            desc.startsWith('[CASH]') ||
            desc.startsWith('Partial cash payment')
          if (!isCash) return
          const current = cashPaidByUserId.get(row.user_id) || 0
          cashPaidByUserId.set(row.user_id, current + Number(row.amount_cents || 0))
          const txList = cashTxByUserId.get(row.user_id) || []
          txList.push({
            id: row.id,
            amountCents: Number(row.amount_cents || 0),
            description: desc,
            createdAt: row.created_at || '',
          })
          cashTxByUserId.set(row.user_id, txList)
        })
      }
    }

    if (!stripe) {
      return NextResponse.json({
        students: students.map((student) => ({
          id: student.id,
          userId: student.user_id,
          fullName: student.full_name,
          email: student.email,
          phone: student.phone,
          preferredCurrency: (student.preferred_currency || 'usd').toLowerCase(),
          trainingItemIds: student.training_item_ids || [],
          stripeCustomerId: student.stripe_customer_id,
          stripeInvoiceBalanceCents: 0,
          stripeBalanceCurrency: (student.preferred_currency || 'usd').toLowerCase(),
          manualCashPaidCents: student.user_id ? cashPaidByUserId.get(student.user_id) || 0 : 0,
          cashTransactions: student.user_id ? cashTxByUserId.get(student.user_id) || [] : [],
          checkouts: [],
        })),
        items,
        stripeConfigured: false,
      })
    }

    const resolvedStudents = await Promise.all(
      students.map(async (student) => {
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

        if (customer && customer.id !== student.stripe_customer_id) {
          await supabaseAdmin
            .from('students')
            .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
            .eq('id', student.id)
        }

        // Fetch recent checkout history from Stripe PaymentIntents
        let checkouts: Array<{
          id: string
          amountCents: number
          currency: string
          status: 'paid' | 'pending' | 'canceled'
          description: string | null
          createdAt: string
          itemsCount: number
          cashAppliedCents: number
        }> = []

        if (customer) {
          try {
            const paymentIntents = await stripe.paymentIntents.list({
              customer: customer.id,
              limit: 30,
            })

            checkouts = paymentIntents.data
              .filter((pi) => pi.metadata?.studentId === student.id)
              .map((pi) => ({
                id: pi.id,
                amountCents: pi.amount,
                currency: pi.currency,
                status: pi.status === 'succeeded'
                  ? 'paid' as const
                  : pi.status === 'canceled'
                    ? 'canceled' as const
                    : 'pending' as const,
                description: pi.description,
                createdAt: new Date(pi.created * 1000).toISOString(),
                itemsCount: Number(pi.metadata?.items_count || 0),
                cashAppliedCents: Number(pi.metadata?.cash_applied_cents || 0),
              }))
          } catch {
            // Stripe query failed, continue without checkout history
          }
        }

        return {
          id: student.id,
          userId: student.user_id,
          fullName: student.full_name,
          email: student.email,
          phone: student.phone,
          preferredCurrency: (student.preferred_currency || customer?.currency || 'usd').toLowerCase(),
          trainingItemIds: student.training_item_ids || [],
          stripeCustomerId: customer?.id || student.stripe_customer_id,
          stripeInvoiceBalanceCents: customer?.balance || 0,
          stripeBalanceCurrency: (customer?.currency || student.preferred_currency || 'usd').toLowerCase(),
          manualCashPaidCents: student.user_id ? cashPaidByUserId.get(student.user_id) || 0 : 0,
          cashTransactions: student.user_id ? cashTxByUserId.get(student.user_id) || [] : [],
          checkouts,
        }
      })
    )

    return NextResponse.json({
      students: resolvedStudents,
      items,
      stripeConfigured: true,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
