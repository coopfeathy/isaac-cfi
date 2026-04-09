---
phase: 05-stripe-sdk-upgrade
plan: 01
subsystem: payments
tags: [stripe, sdk-upgrade, api-version, netlify, typescript]

# Dependency graph
requires:
  - phase: 04-student-self-service-billing
    provides: "14 active Stripe server route files using 2022-11-15 apiVersion"
provides:
  - "stripe@17.7.0 installed (upgraded from 12.8.0)"
  - "All 14 active Stripe server files using apiVersion '2025-02-24.acacia'"
  - "3 dead Netlify Stripe functions removed"
affects: [05-02-PLAN, stripe-webhook, student-billing, admin-billing]

# Tech tracking
tech-stack:
  added: ["stripe@^17.7.0 (upgraded from ^12.8.0)"]
  patterns: ["apiVersion pinned to '2025-02-24.acacia' (LatestApiVersion in stripe v17 types)"]

key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - app/api/stripe-webhook/route.ts
    - app/api/create-payment-intent/route.ts
    - app/api/admin/billing/accountant-text/route.ts
    - app/api/admin/billing/send-reminder/route.ts
    - app/api/admin/billing/sync-products/route.ts
    - app/api/admin/billing/invoice/route.ts
    - app/api/admin/billing/checkout/route.ts
    - app/api/admin/billing/overview/route.ts
    - app/api/admin/billing/delete-checkout/route.ts
    - app/api/admin/billing/push-checkout-link/route.ts
    - app/api/student/setup-intent/route.ts
    - "app/api/student/bookings/[id]/cancel/route.ts"
    - app/api/student/billing-portal/route.ts
    - app/api/student/invoices/route.ts

key-decisions:
  - "Used '2025-02-24.acacia' string directly — it is the LatestApiVersion type in stripe v17.7.0 types, no cast needed"
  - "npm install before source edits — v17 types include the new apiVersion literal; editing first would cause TypeScript rejection"
  - "Dead Netlify functions deleted first to avoid confusion; active route equivalents in app/api/ are the authoritative implementations"

patterns-established:
  - "All new Stripe instantiation must use apiVersion: '2025-02-24.acacia'"

requirements-completed: [STRIPE-01, STRIPE-02, STRIPE-03, STRIPE-04]

# Metrics
duration: 18min
completed: 2026-04-09
---

# Phase 05 Plan 01: Stripe SDK Upgrade Summary

**Stripe server SDK upgraded from 12.8.0 to 17.7.0, dead Netlify functions deleted, all 14 active routes migrated to apiVersion '2025-02-24.acacia' with clean TypeScript compilation**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-09T14:45:00Z
- **Completed:** 2026-04-09T15:03:00Z
- **Tasks:** 2
- **Files modified:** 16 (14 route files + package.json + package-lock.json)

## Accomplishments
- Deleted 3 dead Netlify Stripe functions (stripe-webhook.ts, create-payment-intent.ts, create-checkout.ts) — Next.js route equivalents in app/api/ are the sole implementations
- Installed stripe@17.7.0 (from 12.8.0), gaining 2-retry/5s-timeout defaults and access to the acacia API family
- Updated apiVersion from '2022-11-15' to '2025-02-24.acacia' in all 14 active server files across admin billing, student, and core routes
- Webhook handler confirmed using req.text() for HMAC signature verification (STRIPE-04)
- TypeScript compiles clean (`npx tsc --noEmit` exit 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete dead Netlify Stripe functions and install stripe@17.7.0** - `45e13c4` (chore)
2. **Task 2: Update apiVersion to '2025-02-24.acacia' in all 14 active server files** - `db00fef` (feat)

## Files Created/Modified
- `package.json` - stripe version bumped to `^17.7.0`
- `package-lock.json` - dependency lock updated
- `netlify/functions/stripe-webhook.ts` - DELETED (dead, replaced by app/api/stripe-webhook/route.ts)
- `netlify/functions/create-payment-intent.ts` - DELETED (dead, replaced by Next.js route)
- `netlify/functions/create-checkout.ts` - DELETED (dead, replaced by Next.js route)
- `app/api/stripe-webhook/route.ts` - apiVersion updated to '2025-02-24.acacia'
- `app/api/create-payment-intent/route.ts` - apiVersion updated
- `app/api/admin/billing/accountant-text/route.ts` - apiVersion updated (conditional pattern)
- `app/api/admin/billing/send-reminder/route.ts` - apiVersion updated (conditional pattern)
- `app/api/admin/billing/sync-products/route.ts` - apiVersion updated (conditional pattern)
- `app/api/admin/billing/invoice/route.ts` - apiVersion updated (direct pattern)
- `app/api/admin/billing/checkout/route.ts` - apiVersion updated (conditional pattern)
- `app/api/admin/billing/overview/route.ts` - apiVersion updated (conditional pattern)
- `app/api/admin/billing/delete-checkout/route.ts` - apiVersion updated (conditional pattern)
- `app/api/admin/billing/push-checkout-link/route.ts` - apiVersion updated (conditional pattern)
- `app/api/student/setup-intent/route.ts` - apiVersion updated (direct pattern)
- `app/api/student/bookings/[id]/cancel/route.ts` - apiVersion updated (direct pattern)
- `app/api/student/billing-portal/route.ts` - apiVersion updated (direct pattern)
- `app/api/student/invoices/route.ts` - apiVersion updated (direct pattern)

## Decisions Made
- Installed npm package before editing source files: v17 Stripe types define `LatestApiVersion = '2025-02-24.acacia'` — editing first would cause TypeScript to reject the new string literal
- No `as Stripe.LatestApiVersion` cast needed — the string is the exact type
- v17 retry/timeout default improvements (2 retries, 5s timeout vs 1/2s) accepted without code changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Worktree was initialized from an older commit (`ef8ec6d`) that predated phase 4 changes; required restoring several missing files from HEAD before execution (`git checkout HEAD -- <files>`). Not a code issue — worktree initialization artifact.
- `npm run build` fails in this worktree environment due to missing Supabase environment variables (pre-existing env limitation, not caused by Stripe upgrade). `npx tsc --noEmit` passes cleanly.

## User Setup Required
None - no external service configuration required. The Stripe SDK upgrade is transparent; existing STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET env vars continue to work without change.

## Next Phase Readiness
- Plan 05-02 (client-side Stripe.js upgrade from @stripe/stripe-js@1.x to @stripe/stripe-js@5.x) can proceed
- All server-side Stripe files are on v17 SDK; client-side Elements components still use the older @stripe/react-stripe-js and @stripe/stripe-js

---
*Phase: 05-stripe-sdk-upgrade*
*Completed: 2026-04-09*
