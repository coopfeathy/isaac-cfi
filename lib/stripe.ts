import Stripe from 'stripe'

let _stripe: Stripe | null = null

/**
 * Lazy Stripe client — safe to import at module level.
 * Throws at call time (not import time) if the key is missing,
 * so Next.js static analysis never crashes the build.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    _stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' })
  }
  return _stripe
}
