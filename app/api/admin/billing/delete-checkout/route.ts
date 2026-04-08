import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })
  : null

export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const paymentIntentId = typeof body.paymentIntentId === 'string' ? body.paymentIntentId : ''

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    // Cancel if still pending/requires_payment_method
    const cancelableStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing']
    if (cancelableStatuses.includes(paymentIntent.status)) {
      await stripe.paymentIntents.cancel(paymentIntentId)
    }

    // Remove matching transaction records from the DB
    const supabaseAdmin = getSupabaseAdmin()
    await supabaseAdmin
      .from('transactions')
      .delete()
      .like('description', `%PI:${paymentIntentId}%`)

    return NextResponse.json({ success: true, canceled: paymentIntent.status !== 'succeeded' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
