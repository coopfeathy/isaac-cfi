---
phase: 02-admin-consolidation
plan: "02"
subsystem: admin-ui
tags: [migration, redirects, settings-tab, discovery-slots, admin-07]
dependency_graph:
  requires: [02-01]
  provides: [manage-retirement, settings-subsections, discovery-slot-config-ui]
  affects: [admin-settings, admin-slots, manage-routes, discovery-slot-generation]
tech_stack:
  added: []
  patterns: [301-redirects, sub-section-navigation, lazy-subsection-loading, db-first-config]
key_files:
  created:
    - supabase/migrations/20260408_discovery_slot_config.sql
  modified:
    - next.config.js
    - app/admin/tabs/SettingsTab.tsx
    - app/admin/tabs/SlotsTab.tsx
    - app/api/admin/generate-discovery-slots/route.ts
    - netlify/functions/generate-discovery-slots.ts
decisions:
  - "Settings-bound /manage redirects use /admin (not /admin?tab=settings) — Next.js static redirects do not support query params in destination"
  - "Tasks 2a and 2b implemented together in one file write — all 7 sub-sections delivered atomically"
  - "Adjustments sub-section queries transactions table (not adjustments) — matching existing /manage/adjustments pattern"
  - "discovery_slot_config upsert uses spread of config state — no explicit id, so Supabase inserts if empty or updates existing row"
metrics:
  duration_minutes: 30
  completed_date: "2026-04-08"
  tasks_completed: 4
  files_created: 1
  files_modified: 5
---

# Phase 02 Plan 02: /manage Retirement and Settings Expansion Summary

**One-liner:** Retired /manage zone via 20 Next.js 301 redirects, migrated all 6 manage sub-systems into a 7-sub-section SettingsTab, and added collapsible discovery flight schedule config UI (ADMIN-07) backed by a new `discovery_slot_config` table.

## What Was Built

### Task 1 — /manage 301 Redirects (next.config.js)

Added 20 permanent redirects covering all `/manage/*` routes:
- `/manage/users` and `/manage/users/:path*` → `/admin/students`
- `/manage/aircraft` and `/manage/aircraft/:path*` → `/admin/aircraft`
- `/manage/schedule` and `/manage/schedule/:path*` → `/admin`
- `/manage/instructors`, `/manage/administrators`, `/manage/adjustments`, `/manage/forms`, `/manage/groups`, `/manage/items` (each with `:path*` variant) → `/admin`
- Catch-all `/manage` and `/manage/:path*` → `/admin`

All existing /manage URLs now redirect. The /manage layout and sidebar are bypassed entirely by these server-side redirects.

### Tasks 2a + 2b — SettingsTab with 7 Sub-sections

`app/admin/tabs/SettingsTab.tsx` expanded from a single Courses view into a full sub-section navigator with 7 sections:

| Sub-section | Source | Data |
|-------------|--------|------|
| Courses | existing | `courses` table — preserved as-is |
| Instructors | `/manage/instructors` | `profiles` where `is_instructor=true`, create via `signUp` |
| Administrators | `/manage/administrators` | `profiles` where `is_admin=true`, grant/revoke `is_admin` |
| Adjustments | `/manage/adjustments` | `transactions` table with `profiles` join |
| Forms | `/manage/forms` | `forms` table CRUD |
| Groups | `/manage/groups` | `groups` table CRUD |
| Items | `/manage/items` | `items` table CRUD (price in cents ↔ dollars) |

Sub-section pills at the top use golden highlight for active, gray border for inactive — matching existing admin UI patterns. Each sub-section lazy-loads on first visit (`useEffect` on `activeSubSection` change).

Modal pattern preserved from source pages. All CRUD operations use the anon `supabase` client with RLS enforced at the DB level.

### Task 3 — Discovery Flight Schedule Config UI (SlotsTab + migration + API + cron)

**`app/admin/tabs/SlotsTab.tsx`:**
- Collapsible "Discovery Flight Schedule" panel above the Generate button
- Day-of-week checkboxes (Sun–Sat) bound to `active_weekdays`
- Time input list with add/remove for `template_times`
- Number inputs for `duration_minutes`, `price_cents` (shown as dollars), `generation_days_ahead`, `min_days_out`
- Fetches existing config from `discovery_slot_config` on mount
- Save button upserts to `discovery_slot_config` with `updated_at`

**`supabase/migrations/20260408_discovery_slot_config.sql`:**
- Creates `discovery_slot_config` table with sensible defaults
- Inserts a default row if none exists
- RLS policy: only `is_admin=true` profiles can read/write (T-02-11 mitigation)

**`app/api/admin/generate-discovery-slots/route.ts`:**
- Queries `discovery_slot_config` via `supabaseAdmin` before reading env vars
- Falls back to env vars if no DB row exists — zero breaking change to existing behavior

**`netlify/functions/generate-discovery-slots.ts`:**
- Same DB-first pattern — queries `discovery_slot_config` at start of handler
- Falls back to env vars for all six config values
- Daily cron run now respects admin's saved schedule, not just env vars

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Add 301 redirects for all /manage/* routes | 0a20a97 | Done |
| 2a+2b | Expand SettingsTab with 7 sub-sections | b632521 | Done |
| 3 | Discovery flight schedule config UI + DB-first reads | c169211 | Done |

## Verification Results

All 12 plan verification checks pass:

1. `grep -c "permanent: true" next.config.js` = 20 (>= 10 required)
2. `/manage/users` → `/admin/students` confirmed
3. `activeSubSection` present in SettingsTab
4. `is_instructor` present in SettingsTab
5. `is_admin` present in SettingsTab
6. `from('transactions')` present (adjustments sub-section)
7. `from('forms')` present
8. `from('groups')` present
9. `from('items')` present
10. `scheduleConfig` / `discovery_slot_config` present in SlotsTab
11. `discovery_slot_config` present in API route
12. `discovery_slot_config` present in Netlify function

## Deviations from Plan

### Decision: Settings-bound redirects use /admin, not /admin?tab=settings

The plan noted this as an acceptable fallback: "If query params are not supported, change all settings-bound redirects to use `/admin` as destination." Next.js `next.config.js` static redirects do not reliably pass query strings in destinations, so all settings-bound routes (`/manage/instructors`, `/manage/administrators`, etc.) redirect to `/admin` rather than `/admin?tab=settings`. The user lands on the admin landing and can click the Settings tab. Acceptable since these routes have no existing bookmarks.

### Tasks 2a and 2b merged into single file write

Tasks 2a and 2b were specified as separate tasks but operate on the same file (`SettingsTab.tsx`). Both were implemented together to avoid a partial-state commit where placeholders would need to be immediately replaced. All 7 sub-sections (including the 4 from 2b) were delivered in the single commit `b632521`.

## Known Stubs

None. All sub-sections fetch real data from Supabase. The schedule config panel fetches from `discovery_slot_config` and falls back to hardcoded defaults only if the table is empty — the default values match the existing env var defaults so behavior is unchanged on first use.

## Threat Flags

None beyond what was planned. The `discovery_slot_config` RLS policy (T-02-11) was implemented as specified. The Settings sub-sections use the same client-side supabase + RLS pattern as the retired /manage pages — no new attack surface introduced.

## Self-Check: PASSED

Files confirmed present:
- `next.config.js` — modified, 20 permanent redirects
- `app/admin/tabs/SettingsTab.tsx` — 7 sub-sections with full CRUD
- `app/admin/tabs/SlotsTab.tsx` — schedule config panel added
- `app/api/admin/generate-discovery-slots/route.ts` — DB-first reads
- `netlify/functions/generate-discovery-slots.ts` — DB-first reads
- `supabase/migrations/20260408_discovery_slot_config.sql` — new file

Commits confirmed: 0a20a97, b632521, c169211
