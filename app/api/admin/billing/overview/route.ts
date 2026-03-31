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
  user_id: string | null
  amount_cents: number
  type: string
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
    if (userIds.length > 0) {
      const transactionsResult = await supabaseAdmin
        .from('transactions')
        .select('user_id, amount_cents, type')
        .in('user_id', userIds)
        .in('type', ['cash_payment'])

      if (!transactionsResult.error) {
        ;((transactionsResult.data || []) as TransactionRow[]).forEach((row) => {
          if (!row.user_id) return
          const current = cashPaidByUserId.get(row.user_id) || 0
          cashPaidByUserId.set(row.user_id, current + Number(row.amount_cents || 0))
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
