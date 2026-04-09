# Phase 3: CFI Portal - Research

**Researched:** 2026-04-08
**Domain:** Next.js App Router authenticated zone, Supabase RLS, multi-CFI availability engine
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Add `instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL` to the `students` table.
**D-02:** Only admin can set/change `instructor_id` on a student record. CFI portal is read-only for the roster.
**D-03:** Add an RLS policy so a CFI can SELECT from `students` WHERE `instructor_id = auth.uid()`.
**D-04:** Schedule view joins `bookings` → `students` via `user_id` → filters on `students.instructor_id`.
**D-05:** Default schedule window: today through next 7 days. Show `pending`, `confirmed`, `completed` bookings.
**D-06:** CFI only sees bookings for their own students. Admin sees all (unchanged).
**D-07:** Add `instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` to `instructor_availability` table.
**D-08:** Migrate existing `instructor_availability` rows (no `instructor_id`) to the admin/owner user via backfill migration.
**D-09:** CFI portal availability editor scoped to calling user's `instructor_id`. API enforces `requireCFI()` + user filter.
**D-10:** Date-specific availability overrides remain admin-managed in Phase 3. Weekly template only for CFIs.
**D-11:** Update `lib/availability-engine.ts` to union availability across all active CFIs. A slot is available if ANY active CFI's template covers it.
**D-12:** "Active CFI" = `profiles.is_instructor = true` (no separate `is_active` flag currently exists in schema).
**D-13:** Flight hour logging: (1) insert into `student_lesson_completions` with `instructor_id`, `student_id`, `completed_at`, `notes`; (2) increment `students.dual_hours` and `students.total_hours`.
**D-14:** Logging form fields: student (picker from roster), hours flown (decimal), date, free-text notes (optional).
**D-15:** Create `student_endorsements` table: `id UUID PK`, `student_id UUID FK auth.users`, `instructor_id UUID FK auth.users`, `endorsement_type TEXT`, `endorsed_at TIMESTAMPTZ DEFAULT NOW()`, `notes TEXT`.
**D-16:** `endorsement_type` constrained to: `solo`, `xc_solo`, `night_solo`, `checkride_prep`, `instrument_proficiency_check`, `flight_review`, `other`.
**D-17:** CFI UI: dropdown of predefined types + notes field. `other` allows free text in notes.
**D-18:** RLS: CFI can INSERT into `student_endorsements` for students where `instructor_id = auth.uid()`. Students can SELECT their own endorsements. Admins have full access.
**D-19:** `/cfi` zone uses `requireCFI()` from `lib/auth.ts` (Phase 1 deliverable). Layout guard is a server component that redirects non-CFI users.
**D-20:** `AuthContext` needs `is_instructor` exposed alongside `isAdmin`.
**D-21:** Admin users can also access `/cfi` (CFI-07). `requireCFI()` already allows this per Phase 1 D-02.

### Claude's Discretion

- Exact tab/page structure within `/cfi` (route segments chosen per UI-SPEC)
- Whether to create a `CFIPageShell` or reuse `AdminPageShell` (UI-SPEC: create separate `CFIPageShell`)
- Navigation links to/from `/cfi` vs `/admin`
- Precise column selection and ordering in the student roster table
- Empty-state design for each section
- Loading skeleton approach per page/tab

### Deferred Ideas (OUT OF SCOPE)

- Date-specific availability overrides per CFI
- CFI messaging students directly (CFI-V2-01)
- CFI viewing full syllabus progress / marking curriculum items complete (CFI-V2-02)
- Multi-CFI slot conflict detection
- Availability engine: intersection/per-CFI filter mode
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CFI-01 | User with `is_instructor = true` can access `/cfi`; non-instructor/non-admin redirected away | `requireCFI()` layout guard in server component layout; D-19/D-21 |
| CFI-02 | CFI can view their upcoming lesson schedule | Schedule query (D-04/D-05/D-06); RLS on students + bookings |
| CFI-03 | CFI can set and edit their weekly availability template | `instructor_availability` schema migration (D-07/D-08/D-09); new `/api/cfi/availability` endpoint |
| CFI-04 | CFI can view their full student roster | `instructor_id` FK on `students` (D-01); RLS policy (D-03) |
| CFI-05 | CFI can log flight hours for a student/lesson | `student_lesson_completions` INSERT + `students` hour increment (D-13/D-14) |
| CFI-06 | CFI can log endorsements and training milestones per student | New `student_endorsements` table (D-15 through D-18) |
| CFI-07 | Admin users can also access the CFI portal | `requireCFI()` already passes admin; D-21 |
</phase_requirements>

---

## Summary

Phase 3 builds a dedicated `/cfi` authenticated zone on top of the existing Next.js App Router + Supabase stack. The zone is structurally parallel to `/admin` — same warm-amber design language, same sidebar nav pattern, same server-component layout guard — but scoped to instructor-specific data and actions.

The most technically complex piece is the **availability engine union change** (D-11). Currently `computeWeekAvailability()` queries `instructor_availability` with no `instructor_id` filter. After this phase, each row must belong to a specific CFI and the engine must UNION all active CFI templates. This is load-bearing for the student-facing booking flow and requires the existing tests in `lib/__tests__/availability-engine.test.ts` to be extended.

The second complex piece is the **schema delta**: three DDL operations (`instructor_id` on `students`, `instructor_id` on `instructor_availability`, new `student_endorsements` table) plus three new RLS policies, all expressed as Supabase SQL migrations appended to `SETUP.sql`.

All UI is assembled from already-installed shadcn components (Button, Table, Badge, Select, Textarea, Dialog, Skeleton, Label, Input). No new packages are required.

**Primary recommendation:** Build schema migrations first (Wave 0 of plan 03-01), then the `requireCFI()` guard + layout, then features in dependency order. Test the availability engine change in isolation with unit tests before wiring it into the live endpoint.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | `^16.1.6` | Route segments, server components, layout guards | Project standard [VERIFIED: package.json] |
| `@supabase/supabase-js` | `^2.38.0` | DB queries, auth, RLS | Project standard [VERIFIED: package.json] |
| `@supabase/ssr` | `^0.9.0` | Server-side session handling in layout guards | Project standard [VERIFIED: package.json] |
| shadcn/ui (new-york/neutral) | see components.json | All UI components | Project standard [VERIFIED: UI-SPEC.md] |
| lucide-react | installed via shadcn | Icons | Project standard [VERIFIED: UI-SPEC.md] |
| TypeScript 5.9 | `5.9.3` | Type safety | Project standard [VERIFIED: package.json] |
| Tailwind CSS | `^3.3.2` | Styling | Project standard [VERIFIED: package.json] |

### Test Infrastructure (already installed)

| Library | Version | Purpose |
|---------|---------|---------|
| Jest | `^30.3.0` | Test runner [VERIFIED: package.json] |
| ts-jest | `^29.4.9` | TypeScript transform [VERIFIED: package.json] |
| `@types/jest` | `^30.0.0` | Type definitions [VERIFIED: package.json] |

**Installation:** No new packages required. All dependencies present.

**shadcn components required (check if installed):**
```bash
# These must exist before implementation begins:
# Button, Table, Badge, Select, Textarea, Dialog, Skeleton, Label, Input
# If any are missing, add them:
npx shadcn@latest add button table badge select textarea dialog skeleton label input
```

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── cfi/
│   ├── layout.tsx             # Server component — calls requireCFI(), renders CFITopNav
│   ├── page.tsx               # /cfi dashboard — upcoming schedule + quick actions
│   ├── students/
│   │   └── page.tsx           # /cfi/students — student roster
│   ├── availability/
│   │   └── page.tsx           # /cfi/availability — weekly template editor
│   └── log/
│       └── page.tsx           # /cfi/log — flight hours + endorsements
├── components/
│   ├── CFIPageShell.tsx        # Separate from AdminPageShell — eyebrow "CFI Workspace"
│   └── CFITopNav.tsx           # Separate from AdminTopNav — CFI nav sections only
app/api/cfi/
│   ├── schedule/route.ts       # GET — bookings for this CFI's students
│   ├── students/route.ts       # GET — roster for this CFI
│   ├── availability/route.ts   # GET/POST/PATCH/DELETE — CFI-scoped availability
│   ├── flight-log/route.ts     # POST — log hours + increment student.dual_hours/total_hours
│   └── endorsements/route.ts  # POST — insert student_endorsements row
supabase/
│   └── SETUP.sql               # Append migration blocks for new schema
lib/
│   ├── availability-engine.ts  # Modify computeWeekAvailability() for multi-CFI union
│   └── types/calendar.ts       # Add instructor_id to InstructorAvailability type
```

### Pattern 1: Server-Component Layout Guard

The layout guard follows the same pattern as the planned `requireCFI()` from Phase 1. Since `lib/auth.ts` does not yet exist (it is Phase 1's deliverable), Phase 3 must depend on Phase 1 shipping first.

```typescript
// app/cfi/layout.tsx — SERVER COMPONENT
// Source: CONTEXT.md D-19, mirrors Phase 1 requireAdmin() pattern
import { requireCFI } from '@/lib/auth'

export default async function CFILayout({ children }: { children: React.ReactNode }) {
  await requireCFI() // throws redirect on non-CFI, non-admin
  return (
    <div className="min-h-screen bg-slate-50">
      <CFITopNav />
      <main>{children}</main>
    </div>
  )
}
```

**Key constraint:** The layout is an async server component. `requireCFI()` uses `@supabase/ssr` `getUser()` (not `getSession()`), per SEC-03.

### Pattern 2: CFI-Scoped API Route (mirrors admin availability pattern)

```typescript
// app/api/cfi/availability/route.ts
// Source: app/api/admin/availability/route.ts — same structure, scoped to CFI
import { requireCFI } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { user } = await requireCFI(request)  // returns calling user
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('instructor_availability')
    .select('*')
    .eq('instructor_id', user.id)  // scoped to THIS CFI
    .order('day_of_week')
    .order('start_time')
  // ...
}
```

The existing `app/api/admin/availability/route.ts` is the direct pattern reference — same validation helpers (`isValidTime`), same overlap check, same error response shape — with `instructor_id = user.id` added to all queries.

### Pattern 3: Multi-CFI Availability Engine Union

The current `computeWeekAvailability()` queries `instructor_availability` with `.eq('is_active', true)` and no `instructor_id` filter. After Phase 3 the table has an `instructor_id` column on every row.

The function signature and `computeAvailabilityFromData()` (the pure function) do not change. Only the DB fetch changes:

```typescript
// lib/availability-engine.ts — modified fetch
const [templateRes, ...] = await Promise.all([
  db
    .from('instructor_availability')
    .select('day_of_week, start_time, end_time')
    .eq('is_active', true),
  // instructor_id filter removed — fetch ALL active CFI templates
  // The union is already implicit: computeAvailabilityFromData
  // treats multiple rows for the same day_of_week as additive ranges
  ...
])
```

**Critical insight:** `computeAvailabilityFromData()` already unions multiple template rows per day. Two rows for day_of_week=1 (Monday) produce two `dayRanges` entries that are both included. The "union across CFIs" behavior is already correct as long as all rows are fetched. The only engine change required is removing any per-instructor filter that might be added during Phase 3 work.

### Pattern 4: AuthContext `is_instructor` Extension

```typescript
// app/contexts/AuthContext.tsx — add is_instructor
interface AuthContextType {
  // ... existing fields
  isAdmin: boolean
  isCFI: boolean  // ADD THIS
}

// In AuthProvider:
const isCFI = Boolean(profile?.is_instructor) || isAdmin // admin is superset of CFI
const value = { ..., isAdmin, isCFI }
```

Note: The current `AuthContext` uses `profile?.is_admin` directly. The same pattern applies for `is_instructor`. No changes to the profile fetch query are needed — `select('*')` already returns `is_instructor`.

### Pattern 5: Schedule Query (D-04)

The CFI schedule view cannot use a simple `bookings.instructor_id` filter because bookings do not have a direct instructor FK. The join is two hops:

```typescript
// app/api/cfi/schedule/route.ts
// bookings → students (via bookings.user_id = students.user_id) → filter students.instructor_id
const { data, error } = await db
  .from('bookings')
  .select(`
    id, status, notes, created_at,
    slots!inner(start_time, end_time, type),
    students!inner(full_name, email, instructor_id)
  `)
  .eq('students.instructor_id', user.id)
  .in('status', ['pending', 'confirmed', 'completed'])
  .gte('slots.start_time', todayISO)
  .lte('slots.start_time', sevenDaysISO)
  .order('slots.start_time', { ascending: true })
```

**Caveat:** Supabase PostgREST join syntax for filtering on related tables uses the `!inner` join modifier. Verify exact Supabase PostgREST syntax for nested `.eq()` filters. The alternative is a two-step query: first get student IDs for this CFI, then query bookings by `user_id IN (student_user_ids)`. [ASSUMED: the one-query approach works with PostgREST; the two-step approach is safer if not confirmed]

### Anti-Patterns to Avoid

- **Using `getSession()` in layout guards:** Always use `getUser()` per SEC-03. `getSession()` does not validate the token server-side.
- **Inline requireCFI copies in API routes:** Phase 1's `lib/auth.ts` must be the single source. Do not copy the guard logic.
- **Forgetting `!inner` on PostgREST joins:** Without `!inner`, related-table filters return NULLs instead of filtering rows.
- **Incrementing hours in application code without atomicity:** Use Supabase RPC or a Postgres function for the `students.dual_hours += X` increment to avoid race conditions if two requests arrive simultaneously.
- **Backfill migration runs after schema migration:** The `ADD COLUMN IF NOT EXISTS instructor_id` on `instructor_availability` must run before the backfill UPDATE. Order matters in SETUP.sql.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time zone-aware time arithmetic | Custom DST math | Existing `localTimeToUTC()` + `getTimezoneOffsetMinutes()` in `lib/availability-engine.ts` | Already handles EST/EDT transitions correctly |
| Overlap detection for availability slots | Custom range comparison | Existing `subtractRanges()` in `lib/availability-engine.ts` | Battle-tested, has unit tests |
| Auth guard boilerplate | Inline session checks per route | `requireCFI()` from `lib/auth.ts` (Phase 1) | Single source, consistent 401/403 responses |
| UI component primitives | Custom modal/table/badge | shadcn Dialog, Table, Badge (already installed) | Radix accessible primitives + project style |
| Hours increment atomicity | Read-then-write in JS | Postgres `UPDATE students SET dual_hours = dual_hours + $1` (atomic server-side increment) | Avoids race condition when concurrent writes happen |

---

## Schema Delta (what must be built)

This is the most load-bearing part of the research — three DDL operations, three RLS additions, one backfill.

### Migration 1: `students.instructor_id`

```sql
-- Append to SETUP.sql
ALTER TABLE students ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- RLS: CFI can read their own students
DROP POLICY IF EXISTS "CFIs can view their own students" ON students;
CREATE POLICY "CFIs can view their own students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_instructor = true
    )
    AND instructor_id = auth.uid()
  );
```

### Migration 2: `instructor_availability.instructor_id`

```sql
ALTER TABLE instructor_availability ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill: assign all existing rows to the admin/owner user
-- This must be run AFTER the column is added and BEFORE CFI rows are inserted
-- The admin user ID must be provided by Isaac or discovered from profiles WHERE is_admin = true LIMIT 1
-- Option A (hardcoded): UPDATE instructor_availability SET instructor_id = '<admin-uuid>' WHERE instructor_id IS NULL;
-- Option B (query): UPDATE instructor_availability SET instructor_id = (SELECT id FROM profiles WHERE is_admin = true LIMIT 1) WHERE instructor_id IS NULL;

-- RLS: CFI can read/write their own rows
DROP POLICY IF EXISTS "CFIs can manage their own availability" ON instructor_availability;
CREATE POLICY "CFIs can manage their own availability"
  ON instructor_availability FOR ALL
  USING (
    instructor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_instructor = true)
  )
  WITH CHECK (
    instructor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_instructor = true)
  );
```

**Note on backfill:** The admin user performing the backfill needs to be identified. Using `SELECT id FROM profiles WHERE is_admin = true LIMIT 1` is safe for a single-admin system like Merlin. [ASSUMED: only one admin exists; if multiple admins exist, needs clarification]

### Migration 3: `student_endorsements` (new table)

```sql
CREATE TABLE IF NOT EXISTS student_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  endorsement_type TEXT NOT NULL CHECK (endorsement_type IN (
    'solo', 'xc_solo', 'night_solo', 'checkride_prep',
    'instrument_proficiency_check', 'flight_review', 'other'
  )),
  endorsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE student_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage endorsements" ON student_endorsements;
DROP POLICY IF EXISTS "CFIs insert endorsements for their students" ON student_endorsements;
DROP POLICY IF EXISTS "Students view their own endorsements" ON student_endorsements;

CREATE POLICY "Admins manage endorsements"
  ON student_endorsements FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "CFIs insert endorsements for their students"
  ON student_endorsements FOR INSERT
  WITH CHECK (
    instructor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_instructor = true)
    AND EXISTS (SELECT 1 FROM students WHERE students.user_id = student_id AND students.instructor_id = auth.uid())
  );

CREATE POLICY "Students view their own endorsements"
  ON student_endorsements FOR SELECT
  USING (student_id = auth.uid());
```

### `student_lesson_completions` — existing table, no DDL change needed

The existing `student_lesson_completions` table already has `instructor_id`, `student_id`, `completed_at`, `notes` fields and instructor RLS policies. [VERIFIED: SETUP.sql lines 1847-1879]

**D-13 deviation from existing schema:** The context says "insert a new row" plus increment hours. The existing table has `syllabus_lesson_id NOT NULL` — a required FK. The Phase 3 flight log form may not always have a `syllabus_lesson_id` (the CFI is logging hours for a lesson, not necessarily a syllabus item).

**Resolution options:**
1. Make `syllabus_lesson_id` nullable via `ALTER TABLE student_lesson_completions ALTER COLUMN syllabus_lesson_id DROP NOT NULL` — cleanest for Phase 3 use
2. Create a separate `flight_hour_logs` table — avoids touching existing schema

[ASSUMED: Option 1 is preferred per D-13 intent; confirm with Isaac if this ALTER is acceptable before executing]

---

## Common Pitfalls

### Pitfall 1: `student_lesson_completions.syllabus_lesson_id` is NOT NULL

**What goes wrong:** The CFI flight log form submits without a `syllabus_lesson_id`. INSERT fails with constraint violation.
**Why it happens:** The table was designed for syllabus-linked completions, not free-form flight hour logging.
**How to avoid:** Either run `ALTER TABLE student_lesson_completions ALTER COLUMN syllabus_lesson_id DROP NOT NULL` in the migration, or accept NULL via that ALTER before inserting. Alternatively use a separate `flight_hour_logs` table.
**Warning signs:** 500 errors on flight log POST with `null value in column syllabus_lesson_id violates not-null constraint`.

### Pitfall 2: Availability engine breaks if `instructor_id` is nullable after column add

**What goes wrong:** After adding `instructor_id` to `instructor_availability`, existing rows have `instructor_id = NULL`. If the engine adds a filter on `instructor_id IS NOT NULL`, the old (backfilled) rows disappear from the union.
**Why it happens:** Migration runs but backfill hasn't executed yet — or backfill skipped.
**How to avoid:** Run backfill in the same migration transaction as the column add. Verify with `SELECT COUNT(*) FROM instructor_availability WHERE instructor_id IS NULL` = 0 before marking migration complete.
**Warning signs:** Student-facing slot picker shows no available times after migration.

### Pitfall 3: `requireCFI()` not yet available (Phase 1 not shipped)

**What goes wrong:** Phase 3 implementation begins before Phase 1 ships `lib/auth.ts`. Import fails or layouts use a stale local copy.
**Why it happens:** Phase ordering dependency. `lib/auth.ts` does not currently exist in the repo. [VERIFIED: file not found at lib/auth.ts]
**How to avoid:** Do not start plan 03-01 until `lib/auth.ts` with `requireCFI()` is confirmed merged. The planner should include a pre-flight check.
**Warning signs:** `Module not found: Can't resolve '@/lib/auth'` at build time.

### Pitfall 4: AuthContext `isAdmin` email-fallback carries security risk

**What goes wrong:** The current `AuthContext` has an `NEXT_PUBLIC_ADMIN_EMAIL` email-based admin fallback (lines 106-108 of AuthContext.tsx). This is a Phase 1 SEC-06 issue. When adding `isCFI`, do not use a similar email fallback for the instructor role — it would be a client-side bypass.
**Why it happens:** Copy-paste from `isAdmin` pattern.
**How to avoid:** `isCFI` must only derive from `profile?.is_instructor` (DB-backed) or `isAdmin`. No email env var fallback.

### Pitfall 5: PostgREST nested filter syntax for schedule query

**What goes wrong:** Filtering `bookings` where `students.instructor_id = auth.uid()` via a Supabase join query may not work as expected with the anon/authenticated client — RLS on `students` may prevent the join from returning rows even though the CFI has a policy.
**Why it happens:** The new CFI SELECT policy on `students` only grants access to rows where `instructor_id = auth.uid()`. The PostgREST join uses the same credentials, so it will work — but only if the RLS policy is in place before the query runs.
**How to avoid:** Alternatively, do a two-step query: (1) fetch `student.user_id` list for this CFI from `students`; (2) query `bookings WHERE user_id IN (...)`. This is explicit and easier to test.
**Warning signs:** Empty schedule even when bookings exist.

### Pitfall 6: Admin users get wrong availability when editing in CFI portal

**What goes wrong:** An admin user accessing `/cfi/availability` sees and edits only rows where `instructor_id = auth.uid()`. If the admin's own `instructor_id` was set during backfill, this works. But if the admin is not in `instructor_availability` at all, they see an empty editor.
**Why it happens:** `requireCFI()` allows admins, but the availability API filters by `instructor_id = user.id`.
**How to avoid:** The availability endpoint must detect admin role and behave accordingly, or document that admin availability editing remains on `/admin` (per D-10, overrides stay admin-managed; template editing for the admin-as-instructor belongs in CFI portal only for their own rows).

---

## Code Examples

### CFIPageShell — derived from AdminPageShell

```typescript
// app/components/CFIPageShell.tsx
// Source: app/components/AdminPageShell.tsx — identical structure, different eyebrow
import Link from 'next/link'

type CFILink = { href: string; label: string }

export default function CFIPageShell({
  title,
  description,
  backLinks = [],
  actions,
  maxWidthClassName = 'max-w-6xl',
  children,
}: {
  title: string
  description?: string
  backLinks?: CFILink[]
  actions?: React.ReactNode
  maxWidthClassName?: string
  children: React.ReactNode
}) {
  return (
    <div className="px-4 py-10">
      <div className={`mx-auto ${maxWidthClassName}`}>
        {backLinks.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {backLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                ← {link.label}
              </Link>
            ))}
          </div>
        )}
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            {/* Eyebrow: "CFI Workspace" in golden — matches AdminPageShell pattern with different label */}
            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-[#9A7A17]">CFI Workspace</p>
            <h1 className="text-3xl font-semibold text-darkText">{title}</h1>
            {description && <p className="mt-2 max-w-2xl text-slate-600">{description}</p>}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  )
}
```

Note the UI-SPEC specifies `font-semibold` (600) for headings, whereas `AdminPageShell` uses `font-bold`. Follow the UI-SPEC. [VERIFIED: UI-SPEC.md Typography table]

### Availability Engine — Multi-CFI union change

```typescript
// lib/availability-engine.ts — modified computeWeekAvailability()
// The ONLY change is removing the (currently absent) instructor_id filter.
// After migration, all active CFI rows are fetched; computeAvailabilityFromData
// naturally unions them because multiple rows for the same day_of_week are additive.
const [templateRes, overridesRes, busyRes] = await Promise.all([
  db
    .from('instructor_availability')
    .select('day_of_week, start_time, end_time')
    .eq('is_active', true),
  // No instructor_id filter here — union of ALL active CFIs
  ...
])
```

### `InstructorAvailability` type update

```typescript
// lib/types/calendar.ts — add instructor_id
export interface InstructorAvailability {
  id: string
  instructor_id: string  // ADD THIS
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

### AuthContext `isCFI` addition

```typescript
// app/contexts/AuthContext.tsx
interface AuthContextType {
  // ... existing
  isAdmin: boolean
  isCFI: boolean  // ADD
}

// In component body:
const isCFI = Boolean(profile?.is_instructor) || isAdmin
const value = { ..., isAdmin, isCFI }
```

---

## Runtime State Inventory

> This section applies because Phase 3 adds `instructor_id` to `instructor_availability` — a schema change that affects existing rows.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `instructor_availability` rows with `instructor_id = NULL` after column add | Backfill migration: `UPDATE instructor_availability SET instructor_id = (SELECT id FROM profiles WHERE is_admin = true LIMIT 1) WHERE instructor_id IS NULL` |
| Live service config | None — no external service stores availability config outside the DB | None |
| OS-registered state | None | None |
| Secrets/env vars | None — no env var rename involved | None |
| Build artifacts | None — no compiled assets reference instructor_availability | None |

**Nothing found in other categories** — verified by schema grep and codebase search.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev server | Assumed present | Unknown | — |
| Jest | Unit tests | Yes | `^30.3.0` [VERIFIED: package.json] | — |
| ts-jest | TypeScript test transform | Yes | `^29.4.9` [VERIFIED: package.json] | — |
| Supabase project | All DB operations | Assumed active | — | — |
| `lib/auth.ts` | Layout guard, all API routes | NOT PRESENT [VERIFIED: file not found] | — | Phase 3 blocked until Phase 1 ships |

**Missing dependencies with no fallback:**
- `lib/auth.ts` (Phase 1 deliverable) — Phase 3 cannot start without it. Plans must include a pre-flight assertion that `lib/auth.ts` exports `requireCFI()`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30 + ts-jest 29 [VERIFIED: package.json] |
| Config file | `jest.config.js` in project root [VERIFIED] |
| Quick run command | `npx jest --testPathPattern="cfi" --no-coverage` |
| Full suite command | `npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CFI-01 | Non-CFI user hitting `/cfi` is redirected | unit (layout guard) | `npx jest --testPathPattern="cfi/layout"` | No — Wave 0 |
| CFI-02 | Schedule query returns only this CFI's student bookings | unit (API route) | `npx jest --testPathPattern="cfi/schedule"` | No — Wave 0 |
| CFI-03 | Availability CRUD is scoped to instructor_id = caller | unit (API route) | `npx jest --testPathPattern="cfi/availability"` | No — Wave 0 |
| CFI-04 | Roster query returns only students where instructor_id = caller | unit (API route) | `npx jest --testPathPattern="cfi/students"` | No — Wave 0 |
| CFI-05 | Flight log POST inserts completion and increments hours | unit (API route) | `npx jest --testPathPattern="cfi/flight-log"` | No — Wave 0 |
| CFI-06 | Endorsement POST inserts for student owned by CFI | unit (API route) | `npx jest --testPathPattern="cfi/endorsements"` | No — Wave 0 |
| CFI-07 | Admin user can call `requireCFI()` and access CFI zone | unit (auth) | covered in CFI-01 test | No — Wave 0 |
| D-11 | Availability engine unions all active CFI templates | unit (pure function) | `npx jest --testPathPattern="availability-engine"` | Yes (`lib/__tests__/availability-engine.test.ts`) — extend |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern="cfi" --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `app/api/cfi/schedule/__tests__/route.test.ts` — covers CFI-02
- [ ] `app/api/cfi/students/__tests__/route.test.ts` — covers CFI-04
- [ ] `app/api/cfi/availability/__tests__/route.test.ts` — covers CFI-03
- [ ] `app/api/cfi/flight-log/__tests__/route.test.ts` — covers CFI-05
- [ ] `app/api/cfi/endorsements/__tests__/route.test.ts` — covers CFI-06
- [ ] Extend `lib/__tests__/availability-engine.test.ts` — covers D-11 multi-CFI union

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `requireCFI()` from `lib/auth.ts` using `@supabase/ssr` `getUser()` (not getSession) — per SEC-03 |
| V3 Session Management | Yes | Handled by `@supabase/ssr` middleware (existing, Phase 1) |
| V4 Access Control | Yes | RLS policies on students, instructor_availability, student_endorsements, student_lesson_completions |
| V5 Input Validation | Yes | API routes validate time format (`isValidTime`), decimal hours range, endorsement_type CHECK constraint in Postgres |
| V6 Cryptography | No | No new cryptographic operations |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CFI accessing another CFI's students | Spoofing / Info Disclosure | RLS policy: `instructor_id = auth.uid()` — server-enforced, not client |
| CFI logging hours for a student not in their roster | Tampering | API route validates student is in CFI's roster before INSERT; RLS INSERT policy on `student_endorsements` double-checks |
| Race condition on hours increment | Tampering | Use atomic Postgres `UPDATE ... SET dual_hours = dual_hours + $1` not read-then-write |
| Admin email env var bypass for `isCFI` | Elevation of Privilege | Do not add email fallback to `isCFI` — DB-only derivation |
| Server component using `getSession()` | Spoofing | Always use `getUser()` from `@supabase/ssr` in server components per SEC-03 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Two-step schedule query is safer than single PostgREST join with nested filter | Architecture Patterns, Pitfall 5 | Minor: one-query approach may work; extra round-trip in two-step |
| A2 | Only one admin exists; backfill uses `LIMIT 1` to find owner of old availability rows | Schema Delta Migration 2 | Medium: if multiple admins exist, rows assigned to wrong admin; clarify with Isaac |
| A3 | `student_lesson_completions.syllabus_lesson_id` should be made nullable for Phase 3 | Schema Delta, Pitfall 1 | Medium: if left NOT NULL, flight log form needs a fake/null syllabus_lesson_id workaround |
| A4 | `lib/auth.ts` exports `requireCFI(request: NextRequest)` that returns `{ user }` | Architecture Patterns | HIGH: if Phase 1's API is different, all CFI API routes need to be updated |

---

## Open Questions (RESOLVED)

1. **`student_lesson_completions.syllabus_lesson_id` nullability** — RESOLVED: Plan 03-01 Task 1 uses `ALTER TABLE student_lesson_completions ALTER COLUMN syllabus_lesson_id DROP NOT NULL`. Reuses existing table; no new `flight_hour_logs` table created.

2. **Backfill migration: which admin user owns existing availability rows** — RESOLVED: Plan 03-01 Task 1 uses dynamic subquery `SELECT id FROM profiles WHERE is_admin = true ORDER BY created_at ASC LIMIT 1`. Isaac verifies in Supabase SQL editor before executing.

3. **Phase 1 `requireCFI()` API contract** — RESOLVED: Plan 03-01 Task 2 includes a pre-flight check that reads `lib/auth.ts` before implementing the layout guard. If Phase 1 is not yet merged, the task will stop and surface the blocker. Plans assume the Phase 1 contract from ROADMAP depends_on declaration.

---

## Sources

### Primary (HIGH confidence)

- `supabase/SETUP.sql` — verified all table schemas: `students`, `instructor_availability`, `student_lesson_completions`, `bookings`, `profiles` [VERIFIED: read lines 1-1880]
- `lib/availability-engine.ts` — verified existing logic, confirmed `computeAvailabilityFromData` unions multiple rows [VERIFIED: read full file]
- `lib/types/calendar.ts` — verified `InstructorAvailability` interface (missing `instructor_id`) [VERIFIED: read full file]
- `app/contexts/AuthContext.tsx` — verified `isAdmin` pattern, confirmed `is_instructor` not yet exposed [VERIFIED: read full file]
- `app/components/AdminPageShell.tsx` — verified shell structure for CFIPageShell to mirror [VERIFIED: read full file]
- `app/components/AdminTopNav.tsx` — verified nav component pattern for CFITopNav to mirror [VERIFIED: read full file]
- `app/api/admin/availability/route.ts` — verified pattern for CFI availability API [VERIFIED: read full file]
- `package.json` — verified all dependency versions [VERIFIED: read]
- `jest.config.js` — verified test infrastructure [VERIFIED: read]
- `.planning/phases/03-cfi-portal/03-CONTEXT.md` — locked decisions [VERIFIED: read]
- `.planning/phases/03-cfi-portal/03-UI-SPEC.md` — UI design contract [VERIFIED: read]

### Tertiary (LOW confidence — assumed from training knowledge)

- PostgREST nested join filter syntax for the schedule query — needs confirmation against current Supabase PostgREST docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json
- Architecture: HIGH — all patterns derived from actual codebase files
- Schema delta: HIGH — verified against SETUP.sql
- Pitfalls: HIGH — derived from actual code and schema
- Availability engine union: HIGH — pure function logic verified; only DB fetch changes
- PostgREST schedule query: LOW — nested filter syntax assumed, two-step alternative documented

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable stack — 30 day window)
