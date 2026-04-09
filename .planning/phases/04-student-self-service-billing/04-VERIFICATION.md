---
phase: 04-student-self-service-billing
verified: 2026-04-09T12:00:00Z
status: gaps_found
score: 3/6
overrides_applied: 0
gaps:
  - truth: "Student can view available slots and request a booking from their portal with no payment upfront"
    status: failed
    reason: "app/schedule/page.tsx still contains the old Stripe checkout flow (loadStripe, Elements, PaymentElement, BookingModal calling /api/create-payment-intent). The no-payment booking flow was implemented in commit 29eb597 but was accidentally reverted by commit 6966324 (Plan 03 auth guards commit). The API routes /api/student/slots and /api/student/bookings exist and are correct — the schedule page UI just doesn't call them."
    artifacts:
      - path: "app/schedule/page.tsx"
        issue: "Still imports loadStripe, Elements, PaymentElement; BookingModal calls /api/create-payment-intent instead of /api/student/bookings; fetches slots directly from Supabase client instead of /api/student/slots"
    missing:
      - "Re-apply the no-payment booking flow from commit 29eb597 to the current HEAD of app/schedule/page.tsx"
      - "Remove loadStripe, Elements, PaymentElement, useStripe, useElements imports and StripePaymentForm component"
      - "Change BookingModal to call POST /api/student/bookings with Bearer token"
      - "Fetch slots from /api/student/slots instead of direct supabase.from('slots') call"
  - truth: "Students can save a payment method via Setup Intent and access the Stripe Billing Portal from their dashboard"
    status: failed
    reason: "app/dashboard/page.tsx does not contain setup-intent or billing-portal calls. The rich dashboard with booking history, flight hours, endorsements, and billing section was built in commit 9060dc5 (Plan 03) but was stripped by commit 60bbef8 (Plan 05). Plan 05 replaced the full dashboard with a simplified week-schedule + invoices view, removing all of: booking history with cancel buttons (STU-01), flight hours/milestones (STU-02), endorsements (STU-03), Save Payment Method button (STU-05), Manage Billing button (STU-06)."
    artifacts:
      - path: "app/dashboard/page.tsx"
        issue: "Missing: booking history with cancel buttons, flight hours grid, syllabus_progress milestones, student_endorsements list, setup-intent Save Card button, billing-portal Manage Billing button. Only has: week schedule view + invoice list."
    missing:
      - "Restore the tabbed self-service dashboard from commit 9060dc5 (or re-implement equivalent)"
      - "Wire api/student/setup-intent POST to a Save Payment Method button"
      - "Wire api/student/billing-portal POST to a Manage Billing button"
      - "Show booking history with cancel buttons calling /api/student/bookings/{id}/cancel"
      - "Show flight hours from students table (total_hours, solo_hours, dual_hours, pic_hours)"
      - "Show endorsements from student_endorsements table"
human_verification:
  - test: "Verify webhook audit result — STRIPE-01"
    expected: "Exactly one active webhook endpoint in Stripe dashboard pointing to /api/stripe-webhook, receiving invoice.paid events. Investigate 65% error rate before Phase 5."
    why_human: "Stripe Dashboard state cannot be verified programmatically. Commit 5a56057 documents the human confirmed one endpoint, but the 65% error rate requires investigation before this is considered clean."
---

# Phase 4: Student Self-Service + Billing — Verification Report

**Phase Goal:** A student can book a lesson, cancel it, receive a $50 cancellation fee charge, view their invoice, and pay it — all without Isaac touching anything.
**Verified:** 2026-04-09T12:00:00Z
**Status:** GAPS FOUND
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Student can view available slots and request a booking from their portal with no payment upfront | FAILED | `app/schedule/page.tsx` still uses old Stripe checkout flow — `loadStripe`, `Elements`, `PaymentElement`, `BookingModal` calling `/api/create-payment-intent`. The fix (commit `29eb597`) was reverted by commit `6966324`. |
| 2 | Cancelling a booked lesson charges $50 to card on file; if no card, fee is flagged | VERIFIED | `app/api/student/bookings/[id]/cancel/route.ts` calls `cancel_booking_atomic` RPC then `processCancellationFee`. Card path uses `paymentIntents.create` with `off_session: true`. No-card path inserts into `cancellation_fee_flags`. Unit tests passing (7 cases). |
| 3 | Slot and booking records update atomically on cancellation — no orphaned slot records | VERIFIED | `supabase/migrations/20260408_phase4_cancellation.sql` defines `cancel_booking_atomic` RPC using `FOR UPDATE` row locking, `SECURITY DEFINER`, single transaction that updates both `bookings.status` and `slots.is_booked`. |
| 4 | Admin generates invoice in one click; invoice emails student; student pays without logging in | VERIFIED | `app/api/admin/billing/invoice/route.ts` calls `invoices.create` → `invoiceItems.create` → `finalizeInvoice` → `sendInvoice`. Returns `hosted_invoice_url`. `invoice.paid` webhook handler in `app/api/stripe-webhook/route.ts` (line 648) updates booking to `paid` with `.in('status', ['confirmed', 'pending_approval'])` idempotency guard. |
| 5 | Students can save a payment method via Setup Intent and access the Stripe Billing Portal from their dashboard | FAILED | `app/api/student/setup-intent/route.ts` and `app/api/student/billing-portal/route.ts` exist and are correct. However, `app/dashboard/page.tsx` does not contain calls to either route. These buttons were in commit `9060dc5` (Plan 03) but were stripped by commit `60bbef8` (Plan 05's invoice section rewrite). |
| 6 | All student portal routes enforce server-side auth (no client-side-only guards remain) | VERIFIED | `app/dashboard/layout.tsx` and `app/bookings/layout.tsx` are async server components using `@supabase/ssr` `createServerClient`, calling `supabase.auth.getUser()` and redirecting unauthenticated users to `/login` before any content renders. |

**Score: 3/6 truths verified**

---

## Root Cause Analysis

Two gaps share a common root cause: **worktree merge collisions during parallel execution** produced file reverts that were not caught before commit.

### Gap 1: Schedule Page Revert

Plan 01 (`29eb597`) correctly removed the Stripe checkout from `app/schedule/page.tsx` and replaced it with the `/api/student/bookings` flow.

Plan 03 (`6966324`) was committed with message "add server-component auth guards" but its diff to `app/schedule/page.tsx` shows it **restored** the old Stripe imports and `BookingModal`. This was caused by the `git reset --soft` issue documented in the Plan 03 SUMMARY: 87 files were staged as deletions after branch alignment, the restoration commit `e099f30` attempted to fix this, but the schedule page ended up back at the pre-Plan-01 state.

The `04-REVIEW.md` (IN-02) noted this as an INFO issue, likely because the old Stripe flow was also functional. It is actually a hard blocker against the phase goal.

### Gap 2: Dashboard Stripped

Plan 03 (`9060dc5`) added 638 lines to `app/dashboard/page.tsx` creating a rich tabbed dashboard (booking history, hours, endorsements, billing). Plan 05 (`60bbef8`) added the invoice section but in doing so replaced the entire file with a stripped-down weekly schedule view. The diff shows `StudentHours`, `FullBooking`, `Endorsement`, `Milestone` types and all related queries were removed. Only the invoice `InvoiceData` type and invoice fetch were retained.

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `app/api/student/slots/route.ts` | VERIFIED | Public GET endpoint, queries `slots` table with `is_booked = false`, date range filter |
| `app/api/student/bookings/route.ts` | VERIFIED | GET (booking history) and POST (booking request). Handles `pending_approval` for training, `confirmed` for tour. `requireUser` auth. |
| `app/api/student/bookings/[id]/cancel/route.ts` | VERIFIED | POST, `requireUser`, calls `cancel_booking_atomic` RPC, `processCancellationFee` with charge-or-flag |
| `supabase/migrations/20260408_phase4_booking_status.sql` | VERIFIED | Drops old constraint, adds new CHECK including `pending_approval` |
| `supabase/migrations/20260408_phase4_cancellation.sql` | VERIFIED | `cancellation_fee_flags` table with RLS + `cancel_booking_atomic` SECURITY DEFINER RPC |
| `lib/stripe-customer.ts` | VERIFIED | `ensureStripeCustomer` creates or retrieves Stripe customer ID |
| `lib/__tests__/cancellation-fee.test.ts` | VERIFIED | 7 unit tests (11 describe/it blocks) covering charge, flag, null customer, RPC error paths |
| `app/dashboard/layout.tsx` | VERIFIED | Server component, `createServerClient`, `getUser()`, redirect to `/login` |
| `app/bookings/layout.tsx` | VERIFIED | Server component, same pattern as dashboard layout |
| `app/api/student/setup-intent/route.ts` | VERIFIED | POST, `requireUser`, `ensureStripeCustomer`, `setupIntents.create` with `usage: 'off_session'` |
| `app/api/student/billing-portal/route.ts` | VERIFIED | POST, `requireUser`, looks up `stripe_customer_id`, `billingPortal.sessions.create` |
| `app/api/admin/billing/invoice/route.ts` | VERIFIED | POST, `requireAdmin`, `invoices.create`, `finalizeInvoice`, `sendInvoice`, `collection_method: 'send_invoice'`, `days_until_due: 30` |
| `app/api/admin/bookings/[id]/approve/route.ts` | VERIFIED | POST, `requireAdmin`, status check for `pending_approval`, sets `confirmed` + `is_booked: true`, sends Resend email |
| `supabase/migrations/20260408_phase4_invoice.sql` | VERIFIED | `stripe_invoice_id TEXT` column added with index |
| `app/admin/components/BillingTab.tsx` | VERIFIED | Pending approvals section, cancellation fee flags section, invoice send section, billing overview |
| `lib/__tests__/stripe-webhook-invoice.test.ts` | VERIFIED | 10 test blocks covering invoice.paid handler, idempotency, no-bookingId case |
| `app/api/student/invoices/route.ts` | VERIFIED | GET, `requireUser`, Stripe `invoices.list` with `status: 'open'`, returns `hosted_invoice_url` |
| `app/schedule/page.tsx` | FAILED | Still contains old Stripe checkout flow — `loadStripe`, `Elements`, `PaymentElement`, `BookingModal` |
| `app/dashboard/page.tsx` | FAILED | Missing booking history+cancel, flight hours, endorsements, setup-intent, billing-portal buttons |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/schedule/page.tsx` | `/api/student/slots` | fetch in useEffect | NOT WIRED | Schedule page fetches slots via `supabase.from('slots')` directly |
| `app/schedule/page.tsx` | `/api/student/bookings` | fetch POST on book click | NOT WIRED | Book button calls `setSelectedSlot(slot)` opening `BookingModal` which calls `/api/create-payment-intent` |
| `app/dashboard/page.tsx` | `/api/student/setup-intent` | fetch POST on save card click | NOT WIRED | No reference to `api/student/setup-intent` in dashboard page |
| `app/dashboard/page.tsx` | `/api/student/billing-portal` | fetch POST on manage billing click | NOT WIRED | No reference to `api/student/billing-portal` in dashboard page |
| `app/dashboard/page.tsx` | `/api/student/invoices` | fetch in useEffect | WIRED | Line 154: `fetch('/api/student/invoices')` with auth header |
| `app/api/student/bookings/[id]/cancel/route.ts` | `cancel_booking_atomic` RPC | `supabaseAdmin.rpc()` | WIRED | Line 82: `supabaseAdmin.rpc('cancel_booking_atomic', {...})` |
| `app/api/student/bookings/[id]/cancel/route.ts` | `stripe.paymentIntents.create` | off_session charge | WIRED | Line 40: `stripeClient.paymentIntents.create({off_session: true, ...})` |
| `app/api/admin/billing/invoice/route.ts` | `stripe.invoices.create` | Stripe Invoice API | WIRED | Line 59: `stripe.invoices.create({...})` |
| `app/api/stripe-webhook/route.ts` | `bookings update` | `invoice.paid` handler | WIRED | Line 648: `invoice.paid` handler updates booking to `paid` with status guard |
| `app/api/admin/bookings/[id]/approve/route.ts` | `bookings + slots update` | `pending_approval` → `confirmed` | WIRED | Lines 37-47: updates booking to `confirmed`, line 49: updates slot `is_booked: true` |
| `app/admin/components/BillingTab.tsx` | `/api/admin/bookings/*/approve` | fetch POST on approve click | WIRED | Line 123: `fetch('/api/admin/bookings/${bookingId}/approve', ...)` |
| `app/admin/components/BillingTab.tsx` | `/api/admin/billing/invoice` | fetch POST on invoice click | WIRED | Line 227: `fetch('/api/admin/billing/invoice', ...)` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `app/schedule/page.tsx` | `slots` | `supabase.from('slots')` direct query | Yes — real DB query | FLOWING (old path) but should flow via `/api/student/slots` |
| `app/dashboard/page.tsx` | `invoices` | `fetch('/api/student/invoices')` → `stripe.invoices.list` | Yes — live Stripe API | FLOWING |
| `app/dashboard/page.tsx` | `bookings` (week view only) | `supabase.from('bookings')` direct query | Yes — real DB query | FLOWING (but narrow scope — only `status IN ['confirmed','paid','completed']`, no cancel button) |
| `app/api/student/bookings/route.ts` | return data | `supabaseAdmin.from('bookings').select(...)` | Yes — real DB query | FLOWING |
| `app/api/admin/billing/invoice/route.ts` | invoice | `stripe.invoices.create` chain | Yes — real Stripe API | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `GET /api/student/slots` exists and exports GET | `grep "export async function GET" app/api/student/slots/route.ts` | Match found | PASS |
| `POST /api/student/bookings` handles `pending_approval` | `grep "pending_approval" app/api/student/bookings/route.ts` | Match found | PASS |
| `cancel_booking_atomic` RPC in migration | `grep "cancel_booking_atomic" supabase/migrations/20260408_phase4_cancellation.sql` | Match found | PASS |
| Schedule page no longer has PaymentElement | `grep "PaymentElement" app/schedule/page.tsx` | Match found at line 9, 61 | FAIL |
| Dashboard page has setup-intent call | `grep "setup-intent" app/dashboard/page.tsx` | No match | FAIL |
| Webhook has invoice.paid handler | `grep "invoice.paid" app/api/stripe-webhook/route.ts` | Match found at line 648 | PASS |
| Unit tests: cancellation-fee.test.ts has multiple tests | File has 11 test blocks | 7 tests cover all 4 planned behaviors | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BOOK-01 | 04-01 | Student can view available slots without logging in | FAILED | API route exists but schedule page still queries Supabase directly and shows old payment UI |
| BOOK-02 | 04-01 | Student can request a lesson slot after logging in (no payment required) | FAILED | `POST /api/student/bookings` exists and correct; schedule page does not call it |
| BOOK-03 | 04-04 | Student receives booking confirmation email when slot request is approved | VERIFIED | `approve/route.ts` sends Resend email with "Booking Confirmed" subject |
| BOOK-04 | 04-02 | Student can cancel a booked lesson from their portal | PARTIAL | Cancel API exists; dashboard lacks cancel buttons (dashboard regression) |
| BOOK-05 | 04-02 | Cancellation charges $50 via Stripe when card on file | VERIFIED | `processCancellationFee` with `paymentIntents.create` and `off_session: true` |
| BOOK-06 | 04-02 | If no card, $50 fee flagged on student account | VERIFIED | `cancellation_fee_flags` insert in `processCancellationFee` |
| BOOK-07 | 04-02 | Slot and booking updated atomically on cancellation | VERIFIED | `cancel_booking_atomic` RPC with FOR UPDATE + SECURITY DEFINER |
| BOOK-08 | 04-01 | Discovery flight auto-confirms without admin approval | VERIFIED | `isTour ? 'confirmed' : 'pending_approval'` in `POST /api/student/bookings` |
| STU-01 | 04-03 | Student can view full booking history (past and upcoming) | FAILED | Dashboard was stripped of booking history in commit 60bbef8 |
| STU-02 | 04-03 | Student can view logged flight hours and milestones | FAILED | Dashboard stripped of hours/milestones section |
| STU-03 | 04-03 | Student can access training documents (endorsements) | FAILED | Dashboard stripped of endorsements section |
| STU-04 | 04-05 | Student can view outstanding invoices and pay online | VERIFIED | Invoice section in dashboard, `hosted_invoice_url` Pay Now button |
| STU-05 | 04-03 | Student can save a payment method via Stripe Setup Intent | FAILED | API exists; dashboard has no Save Payment Method button |
| STU-06 | 04-03 | Student can access Stripe Billing Portal from their dashboard | FAILED | API exists; dashboard has no Manage Billing button |
| STU-07 | 04-03 | Student portal enforces authentication via server-component layout guard | VERIFIED | Both `/dashboard` and `/bookings` layouts use `createServerClient` + `getUser()` redirect |
| ADMIN-04 | 04-04 | Admin can create and send invoices via Stripe | VERIFIED | `POST /api/admin/billing/invoice` with `invoices.create`, `sendInvoice`, `finalizeInvoice` |
| ADMIN-05 | 04-04 | Admin can view cancellations flagged for $50 fee | VERIFIED | BillingTab shows `cancellation_fee_flags` where `resolved = false` with Resolve button |
| BILL-01 | 04-04 | After CFI logs lesson complete, admin generates invoice in one click | VERIFIED | BillingTab invoice button on `status IN ('completed','confirmed')` bookings |
| BILL-02 | 04-04 | Invoices created via Stripe and emailed to student automatically | VERIFIED | `sendInvoice` called after `finalizeInvoice`; Stripe emails the student |
| BILL-03 | 04-04 | Student can pay via Stripe (no login wall for payment) | VERIFIED | `hosted_invoice_url` returned from invoice API; student pays without logging in |
| BILL-04 | 04-02 | Cancellation fee charged via Stripe immediately when card on file | VERIFIED | `paymentIntents.create` with `off_session: true`, `confirm: true` |
| BILL-05 | 04-04 | Stripe webhook marks lessons as paid — idempotent, duplicate-safe | VERIFIED | `invoice.paid` handler uses `.in('status', [...])` guard + `stripe_webhook_events` idempotency table |
| BILL-06 | 04-04 | Admin can view all invoices, payments, and outstanding balances per student | VERIFIED | BillingTab "Billing Overview" section with per-student Stripe customer + fee summary |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `app/schedule/page.tsx` | 8-9 | `import { loadStripe }`, `import { Elements, PaymentElement, useStripe, useElements }` | BLOCKER | Old Stripe checkout flow active — new booking API never called from schedule page |
| `app/schedule/page.tsx` | 39-75 | `StripePaymentForm` component with `PaymentElement` | BLOCKER | Students still go through upfront payment, not the `pending_approval` flow |
| `app/schedule/page.tsx` | 109 | `fetch('/api/create-payment-intent', ...)` in `handleContinueToPayment` | BLOCKER | Old payment intent API called instead of new booking API |
| `app/schedule/page.tsx` | 387-399 | `supabase.from('slots').select('*')` direct query | WARNING | Bypasses `/api/student/slots` endpoint, exposes `instructor_id` to client |
| `app/dashboard/page.tsx` | entire | Missing: booking history, flight hours, endorsements, setup-intent, billing-portal | BLOCKER | 5 requirements (STU-01, STU-02, STU-03, STU-05, STU-06) not addressable from dashboard |

---

## Human Verification Required

### 1. Stripe Webhook Audit (STRIPE-01)

**Test:** Log into Stripe Dashboard → Developers → Webhooks. Confirm exactly one endpoint is registered.
**Expected:** Single endpoint at `https://isaac-cfi.netlify.app/api/stripe-webhook` (or production domain). Event list includes: `payment_intent.succeeded`, `invoice.paid`, `checkout.session.completed`, `charge.refunded`. No Netlify functions endpoint (`/.netlify/functions/stripe-webhook`) is registered.
**Why human:** Stripe Dashboard state cannot be verified programmatically. Commit `5a56057` documents the human confirmed single endpoint. The 65% error rate detected in the audit requires investigation and resolution before Phase 5 begins — this is not a code issue but requires checking Stripe's event delivery logs.

---

## Gaps Summary

Two blockers stem from the same root cause: **file reverts caused by `git reset --soft` worktree alignment issues during parallel plan execution**.

### Gap 1: Schedule Page Still Has Old Stripe Checkout (Blocks BOOK-01, BOOK-02)

`app/schedule/page.tsx` was correctly updated in commit `29eb597` (Plan 01) to remove Stripe imports and call `/api/student/bookings`. However, commit `6966324` (Plan 03) — labeled as "add server-component auth guards" — accidentally restored the old version of the schedule page. The Plan 03 SUMMARY documents that `e099f30` was a restoration commit for files affected by staged deletions, but the restore brought back the pre-Plan-01 schedule page rather than the Plan-01 version.

**Fix:** Re-apply the schedule page changes from commit `29eb597`. The API routes (`/api/student/slots`, `/api/student/bookings`) are correct and ready — only the schedule page UI needs to be updated to call them.

### Gap 2: Dashboard Missing STU-01/02/03/05/06 (Blocks Setup Intent, Billing Portal, Booking History, Hours, Endorsements)

`app/dashboard/page.tsx` was comprehensively enhanced in commit `9060dc5` (Plan 03) with tabs for booking history, flight hours, milestones, endorsements, and billing (setup-intent + billing-portal). Commit `60bbef8` (Plan 05) replaced the entire file with a simpler weekly schedule view + invoices, stripping all sections Plan 03 had added.

`app/api/student/setup-intent/route.ts` and `app/api/student/billing-portal/route.ts` are implemented correctly but unreachable from the student interface.

**Fix:** Restore the full tabbed dashboard from commit `9060dc5` and merge in the invoice section from commit `60bbef8`. Both pieces are needed.

### What IS Working

The backend infrastructure for Phase 4 is essentially complete and correct:
- All 10 API routes implemented with proper auth guards
- Atomic cancellation via Supabase RPC
- $50 cancellation charge-or-flag logic with unit tests
- Admin invoice creation via Stripe (create, finalize, send)
- `invoice.paid` webhook handler with idempotency guard
- Admin booking approval endpoint with Resend email
- Admin BillingTab with all required sections
- Server-component auth guards on `/dashboard` and `/bookings`
- Student invoice view with Pay Now links

The two gaps are UI wiring issues caused by commit-order accidents, not missing functionality. Both fixes are mechanical re-applications of already-written code.

---

*Verified: 2026-04-09T12:00:00Z*
*Verifier: Claude (gsd-verifier)*
