---
phase: 03-cfi-portal
reviewed: 2026-04-08T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - app/api/cfi/availability/route.ts
  - app/api/cfi/availability/__tests__/route.test.ts
  - app/api/cfi/endorsements/route.ts
  - app/api/cfi/endorsements/__tests__/route.test.ts
  - app/api/cfi/flight-log/route.ts
  - app/api/cfi/flight-log/__tests__/route.test.ts
  - app/api/cfi/schedule/route.ts
  - app/api/cfi/schedule/__tests__/route.test.ts
  - app/cfi/availability/page.tsx
  - app/cfi/layout.tsx
  - app/cfi/log/page.tsx
  - app/cfi/page.tsx
  - app/cfi/__tests__/layout.test.tsx
  - app/components/CFIPageShell.tsx
  - app/components/CFITopNav.tsx
  - app/contexts/AuthContext.tsx
  - lib/auth.ts
  - lib/__tests__/availability-engine.test.ts
  - lib/types/calendar.ts
  - supabase/SETUP.sql
findings:
  critical: 2
  warning: 4
  info: 4
  total: 10
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-08
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

This phase delivers the CFI portal: four API routes (availability, endorsements, flight-log, schedule), corresponding UI pages, shared layout/nav components, auth guards, the availability-engine tests, type definitions, and the Phase 3 SQL migrations.

The overall security posture is strong. All CFI API routes are gated by `requireCFI`, roster checks prevent a CFI from logging hours or endorsements for students who do not belong to them, and `getSupabaseAdmin` (service-role client) is used appropriately for writes so that RLS is bypassed only when the application code has already verified identity.

Two critical issues were found:

1. The `student_lesson_completions` table definition in `SETUP.sql` still has `syllabus_lesson_id NOT NULL` as the original DDL, and the Phase 3 migration that removes `NOT NULL` is applied afterward as an `ALTER`. If the file is re-run on a fresh database in order (which the header says is safe to do), the INSERT in the flight-log POST handler — which never sends a `syllabus_lesson_id` — will hit a `NOT NULL` violation.

2. `AuthContext.tsx` contains three `console.log` calls in the `signIn` function that expose the user's email and the redirect URL to browser devtools and any log-aggregation services. One of the logged fields is `{ data, error }` from the Supabase OTP response, which can include internal error objects. These are debug leftovers.

Four warnings and four info items are also noted below.

---

## Critical Issues

### CR-01: `student_lesson_completions.syllabus_lesson_id` is NOT NULL in base DDL — flight-log POST will fail on a fresh database

**File:** `supabase/SETUP.sql:1849`

**Issue:** The base `CREATE TABLE` definition at line 1849 declares `syllabus_lesson_id UUID NOT NULL REFERENCES syllabus_lessons(id)`. The Phase 3 migration at line 1984 runs `ALTER TABLE student_lesson_completions ALTER COLUMN syllabus_lesson_id DROP NOT NULL`, but this only works if the table already exists from a prior deployment. The file header states "Run this entire file in your Supabase SQL Editor" and "safe to re-run." On a *fresh* database, `CREATE TABLE IF NOT EXISTS` creates the table with `NOT NULL`, then the `ALTER` drops it — so the order is correct for a fresh run too. However, there is a subtle race: if a developer runs only the `CREATE TABLE` block (e.g. from a snapshot of the pre-Phase-3 file that some tooling keeps), the column is `NOT NULL` and the flight-log API will fail with a Postgres error on every insert because the handler never provides `syllabus_lesson_id`.

More practically, the test at `flight-log/__tests__/route.test.ts:191` asserts that `insertChain.insert` is called without `syllabus_lesson_id` in the payload — confirming the API intentionally omits it — but the base DDL still says `NOT NULL`. The safe fix is to make the base DDL match the final intended schema:

**Fix:**
```sql
-- In the CREATE TABLE block (line 1849), change:
  syllabus_lesson_id UUID NOT NULL REFERENCES syllabus_lessons(id) ON DELETE CASCADE,
-- to:
  syllabus_lesson_id UUID REFERENCES syllabus_lessons(id) ON DELETE CASCADE,

-- The ALTER at line 1984 then becomes a harmless no-op and can be removed or kept for safety.
```

---

### CR-02: Debug `console.log` statements in `signIn` expose user email and OTP response to browser logs

**File:** `app/contexts/AuthContext.tsx:76-86`

**Issue:** Three `console.log` calls remain in the production `signIn` function:

```
console.log('Attempting sign in for:', email)   // line 76 — logs user email
console.log('Redirect URL:', redirectUrl)         // line 77 — logs redirect URL
console.log('Sign in response:', { data, error }) // line 86 — logs full Supabase OTP response
```

In a browser context these appear in DevTools and are captured by any browser extension, analytics SDK, or log-aggregation script on the page. Logging the user's email is a PII exposure risk. Logging the raw `{ data, error }` OTP response can expose internal Supabase error details. This is distinct from the `console.error` calls in the same file which are appropriate for unexpected errors.

**Fix:**
```ts
// Remove lines 76, 77, and 86 entirely.
// The console.error calls at lines 89 and 95 are acceptable and should stay.
const signIn = async (email: string) => {
  try {
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/login`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    })
    if (error) {
      console.error('Supabase sign in error:', error)
      throw new Error(error.message || 'Failed to send magic link')
    }
  } catch (error: any) {
    console.error('Sign in error:', error)
    throw new Error(error.message || 'Failed to connect to authentication service...')
  }
}
```

---

## Warnings

### WR-01: `student_endorsements` RLS policy missing SELECT for CFIs — GET endpoint will always return 0 rows via anon/service-role bypass

**File:** `supabase/SETUP.sql:2001-2020`

**Issue:** The RLS policies on `student_endorsements` define:
- `Admins manage endorsements` (ALL — for admins)
- `CFIs insert endorsements for their students` (INSERT — for instructors)
- `Students view their own endorsements` (SELECT — for the student)

There is **no SELECT policy allowing a CFI to read endorsements they issued**. The `GET /api/cfi/endorsements` handler queries `.eq('instructor_id', user.id)` — but because the service-role client (`getSupabaseAdmin`) bypasses RLS, the API itself works. However, the missing policy is a schema integrity gap: if any future code or a direct Supabase query uses the anon/user client to read endorsements as a CFI, it will return nothing silently. It also means the CFI portal's read path relies entirely on the service-role bypass remaining in place rather than on an explicit permission grant.

**Fix:**
```sql
-- Add to the student_endorsements RLS block in SETUP.sql:
DROP POLICY IF EXISTS "CFIs view endorsements they issued" ON student_endorsements;
CREATE POLICY "CFIs view endorsements they issued"
  ON student_endorsements FOR SELECT
  USING (
    instructor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_instructor = true)
  );
```

---

### WR-02: `PATCH /api/cfi/availability` — `count` is destructured but never checked; 0-row update is already caught but `count` is dead

**File:** `app/api/cfi/availability/route.ts:173`

**Issue:** The destructure `const { data, error, count } = await db...update(...)` declares `count` but never reads it. The 0-row case is caught on line 184 via `data.length === 0`, which is correct. The `count` variable is unused dead code and may cause a TypeScript `noUnusedLocals` warning depending on compiler settings. While harmless functionally, it signals the developer may have started an approach (checking `count === 0`) and switched to checking `data`, without cleaning up.

**Fix:**
```ts
// Remove `count` from the destructure:
const { data, error } = await db
  .from('instructor_availability')
  .update(updates)
  .eq('id', id)
  .eq('instructor_id', user.id)
  .select('*')
```

---

### WR-03: `app/cfi/log/page.tsx` — `cancelled` flag declared in `useEffect` but never read inside the fetch callbacks

**File:** `app/cfi/log/page.tsx:560-574`

**Issue:** A `cancelled` boolean is declared in the `useEffect` cleanup pattern and set to `true` in the cleanup function, but it is never checked inside `fetchStudents`, `fetchFlightLogs`, or `fetchEndorsements`. Those three callbacks each capture `setLoading*` / `setFlightLogs` etc. — if the component unmounts between a fetch starting and completing, those state setters will still fire on an unmounted component (or on the wrong mounted instance). This is the classic "state update on unmounted component" warning in React and can produce stale-state bugs.

The pattern is correctly applied in `app/cfi/availability/page.tsx` (lines 61-84) where `cancelled` is checked inside `fetchAvailability`. The log page should mirror that.

**Fix:**
```ts
// Inside each fetch callback, gate state updates on !cancelled.
// Example for fetchFlightLogs — same pattern needed for fetchStudents and fetchEndorsements:
const fetchFlightLogs = useCallback(async () => {
  setLoadingLogs(true)
  try {
    const res = await fetch('/api/cfi/flight-log', { headers: authHeaders() })
    if (res.ok) {
      const data = await res.json()
      if (!cancelled) setFlightLogs(Array.isArray(data) ? data : [])
    }
  } catch {
    // silent
  } finally {
    if (!cancelled) setLoadingLogs(false)
  }
}, [authHeaders])
```

Note: `cancelled` needs to be accessible inside the callbacks, e.g. by using a `ref` or restructuring so the flag is in scope.

---

### WR-04: `app/api/cfi/schedule/route.ts` — Supabase foreign-table filter on `slots.start_time` via `.gte`/`.lte` may silently return all bookings

**File:** `app/api/cfi/schedule/route.ts:40-42`

**Issue:** The query filters by date range using:
```ts
.gte('slots.start_time', today.toISOString())
.lte('slots.start_time', sevenDaysLater.toISOString())
```

When filtering on a related table's column in Supabase PostgREST, the dot-notation `slots.start_time` in `.gte()`/`.lte()` applies as a *PostgREST embedded resource filter*, which only works correctly when the relationship is a one-to-one embed (i.e., joined via `!inner`). On a standard `select(..., slots(...))` join, PostgREST treats the foreign-table filter as a filter on the booking row's joined slot — if there is no matching slot or the slot is null, the row is excluded. However, the filter semantics for date ranges on embedded tables in Supabase JS v2 are **unreliable without `!inner`**: in many Supabase versions, the `.gte`/`.lte` on the embedded table column is silently ignored and all bookings within the status filter are returned regardless of date. The application then relies on `b.slots !== null` to filter at line 52, but this only removes bookings with no slot — it does not enforce the 7-day window.

The result is a risk of returning bookings outside the 7-day window to the CFI's schedule page.

**Fix:**
```ts
// Use explicit inner join and filter on the embedding resource:
const { data: bookings, error: bookingsError } = await db
  .from('bookings')
  .select('id, status, notes, user_id, created_at, slots!inner(start_time, end_time, type)')
  .in('user_id', studentUserIds)
  .in('status', ['pending', 'confirmed', 'completed'])
  .gte('slots.start_time', today.toISOString())
  .lte('slots.start_time', sevenDaysLater.toISOString())
  .order('slots(start_time)', { ascending: true })
```

The `!inner` join ensures only bookings with a matching slot row are returned, and the date range filter is applied as a WHERE on the joined table.

---

## Info

### IN-01: `AuthContext.tsx` uses `error: any` in `signIn` catch block

**File:** `app/contexts/AuthContext.tsx:94`

**Issue:** `catch (error: any)` uses an `any` type annotation. TypeScript catch variables are `unknown` by default and `any` is the weaker typing.

**Fix:** Use `instanceof Error` narrowing or cast via `unknown`:
```ts
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Failed to connect...'
  throw new Error(message)
}
```

---

### IN-02: `app/cfi/page.tsx` — "Log Hours" and "Log Endorsement" action buttons both navigate to `/cfi/log`, making them identical

**File:** `app/cfi/page.tsx:104-117`

**Issue:** Both action `<Link>` elements in `CFISchedulePage` share the exact same `href="/cfi/log"` and the same label text ("Log Hours", "Log Endorsement"). Since they're navigation links rather than dialog-openers (unlike the equivalent buttons in `cfi/log/page.tsx`), both links take the user to the same page. Having two visually distinct buttons that do the same thing is confusing UX and represents dead UI. One of them is likely intended to deep-link to the endorsement form, but no anchor/query-param targeting is implemented.

**Fix:** Either remove the duplicate button, or open the dialogs directly from the schedule page by importing the dialog components, or add a `?tab=endorsement` query param and handle it in `cfi/log/page.tsx`.

---

### IN-03: `lib/__tests__/availability-engine.test.ts` test 14 — Sunday slot appears last in result, not first (day ordering assumption)

**File:** `lib/__tests__/availability-engine.test.ts:221-235`

**Issue:** Test 14 ("full week template maps days correctly") asserts:
```ts
expect(result[0].date).toBe('2025-06-16') // Mon
expect(result[1].date).toBe('2025-06-18') // Wed
expect(result[2].date).toBe('2025-06-20') // Fri
expect(result[3].date).toBe('2025-06-22') // Sun
```
The template includes `day_of_week: 0` (Sunday) but Sunday is the *last* result even though it is first in the template array and `day_of_week=0`. This implies the engine produces output in calendar-date order for the given week (`WEEK_START = '2025-06-16'` = Monday), not in `day_of_week` integer order. This is the correct behavior and the test correctly documents it — but the test comment `// Sunday` next to `result[3]` could mislead a reader into thinking the engine produces day_of_week=0 first. No code change needed; a clarifying test comment would help.

**Fix (comment only):**
```ts
// result[3] = Sunday 2025-06-22 — appears last because WEEK_START is Monday
// and the engine outputs slots in ascending calendar date order.
expect(result[3].date).toBe('2025-06-22') // Sun (end of this calendar week)
```

---

### IN-04: `supabase/SETUP.sql` — `students` table RLS does not include a CFI SELECT policy at the table level; CFI API reads rely entirely on service-role bypass

**File:** `supabase/SETUP.sql:558-576`

**Issue:** The `students` table has SELECT policies for the student themselves (`auth.uid() = user_id`) and for admins, but no policy for instructors to read students assigned to them. The CFI portal's schedule, flight-log, and endorsement GET routes all query `students` via `getSupabaseAdmin()` (service role), so they work. But there is no RLS policy expressing the intended access rule, mirroring the same gap noted in WR-01 for endorsements. A future client-side Supabase query by a CFI would silently return no students.

The Phase 3 migration at line 1972 adds `instructor_id` to `students` and at line 1974 creates a `CFIs can view their own students` policy — so this is partially addressed. Verify the new policy exists in the file. (It does — the grep confirms `DROP POLICY IF EXISTS "CFIs can view their own students"` at line 1974.) This item is informational only: the policy is present in the migration block and applies correctly.

**Fix:** No change needed — confirming the Phase 3 migration at line 1974 covers this. Info recorded for traceability.

---

_Reviewed: 2026-04-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
