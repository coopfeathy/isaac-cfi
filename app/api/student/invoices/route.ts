import { requireUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export async function GET(request: NextRequest) {
  const authCheck = await requireUser(request)
  if ('error' in authCheck) return authCheck.error

  const supabaseAdmin = getSupabaseAdmin()
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('stripe_customer_id')
    .eq('user_id', authCheck.user.id)
    .single()

  if (!student?.stripe_customer_id) {
    return NextResponse.json({ invoices: [] })
  }

  const invoices = await stripe.invoices.list({
    customer: student.stripe_customer_id,
    status: 'open',
    limit: 20,
  })

  const formatted = invoices.data.map((inv) => ({
    id: inv.id,
    amount_due: inv.amount_due,
    currency: inv.currency,
    description: inv.description || inv.lines?.data?.[0]?.description || 'Invoice',
    created: inv.created,
    due_date: inv.due_date,
    hosted_invoice_url: inv.hosted_invoice_url,
    status: inv.status,
  }))

  return NextResponse.json({ invoices: formatted })
}
