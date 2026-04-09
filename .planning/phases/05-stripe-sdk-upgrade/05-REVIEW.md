---
phase: 05-stripe-sdk-upgrade
reviewed: 2026-04-09T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - package.json
  - app/api/stripe-webhook/route.ts
  - app/api/create-payment-intent/route.ts
  - app/api/admin/billing/accountant-text/route.ts
  - app/api/admin/billing/send-reminder/route.ts
  - app/api/admin/billing/sync-products/route.ts
  - app/api/admin/billing/invoice/route.ts
  - app/api/admin/billing/checkout/route.ts
  - app/api/admin/billing/overview/route.ts
  - app/api/admin/billing/delete-checkout/route.ts
  - app/api/admin/billing/push-checkout-link/route.ts
  - app/api/student/setup-intent/route.ts
  - app/api/student/bookings/[id]/cancel/route.ts
  - app/api/student/billing-portal/route.ts
  - app/api/student/invoices/route.ts
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-09
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This review covers the Stripe SDK upgrade from v12 to v17 (apiVersion `2022-11-15` → `2025-02-24.acacia`) across 14 server route files and `package.json`. The API version bump itself is applied consistently and correctly across all routes.

The upgrade introduced no regressions, but the review surfaced one pre-existing critical security gap: the public `create-payment-intent` route has no authentication, meaning any unauthenticated caller can create bookings and charge arbitrary users. Four warnings were found: two unguarded Stripe calls that expose raw errors to clients, one booking status downgrade gap in the webhook, and a SQL wildcard injection risk in the delete-checkout route. Two info-level issues round out the findings.

---

## Critical Issues

### CR-01: `create-payment-intent` has no authentication — unauthenticated callers can create bookings

**File:** `app/api/create-payment-intent/route.ts:9`

**Issue:** This route accepts `userId`, `slotId`, and `amount` from the raw request body and creates both a Supabase booking and a Stripe PaymentIntent without verifying the caller's identity. Any unauthenticated request can supply an arbitrary `userId` to create a booking under another user's account. Additionally, because `amount` is caller-supplied and only validated for positivity (line 85), the payment amount is not verified against the slot's actual price at the time of payment intent creation (the slot price is fetched at line 26 but `amount` from the body is what gets charged).

**Fix:**
Add auth before any business logic. All other student-facing routes already use `requireUser` from `@/lib/auth`.

```typescript
import { requireUser } from '@/lib/auth'

export async function POST(req: Request) {
  const authCheck = await requireUser(req as any)
  if ('error' in authCheck) return authCheck.error

  // Replace caller-supplied userId with the authenticated user's ID
  const { amount, slotId, email, name, phone, notes } = await req.json()
  const userId = authCheck.user.id   // <-- not from body

  // Also enforce server-side amount from slot:
  //   const totalAmount = slot.price + Math.round(slot.price * 0.035)
  // ...rest of handler
}
```

---

## Warnings

### WR-01: `checkout.session.completed` webhook branch can downgrade a completed booking

**File:** `app/api/stripe-webhook/route.ts:638-643`

**Issue:** The `payment_intent.succeeded` branch (line 519) correctly limits updates with `.in('status', ['pending', 'pending_approval', 'confirmed'])` to prevent overwriting a `'completed'` booking on a Stripe retry or replay. The `checkout.session.completed` branch at line 639 does not apply the same guard:

```typescript
// current — no status filter
const { error: bookingError } = await supabaseAdmin
  .from('bookings')
  .update({ status: 'paid' })
  .eq('id', bookingId)
```

A Stripe retry of this event would re-set a `'completed'` booking back to `'paid'`.

**Fix:**
```typescript
const { error: bookingError } = await supabaseAdmin
  .from('bookings')
  .update({ status: 'paid' })
  .eq('id', bookingId)
  .in('status', ['pending', 'pending_approval', 'confirmed'])

// PGRST116 = no rows matched (already paid/completed) — not an error
if (bookingError && bookingError.code !== 'PGRST116') throw bookingError
```

---

### WR-02: `student/billing-portal` Stripe call is not wrapped in try/catch

**File:** `app/api/student/billing-portal/route.ts:28-32`

**Issue:** `stripe.billingPortal.sessions.create()` is called without error handling. A Stripe error (invalid or deleted `stripe_customer_id`, misconfigured billing portal, network failure) will propagate as an uncaught exception. Next.js will return a generic 500, and the raw Stripe error message may be exposed to the client depending on the runtime.

**Fix:**
```typescript
try {
  const session = await stripe.billingPortal.sessions.create({
    customer: student.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://isaac-cfi.netlify.app'}/dashboard`,
  })
  return NextResponse.json({ url: session.url })
} catch (error: any) {
  return NextResponse.json(
    { error: error?.message || 'Unable to open billing portal' },
    { status: 500 }
  )
}
```

---

### WR-03: `student/invoices` Stripe call is not wrapped in try/catch

**File:** `app/api/student/invoices/route.ts:25-29`

**Issue:** `stripe.invoices.list()` is called without error handling. Same exposure as WR-02 — a Stripe API error or invalid customer ID will surface as an unhandled exception.

**Fix:**
```typescript
try {
  const invoices = await stripe.invoices.list({
    customer: student.stripe_customer_id,
    status: 'open',
    limit: 20,
  })
  // ...format and return
} catch (error: any) {
  return NextResponse.json(
    { error: error?.message || 'Unable to fetch invoices' },
    { status: 500 }
  )
}
```

---

### WR-04: SQL wildcard injection in `delete-checkout` transaction cleanup

**File:** `app/api/admin/billing/delete-checkout/route.ts:68`

**Issue:** The `paymentIntentId` from the request body is used directly in a `.like()` pattern without validating its format:

```typescript
await supabaseAdmin
  .from('transactions')
  .delete()
  .like('description', `%PI:${paymentIntentId}%`)
```

The only check is `typeof body.paymentIntentId === 'string'` (line 49). A value like `%` or `%PI:pi_%` would match every transaction row containing "PI:", deleting unintended records. Stripe PaymentIntent IDs follow a known format (`pi_` followed by alphanumerics and underscores).

**Fix:** Validate the format before use:
```typescript
const PI_ID_PATTERN = /^pi_[A-Za-z0-9_]{6,}$/
const paymentIntentId = typeof body.paymentIntentId === 'string' ? body.paymentIntentId : ''

if (!paymentIntentId || !PI_ID_PATTERN.test(paymentIntentId)) {
  return NextResponse.json({ error: 'Invalid paymentIntentId format' }, { status: 400 })
}
```

---

## Info

### IN-01: `sync-products` fetches at most 100 Stripe products — pagination not handled

**File:** `app/api/admin/billing/sync-products/route.ts:90`

**Issue:** `stripe.products.list({ active: true, limit: 100 })` returns at most 100 products. If the Stripe account ever has more than 100 active products, the sync will silently stop after the first page. The response includes `has_more: true` when there are more results.

**Fix:** Use auto-pagination or manually iterate pages:
```typescript
const allProducts: Stripe.Product[] = []
for await (const product of stripe.products.list({ active: true, limit: 100, expand: ['data.default_price'] })) {
  allProducts.push(product)
}
// then iterate allProducts instead of productList.data
```

---

### IN-02: `@netlify/functions` is still listed as a dependency

**File:** `package.json:17`

**Issue:** The phase context notes that 3 dead Netlify functions were deleted. `@netlify/functions: "^2.0.0"` remains in `dependencies`. If no Netlify functions are in the codebase this is dead weight and increases bundle/install size. It is not harmful, but worth cleaning up if the last consumers are gone.

**Fix:** Verify no files import from `@netlify/functions`, then remove the entry from `package.json` and run `npm install`.

---

_Reviewed: 2026-04-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
