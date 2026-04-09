---
phase: 02-admin-consolidation
plan: "03"
subsystem: ui
tags: [react, supabase, postgres, admin, prospects, pipeline]

# Dependency graph
requires:
  - phase: 02-admin-consolidation-plan-01
    provides: ProspectsTab extracted from monolith admin page
provides:
  - Prospect pipeline with lead_stage inline dropdown (new/contacted/booked/no-show/converted)
  - Database migration for lead_stage column with CHECK constraint
  - Stage filter pill bar for pipeline view
  - Fallback query handling when lead_stage column is not yet migrated
affects: [any future prospect or CRM features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline optimistic dropdown update: update state immediately on change, save async to Supabase
    - Fallback query pattern: try with new column, catch and retry without if column missing

key-files:
  created:
    - supabase/migrations/20260408_add_lead_stage.sql
  modified:
    - app/admin/tabs/ProspectsTab.tsx

key-decisions:
  - "lead_stage is separate from status — status tracks prospect activity (active/inactive/lost), lead_stage tracks pipeline progression (new/contacted/booked/no-show/converted)"
  - "Fallback query added so app works before and after the migration SQL is applied in Supabase"
  - "Inline dropdown saves immediately on change — no save button needed per D-11"

patterns-established:
  - "Stage color coding: new=blue, contacted=yellow, booked=green, no-show=red, converted=purple"
  - "Fallback try/catch on Supabase queries when new columns may not exist yet"

requirements-completed: [ADMIN-09]

# Metrics
duration: ~45min
completed: 2026-04-08
---

# Phase 02 Plan 03: Prospect Pipeline Summary

**Color-coded lead_stage pipeline added to ProspectsTab with inline dropdown, stage filter bar, and graceful fallback if migration has not been applied yet**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-08
- **Completed:** 2026-04-08
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Added `lead_stage` column migration (`supabase/migrations/20260408_add_lead_stage.sql`) with CHECK constraint limiting values to `new | contacted | booked | no-show | converted`
- Wired ProspectsTab.tsx with inline color-coded lead stage `<select>` dropdown on every prospect card, saving immediately on change via `handleLeadStageChange`
- Added `stageFilter` state and stage filter pill bar so admin can view prospects filtered by pipeline stage
- Added fallback query path so the app loads prospects normally even if the migration SQL has not been run yet in Supabase — lead_stage UI appears automatically once migration is applied
- All 3 plans of phase 02 admin consolidation verified working end-to-end by human review

## Task Commits

Each task was committed atomically:

1. **Task 1: Add lead_stage pipeline to ProspectsTab + migration** - `fbd7149` (feat)
2. **Task 1 deviation: Fallback query if lead_stage missing** - `53b3eec` (fix)
3. **Task 2: Human verification checkpoint** - approved, no code commit

## Files Created/Modified

- `supabase/migrations/20260408_add_lead_stage.sql` - ALTER TABLE adding lead_stage text column with CHECK constraint and default 'new'
- `app/admin/tabs/ProspectsTab.tsx` - Added LeadStage type, lead_stage to select query, handleLeadStageChange, stageFilter state + pill bar, color-coded inline select per prospect, lead_stage: 'new' in handleCreateProspect insert, fallback query for pre-migration environments

## Decisions Made

- `lead_stage` is kept separate from `status` — status tracks whether a prospect is active/inactive/lost, lead_stage tracks where they are in the pipeline funnel. They are different concepts.
- Fallback query pattern chosen over requiring migration first: try query with `lead_stage`, catch column-missing error, retry without it. This means the app works before and after migration.
- Inline dropdown saves immediately on change (optimistic local state update + async Supabase write) per D-11.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added fallback query for pre-migration environments**
- **Found during:** Task 1 (wiring lead_stage into ProspectsTab)
- **Issue:** The prospects table in the live Supabase instance does not yet have the lead_stage column. Requesting the column in the SELECT would throw an error and break prospect loading entirely until the migration is manually applied.
- **Fix:** Added try/catch around fetchProspects — if the query with `lead_stage` fails (column missing), retries the query without lead_stage so the tab loads normally. Lead_stage UI defaults to 'new' and will display real values once migration is applied.
- **Files modified:** app/admin/tabs/ProspectsTab.tsx
- **Verification:** Prospects tab loads without error before and after migration
- **Committed in:** 53b3eec

---

**Total deviations:** 1 auto-fixed (missing critical — graceful degradation)
**Impact on plan:** Fix ensures zero downtime adoption. No scope creep.

## Issues Encountered

None beyond the fallback handled above.

## User Setup Required

The lead_stage column migration must be applied manually in the Supabase SQL Editor:

```sql
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS lead_stage text DEFAULT 'new'
  CHECK (lead_stage IN ('new', 'contacted', 'booked', 'no-show', 'converted'));
UPDATE prospects SET lead_stage = 'new' WHERE lead_stage IS NULL;
```

Until this is run, prospects load normally but lead_stage values are not persisted between sessions. After running it, the inline dropdown fully saves to the database.

## Next Phase Readiness

- Phase 02 admin consolidation is complete. All 3 plans delivered and human-verified.
- Admin zone is now a unified single destination — /manage retired with redirects, all tabs lazy-loaded, prospect pipeline with lead_stage, settings sub-sections, and discovery flight schedule config all operational.
- No blockers for Phase 03.

---
*Phase: 02-admin-consolidation*
*Completed: 2026-04-08*
