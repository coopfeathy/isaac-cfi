---
phase: 06-lead-nurturing-career-content
plan: "02"
subsystem: rate-limiting
tags: [rate-limiting, upstash, redis, api-protection, lead-nurturing]
dependency_graph:
  requires: []
  provides: [rate-limiting-helper, protected-api-endpoints, 429-ui-error]
  affects: [app/api/discovery-flight-signup/route.ts, app/api/contact/route.ts, app/api/slot-requests/route.ts, app/discovery-flight-funnel/page.tsx]
tech_stack:
  added: ["@upstash/ratelimit@2.0.8", "@upstash/redis@1.37.0", "lucide-react"]
  patterns: [sliding-window-rate-limit, fail-open-pattern, inline-error-display]
key_files:
  created:
    - lib/ratelimit.ts
    - lib/__tests__/ratelimit.test.ts
  modified:
    - app/api/discovery-flight-signup/route.ts
    - app/api/contact/route.ts
    - app/api/slot-requests/route.ts
    - app/discovery-flight-funnel/page.tsx
    - package.json
decisions:
  - Fail-open pattern chosen for Redis unavailability — prevents self-DoS if Upstash goes down
  - slidingWindow(10, '1 h') per IP with prefix merlin_rl
  - 429 error clears on page reload only (no retry button per UI-SPEC)
  - lucide-react installed for AlertCircle icon (not previously in project)
metrics:
  duration: ~15 minutes
  completed: 2026-04-09
  tasks_completed: 2
  tasks_total: 3
  files_created: 2
  files_modified: 5
---

# Phase 6 Plan 02: Rate Limiting Summary

## One-liner

Upstash Redis sliding-window rate limiting (10 req/IP/hour) added to three public API endpoints with fail-open behavior and inline 429 error UI.

## What Was Built

**Task 1: Rate limit helper + tests**
- Installed `@upstash/ratelimit` and `@upstash/redis` packages
- Created `lib/ratelimit.ts` with lazy-initialized Ratelimit instance using `slidingWindow(10, '1 h')`, prefix `merlin_rl`, fail-open when env vars missing
- Created `lib/__tests__/ratelimit.test.ts` with 3 passing tests: allow on success, 429 on rate-exceeded, fail-open on missing env vars
- Commit: `4d8a989`

**Task 2: Apply to endpoints + 429 UI**
- Added `applyRateLimit(request)` call at the very start of POST handlers in:
  - `app/api/discovery-flight-signup/route.ts`
  - `app/api/contact/route.ts`
  - `app/api/slot-requests/route.ts`
- Added 429 inline error display to `app/discovery-flight-funnel/page.tsx` (the funnel entry page that calls `/api/discovery-flight-signup`): AlertCircle icon, "Too many requests" heading, user-friendly body text, no retry button
- Installed `lucide-react` for AlertCircle icon
- Commit: `07e885e`

**Task 3: Upstash database + env vars** — AWAITING HUMAN ACTION (checkpoint)
- User must create Upstash Redis database and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in both Netlify and `.env.local`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 4d8a989 | feat(06-02): install Upstash packages and create rate limit helper with tests |
| 2    | 07e885e | feat(06-02): apply rate limiting to 3 endpoints and add 429 UI error display |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] lucide-react not in project dependencies**
- **Found during:** Task 2 — TypeScript error on `import { AlertCircle } from 'lucide-react'`
- **Issue:** `lucide-react` was not installed; plan referenced it without noting it as a new dependency
- **Fix:** `npm install lucide-react --save`
- **Files modified:** package.json, package-lock.json
- **Commit:** 07e885e

## Known Stubs

None — all rate limiting logic is fully wired. The 429 UI error is correctly triggered by `response.status === 429`.

## Threat Flags

None — all surface introduced here matches the plan's threat model (T-06-06 through T-06-09).

## Self-Check: PASSED

- [x] `lib/ratelimit.ts` exists and contains `slidingWindow(10, '1 h')` and `prefix: 'merlin_rl'`
- [x] `lib/__tests__/ratelimit.test.ts` exists with 3 passing tests
- [x] All 3 API routes contain `applyRateLimit` import and call
- [x] `app/discovery-flight-funnel/page.tsx` contains `AlertCircle`, `429` check, and "Too many requests" text
- [x] Commits 4d8a989 and 07e885e exist in git log
- [x] No TypeScript errors (`npx tsc --noEmit` clean)
