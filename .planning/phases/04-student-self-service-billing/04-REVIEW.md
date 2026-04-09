---
phase: 04-student-self-service-billing
reviewed: 2026-04-08T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - app/admin/components/BillingTab.tsx
  - app/api/admin/billing/invoice/route.ts
  - app/api/admin/bookings/[id]/approve/route.ts
  - app/api/stripe-webhook/route.ts
  - app/api/student/billing-portal/route.ts
  - app/api/student/bookings/[id]/cancel/route.ts
  - app/api/student/bookings/route.ts
  - app/api/student/invoices/route.ts
  - app/api/student/setup-intent/route.ts
  - app/api/student/slots/route.ts
  - app/bookings/layout.tsx
  - app/dashboard/layout.tsx
  - app/dashboard/page.tsx
  - app/schedule/page.tsx
  - lib/auth.ts
  - lib/stripe-customer.ts
  - lib/__tests__/cancellation-fee.test.ts
  - lib/__tests__/stripe-webhook-invoice.test.ts
  - supabase/migrations/20260408_phase4_booking_status.sql
  - supabase/migrations/20260408_phase4_cancellation.sql
  - supabase/migrations/20260408_phase4_invoice.sql
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-08
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

This phase introduces student self-service booking, cancellation with fee logic, admin invoice creation via Stripe, and a student billing portal. The overall architecture is solid: auth guards are consistently applied, RPC-based atomic cancellation prevents race conditions, and the Stripe webhook uses signature verification with idempotency checks.

Three areas need attention before shipping:

1. **Critical:** The `payment_intent.succeeded` handler updates the booking to `'paid'` even when it was already in an active state (confirmed, paid, completed) — there is a status check for `alreadyPaid` to gate the *email*, but the database write to `'paid'` is unconditional, which can silently overwrite a `'completed'` booking.
2. **Warnings:** The cancellation fee is charged/flagged for *every* cancellation regardless of notice window — there is no grace period or time-before-lesson check, meaning a student who cancels days in advance is charged the same as one who cancels an hour before.
3. **Warnings:** Several Supabase queries in `BillingTab.tsx` run from the client using the anon key without RLS policies shown for the tables they touch (e.g., `bookings`, `students`, `cancellation_fee_flags`). The admin UI relies on the user's session but the fetch calls do not pass the auth token to these direct Supabase queries.

---

## Critical Issues

### CR-01: Webhook unconditionally overwrites booking status to 'paid', including 'completed' bookings

**File:** `app/api/stripe-webhook/route.ts:505-514`

**Issue:** The `alreadyPaid` flag is computed (line 505) and used only to gate sending the confirmation email (line 531). The database update to `status: 'paid'` on line 508 runs unconditionally for every `payment_intent.succeeded` event that has a `bookingId` in metadata. This means a booking that is already `'completed'` will be silently downgraded to `'paid'` every time this webhook fires for it (e.g., Stripe retry, manual replay).

The parallel `invoice.paid` handler (line 651) correctly uses `.in('status', ['confirmed', 'pending_approval'])` to guard against re-updating — the same guard is absent from the `payment_intent.succeeded` path.

**Fix:**
```typescript
// Replace the unconditional update at line 507-514 with a guarded update:
const { data: booking, error: bookingError } = await supabaseAdmin
  .from('bookings')
  .update({ status: 'paid' })
  .eq('id', bookingId)
  .in('status', ['pending', 'pending_approval', 'confirmed'])  // never downgrade completed
  .select('id, slot_id, user_id')
  .single()

// If no rows were updated (already paid/completed), booking will be null.
// Re-fetch the existing booking for the email step.
if (bookingError && bookingError.code !== 'PGRST116') throw bookingError
```

---

## Warnings

### WR-01: Cancellation fee charged regardless of notice window

**File:** `app/api/student/bookings/[id]/cancel/route.ts:117-123`

**Issue:** `processCancellationFee` is called for every cancellation without any check on how far in advance the student is cancelling. The business rule (as implied by the "late cancellation" reason text in the flags table) presumably only applies within some window (e.g., < 24 hours before the lesson). Currently a student who cancels a week ahead would be charged/flagged $50.

**Fix:** Before calling `processCancellationFee`, fetch the slot's `start_time` and apply a grace period check:
```typescript
// After the RPC succeeds, fetch slot start_time from rpcResult.slot_id
// (the RPC returns slot_id in its ok response)
const LATE_CANCEL_HOURS = 24
const slotStart = new Date(slot.start_time)
const hoursUntil = (slotStart.getTime() - Date.now()) / 3600000

if (hoursUntil >= LATE_CANCEL_HOURS) {
  return NextResponse.json({ canceled: true, fee: 'waived', amount_cents: 0 }, { status: 200 })
}
// else: proceed with processCancellationFee(...)
```

### WR-02: BillingTab reads sensitive tables directly from the client using the anon key

**File:** `app/admin/components/BillingTab.tsx:104-113, 149-158, 263-300`

**Issue:** `fetchPendingBookings`, `fetchCancellationFees`, and `fetchStudentOverviews` all call `supabase` (the client-side instance using `NEXT_PUBLIC_SUPABASE_ANON_KEY`) directly. These queries read `bookings`, `cancellation_fee_flags`, and `students` — tables containing PII and billing data. For this to be safe, those tables must have tight admin-only RLS policies enforced in Supabase. The `cancellation_fee_flags` migration does define an admin policy, but there is no RLS shown for `bookings` or `students` in the phase 4 migrations. If those tables are accessible to any authenticated user under the anon key, a non-admin student could query them directly from their browser's devtools.

**Fix:** Either:
a) Confirm in the Supabase dashboard that `bookings` and `students` have RLS policies that restrict reads to admins only, or
b) Move these queries behind authenticated API routes that use `supabase-admin` and go through `requireAdmin` — consistent with the invoice and approve endpoints.

### WR-03: `handleResolveFee` in BillingTab has no authentication header

**File:** `app/admin/components/BillingTab.tsx:165-178`

**Issue:** `handleResolveFee` directly calls `supabase.from('cancellation_fee_flags').update(...)` from the client without using the session token. If a non-admin user somehow reached this component and called this function, the only enforcement is whatever RLS policy exists. Unlike `handleApproveBooking` and `handleSendInvoice` which pass `Authorization: Bearer ${session.access_token}` to server-side API routes, this write goes directly to Supabase. The admin policy on the table should block it, but the pattern is inconsistent and risky.

**Fix:** Create a `POST /api/admin/billing/resolve-fee` route protected by `requireAdmin`, and call it the same way `handleApproveBooking` does. This makes admin authorization server-enforced, not database-enforced.

### WR-04: `ensureStripeCustomer` has a TOCTOU race creating duplicate Stripe customers

**File:** `lib/stripe-customer.ts:19-41`

**Issue:** The function reads `stripe_customer_id` from the database, then creates a new customer and writes it back if absent. Under concurrent requests (e.g., student opens two tabs and triggers setup-intent twice in quick succession), both requests can read `null`, both call `stripe.customers.create`, and the second `update` silently overwrites the first — leaving an orphaned Stripe customer with no reference in the database.

**Fix:** Use a database upsert with a unique constraint, or use an advisory lock / serializable transaction. A lower-effort mitigation is to add a `UNIQUE` constraint on `students.stripe_customer_id` so the second concurrent write fails cleanly, then catch the conflict and re-fetch:
```typescript
// After stripe.customers.create, use upsert or handle unique violation:
const { error: updateError } = await supabaseAdmin
  .from('students')
  .update({ stripe_customer_id: customer.id })
  .eq('id', studentId)
  .is('stripe_customer_id', null)  // only update if still null

if (updateError) {
  // Another request won the race — fetch the winner's customer id
  const { data: refetch } = await supabaseAdmin
    .from('students').select('stripe_customer_id').eq('id', studentId).single()
  if (refetch?.stripe_customer_id) return refetch.stripe_customer_id
}
```

### WR-05: `payment_intent.succeeded` webhook returns early before marking event as processed when admin-checkout path is taken

**File:** `app/api/stripe-webhook/route.ts:486-490`

**Issue:** When `bookingId` or `slotId` is absent from the PaymentIntent metadata (admin checkout path, lines 448-490), the handler calls `return new Response(...)` at line 486 without executing the `stripe_webhook_events` update at line 689 that marks the event `'processed'`. This means the event record remains in `'processing'` state in the database forever. On the next Stripe retry or replay, the event will be found with `status: 'processing'` (not `'processed'`), so the idempotency check (line 258) will not short-circuit it, and the payment confirmation email will be sent again.

**Fix:** Mark the event as processed before returning:
```typescript
// Replace the early return at line 486 with:
await supabaseAdmin
  .from('stripe_webhook_events')
  .update({ status: 'processed', processed_at: new Date().toISOString() })
  .eq('event_id', event.id)

return new Response(JSON.stringify({ ok: true }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})
```

Similarly, the `checkout.session.completed` handler has an early return at line 640 with the same problem.

---

## Info

### IN-01: `schedule/page.tsx` queries `slots` directly from the client, bypassing the `/api/student/slots` endpoint

**File:** `app/schedule/page.tsx:386-399`

**Issue:** The schedule page queries Supabase directly using `supabase.from('slots').select('*')`, including the `instructor_id` column, rather than using `/api/student/slots` which was built for this purpose and explicitly limits the columns returned. This exposes the `instructor_id` field to clients unnecessarily and creates a second code path that may diverge from the API route over time.

**Fix:** Replace the direct Supabase call with `fetch('/api/student/slots?start=...&end=...')` and remove the `instructor_id` column from client-readable data if it's not needed in the UI.

### IN-02: `BookingModal` in schedule page uses the old Stripe payment flow, not the new `pending_approval` booking flow

**File:** `app/schedule/page.tsx:103-126`

**Issue:** The `BookingModal` calls `/api/create-payment-intent` (the pre-phase-4 checkout flow) rather than `/api/student/bookings` (the new flow that creates `pending_approval` bookings for training slots). Training slots in the schedule page will therefore continue to go through the payment-first path, which is inconsistent with the phase 4 design where training slots require instructor approval before payment.

This may be intentional (the old flow still works for paid slots), but it means the new booking flow introduced in phase 4 is only accessible from wherever `POST /api/student/bookings` is called — the primary schedule page does not use it.

**Fix:** Clarify the intended user flow. If training slots should use the new approval-first path, `BookingModal` should call `POST /api/student/bookings` with the `slotId`, and on success show a "request submitted — await confirmation" UI instead of a payment form.

### IN-03: `outstanding_bookings` field in `StudentBillingOverview` is always 0

**File:** `app/admin/components/BillingTab.tsx:288-299`

**Issue:** The `outstanding_bookings` field in the `StudentBillingOverview` type is initialized to `0` for all students with the comment "user_id vs student.id linkage handled below" — but no code below actually computes it. The `outstandingBookings` query result (line 279) selects `user_id` from `bookings` but the resulting data is never used to populate the `outstanding_bookings` field.

**Fix:** Either populate the field or remove the dead query and the column from the overview type/table.

### IN-04: Token extraction in `lib/auth.ts` uses fragile string replacement

**File:** `lib/auth.ts:33, 70, 111`

**Issue:** `authHeader.replace('Bearer ', '')` removes only the first occurrence and would silently pass a malformed header like `"bearer token"` (lowercase) straight to `supabase.auth.getUser`, which would then fail with an auth error rather than a clean 401 early return. This is low-risk since Supabase will reject it regardless, but the pattern is fragile.

**Fix:**
```typescript
const token = authHeader.startsWith('Bearer ')
  ? authHeader.slice(7)
  : authHeader
```

---

_Reviewed: 2026-04-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
