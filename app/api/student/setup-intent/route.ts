import { requireUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { ensureStripeCustomer } from '@/lib/stripe-customer'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export async function POST(request: NextRequest) {
  const authCheck = await requireUser(request)
  if ('error' in authCheck) return authCheck.error

  const supabaseAdmin = getSupabaseAdmin()
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, email, full_name, stripe_customer_id')
    .eq('user_id', authCheck.user.id)
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
  }

  const customerId = await ensureStripeCustomer(stripe, student.id, {
    email: student.email,
    name: student.full_name,
  })

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  })

  return NextResponse.json({ clientSecret: setupIntent.client_secret })
}
