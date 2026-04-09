---
phase: 04-student-self-service-billing
plan: "01"
subsystem: student-booking
tags: [booking, schedule, api, migration, email]
dependency_graph:
  requires:
    - lib/auth.ts (requireUser — from Phase 1 plan 01-01)
    - lib/supabase-admin.ts (getSupabaseAdmin)
    - lib/supabase.ts (public client for slots query)
  provides:
    - GET /api/student/slots (public slot browsing)
    - POST /api/student/bookings (authenticated booking request)
    - GET /api/student/bookings (authenticated booking history)
    - pending_approval booking status in DB
  affects:
    - app/schedule/page.tsx (schedule page UI — Stripe flow removed)
    - supabase/migrations/20260408_phase4_booking_status.sql (DB schema)
tech_stack:
  added: []
  patterns:
    - requireUser() guard from lib/auth.ts for authenticated student routes
    - getSupabaseAdmin() for server-side writes bypassing RLS
    - Public Supabase client for public slot reads (BOOK-01)
    - Resend fetch-based email for booking notifications
key_files:
  created:
    - app/api/student/slots/route.ts
    - app/api/student/bookings/route.ts
    - supabase/migrations/20260408_phase4_booking_status.sql
  modified:
    - app/schedule/page.tsx
decisions:
  - "Bookings status column is TEXT+CHECK (not native ENUM) — migration drops old constraint and adds new one with pending_approval"
  - "Tour slots auto-mark is_booked=true on booking; training slots do not (admin approves in Plan 04)"
  - "Email send failures are non-fatal — logged but do not fail the booking response"
  - "Schedule page fetches slots from /api/student/slots (60-day window) instead of direct Supabase client query"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-09"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 1
---

# Phase 04 Plan 01: Slot Viewing and Lesson Booking Flow Summary

**One-liner:** No-payment booking request flow with pending_approval status for training and auto-confirm for discovery flights.

## What Was Built

Converted the schedule page from a Stripe Checkout payment flow to a no-payment booking request system. Students can now browse available slots without logging in, and submit booking requests after authentication.

### New API Routes

**GET /api/student/slots** — Public endpoint (no auth). Returns available (unbooked) slots filtered by date range (default: now to 14 days). Used by the schedule page as the single source of truth for slot display.

**GET /api/student/bookings** — Authenticated. Returns booking history for the current user, joined with slot data, ordered newest first.

**POST /api/student/bookings** — Authenticated. Creates a booking request:
- Tour/discovery slots: `status: 'confirmed'`, slot marked `is_booked = true` immediately (BOOK-08)
- Training slots: `status: 'pending_approval'`, slot NOT marked as booked (admin approves in Plan 04)
- Sends transactional email via Resend for both types
- Validates slotId, checks `is_booked = false` before insert (race condition mitigation, T-04-02)
- `user_id` sourced from auth token only — never from request body (T-04-01, T-04-06)

### Migration

`supabase/migrations/20260408_phase4_booking_status.sql` — Drops the old `bookings_status_check` constraint and adds a new one including `pending_approval` alongside existing values (`pending`, `paid`, `confirmed`, `canceled`, `completed`).

### Schedule Page Update

Removed: `loadStripe`, `Elements`, `PaymentElement`, `useStripe`, `useElements`, `StripePaymentForm`, `BookingModal`, and the multi-step Stripe payment modal entirely.

Added:
- Fetches slots from `/api/student/slots` (60-day window) instead of direct Supabase client
- "Book Discovery Flight" button for tour slots; "Request Booking" for training slots
- "Log in to book" link for unauthenticated users
- Inline per-slot success/error feedback with loading state
- Auto-removes booked tour slots from the list on success

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Worktree had staged file deletions from previous agent state**
- **Found during:** Pre-task setup
- **Issue:** `git reset --soft` left 83 staged file deletions including `lib/auth.ts`, making required files inaccessible
- **Fix:** `git checkout HEAD -- $(git status --short | grep "^D " | awk '{print $2}')` restored all files from base commit
- **Files modified:** None (restoration only)
- **Commit:** Pre-task (not committed — working tree restoration)

**2. [Rule 1 - Bug] Status column is TEXT+CHECK, not native ENUM**
- **Found during:** Task 1
- **Issue:** Plan instructed `ALTER TYPE booking_status ADD VALUE` but there is no ENUM — the column is `TEXT DEFAULT 'pending' CHECK (status IN (...))`
- **Fix:** Migration drops old constraint and adds new `CHECK` constraint including `pending_approval`
- **Files modified:** `supabase/migrations/20260408_phase4_booking_status.sql`
- **Commit:** 31c4679

**3. [Rule 2 - Missing] Input validation for JSON body parse failure**
- **Found during:** Task 2
- **Issue:** Plan didn't specify handling for malformed JSON body in POST handler
- **Fix:** Added try/catch around `request.json()` returning 400 on parse failure
- **Files modified:** `app/api/student/bookings/route.ts`
- **Commit:** 29eb597

**4. [Rule 2 - Missing] Email send errors are non-fatal**
- **Found during:** Task 2
- **Issue:** Plan didn't specify error handling for Resend API failures — a transient email error should not fail the booking
- **Fix:** Wrapped email fetch in `.catch()` with console.error logging; booking returns 201 regardless
- **Files modified:** `app/api/student/bookings/route.ts`
- **Commit:** 29eb597

## Threat Model Coverage

All mitigations from the plan's threat register were applied:

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-04-01 | `requireUser()` validates Bearer token; `user_id` set from `user.id`, not request body |
| T-04-02 | `slotId` validated as non-empty string; slot fetched and `is_booked` checked before insert |
| T-04-06 | User can only book for themselves; `user_id` from auth token only |

## Known Stubs

None. All data paths are wired to real DB queries and API endpoints.

## Threat Flags

None. No new network surface beyond the planned API routes.

## Self-Check: PASSED

Files exist:
- app/api/student/slots/route.ts: FOUND
- app/api/student/bookings/route.ts: FOUND
- supabase/migrations/20260408_phase4_booking_status.sql: FOUND
- app/schedule/page.tsx: FOUND (modified)

Commits exist:
- 31c4679: feat(04-01): add pending_approval migration and public student slots API
- 29eb597: feat(04-01): booking request API and no-payment schedule page flow
