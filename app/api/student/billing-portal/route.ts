import { requireUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
})

export async function POST(request: NextRequest) {
  const authCheck = await requireUser(request)
  if ('error' in authCheck) return authCheck.error

  const supabaseAdmin = getSupabaseAdmin()
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('stripe_customer_id')
    .eq('user_id', authCheck.user.id)
    .single()

  if (!student?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account found. Please save a payment method first.' },
      { status: 400 }
    )
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: student.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://isaac-cfi.netlify.app'}/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}
