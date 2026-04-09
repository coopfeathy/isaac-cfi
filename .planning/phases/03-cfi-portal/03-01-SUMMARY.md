---
phase: 03-cfi-portal
plan: "01"
subsystem: cfi-portal
tags: [cfi, auth, availability, schedule, schema, rls]
dependency_graph:
  requires: [lib/auth.ts]
  provides: [app/cfi/**, app/api/cfi/**, supabase/SETUP.sql Phase3 migrations]
  affects: [lib/types/calendar.ts, app/contexts/AuthContext.tsx, lib/__tests__/availability-engine.test.ts]
tech_stack:
  added: []
  patterns: [requireCFI layout guard via createServerClient, two-step instructor_id booking query, CFI-scoped CRUD with double .eq ownership check]
key_files:
  created:
    - lib/auth.ts
    - app/cfi/layout.tsx
    - app/cfi/page.tsx
    - app/cfi/availability/page.tsx
    - app/components/CFIPageShell.tsx
    - app/components/CFITopNav.tsx
    - app/api/cfi/schedule/route.ts
    - app/api/cfi/availability/route.ts
    - app/api/cfi/schedule/__tests__/route.test.ts
    - app/api/cfi/availability/__tests__/route.test.ts
    - app/cfi/__tests__/layout.test.tsx
  modified:
    - supabase/SETUP.sql
    - lib/types/calendar.ts
    - app/contexts/AuthContext.tsx
    - lib/__tests__/availability-engine.test.ts
decisions:
  - "CFI layout guard uses createServerClient (server component pattern) rather than requireCFI(NextRequest) — layout has no NextRequest, uses cookies-based Supabase session"
  - "Admin users can access /cfi (admin is superset of CFI per D-02) — checked via is_admin flag in layout guard"
  - "DELETE accepts id from URL search params (primary) or body (fallback) for REST ergonomics"
  - "lib/auth.ts created as prerequisite — Phase 1 plan 01-01 shipped it but worktree was branched from main before that merge; auto-fixed per Rule 3"
metrics:
  duration: ~45 minutes
  completed: 2026-04-08
  tasks_completed: 3
  files_created: 11
  files_modified: 4
requirements:
  - CFI-01
  - CFI-02
  - CFI-03
  - CFI-07
---

# Phase 3 Plan 01: CFI Portal Foundation Summary

**One-liner:** CFI zone with server-side auth guard, schedule view, and CRUD availability editor, all scoped to per-instructor ownership via `instructor_id` with Phase 3 schema migrations.

---

## What Was Built

### Schema Migrations (appended to supabase/SETUP.sql)

1. `instructor_availability.instructor_id` — UUID FK to auth.users, backfilled to primary admin, RLS policy for CFI self-management
2. `students.instructor_id` — UUID FK to auth.users, RLS policy for CFI read of own students
3. `student_lesson_completions.syllabus_lesson_id` — made nullable for flight log use
4. `student_endorsements` — new table with CHECK constraint on endorsement_type, three RLS policies (admin ALL, CFI INSERT for own students, student SELECT own)

### Type and Context Updates

- `InstructorAvailability` interface — added `instructor_id: string` field
- `AuthContextType` + `AuthProvider` — added `isCFI: boolean` (DB-only, no email fallback, admin is superset)

### CFI Zone Infrastructure

- `app/cfi/layout.tsx` — server component using `createServerClient` + `cookies()`. Redirects unauthenticated → `/login`, non-CFI authenticated → `/dashboard`. Admin passes (is_admin OR is_instructor).
- `app/components/CFIPageShell.tsx` — page shell with "CFI Workspace" eyebrow (`text-[#9A7A17]`), `font-semibold` h1, same structural pattern as AdminPageShell
- `app/components/CFITopNav.tsx` — sidebar nav with Schedule/My Students/Availability/Flight Log, lucide-react icons, active/inactive/hover states per UI-SPEC, "Back to Admin" link visible when `isAdmin`

### CFI Dashboard + Schedule API

- `app/cfi/page.tsx` — schedule table with loading skeletons (5 rows at 48px), empty state, error state, "Log Hours" and "Log Endorsement" buttons using `bg-golden`
- `app/api/cfi/schedule/route.ts` — two-step query: (1) `students WHERE instructor_id = user.id`, (2) `bookings WHERE user_id IN studentIds AND status IN ['pending','confirmed','completed'] AND start_time within 7-day window`. Returns enriched array with `student_name`.

### Availability CRUD API + Editor

- `app/api/cfi/availability/route.ts` — GET/POST/PATCH/DELETE all scoped with `.eq('instructor_id', user.id)`. POST validates `isValidTime()` (HH:MM) and checks overlap. PATCH uses double-scope (id + instructor_id). DELETE accepts id from URL params or body, returns 204.
- `app/cfi/availability/page.tsx` — weekly editor showing 7 days, per-day existing blocks with activate/deactivate/remove, add form with time inputs, saving state, error handling, bg-golden buttons.

### Availability Engine (no change needed)

Verified `computeWeekAvailability` query does NOT filter by `instructor_id` — it already unions all active CFI templates naturally. Added two passing multi-CFI union tests to confirm this behavior.

---

## Tests

| File | Tests | Status |
|------|-------|--------|
| app/api/cfi/schedule/__tests__/route.test.ts | 4 | All passing |
| app/api/cfi/availability/__tests__/route.test.ts | 7 | All passing |
| lib/__tests__/availability-engine.test.ts | 17 (2 new) | All passing |
| app/cfi/__tests__/layout.test.tsx | 2 | Stubs (layout is server component, tested via integration) |

---

## Commits

| Hash | Type | Description |
|------|------|-------------|
| a3e7f18 | feat | Schema migrations, type updates, AuthContext isCFI, Wave 0 test stubs |
| 3847434 | feat | CFI zone layout guard, page shell, nav, dashboard page, and schedule API |
| 25ff5a7 | feat | Availability CRUD API, availability editor page, multi-CFI union tests |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created lib/auth.ts prerequisite**
- **Found during:** Task 2 pre-flight check
- **Issue:** `lib/auth.ts` (with `requireCFI`) was not present in this worktree branch. The worktree was branched from commit `482fe17` which predates the Phase 1 commit that created `lib/auth.ts`.
- **Fix:** Created `lib/auth.ts` with `requireAdmin`, `requireCFI`, and `requireUser` — identical to the Phase 1 implementation (sourced from `git show 3935eac:lib/auth.ts`).
- **Files modified:** `lib/auth.ts` (created)
- **Commit:** a3e7f18

**2. [Rule 1 - Bug] CFI layout uses createServerClient instead of requireCFI(NextRequest)**
- **Found during:** Task 2 implementation
- **Issue:** The plan's layout spec shows `await requireCFI()` with no argument, but the actual `requireCFI` signature requires a `NextRequest`. Server component layouts don't have a `NextRequest` — they use `cookies()`.
- **Fix:** Implemented layout guard using `createServerClient` + `cookies()` from `@supabase/ssr` (already used in `app/auth/callback/route.ts`). Performs equivalent auth check: redirects unauthenticated → `/login`, non-CFI/non-admin → `/dashboard`.
- **Files modified:** `app/cfi/layout.tsx`
- **Commit:** 3847434

**3. [Auto] Shadcn components not installed**
- **Found during:** Task 2 implementation
- **Issue:** Plan references shadcn `Button`, `Table`, `Badge`, `Skeleton` components but `components/ui/` directory doesn't exist and no Radix dependencies are installed.
- **Fix:** Used plain Tailwind + HTML matching the existing admin zone pattern (AdminLanding, AdminTopNav use the same approach). Visual identity (colors, spacing, states) matches UI-SPEC.
- **Files affected:** app/cfi/page.tsx, app/cfi/availability/page.tsx

---

## Known Stubs

None — all data sources are wired. The availability editor fetches from `/api/cfi/availability`, the schedule page fetches from `/api/cfi/schedule`. No hardcoded empty values flow to UI rendering.

---

## Self-Check: PASSED

All 11 created files confirmed present on disk. All 3 task commits confirmed in git log.
