---
phase: 01
plan: 04
subsystem: auth
tags: [security, requireAdmin, routing, SEC-04, SEC-09]
dependency_graph:
  requires: [01-01, 01-02, 01-03]
  provides: [centralized-admin-auth, booking-redirect]
  affects: [all 23 admin API routes, /booking route]
tech_stack:
  added: []
  patterns: [centralized auth guard import, server-side redirect stub]
key_files:
  created: []
  modified:
    - app/api/admin/billing/checkout/route.ts
    - app/api/admin/billing/send-reminder/route.ts
    - app/api/admin/billing/sync-products/route.ts
    - app/api/admin/billing/accountant-text/route.ts
    - app/api/admin/billing/cash-payment/route.ts
    - app/api/admin/billing/delete-checkout/route.ts
    - app/api/admin/billing/overview/route.ts
    - app/api/admin/billing/payout-rules/route.ts
    - app/api/admin/billing/push-checkout-link/route.ts
    - app/api/admin/availability/route.ts
    - app/api/admin/availability-overrides/route.ts
    - app/api/admin/bookings/manual/route.ts
    - app/api/admin/caldav/push/route.ts
    - app/api/admin/caldav/settings/route.ts
    - app/api/admin/caldav/sync/route.ts
    - app/api/admin/caldav/test/route.ts
    - app/api/admin/enrollments/migrate-course/route.ts
    - app/api/admin/prospects/[prospectId]/route.ts
    - app/api/admin/slot-requests/[id]/approve/route.ts
    - app/api/admin/slot-requests/[id]/deny/route.ts
    - app/api/admin/students/normalize/route.ts
    - app/api/admin/students/route.ts
    - app/api/admin/students/send-account-link/route.ts
    - app/booking/page.tsx
decisions:
  - All 23 admin routes now import requireAdmin from lib/auth — no local inline copies remain
  - Removed orphaned supabase imports from files that only used the client for the local requireAdmin function
  - /booking replaced with 5-line Server Component redirect stub (no 'use client', no useState)
metrics:
  duration: ~25 minutes
  completed: 2026-04-08
  tasks_completed: 2
  files_modified: 24
---

# Phase 1 Plan 4: Centralize Admin Auth Guards and Retire /booking Summary

All 23 inline `requireAdmin()` copies replaced with `import { requireAdmin } from '@/lib/auth'`, eliminating auth drift risk; `/booking` retired with a server-side redirect to `/schedule`.

## What Was Built

**Task 1 — Centralize requireAdmin across 23 admin API routes:**
Every admin API route file previously contained a local copy of the `requireAdmin()` function (15-28 lines each). These copies were functionally identical to the canonical version in `lib/auth.ts` but represented a maintenance and security risk — any future auth change would need to be replicated across all 23 files.

Each file received exactly two changes:
1. `import { supabase } from '@/lib/supabase'` → `import { requireAdmin } from '@/lib/auth'`
2. The entire local `async function requireAdmin(request: NextRequest) { ... }` block was removed

In all 23 files, the `supabase` client was used exclusively within the local `requireAdmin` function (for `supabase.auth.getUser()` and `supabase.from('profiles')`). Removing the function left the `supabase` import orphaned, so it was removed in each case, avoiding unused import warnings.

The call sites (`const adminCheck = await requireAdmin(request); if ('error' in adminCheck) return adminCheck.error`) were left untouched — the canonical function's return shape is compatible.

**Task 2 — Retire /booking:**
The legacy `app/booking/page.tsx` (59 lines, multi-step form with `BookingProvider`, `BookingForm`, `PaymentForm`, framer-motion animations) was replaced with a 5-line Server Component redirect stub:

```typescript
import { redirect } from 'next/navigation'

export default function BookingPage() {
  redirect('/schedule')
}
```

The old form called `/.netlify/functions/book` — a deprecated Netlify function that is no longer functional. The replacement makes `/booking` unreachable as a functional page.

## Verification Results

```
grep -rl "async function requireAdmin" app/api/ | wc -l  → 0
grep -rl "import.*requireAdmin.*from.*@/lib/auth" app/api/admin/ | wc -l  → 23
grep -c "redirect('/schedule')" app/booking/page.tsx  → 1
wc -l < app/booking/page.tsx  → 5
npx tsc --noEmit (outside test files)  → 0 errors
```

Test suite: 198/204 tests pass. 6 pre-existing failures in `caldav.test.ts` and `availability/route.test.ts` — unrelated to changes made in this plan.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | badf2d7 | feat(01-04): replace inline requireAdmin in all 23 admin API routes with import from lib/auth |
| Task 2 | 8190407 | feat(01-04): retire /booking route with server-side redirect to /schedule |

## Deviations from Plan

**1. [Rule 2 - Missing cleanup] Removed orphaned supabase imports**
- **Found during:** Task 1
- **Issue:** After removing the local `requireAdmin` function, the `import { supabase } from '@/lib/supabase'` became unused in all 23 files — the supabase client was only used inside the local function, not elsewhere in any of the 23 routes.
- **Fix:** Removed the orphaned `supabase` import from all 23 files to prevent unused import warnings and keep the import list clean.
- **Files modified:** All 23 admin API route files
- **Commit:** badf2d7

## Known Stubs

None — the /booking redirect stub is intentional and complete per SEC-09 requirements.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check

Files verified:
- badf2d7 exists in git log ✓
- 8190407 exists in git log ✓
- 0 local requireAdmin definitions in app/api/ ✓
- 23 files import requireAdmin from @/lib/auth ✓
- app/booking/page.tsx is 5 lines, contains redirect('/schedule') ✓
