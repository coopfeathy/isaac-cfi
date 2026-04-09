---
phase: 05-stripe-sdk-upgrade
fixed_at: 2026-04-09T15:35:38Z
review_path: .planning/phases/05-stripe-sdk-upgrade/05-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-09T15:35:38Z
**Source review:** .planning/phases/05-stripe-sdk-upgrade/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (1 Critical, 4 Warning — Info excluded per fix_scope)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: `create-payment-intent` has no authentication

**Files modified:** `app/api/create-payment-intent/route.ts`
**Commit:** 537afeb
**Applied fix:** Added `requireUser` auth guard as the first operation in the POST handler. Changed the function signature from `req: Request` to `req: NextRequest` (importing `NextRequest` from `next/server`). Removed `userId` from the destructured request body — the authenticated user's ID is now taken exclusively from `authCheck.user.id`. Updated the missing-fields validation message to no longer reference `userId`.

---

### WR-01: `checkout.session.completed` webhook branch can downgrade a completed booking

**Files modified:** `app/api/stripe-webhook/route.ts`
**Commit:** f5b0168
**Applied fix:** Added `.in('status', ['pending', 'pending_approval', 'confirmed'])` filter to the booking update query in the `checkout.session.completed` branch. Updated the error check to allow `PGRST116` (no rows matched) since that code means the booking was already in a terminal state (`paid` or `completed`) — not a true error.

---

### WR-02: `student/billing-portal` Stripe call is not wrapped in try/catch

**Files modified:** `app/api/student/billing-portal/route.ts`
**Commit:** 33acd21
**Applied fix:** Wrapped `stripe.billingPortal.sessions.create()` and the `NextResponse.json({ url })` return in a try/catch block. The catch returns a 500 JSON response with the Stripe error message or a generic fallback string.

---

### WR-03: `student/invoices` Stripe call is not wrapped in try/catch

**Files modified:** `app/api/student/invoices/route.ts`
**Commit:** 46813c5
**Applied fix:** Wrapped `stripe.invoices.list()`, the `formatted` mapping, and the `NextResponse.json({ invoices })` return in a try/catch block. The catch returns a 500 JSON response with the Stripe error message or a generic fallback string.

---

### WR-04: SQL wildcard injection in `delete-checkout` transaction cleanup

**Files modified:** `app/api/admin/billing/delete-checkout/route.ts`
**Commit:** 4dd3e2a
**Applied fix:** Added `PI_ID_PATTERN = /^pi_[A-Za-z0-9_]{6,}$/` validation immediately after the existing empty-string check. If the supplied `paymentIntentId` does not match the Stripe PaymentIntent ID format, the route returns 400 before reaching the `.like()` query. The validated value is then assigned to `paymentIntentId` for use downstream.

---

_Fixed: 2026-04-09T15:35:38Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
