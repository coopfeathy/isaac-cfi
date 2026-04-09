import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
})

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabaseAdmin = getSupabaseAdmin()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { bookingId, studentId, amountCents, description } = body

  // Validate required fields
  if (!bookingId || typeof bookingId !== 'string') {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }
  if (!studentId || typeof studentId !== 'string') {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  }
  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'amountCents must be a positive integer' }, { status: 400 })
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return NextResponse.json({ error: 'description must be a non-empty string' }, { status: 400 })
  }

  // Look up the student
  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('stripe_customer_id, email, full_name')
    .eq('id', studentId)
    .single()

  if (studentError || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  if (!student.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Student has no Stripe customer. They must save a payment method first.' },
      { status: 400 }
    )
  }

  try {
    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: student.stripe_customer_id,
      collection_method: 'send_invoice',
      days_until_due: 30,
      auto_advance: false,
      metadata: { bookingId, studentId, type: 'lesson_completion' },
    })

    // Add invoice line item
    await stripe.invoiceItems.create({
      customer: student.stripe_customer_id,
      invoice: invoice.id,
      amount: amountCents,
      currency: 'usd',
      description: description.trim(),
    })

    // Finalize and send
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
    await stripe.invoices.sendInvoice(finalized.id)

    // Update booking with invoice ID
    await supabaseAdmin
      .from('bookings')
      .update({ stripe_invoice_id: finalized.id })
      .eq('id', bookingId)

    return NextResponse.json(
      {
        invoice: {
          id: finalized.id,
          hosted_invoice_url: finalized.hosted_invoice_url,
          status: finalized.status,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
