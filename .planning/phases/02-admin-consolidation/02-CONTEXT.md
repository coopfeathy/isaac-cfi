# Phase 2: Admin Consolidation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Unify `/admin` and `/manage` into a single admin zone: retire `/manage` with redirects, decompose the 3,275-line `app/admin/page.tsx` monolith into independently lazy-loaded tab components, expand the Settings tab to absorb migrated `/manage` system-config features, and add prospect pipeline stage management.

This phase does NOT touch student self-service, billing automation, CFI portal, or Stripe upgrades — those are later phases.

</domain>

<decisions>
## Implementation Decisions

### Tab decomposition
- **D-01:** Extract each tab into `app/admin/tabs/` component files: `BookingsTab.tsx`, `SlotsTab.tsx`, `ProspectsTab.tsx`, `BlogTab.tsx`, `SocialTab.tsx`, `EmailTab.tsx`, `SettingsTab.tsx`.
- **D-02:** `app/admin/page.tsx` becomes a thin shell — imports the active tab via `next/dynamic` for lazy loading. URL stays `/admin?tab=X`, no routing structure change.
- **D-03:** Each tab component fetches its own data independently on first render. Nothing fetches until the tab is visited. No upfront prefetch of all tabs.

### /manage retirement and redirect mapping
- **D-04:** `/manage/users` → already replaced by `app/admin/students/page.tsx` (983 lines, full implementation). Add 301 redirect only — no migration needed.
- **D-05:** `/manage/aircraft` → already replaced by `app/admin/aircraft/page.tsx` (641 lines, full implementation). Add 301 redirect only — no migration needed.
- **D-06:** `/manage/schedule` (the "flights" table CRUD) is legacy/dead. Retire with a redirect to `/admin` — do not migrate the UI.
- **D-07:** `/manage/instructors`, `/manage/administrators`, `/manage/adjustments`, `/manage/forms`, `/manage/groups`, `/manage/items` all migrate as new sub-sections within the `/admin` Settings tab. Do not create new tabs or routes.
- **D-08:** All `/manage/*` URLs redirect to their equivalent admin destination (e.g., `/manage/users` → `/admin/students`, `/manage/aircraft` → `/admin/aircraft`, all others → `/admin?tab=settings`).

### Settings tab expansion
- **D-09:** Settings tab gains new sub-sections alongside the existing Courses sub-section: Instructors, Administrators (grant/revoke `is_admin`), Billing Adjustments, Forms, Groups, Items.
- **D-10:** Sub-sections are organized within the single Settings tab — no new routes or nested pages.

### Prospect pipeline
- **D-11:** Lead stage updates via inline dropdown in the prospect table row — saves immediately on change (no modal, no side panel).
- **D-12:** Both funnel-submitted and manually created prospects appear in the pipeline view. The pipeline is the unified prospect table.
- **D-13:** Lead stages: `new / contacted / booked / no-show / converted` (matches LEAD-03 in REQUIREMENTS.md).

### Claude's Discretion
- Exact Settings sub-section layout and visual ordering within the tab
- Loading skeleton design for lazy-loaded tabs
- Error state handling per tab
- Whether to surface a "follow-up date" column in the prospect table (not discussed — implement if clearly useful)
- Redirect implementation approach (Next.js `next.config.js` redirects vs per-page redirect components)

</decisions>

<specifics>
## Specific Ideas

- URL structure stays `/admin?tab=X` — no breaking change to any existing links or bookmarks to admin tabs
- The lazy-load decomposition must satisfy the "<2 second tab load" success criterion — only active tab's data fetches on mount
- `/manage/administrators` functionality (grant/revoke `is_admin`) is a sub-section in Settings that lets Isaac promote/demote admins without direct DB access

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ADMIN-01 through ADMIN-09 (full requirement text for this phase)

### Files being decomposed
- `app/admin/page.tsx` — the 3,275-line monolith. All current tab logic lives here. This is the source of truth for what each tab renders and what data it fetches.
- `app/admin/layout.tsx` — admin shell layout (AdminTopNav + main). Stays as-is.

### Files being retired (with redirects)
- `app/manage/layout.tsx` — sidebar-based manage layout. Being retired.
- `app/manage/users/page.tsx` — user CRUD (profiles table). Redirect to `/admin/students`.
- `app/manage/aircraft/page.tsx` — aircraft CRUD. Redirect to `/admin/aircraft`.
- `app/manage/instructors/page.tsx` — instructor management (profiles `is_instructor`). Migrating to Settings sub-section.
- `app/manage/administrators/page.tsx` — admin role management (profiles `is_admin`). Migrating to Settings sub-section.
- `app/manage/adjustments/page.tsx` — billing adjustments (amount_cents). Migrating to Settings sub-section.
- `app/manage/forms/page.tsx` — forms CRUD (name/description/url). Migrating to Settings sub-section.
- `app/manage/groups/page.tsx` — groups CRUD. Migrating to Settings sub-section.
- `app/manage/items/page.tsx` — items CRUD. Migrating to Settings sub-section.
- `app/manage/schedule/page.tsx` — flights table (legacy/dead). Redirect to `/admin` only.

### Existing admin sub-pages (already full implementations)
- `app/admin/students/page.tsx` — replaces `/manage/users` (983 lines)
- `app/admin/aircraft/page.tsx` — replaces `/manage/aircraft` (641 lines)

### Auth (from Phase 1)
- `lib/auth.ts` — canonical `requireAdmin()` guard. All new admin routes must use this.
- `app/admin/layout.tsx` — admin layout already enforces auth via Phase 1 work.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/admin/students/page.tsx` (983 lines) — full replacement for `/manage/users`. Just needs a redirect wired.
- `app/admin/aircraft/page.tsx` (641 lines) — full replacement for `/manage/aircraft`. Just needs a redirect wired.
- `app/admin/page.tsx` tabs section — each `{activeTab === 'X' && (...)}` block is the source for its respective tab component file.

### Established Patterns
- Admin uses `supabase` client (anon key with RLS) for data fetching in the monolith — tab components should continue this pattern.
- API error responses: `NextResponse.json({ error: string }, { status: N })` — maintain shape.
- `app/components/AdminTopNav` — existing top nav component. Tab switching likely lives here or in `page.tsx`.

### Integration Points
- `next/dynamic` from Next.js — the lazy-load mechanism for tab components.
- `app/manage/layout.tsx` — has a `ManageSidebar` component; both get retired with redirects replacing the routes.
- The middleware from Phase 1 already covers `/manage/*` — redirect rules can be added at the Next.js config level or per-page.

</code_context>

<deferred>
## Deferred Ideas

- Student portal server-side auth hardening — Phase 4 (STU-07)
- Discovery flight funnel auto-follow-up sequences — Phase 6 (LEAD-01)
- Billing automation (auto-invoice after lesson complete) — Phase 4 (BILL-01 through BILL-06)
- CFI portal — Phase 3
- Rate limiting on discovery funnel endpoints (LEAD-04, LEAD-05) — Phase 6

</deferred>

---

*Phase: 02-admin-consolidation*
*Context gathered: 2026-04-08*
