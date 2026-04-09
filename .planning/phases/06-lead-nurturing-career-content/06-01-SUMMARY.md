---
phase: 06-lead-nurturing-career-content
plan: 01
subsystem: api
tags: [resend, supabase, netlify-functions, email, scheduling, prospects]

requires:
  - phase: 05-stripe-sdk-upgrade
    provides: stable Stripe + Supabase foundation

provides:
  - sequence_step column on prospects table (migration)
  - prospectWelcome, prospectFollowUpDay3, prospectFollowUpDay7 email templates in lib/resend.ts
  - day-0 confirmation email fired after new prospect INSERT in discovery-flight-signup/route.ts
  - prospect-followup-day3.ts Netlify scheduled function (daily 2pm UTC)
  - prospect-followup-day7.ts Netlify scheduled function (daily 2pm UTC)
  - Full unit test coverage for all three above

affects: [06-02-rate-limiting, 06-03-career-content, admin-prospects-tab]

tech-stack:
  added: []
  patterns:
    - "Netlify scheduled function pattern: Config.schedule + Handler, createClient with service role, per-prospect loop with error isolation"
    - "Email-after-DB pattern: DB write first (always), email in try/catch, failure logged not surfaced to client"
    - "TDD pattern for route tests: mock @/lib/resend to bypass module-level RESEND_API_KEY guard"

key-files:
  created:
    - supabase/migrations/20260409_add_sequence_step.sql
    - netlify/functions/prospect-followup-day3.ts
    - netlify/functions/prospect-followup-day7.ts
    - app/api/discovery-flight-signup/__tests__/route.test.ts
    - netlify/functions/__tests__/prospect-followup-day3.test.ts
    - netlify/functions/__tests__/prospect-followup-day7.test.ts
  modified:
    - lib/resend.ts
    - app/api/discovery-flight-signup/route.ts

key-decisions:
  - "Mock @/lib/resend (not just 'resend') in route tests to bypass module-level RESEND_API_KEY guard that throws at import time"
  - "sequence_step tracked in DB (not Resend API) for reliable idempotency — query filter is .lt('sequence_step', N) so missed cron runs self-correct on next window"
  - "Per-prospect error isolation in scheduled functions — one failed email does not abort the batch"

patterns-established:
  - "Netlify scheduled function: import from ../../lib/resend (relative path, no @/ alias)"
  - "DB-first guarantee: insert succeeds before any email attempt; email failure is catch+log only"

requirements-completed: [LEAD-01, LEAD-02]

duration: 30min
completed: 2026-04-09
---

# Phase 06 Plan 01: Prospect Email Sequence Summary

**Automated 3-step prospect nurturing pipeline: day-0 confirmation email on signup, day-3 and day-7 Netlify scheduled follow-ups with sequence_step idempotency tracking in Supabase**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-09T00:00:00Z
- **Completed:** 2026-04-09
- **Tasks:** 2 of 3 automated (Task 3 is human-action checkpoint)
- **Files modified:** 8

## Accomplishments

- Added `sequence_step int DEFAULT 0` column to `prospects` via SQL migration
- Extended `lib/resend.ts` with three prospect email templates (welcome, day-3, day-7) using brand constants and `emailWrapper`
- Modified `discovery-flight-signup/route.ts` to send day-0 confirmation email after new INSERT, update `sequence_step` to 1, and catch+log email failures without affecting the 200 response
- Created `prospect-followup-day3.ts`: queries `sequence_step < 2` + `lead_stage IN (new, contacted)` within 3-day window, sends email, increments step to 2
- Created `prospect-followup-day7.ts`: same pattern for 7-day window, increments step to 3
- 10 unit tests all pass across 3 test files

## Task Commits

1. **Task 1: Migration, email templates, and test scaffolds (TDD RED)** - `e955dc4` (test)
2. **Task 2: Implement prospect persistence, day-0 email, and follow-up functions (TDD GREEN)** - `c35c8af` (feat)
3. **Task 3: Push migration to Supabase** — human-action checkpoint (not committed — awaiting user)

## Files Created/Modified

- `supabase/migrations/20260409_add_sequence_step.sql` — ALTER TABLE prospects ADD COLUMN sequence_step int NOT NULL DEFAULT 0
- `lib/resend.ts` — Added prospectWelcome, prospectFollowUpDay3, prospectFollowUpDay7 templates
- `app/api/discovery-flight-signup/route.ts` — Day-0 email send + sequence_step update after INSERT; email failure is caught and logged
- `netlify/functions/prospect-followup-day3.ts` — Scheduled daily at 0 14 * * *, sends to sequence_step<2 prospects in 3-day window
- `netlify/functions/prospect-followup-day7.ts` — Same pattern, 7-day window, sequence_step<3
- `app/api/discovery-flight-signup/__tests__/route.test.ts` — 3 unit tests: insert+email, email-throws+200, no-email-on-update
- `netlify/functions/__tests__/prospect-followup-day3.test.ts` — 4 unit tests: send+step-update, skip>=2, skip-converted, count
- `netlify/functions/__tests__/prospect-followup-day7.test.ts` — 3 unit tests: send+step-update, skip>=3, count

## Decisions Made

- Mocked `@/lib/resend` (not just `resend`) in route tests to bypass the module-level `RESEND_API_KEY` guard that throws at import time — this is the correct pattern for testing Next.js routes that import from `lib/resend.ts`
- `sequence_step` tracked in DB rather than querying Resend API — reliable, offline-safe, queryable in a single Supabase call; missed cron runs self-correct on next window
- Per-prospect error isolation in scheduled functions — one failed Resend call does not abort the entire batch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test mock strategy to bypass module-level RESEND_API_KEY guard**
- **Found during:** Task 2 (GREEN phase test run)
- **Issue:** `lib/resend.ts` throws `Error('RESEND_API_KEY environment variable is not set')` at module load time. The original test mocked only `resend` (the npm package) but the route imports `emailTemplates` from `@/lib/resend`, which triggers the guard before any jest mock can intercept it.
- **Fix:** Added `jest.mock('@/lib/resend', ...)` with inline template stubs; also set `process.env.RESEND_API_KEY` at file top before any imports.
- **Files modified:** `app/api/discovery-flight-signup/__tests__/route.test.ts`
- **Verification:** All 3 route tests pass (10/10 total)
- **Committed in:** `c35c8af` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test mock strategy)
**Impact on plan:** Necessary for correct test execution. No scope creep.

## Issues Encountered

None beyond the mock strategy deviation above.

## User Setup Required

**Task 3 is a blocking human-action checkpoint.** Isaac must push the migration to Supabase before the sequence_step column is live:

**Option A — CLI:**
```bash
supabase db push
```

**Option B — Supabase Dashboard SQL Editor:**
```sql
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS sequence_step int NOT NULL DEFAULT 0;
```

**Verification query:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'prospects' AND column_name = 'sequence_step';
```
Expected: one row with `integer` type and `0` default.

## Next Phase Readiness

- Plan 02 (rate limiting) is independent of this migration and can proceed in parallel
- Plan 03 (career content) is also independent
- After migration is pushed, the full nurturing pipeline is live: signup → day-0 email → day-3 → day-7 with DB-tracked idempotency
- No blockers for Plan 02 or 03

## Known Stubs

None — all email templates use real copy per D-06/D-07 spec. No placeholder data flows to UI.

## Threat Flags

None — no new network endpoints introduced. All changes are server-side only (API route already existed, Netlify functions are not publicly routable endpoints). `sequence_step` column write is server-side only, per T-06-05.

## Self-Check: PASSED

- `supabase/migrations/20260409_add_sequence_step.sql` — FOUND
- `lib/resend.ts` contains `prospectWelcome:` — FOUND
- `lib/resend.ts` contains `prospectFollowUpDay3:` — FOUND
- `lib/resend.ts` contains `prospectFollowUpDay7:` — FOUND
- `app/api/discovery-flight-signup/route.ts` contains `emailTemplates.prospectWelcome` — FOUND
- `netlify/functions/prospect-followup-day3.ts` contains `schedule: '0 14 * * *'` — FOUND
- `netlify/functions/prospect-followup-day7.ts` contains `schedule: '0 14 * * *'` — FOUND
- Commit `e955dc4` — FOUND
- Commit `c35c8af` — FOUND
- All 10 tests pass — VERIFIED

---
*Phase: 06-lead-nurturing-career-content*
*Completed: 2026-04-09*
