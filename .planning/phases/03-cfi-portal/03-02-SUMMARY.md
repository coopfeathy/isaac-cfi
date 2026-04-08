---
phase: 03-cfi-portal
plan: "02"
subsystem: cfi-portal
tags: [cfi, students, roster, api, table, accessibility]
dependency_graph:
  requires: [lib/auth.ts, lib/supabase-admin.ts, app/components/CFIPageShell.tsx, supabase/SETUP.sql Phase3 migrations]
  provides: [app/cfi/students/page.tsx, app/api/cfi/students/route.ts]
  affects: []
tech_stack:
  added: []
  patterns: [instructor_id ownership scoping, batch endorsement count query, async cancellation pattern in useEffect]
key_files:
  created:
    - app/api/cfi/students/route.ts
    - app/api/cfi/students/__tests__/route.test.ts
    - app/cfi/students/page.tsx
  modified: []
decisions:
  - "Student roster API uses a two-step query (students first, then endorsements batch) to avoid N+1 queries"
  - "endorsement_count uses student.user_id as the join key matching student_endorsements.student_id"
  - "Page uses plain Tailwind table (no shadcn Table) matching the established codebase pattern from Plan 03-01"
metrics:
  duration: ~2 minutes
  completed: 2026-04-08
  tasks_completed: 2
  files_created: 3
  files_modified: 0
requirements:
  - CFI-04
---

# Phase 3 Plan 02: Student Roster Summary

**One-liner:** Read-only CFI student roster with dual/total hours and endorsement counts, scoped per-instructor via `instructor_id` with accessible table markup and empty/loading/error states.

---

## What Was Built

### GET /api/cfi/students

`app/api/cfi/students/route.ts` — read-only endpoint returning the calling CFI's students with enriched data:

1. `requireCFI(request)` validates Bearer token — returns 401/403 on failure (T-03-07)
2. Queries `students` with `.eq('instructor_id', user.id)` — CFI sees only their own students (T-03-04)
3. Batch queries `student_endorsements` for all student `user_id`s
4. Counts endorsements per student and enriches response with `endorsement_count`

Response shape per student: `{ id, user_id, full_name, email, dual_hours, total_hours, created_at, endorsement_count }`

Read-only — no POST/PATCH/DELETE handlers.

### app/cfi/students/page.tsx

`'use client'` page using `CFIPageShell` with title "My Students".

- Fetches `GET /api/cfi/students` in `useEffect` with async cancellation pattern
- Passes Bearer token from `useAuth().session?.access_token`

**Table columns:** Name, Email, Dual Hours (1 decimal), Total Hours (1 decimal), Endorsements

**Visual:** Column headers `text-xs font-semibold uppercase tracking-[0.2em]` per UI-SPEC. Row hover `hover:bg-[#FFFDF7]`.

**Loading:** 6 `animate-pulse` skeleton rows with `aria-busy="true"` on container.

**Empty state:** `role="status" aria-live="polite"` region with "No students yet" heading and "Students will appear here once an admin assigns you as their instructor." body. No CTA (CFI cannot self-assign per D-02).

**Error state:** "Could not load your student roster. Refresh the page to try again."

**Accessibility:** `scope="col"` on all `<th>` elements.

---

## Tests

| File | Tests | Status |
|------|-------|--------|
| app/api/cfi/students/__tests__/route.test.ts | 4 | All passing |

Test cases: 401 unauthenticated, instructor_id scoping verification, empty array when no students, endorsement_count enrichment with count per student.

---

## Commits

| Hash | Type | Description |
|------|------|-------------|
| f50cf0b | feat | Student roster API endpoint with endorsement counts and tests |
| d9b330f | feat | Student roster page with table, empty state, and accessibility |

---

## Deviations from Plan

None — plan executed exactly as written. The shadcn Table component is referenced in the plan but the codebase established in 03-01 that shadcn components are not installed; plain Tailwind table was used consistent with that established pattern (same as CFI dashboard page).

---

## Known Stubs

None — all data sources are wired. The roster page fetches from `/api/cfi/students` and renders real data. Hours and endorsement counts display 0.0 / 0 as neutral defaults when null, not as placeholder text.

---

## Threat Surface

Threat mitigations T-03-04 and T-03-07 from the plan's threat model are both implemented:
- T-03-04: `.eq('instructor_id', user.id)` in the query ensures information disclosure isolation
- T-03-07: `requireCFI(request)` uses `getUser()` (server-verified JWT) not session cookie

No new threat surface introduced beyond what was modeled in the plan.

---

## Self-Check: PASSED

- app/api/cfi/students/route.ts: FOUND
- app/api/cfi/students/__tests__/route.test.ts: FOUND
- app/cfi/students/page.tsx: FOUND
- Commit f50cf0b: FOUND (feat(03-02): student roster API endpoint...)
- Commit d9b330f: FOUND (feat(03-02): student roster page...)
