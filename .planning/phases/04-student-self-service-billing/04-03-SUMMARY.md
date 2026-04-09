---
phase: 04-student-self-service-billing
plan: "03"
subsystem: student-portal
tags: [auth, student, stripe, dashboard, server-component]
dependency_graph:
  requires: [04-02]
  provides: [server-auth-guard-dashboard, server-auth-guard-bookings, booking-history-ui, flight-hours-ui, endorsements-ui, setup-intent-api, billing-portal-api]
  affects: [app/dashboard, app/bookings, app/api/student]
tech_stack:
  added: ["@supabase/ssr createServerClient for server-component auth"]
  patterns: ["server-component layout guard", "tab-based self-service UI", "Stripe SetupIntent off_session", "Stripe Billing Portal redirect"]
key_files:
  created:
    - app/api/student/setup-intent/route.ts
    - app/api/student/billing-portal/route.ts
  modified:
    - app/dashboard/layout.tsx
    - app/bookings/layout.tsx
    - app/dashboard/page.tsx
decisions:
  - "Used await cookies() per Next.js 16.x async cookies() API in server component guards"
  - "Billing portal shows only when stripe_customer_id exists — prevents 400 from Stripe"
  - "Tab-based UI chosen over collapsible sections for cleaner separation of history/hours/endorsements/billing"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-08"
  tasks_completed: 3
  files_modified: 5
requirements: [STU-01, STU-02, STU-03, STU-05, STU-06, STU-07]
---

# Phase 04 Plan 03: Student Portal Auth Guards + Self-Service Dashboard Summary

**One-liner:** Server-component auth guards on /dashboard and /bookings eliminate flash-of-content vulnerability; tabbed dashboard adds booking history with cancel buttons, flight hours grid, endorsements list, and Stripe billing management.

## What Was Built

### Task 1: Server-Component Layout Guards (STU-07)
Rewrote `app/dashboard/layout.tsx` and `app/bookings/layout.tsx` as async server components using `@supabase/ssr` `createServerClient`. Both now call `supabase.auth.getUser()` and redirect unauthenticated users to `/login` before any page content renders. This eliminates the flash-of-content vulnerability where client-side `useAuth` guards would briefly show protected content before redirecting.

- Uses `await cookies()` (Next.js 16.x async cookies API)
- Server-component redirect is now the security boundary (T-04-12 mitigated)
- Client-side `useAuth` belt-and-suspenders guard preserved in page components

### Task 2: Enhanced Dashboard Page (STU-01, STU-02, STU-03)
Preserved the existing week schedule view and added a tabbed "My Training Account" section with four tabs:

- **Booking History**: Shows upcoming bookings (with Cancel buttons calling `/api/student/bookings/{id}/cancel`) and past/canceled bookings. Status color-coded: green=confirmed/paid, yellow=pending_approval, gray=canceled, blue=completed.
- **Flight Hours**: Grid of 6 hour totals (total, solo, dual, PIC, instrument, cross-country) from `students` table. Milestones from `syllabus_progress` table listed below.
- **Endorsements**: List from `student_endorsements` table showing type, issued date, expiration date, and notes.
- **Billing**: Save Payment Method button (calls setup-intent), Manage Billing button (calls billing-portal, only shown when `stripe_customer_id` exists).

All data queries filter by authenticated user's ID (T-04-16 mitigated).

### Task 3: Setup Intent + Billing Portal API Routes (STU-05, STU-06)
Created two new POST API routes:

- `app/api/student/setup-intent/route.ts`: Validates auth via `requireUser()`, looks up student by `user_id`, calls `ensureStripeCustomer()` to get/create Stripe customer, creates `setupIntents.create` with `usage: 'off_session'`, returns `clientSecret`.
- `app/api/student/billing-portal/route.ts`: Validates auth via `requireUser()`, looks up `stripe_customer_id` from student record, calls `billingPortal.sessions.create` with `return_url` pointing to `/dashboard`, returns `url` for redirect.

Both routes derive the Stripe customer from the authenticated user's own student record — preventing elevation of privilege across students (T-04-13, T-04-14, T-04-15 mitigated).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree missing dependency files**
- **Found during:** Task 1 setup
- **Issue:** `lib/auth.ts` and `lib/stripe-customer.ts` were not present in the worktree (deleted by `git reset --soft` during branch alignment)
- **Fix:** Restored from base commit `3a9db3b` via `git checkout HEAD -- lib/auth.ts lib/stripe-customer.ts`
- **Commit:** e099f30

**2. [Rule 3 - Blocking] git reset --soft accidentally staged deletions**
- **Found during:** Task 1 commit
- **Issue:** The initial `git reset --soft 3a9db3b` left 87 files staged as deletions. These were committed along with Task 1 changes.
- **Fix:** Restored all affected files from base commit and committed the restoration separately
- **Files modified:** All .planning/ files, app/admin/tabs/, app/api/cfi/, app/cfi/, lib/, supabase/migrations/
- **Commit:** e099f30

## Known Stubs

- **`handleSaveCard` in `app/dashboard/page.tsx`**: On success, sets `cardSaved = true` and shows a confirmation message. In production, the `clientSecret` should be used with Stripe Elements (`@stripe/react-stripe-js`) to collect and confirm the payment method client-side. The API route correctly creates the SetupIntent; the Stripe Elements UI integration is deferred (the API contract is complete, the client-side form is the stub). Plan 04-05 or a follow-up plan should wire Stripe Elements.

## User Setup Required

- Isaac must configure the Stripe Billing Portal in the Stripe dashboard (Settings → Billing → Customer portal) before `billingPortal.sessions.create()` will succeed. Without this, the Manage Billing button will return a 400 error from Stripe.

## Threat Flags

No new threat surface introduced beyond what is documented in the plan's threat model. All new endpoints are behind `requireUser()`.

## Self-Check: PASSED

Files exist:
- app/dashboard/layout.tsx — FOUND
- app/bookings/layout.tsx — FOUND
- app/dashboard/page.tsx — FOUND
- app/api/student/setup-intent/route.ts — FOUND
- app/api/student/billing-portal/route.ts — FOUND

Commits exist:
- 6966324 feat(04-03): add server-component auth guards
- 9060dc5 feat(04-03): enhance dashboard with booking history, flight hours, and endorsements
- 2b78dc7 feat(04-03): add Setup Intent and Billing Portal API routes
