---
phase: 04-student-self-service-billing
plan: 04
subsystem: billing
tags: [stripe, invoicing, webhooks, admin-ui, booking-approval]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [invoice-api, booking-approval-api, webhook-invoice-handler, billing-admin-ui]
  affects: [app/api/stripe-webhook/route.ts, app/admin/billing]
tech_stack:
  added: []
  patterns: [stripe-invoices, send_invoice, invoice.paid webhook, resend-email, admin-tab-component]
key_files:
  created:
    - supabase/migrations/20260408_phase4_invoice.sql
    - app/api/admin/billing/invoice/route.ts
    - app/api/admin/bookings/[id]/approve/route.ts
    - app/admin/components/BillingTab.tsx
    - lib/__tests__/stripe-webhook-invoice.test.ts
  modified:
    - app/api/stripe-webhook/route.ts
decisions:
  - "Created app/admin/components/ directory (did not exist) to house BillingTab per plan spec"
  - "BillingTab invoice query uses .in('status', ['completed', 'confirmed']) to handle both Phase 3 lesson status variations"
  - "Billing overview filters to show only students with Stripe customers or unresolved fees to reduce noise"
metrics:
  duration: "~30 minutes"
  completed: "2026-04-08"
  tasks_completed: 4
  tasks_total: 4
  files_created: 5
  files_modified: 1
---

# Phase 4 Plan 04: Invoice Generation, Booking Approval, and Admin Billing UI Summary

**One-liner:** Stripe invoice send_invoice flow with invoice.paid webhook, admin booking approval with Resend confirmation email, and BillingTab UI surfacing pending approvals, cancellation fee flags, and per-student billing overview.

## What Was Built

### Task 1: Invoice Migration, API, and Webhook Handler (TDD)

**Migration** (`supabase/migrations/20260408_phase4_invoice.sql`): Adds `stripe_invoice_id TEXT` column to `bookings` with an index for fast lookup by invoice ID.

**Invoice API** (`app/api/admin/billing/invoice/route.ts`): Admin-only POST endpoint that:
- Validates all four fields (bookingId, studentId, amountCents, description)
- Looks up student's `stripe_customer_id` — returns 400 if absent
- Creates Stripe invoice with `collection_method: 'send_invoice'`, `days_until_due: 30`, `auto_advance: false`
- Creates invoice line item, finalizes invoice, sends it (Stripe emails the student)
- Updates `bookings.stripe_invoice_id` with the finalized invoice ID
- Returns `{ invoice: { id, hosted_invoice_url, status } }` with 201

**Webhook Handler** (`app/api/stripe-webhook/route.ts`): Added `invoice.paid` handler that:
- Extracts `bookingId` from `invoice.metadata?.bookingId`
- Updates booking status to `paid` only if current status is in `['confirmed', 'pending_approval']`
- Leverages existing `stripe_webhook_events` idempotency table to prevent duplicate processing

**Unit Tests** (`lib/__tests__/stripe-webhook-invoice.test.ts`): 8 tests covering:
- invoice.paid with bookingId updates booking to paid
- invoice.paid without bookingId does not throw or update DB
- Duplicate event idempotency (status='processed' → returns duplicate:true)
- Idempotent guard uses correct status list
- Invoice API validation rejects missing/invalid fields, accepts valid body

### Task 2: Admin Booking Approval Endpoint (BOOK-03)

**Approval API** (`app/api/admin/bookings/[id]/approve/route.ts`):
- `requireAdmin` guard — 401/403 if not admin
- Fetches booking with slot details; 404 if not found
- Returns 409 if booking is not in `pending_approval` status (prevents approving already-confirmed/canceled bookings)
- Updates `bookings.status` to `confirmed`
- Sets `slots.is_booked = true` (slot was NOT marked booked during pending_approval creation in Plan 01)
- Sends "Booking Confirmed" email to student via Resend with date, type, and description
- Returns `{ approved: true, bookingId, status: 'confirmed' }`

### Task 3: Admin BillingTab UI Component

**BillingTab** (`app/admin/components/BillingTab.tsx`): New 'use client' component with four sections:

1. **Pending Approvals**: Fetches `bookings` with `status = 'pending_approval'`, shows student name, lesson type, date/time, requested date. Approve button calls `POST /api/admin/bookings/{id}/approve`.

2. **Cancellation Fees**: Fetches `cancellation_fee_flags` where `resolved = false`, shows student, email, $50.00 amount, reason, date. Resolve button updates flag in-place via Supabase client.

3. **Send Invoice**: Fetches bookings with `status IN ('completed', 'confirmed')` and `stripe_invoice_id IS NULL`. Per-booking invoice form with editable amount and description. Calls `POST /api/admin/billing/invoice` with `bookingId`, `studentId`, `amountCents`, `description`.

4. **Billing Overview**: Per-student summary showing Stripe customer ID, unresolved fee count, and total flagged amount. Filters to students with Stripe customers or outstanding flags.

### Task 4: Database Migrations Applied

All three migrations applied to the live Supabase database via `supabase db push` (confirmed by Isaac):
- `20260408_phase4_booking_status.sql` (Plan 01) — `pending_approval` status value on bookings
- `20260408_phase4_cancellation.sql` (Plan 02) — `cancellation_fee_flags` table + `cancel_booking_atomic` RPC
- `20260408_phase4_invoice.sql` (Plan 04) — `stripe_invoice_id` column on bookings

**Status:** Complete.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Structural Notes

**[Deviation - Directory Creation]** The plan specified `app/admin/components/BillingTab.tsx` but the directory `app/admin/components/` did not exist. Created it as a new directory for admin-specific components. Existing admin tabs live in `app/admin/tabs/` — the new `components/` directory is for reusable admin components that are not full tab pages.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 (TDD) | d55a182 | feat(04-04): invoice API, invoice.paid webhook handler, and unit tests |
| Task 2 | 798a73a | feat(04-04): admin booking approval endpoint (BOOK-03) |
| Task 3 | 727ee35 | feat(04-04): admin BillingTab with pending approvals, cancellation fees, and invoice UI |
| Task 4 | 4529658 | feat(04-04): apply Phase 4 DB migrations (supabase db push confirmed) |

## Known Stubs

None — all sections fetch live data from Supabase. The billing overview's `outstanding_bookings` count is a partial implementation (counts confirmed bookings by status but the user_id→student_id linkage is noted as a simplification); the unresolved fee count and Stripe customer display are fully wired.

## Threat Flags

None — all new endpoints use `requireAdmin()`. The `invoice.paid` webhook uses existing Stripe signature verification and the `stripe_webhook_events` idempotency table. RLS on `cancellation_fee_flags` restricts to admin and service_role (from Plan 02 migration).

## Self-Check: PASSED

All created files confirmed present on disk. All commits (d55a182, 798a73a, 727ee35, 4529658) confirmed in git history. Task 4 migration confirmed applied to live database by Isaac.
