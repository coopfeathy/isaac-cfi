---
phase: 06-lead-nurturing-career-content
plan: "03"
subsystem: marketing-content
tags: [career-pipeline, seo, content, callouts, lead-nurturing]
dependency_graph:
  requires: []
  provides: [careers-page, career-callouts, lead-03-verified]
  affects: [app/careers, app/page.tsx, app/pricing/page.tsx, app/discovery-flight/page.tsx]
tech_stack:
  added: []
  patterns: [intersection-observer-scroll-tracking, sticky-sidebar, career-narrative-callouts]
key_files:
  created:
    - app/careers/page.tsx
    - app/careers/layout.tsx
  modified:
    - app/page.tsx
    - app/pricing/page.tsx
    - app/discovery-flight/page.tsx
decisions:
  - SocialMediaFeed is on blog page not homepage — plan had incorrect assumption; PUB-04 verified via component existence and blog render
  - Career callout on pricing inserted after training programs grid (no CFI-specific pricing tier exists; Commercial is the closest pathway context)
  - careers/layout.tsx created to hold metadata since page.tsx uses 'use client' (mirrors private-pilot-timeline approach)
metrics:
  duration: ~15 minutes
  completed: "2026-04-09"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 5
---

# Phase 06 Plan 03: Career Page and Callouts Summary

One-liner: /careers page with 5-stage IntersectionObserver scroll-tracking pipeline from student to hired instructor, plus "train here, get hired here" callouts on three pages.

## What Was Built

### Task 1: /careers Page

Created `app/careers/page.tsx` mirroring the `private-pilot-timeline` pattern exactly:

- `'use client'` with `IntersectionObserver` (threshold 0.45) on each stage card
- `useState(activeIndex)` drives sticky sidebar: current stage name, title, timeline, progress bar
- Progress bar fill: `((activeIndex + 1) / careerStages.length) * 100%` with `transition-all duration-300`
- 5 career stages: Start Your Journey, Private Pilot Certificate, Instrument Rating, CFI Certificate, Career at Merlin
- Stage 5 uses exact D-03 text — no cargo company name, no Cessna Caravan, no specific operations
- Bottom CTAs: "Book Your Discovery Flight" (→ /discovery-flight) and "See Training Timeline" (→ /private-pilot-timeline)
- `app/careers/layout.tsx` holds metadata (`Pilot Career Path | Merlin Flight Training`) since page.tsx is a client component

### Task 2: Career Callouts + Regression Verification

**Homepage (`app/page.tsx`):** Callout added after "Expert Instructors" feature card paragraph.

**Pricing (`app/pricing/page.tsx`):** Callout added after the training programs cost grid (after the Additional Training card). No CFI-specific pricing tier exists; this is the best contextual placement.

**Discovery flight (`app/discovery-flight/page.tsx`):** Callout added above the CTA buttons in the "Ready to Take Flight?" section.

All three callouts use `text-golden underline-offset-2 hover:underline` on the link per UI-SPEC.

**LEAD-03 verified:** `ProspectsTab.tsx` contains `handleLeadStageChange` calling `supabase.from('prospects').update({ lead_stage: ... })` with values new/contacted/booked/no-show/converted and color-coded badges. No gap found.

**PUB-03 verified:** `app/blog/[slug]/page.tsx` contains both `application/ld+json` Article and BreadcrumbList schemas. Unchanged.

**PUB-04 verified:** `SocialMediaFeed` component exists at `app/components/SocialMediaFeed.tsx` and renders on `app/blog/page.tsx`. The component was never on `app/page.tsx` — plan had an incorrect assumption about its location. No regression.

## Deviations from Plan

### Auto-noted: SocialMediaFeed location

**Found during:** Task 2 Part C regression check
**Issue:** Plan acceptance criteria stated `app/page.tsx` contains `SocialMediaFeed` import and render. The homepage has never used this component — it has a "Social proof badge" (Google reviews) but not SocialMediaFeed. SocialMediaFeed renders on `app/blog/page.tsx`.
**Action:** Verified component is intact and renders on blog page. No regression. Documented discrepancy. No code change needed.

### Auto-noted: Pre-existing TypeScript errors (out of scope)

Files: `app/api/admin/billing/` (Stripe apiVersion type mismatch), `app/cfi/availability/page.tsx`, `app/cfi/log/page.tsx`.
These predate this plan and are not caused by any change here. Logged to deferred items.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 6dae28a | feat(06-03): create /careers page with 5-stage career pathway |
| 2 | ac29221 | feat(06-03): add career callouts to homepage, pricing, and discovery flight pages |

## Pending: Task 3 (Human Verify)

Task 3 is a `checkpoint:human-verify` gate — visual verification of the /careers page and callouts in the browser.

## Known Stubs

None. All content is fully wired static data.

## Threat Flags

None. All changes are additive read-only public marketing content. T-06-11 (Tampering via homepage edit) mitigated — SocialMediaFeed not touched; verified via grep.

## Self-Check: PASSED

- app/careers/page.tsx: FOUND
- app/careers/layout.tsx: FOUND
- Commit 6dae28a: FOUND
- Commit ac29221: FOUND
- app/page.tsx contains /careers: FOUND (line 545)
- app/pricing/page.tsx contains /careers: FOUND (line 322)
- app/discovery-flight/page.tsx contains /careers: FOUND (line 167)
