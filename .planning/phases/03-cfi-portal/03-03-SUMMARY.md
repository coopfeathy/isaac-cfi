---
phase: 03-cfi-portal
plan: "03"
subsystem: cfi-portal
tags: [cfi, flight-log, endorsements, api, atomic-rpc, postgres, security]
dependency_graph:
  requires:
    - 03-01 (requireCFI auth guard, schema migrations, student_endorsements table)
    - 03-02 (GET /api/cfi/students for student picker)
  provides:
    - app/api/cfi/flight-log/route.ts
    - app/api/cfi/endorsements/route.ts
    - app/cfi/log/page.tsx
    - supabase/SETUP.sql (increment_student_hours RPC)
  affects:
    - students table (dual_hours, total_hours atomically incremented)
    - student_lesson_completions table (new rows inserted per flight hour log)
    - student_endorsements table (new rows inserted per endorsement)
tech_stack:
  added:
    - Postgres RPC function (increment_student_hours, SECURITY DEFINER, atomic UPDATE)
  patterns:
    - Two-step DB pattern: roster ownership check before any INSERT
    - Atomic hour increment via .rpc() — no read-then-write race condition
    - Inline accessible modal overlay (role=dialog, aria-modal, aria-labelledby) matching codebase pattern
key_files:
  created:
    - app/api/cfi/flight-log/route.ts
    - app/api/cfi/flight-log/__tests__/route.test.ts
    - app/api/cfi/endorsements/route.ts
    - app/api/cfi/endorsements/__tests__/route.test.ts
    - app/cfi/log/page.tsx
  modified:
    - supabase/SETUP.sql (added increment_student_hours function)
decisions:
  - "Used inline accessible modal overlay pattern (role=dialog) instead of shadcn Dialog — shadcn components/ui directory not installed in project; existing codebase (schedule/page.tsx) uses same inline overlay pattern"
  - "Removed non-atomic fallback in flight-log POST — RPC is the sole path per plan instruction; fallback removed for clarity"
  - "GET /api/cfi/flight-log uses two-step query (students then completions) because student_lesson_completions.student_id references auth.users.id not students.id — direct join would fail"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-08"
  tasks_completed: 2
  files_created: 5
  files_modified: 1
---

# Phase 3 Plan 03: Flight Log and Endorsement Recording Summary

**One-liner:** CFI flight hour logging with atomic Postgres RPC increment and endorsement recording with 7-type allowlist, both with roster ownership enforcement and accessible modal forms.

## What Was Built

### Task 1: Flight Log API + Endorsement API + Tests (commit c1ef98b)

**`app/api/cfi/flight-log/route.ts`**
- `GET` returns recent flight completions for the calling CFI (joined with student names via two-step query)
- `POST` validates `student_id`, `hours` (0.1–24), `date`; verifies roster ownership via `students.instructor_id = user.id` (403 if not found); inserts `student_lesson_completions` row; calls `increment_student_hours` RPC for atomic dual_hours + total_hours update

**`app/api/cfi/endorsements/route.ts`**
- `GET` returns recent endorsements for the calling CFI
- `POST` validates `student_id`, `endorsement_type` (against 7-item allowlist); verifies roster ownership (403 if not found); inserts to `student_endorsements`

**`supabase/SETUP.sql`** — Added `increment_student_hours(p_student_user_id UUID, p_hours NUMERIC)` function with `SECURITY DEFINER`. Uses `SET dual_hours = COALESCE(dual_hours, 0) + p_hours` — atomic, no read-then-write race condition (mitigates T-03-08).

**Tests:** 14 tests across both suites — 401 auth, 403 roster, 400 validation, success paths with RPC call verification, instructor_id presence in INSERT args.

### Task 2: /cfi/log Page (commit b8b1d6a)

**`app/cfi/log/page.tsx`** — `'use client'` component using `CFIPageShell` with title "Flight Log".
- Loads students from `GET /api/cfi/students`, flight logs from `GET /api/cfi/flight-log`, endorsements from `GET /api/cfi/endorsements` on mount using async cancellation pattern
- **Log Hours** button → `LogHoursDialog` modal (student picker, hours 0.1–24, date, notes) — `POST /api/cfi/flight-log`
- **Log Endorsement** button → `LogEndorsementDialog` modal (student picker, 7-type dropdown with proper labels, notes) — `POST /api/cfi/endorsements`
- Flight hours table with Date / Student / Notes columns
- Endorsements table with Date / Student / Type (badge) / Notes columns
- `EndorsementBadge` component — default variant for all operational types, secondary (slate) for "other"
- Empty states with `role="status"` and `aria-live="polite"` per UI-SPEC
- Modals use inline `role="dialog"` overlay pattern matching the schedule/page.tsx codebase pattern

## Security Properties (Threat Model)

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-03-05: Tampering flight log | `students.instructor_id = user.id` check before INSERT | Implemented |
| T-03-06: Tampering endorsements | Same roster check + endorsement_type allowlist | Implemented |
| T-03-08: Race condition on hours | Atomic `UPDATE SET dual_hours = dual_hours + p_hours` via RPC | Implemented |
| T-03-09: Elevation of privilege | `requireCFI()` on all handlers | Implemented |
| T-03-10: Input validation | hours: number 0.1-24, date: string, student_id: string | Implemented |

## Deviations from Plan

### Auto-selected alternatives

**1. [Rule 1 - Pattern Match] Inline modal overlay instead of shadcn DialogContent**
- **Found during:** Task 2
- **Issue:** `components/ui/` directory does not exist in this project — shadcn components are not installed. Plan spec referenced `DialogContent` which would cause a build error.
- **Fix:** Used inline accessible modal overlay (fixed inset-0 overlay + `role="dialog"`, `aria-modal="true"`, `aria-labelledby`) matching the existing `BookingModal` pattern in `app/schedule/page.tsx`.
- **Files modified:** app/cfi/log/page.tsx
- **Accessibility preserved:** All required attributes (role, aria-modal, aria-labelledby pointing to dialog title id) are present.

**2. [Rule 1 - Bug Prevention] Two-step query in GET /api/cfi/flight-log**
- **Found during:** Task 1 implementation
- **Issue:** Plan spec suggested `students!inner(full_name)` join from `student_lesson_completions`. However, `student_lesson_completions.student_id` references `auth.users(id)` while `students.user_id` is the join key — the `!inner` syntax would fail or return incorrect data.
- **Fix:** Implemented two-step query: (1) get students for this CFI, (2) get completions filtered by instructor_id, then map student names. Consistent with the pattern used in `schedule/route.ts`.
- **Files modified:** app/api/cfi/flight-log/route.ts

**3. [Rule 1 - Simplification] Removed non-atomic fallback**
- **Found during:** Task 1 — plan showed a fallback update path if RPC failed
- **Fix:** Per plan's final instruction ("The final POST handler should use ONLY the RPC call"), removed the fallback. If RPC errors, return 500.

## Pre-existing Failures (Out of Scope)

Two test suites were failing before this plan's changes and remain failing:
- `lib/__tests__/caldav.test.ts` — 6 failing tests (pre-existing)
- `app/api/availability/__tests__/route.test.ts` — unrelated to CFI portal

Logged to deferred-items tracking — not caused by this plan.

## Test Results

```
Plan 03-03 tests: 14 passed, 0 failed
All CFI tests: 25 passed, 0 failed
Full suite: 197 passed, 6 failed (6 failures are pre-existing, unrelated to this plan)
```

## Self-Check: PASSED

- app/api/cfi/flight-log/route.ts: FOUND
- app/api/cfi/flight-log/__tests__/route.test.ts: FOUND
- app/api/cfi/endorsements/route.ts: FOUND
- app/api/cfi/endorsements/__tests__/route.test.ts: FOUND
- app/cfi/log/page.tsx: FOUND
- supabase/SETUP.sql contains increment_student_hours: FOUND
- Commit c1ef98b (Task 1): FOUND
- Commit b8b1d6a (Task 2): FOUND
