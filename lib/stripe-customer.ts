import Stripe from 'stripe'
import { getSupabaseAdmin } from './supabase-admin'

/**
 * Ensures a Stripe customer exists for the given student.
 *
 * If the student already has a stripe_customer_id stored in the database,
 * that ID is returned immediately. Otherwise, a new Stripe customer is
 * created and the ID is persisted to the students table before returning.
 *
 * This helper is shared across cancel, setup-intent, and billing-portal routes
 * to avoid creating duplicate Stripe customers for the same student.
 */
export async function ensureStripeCustomer(
  stripe: Stripe,
  studentId: string,
  { email, name }: { email: string | null; name: string }
): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('stripe_customer_id')
    .eq('id', studentId)
    .single()

  if (student?.stripe_customer_id) {
    return student.stripe_customer_id
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name,
    metadata: { studentId },
  })

  // Use a conditional update (.is null guard) so that if two concurrent requests
  // both created a Stripe customer, only the first writer wins and the second
  // update is a no-op (rather than silently overwriting the winning customer ID).
  const { error: updateError } = await supabaseAdmin
    .from('students')
    .update({ stripe_customer_id: customer.id })
    .eq('id', studentId)
    .is('stripe_customer_id', null)

  if (updateError) {
    // Another concurrent request won the race — re-fetch the winning customer ID.
    const { data: refetch } = await supabaseAdmin
      .from('students')
      .select('stripe_customer_id')
      .eq('id', studentId)
      .single()
    if (refetch?.stripe_customer_id) return refetch.stripe_customer_id
  }

  return customer.id
}
