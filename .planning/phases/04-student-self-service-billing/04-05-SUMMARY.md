---
phase: 04-student-self-service-billing
plan: "05"
subsystem: student-billing
tags: [stripe, invoices, dashboard, webhook-audit]
dependency_graph:
  requires: [04-03, 04-04]
  provides: [student-invoice-view, stripe-webhook-audit]
  affects: [app/dashboard/page.tsx, app/api/student/invoices/route.ts]
tech_stack:
  added: []
  patterns: [requireUser-auth-guard, stripe-invoices-list, hosted-invoice-url]
key_files:
  created:
    - app/api/student/invoices/route.ts
  modified:
    - app/dashboard/page.tsx
decisions:
  - "Only open invoices (status: open) are shown — completed/voided invoices excluded"
  - "Invoice payment opens Stripe-hosted page in new tab — no custom payment UI needed"
  - "Students without a stripe_customer_id get empty invoice list (graceful zero-state)"
metrics:
  duration: "<10 min"
  completed_date: "2026-04-08"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 2
---

# Phase 04 Plan 05: Student Invoices + Webhook Audit Summary

**One-liner:** Student invoice viewing via Stripe invoices.list API with dashboard Pay Now links; webhook dual-endpoint audit checkpoint pending human verification.

## Status

**CHECKPOINT REACHED** — Task 1 complete and committed. Task 2 requires human verification in the Stripe Dashboard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Student invoices API + dashboard section | 60bbef8 | app/api/student/invoices/route.ts, app/dashboard/page.tsx |

## What Was Built

### Task 1: Student Invoices API (`GET /api/student/invoices`)

- Auth-gated via `requireUser()` — returns 401 if no valid Bearer token
- Looks up student's `stripe_customer_id` from `students` table by `user_id`
- Returns empty array if no customer ID (graceful zero-state for new students)
- Calls `stripe.invoices.list({ status: 'open', limit: 20 })` — only unpaid invoices
- Returns: `id`, `amount_due`, `currency`, `description`, `created`, `due_date`, `hosted_invoice_url`, `status`

### Dashboard Invoice Section

- Added `InvoiceData` type and `invoices` / `invoicesLoading` state
- Fetches from `/api/student/invoices` on mount with auth header from `supabase.auth.getSession()`
- Shows loading skeleton while fetching
- Shows "No outstanding invoices." when list is empty
- Each invoice card shows: description, due date (or issue date), amount in dollars, "Pay Now" button
- "Pay Now" opens `hosted_invoice_url` in a new tab

## Task 2: Pending (Checkpoint)

The Stripe webhook dual-endpoint audit (STRIPE-01) requires human verification in the Stripe Dashboard. See checkpoint message.

**Automated findings before checkpoint:**
- Legacy Netlify function exists: `netlify/functions/stripe-webhook.ts` — deployed via `netlify.toml` `[functions] directory = "netlify/functions"`
- Authoritative App Router handler: `app/api/stripe-webhook/route.ts` — handles `invoice.paid`, `setup_intent.succeeded`, `payment_intent.succeeded`, etc.
- No client-side code references `/.netlify/functions/stripe-webhook` (only `/.netlify/functions/book` is referenced in BookingForm.tsx)
- The legacy function uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not service role) — weaker than App Router handler

**Required action:** Verify in Stripe Dashboard that only ONE webhook endpoint is registered pointing to `/api/stripe-webhook`. If the Netlify functions URL (`https://merlinflighttraining.com/.netlify/functions/stripe-webhook`) is also registered, it must be disabled/deleted.

## Deviations from Plan

None — Task 1 executed exactly as specified.

## Known Stubs

None — invoice data is live from Stripe API, not mocked.

## Threat Surface

| Flag | File | Description |
|------|------|-------------|
| (none new) | — | T-04-23 and T-04-24 mitigations applied as planned: user-scoped lookup + requireUser() guard |

## Self-Check

- [x] `app/api/student/invoices/route.ts` created
- [x] Commit 60bbef8 exists
- [x] `app/dashboard/page.tsx` updated with invoice section
- [x] All 8 acceptance criteria verified (grep checks passed)
