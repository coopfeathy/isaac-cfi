---
phase: 02-admin-consolidation
plan: "01"
subsystem: admin-ui
tags: [refactor, decomposition, lazy-loading, next-dynamic]
dependency_graph:
  requires: []
  provides: [admin-tab-components, admin-shell]
  affects: [admin-ui, admin-bookings, admin-slots, admin-prospects]
tech_stack:
  added: [next/dynamic]
  patterns: [tab-component-extraction, lazy-loading, client-component-isolation]
key_files:
  created:
    - app/admin/tabs/SlotsTab.tsx
    - app/admin/tabs/BookingsTab.tsx
    - app/admin/tabs/ProspectsTab.tsx
    - app/admin/tabs/BlogTab.tsx
    - app/admin/tabs/SocialTab.tsx
    - app/admin/tabs/EmailTab.tsx
    - app/admin/tabs/SettingsTab.tsx
    - app/admin/tabs/AdminLanding.tsx
  modified:
    - app/admin/page.tsx
decisions:
  - "Extracted AdminLanding to its own component to keep page.tsx under 250 lines (landed at 197)"
  - "BookingsTab fetches slots independently on mount to pass to AdminBookingPlanner"
  - "EmailTab fetches its own prospects/slotRequests to build inbox view independently"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-08"
  tasks_completed: 3
  files_created: 8
  files_modified: 1
---

# Phase 02 Plan 01: Admin Monolith Decomposition Summary

**One-liner:** Decomposed 3,275-line admin page.tsx monolith into 7 independently lazy-loaded tab components via next/dynamic, reducing shell to 197 lines.

## What Was Built

The 3,275-line `app/admin/page.tsx` monolith was split into:

- **8 component files** under `app/admin/tabs/` (7 tab components + AdminLanding)
- **197-line shell** `app/admin/page.tsx` with dynamic imports for all tabs
- Each tab component is fully self-contained: own state, own data fetching, own event handlers

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Extract 7 tab components from monolith | a1d2c06 | Done |
| 2 | Rewrite page.tsx as thin shell with dynamic imports | 54a00dd | Done |
| 3 | Verify booking and student management intact | (no changes) | Verified |

## Verification Results

All plan checks pass:

- `ls app/admin/tabs/*.tsx | wc -l` = 8 (7 tabs + AdminLanding)
- `wc -l app/admin/page.tsx` = 197 (under 250 target)
- `grep -c "dynamic(" app/admin/page.tsx` = 8 (all 7 tabs + landing)
- `grep "export default function" app/admin/tabs/*.tsx | wc -l` = 8
- BookingsTab contains `AdminBookingPlanner` import and render
- `app/admin/students/page.tsx` exports `AdminStudentsPage` (ADMIN-03 intact)
- All sub-page routes (`/admin/slots`, `/admin/bookings`, etc.) still import `AdminWorkspacePage` from `../page`

## ADMIN-02 and ADMIN-03 Preserved

**ADMIN-02 (booking management):** `BookingsTab.tsx` imports and renders `AdminBookingPlanner` from `@/app/components/AdminBookingPlanner`. Bookings data is fetched independently on mount.

**ADMIN-03 (student management):** `app/admin/students/page.tsx` is unchanged. It uses `fetch('/api/admin/students')` which queries the `profiles` table via the API route. The plan's `grep "profiles"` check was a false negative against the page file — the actual query lives in `app/api/admin/students/route.ts` where `from('profiles')` appears on line 141.

## Deviations from Plan

### Auto-added: AdminLanding component

**Rule 2 — Missing critical functionality to meet line count acceptance criteria**

- **Found during:** Task 2
- **Issue:** page.tsx with the full landing page grid (4 nav cards with static links) was 351 lines — exceeding the 250-line acceptance criterion.
- **Fix:** Extracted the AdminLanding view into `app/admin/tabs/AdminLanding.tsx` and imported it via `dynamic()` as well. This keeps the landing page logic intact while reducing page.tsx to 197 lines.
- **Files modified:** `app/admin/page.tsx`, `app/admin/tabs/AdminLanding.tsx` (new)
- **Commit:** 54a00dd

## Known Stubs

None. All tab components fetch real data from Supabase on mount.

## Threat Flags

None. The auth check (`useAuth + isAdmin`) remains in the shell `AdminPageContent` function — tabs only render after auth passes, satisfying T-02-03 mitigation.

## Self-Check: PASSED

All 9 files confirmed present. Both commits (a1d2c06, 54a00dd) confirmed in git log.
