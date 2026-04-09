---
phase: 04-student-self-service-billing
plan: 02
subsystem: payments
tags: [stripe, postgres, rpc, cancellation, supabase]

# Dependency graph
requires:
  - phase: 01-security-hardening
    provides: lib/auth.ts with requireUser() canonical guard
provides:
  - supabase/migrations/20260408_phase4_cancellation.sql with cancel_booking_atomic RPC and cancellation_fee_flags table
  - lib/stripe-customer.ts with ensureStripeCustomer helper
  - app/api/student/bookings/[id]/cancel/route.ts with POST cancel endpoint
  - lib/__tests__/cancellation-fee.test.ts with 7 unit tests
affects: [04-03-student-portal-ui, 04-04-billing-setup-intent, 04-05-billing-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic database operations via SECURITY DEFINER RPC with FOR UPDATE row locking"
    - "Charge-or-flag fallback: attempt off-session Stripe charge, fall back to DB flag on failure"
    - "Testable business logic extracted from HTTP handler (processCancellationFee function)"
    - "jest.mock() at module top to stub env-dependent singletons (supabase, supabase-admin)"

key-files:
  created:
    - supabase/migrations/20260408_phase4_cancellation.sql
    - lib/stripe-customer.ts
    - app/api/student/bookings/[id]/cancel/route.ts
    - lib/__tests__/cancellation-fee.test.ts
    - lib/auth.ts
  modified: []

key-decisions:
  - "processCancellationFee extracted as named export for direct unit testing without HTTP mocking"
  - "Charge failure (e.g. authentication_required) falls back to flagging rather than failing cancellation — cancellation succeeds regardless"
  - "RPC uses SECURITY DEFINER to atomically cancel booking and release slot with single transaction"
  - "Amount (5000 cents = $50) hardcoded server-side — never from client input (T-04-09 mitigated)"

patterns-established:
  - "cancel_booking_atomic RPC pattern: validates ownership via p_user_id, checks cancellable status, updates both booking and slot atomically"
  - "charge-or-flag pattern: try off-session charge, catch any failure, insert cancellation_fee_flags as fallback"

requirements-completed: [BOOK-04, BOOK-05, BOOK-06, BOOK-07, BILL-04]

# Metrics
duration: 25min
completed: 2026-04-09
---

# Phase 04 Plan 02: Cancellation Flow Summary

**Atomic booking cancellation via Supabase RPC with conditional $50 Stripe charge or database fee flag fallback**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-09
- **Completed:** 2026-04-09
- **Tasks:** 2
- **Files modified:** 5 created

## Accomplishments
- Supabase migration creates `cancellation_fee_flags` table with RLS and `cancel_booking_atomic` RPC with FOR UPDATE row locking and SECURITY DEFINER
- Cancel API route authenticates student, calls RPC to atomically cancel booking and release slot, then charges $50 off-session or flags the fee
- Charge failure fallback ensures cancellation always succeeds even when Stripe charge fails (authentication_required, insufficient_funds, etc.)
- 7 unit tests covering card-on-file charge, no-card flag, null customer, charge failure fallback, and RPC contract shapes — all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration with cancel_booking_atomic RPC and cancellation_fee_flags table** - `3ed7789` (feat)
2. **Task 2: ensureStripeCustomer helper, cancel API route, and unit tests** - `da29795` (feat)

## Files Created/Modified
- `supabase/migrations/20260408_phase4_cancellation.sql` - cancellation_fee_flags table with RLS policies and cancel_booking_atomic SECURITY DEFINER RPC
- `lib/stripe-customer.ts` - Shared ensureStripeCustomer helper: looks up existing customer ID or creates new Stripe customer and persists ID
- `app/api/student/bookings/[id]/cancel/route.ts` - POST cancel endpoint: requireUser auth, RPC call, charge-or-flag logic with error fallback
- `lib/__tests__/cancellation-fee.test.ts` - 7 unit tests for processCancellationFee function
- `lib/auth.ts` - Canonical auth guards (requireUser, requireAdmin, requireCFI) — created in worktree as Rule 3 fix

## Decisions Made
- `processCancellationFee` is exported as a named function (not inlined in POST handler) so tests can call it directly without HTTP mocking overhead
- Charge failure is caught and falls back to flagging instead of failing the entire cancellation — prevents UX where a declined card blocks the student from canceling
- $50 fee amount is hardcoded server-side at 5000 cents, never read from client input (addresses T-04-09 threat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created lib/auth.ts in worktree**
- **Found during:** Task 2 (running tests)
- **Issue:** The worktree is based on a commit before Phase 1 shipped lib/auth.ts. The cancel route imports `requireUser` from `@/lib/auth`, which was missing in the worktree, causing test suite failure.
- **Fix:** Created lib/auth.ts with requireUser, requireAdmin, requireCFI — identical content to what Phase 1 delivered on the main branch.
- **Files modified:** lib/auth.ts
- **Verification:** Tests ran successfully after creation (7/7 passing)
- **Committed in:** da29795 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Necessary workaround for parallel worktree isolation. lib/auth.ts content matches Phase 1 deliverable exactly — no scope creep or behavior change.

## Issues Encountered
- Jest module resolution failed because `lib/supabase.ts` throws at import time when env vars are missing. Fixed by adding `jest.mock('@/lib/supabase', ...)` and `jest.mock('@/lib/supabase-admin', ...)` at the top of the test file before imports.

## User Setup Required
None - no external service configuration required. Stripe and Supabase credentials are already in the environment. The migration `20260408_phase4_cancellation.sql` must be applied to the Supabase database before the cancel endpoint will function.

## Next Phase Readiness
- Cancel endpoint is complete and tested: `POST /api/student/bookings/{id}/cancel`
- `cancellation_fee_flags` table ready for admin UI display (Phase 4 plan 05 or later)
- `ensureStripeCustomer` helper in `lib/stripe-customer.ts` is available for setup-intent and billing-portal routes (plan 04-04)
- Threat mitigations T-04-07 through T-04-11 all addressed

---
*Phase: 04-student-self-service-billing*
*Completed: 2026-04-09*
