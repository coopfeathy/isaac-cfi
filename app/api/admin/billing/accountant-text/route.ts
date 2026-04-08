import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendTwilioMessage } from '@/lib/twilio'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })
  : null

type TransactionRow = {
  id: string
  user_id: string | null
  amount_cents: number
  type: string
  description: string | null
  created_at: string
}

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

function extractPaymentIntentId(text: string | null): string | null {
  if (!text) return null
  const match = text.match(/PI:(pi_[A-Za-z0-9_]+)/)
  return match?.[1] || null
}

function extractUrls(text: string | null): string[] {
  if (!text) return []
  const matches = text.match(/https?:\/\/[^\s]+/g)
  return matches || []
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100)
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const accountantPhone = process.env.ACCOUNTANT_PHONE
    if (!accountantPhone) {
      return NextResponse.json({ error: 'ACCOUNTANT_PHONE is not configured' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedLookback = Number(body?.daysBack || process.env.ACCOUNTANT_TEXT_LOOKBACK_DAYS || 7)
    const daysBack = Number.isFinite(requestedLookback) ? Math.max(1, Math.min(30, Math.floor(requestedLookback))) : 7

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const supabaseAdmin = getSupabaseAdmin()

    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select('id, user_id, amount_cents, type, description, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (transactionsError) {
      return NextResponse.json({ error: transactionsError.message }, { status: 400 })
    }

    const transactionRows = (transactions || []) as TransactionRow[]
    if (transactionRows.length === 0) {
      await sendTwilioMessage({
        to: accountantPhone,
        body: `Merlin Billing Report (${daysBack}d): No purchases or expenses logged.`,
      })
      return NextResponse.json({ success: true, sent: true, count: 0, mediaCount: 0 })
    }

    const userIds = Array.from(new Set(transactionRows.map((row) => row.user_id).filter(Boolean))) as string[]
    const studentsResult = userIds.length
      ? await supabaseAdmin.from('students').select('user_id, full_name').in('user_id', userIds)
      : { data: [], error: null }

    if (studentsResult.error) {
      return NextResponse.json({ error: studentsResult.error.message }, { status: 400 })
    }

    const studentNameByUserId = new Map<string, string>()
    ;(studentsResult.data || []).forEach((row: any) => {
      if (row.user_id) studentNameByUserId.set(row.user_id, row.full_name || 'Student')
    })

    const paymentIntentIds = Array.from(
      new Set(
        transactionRows
          .map((row) => extractPaymentIntentId(row.description))
          .filter(Boolean)
      )
    ) as string[]

    const mediaCandidates: string[] = []

    if (stripe) {
      for (const paymentIntentId of paymentIntentIds.slice(0, 5)) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge'],
          })
          const latestCharge = paymentIntent.latest_charge as Stripe.Charge | null
          const receiptUrl = latestCharge?.receipt_url || null
          if (receiptUrl) {
            mediaCandidates.push(receiptUrl)
          }
        } catch {
          // ignore individual Stripe fetch failures and continue
        }
      }
    }

    transactionRows.forEach((row) => {
      extractUrls(row.description).forEach((url) => mediaCandidates.push(url))
    })

    const uniqueMediaUrls = Array.from(new Set(mediaCandidates)).slice(0, 5)

    const purchaseTotal = transactionRows
      .filter((row) => ['charge', 'purchase', 'cash_payment'].includes(row.type.toLowerCase()))
      .reduce((sum, row) => sum + Number(row.amount_cents || 0), 0)

    const expenseTotal = transactionRows
      .filter((row) => row.type.toLowerCase() === 'expense')
      .reduce((sum, row) => sum + Number(row.amount_cents || 0), 0)

    const summaryLines = transactionRows.slice(0, 8).map((row) => {
      const studentName = row.user_id ? studentNameByUserId.get(row.user_id) || 'Student' : 'N/A'
      const dateLabel = new Date(row.created_at).toLocaleDateString('en-US')
      return `${dateLabel} | ${row.type.toUpperCase()} | ${formatMoney(row.amount_cents)} | ${studentName}`
    })

    const bodyText = [
      `Merlin Purchases & Expenses (${daysBack}d)`,
      `Purchases: ${formatMoney(purchaseTotal)}`,
      `Expenses: ${formatMoney(expenseTotal)}`,
      ...summaryLines,
      uniqueMediaUrls.length > 0 ? 'Attached: invoice/receipt links where available.' : 'No receipt/invoice attachments found.',
    ].join('\n')

    await sendTwilioMessage({
      to: accountantPhone,
      body: bodyText,
      mediaUrls: uniqueMediaUrls,
    })

    return NextResponse.json({
      success: true,
      sent: true,
      count: transactionRows.length,
      mediaCount: uniqueMediaUrls.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
