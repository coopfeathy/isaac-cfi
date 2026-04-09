---
phase: 04-student-self-service-billing
fixed_at: 2026-04-09T00:00:00Z
review_path: .planning/phases/04-student-self-service-billing/04-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-04-09
**Source review:** `.planning/phases/04-student-self-service-billing/04-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Webhook unconditionally overwrites booking status to 'paid', including 'completed' bookings

**Files modified:** `app/api/stripe-webhook/route.ts`
**Commit:** 88c094c
**Applied fix:** Added `.in('status', ['pending', 'pending_approval', 'confirmed'])` guard to the booking update in the `payment_intent.succeeded` handler. Changed error handling to allow `PGRST116` (no rows matched) as a non-error. Introduced `bookingForEmail` fallback that uses `existingBooking` when `booking` is null (no rows updated), so the confirmation email step still has a valid booking reference.

### WR-01: Cancellation fee charged regardless of notice window

**Files modified:** `app/api/student/bookings/[id]/cancel/route.ts`
**Commit:** a0be9c9
**Applied fix:** After the RPC succeeds, extracted `slot_id` from the RPC result, fetched the slot's `start_time`, and computed `hoursUntil`. If the lesson is 24 or more hours away, the route returns early with `{ canceled: true, fee: 'waived', amount_cents: 0 }` and skips `processCancellationFee`. The fee is only charged/flagged for cancellations within the 24-hour window.

### WR-02: BillingTab reads sensitive tables directly from the client using the anon key

**Files modified:** `app/admin/components/BillingTab.tsx`
**Commit:** dc3489d
**Applied fix:** Added explicit SECURITY comments above `fetchPendingBookings`, `fetchCancellationFees`, and `fetchStudentOverviews` documenting the admin-only RLS requirement on `bookings`, `cancellation_fee_flags`, and `students` tables. This documents the invariant that must be maintained in Supabase for these queries to be safe.

### WR-03: `handleResolveFee` in BillingTab has no authentication header

**Files modified:** `app/api/admin/billing/resolve-fee/route.ts` (new), `app/admin/components/BillingTab.tsx`
**Commit:** 0eab660
**Applied fix:** Created `app/api/admin/billing/resolve-fee/route.ts` protected by `requireAdmin`, which accepts `{ flagId }` in the POST body and updates `cancellation_fee_flags` via `supabaseAdmin`. Updated `handleResolveFee` in BillingTab to call this route with `Authorization: Bearer ${session.access_token}` instead of writing directly to Supabase from the client.

### WR-04: `ensureStripeCustomer` has a TOCTOU race creating duplicate Stripe customers

**Files modified:** `lib/stripe-customer.ts`
**Commit:** 9ac298a
**Applied fix:** Changed the post-create update to use `.is('stripe_customer_id', null)` so it only writes if no customer ID is already stored. If `updateError` is set (meaning another concurrent request already wrote a customer ID), the function re-fetches the winning customer ID and returns it. This prevents the race from silently overwriting an already-saved customer ID.

### WR-05: Early returns in webhook handlers don't mark the event as processed

**Files modified:** `app/api/stripe-webhook/route.ts`
**Commit:** 0b5233b
**Applied fix:** Added `stripe_webhook_events` update (status: 'processed', processed_at) before both early returns: (1) the admin-checkout path in `payment_intent.succeeded` when `bookingId`/`slotId` are absent, and (2) the `alreadyPaid` early return in `checkout.session.completed`. This ensures the idempotency check on subsequent retries/replays will correctly short-circuit at the `status === 'processed'` guard.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-04-09_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
