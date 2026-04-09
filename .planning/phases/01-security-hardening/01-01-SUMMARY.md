---
phase: 01-security-hardening
plan: "01"
subsystem: auth
tags: [auth, middleware, security, supabase-ssr, tdd]
dependency_graph:
  requires: []
  provides: [lib/auth.ts, middleware.ts]
  affects: [app/api/admin/*, app/api/manage/*]
tech_stack:
  added: []
  patterns: [bearer-token-auth, supabase-ssr-middleware, getUser-not-getSession]
key_files:
  created:
    - lib/auth.ts
    - lib/__tests__/auth.test.ts
    - middleware.ts
  modified: []
decisions:
  - "Use getUser() not getSession() in both auth.ts and middleware.ts — server-verified per SEC-03"
  - "requireCFI() accepts is_admin=true as superset of CFI (D-02)"
  - "requireUser() performs no profile lookup — session existence is sufficient (D-03)"
  - "middleware.ts covers /admin/* and /manage/* only — student routes stay client-side until Phase 4"
  - "No return URL on /login redirect per D-07"
  - "Middleware does no role checks — role enforcement stays in individual route/layout guards (D-08)"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
requirements_addressed:
  - SEC-03
  - SEC-04
---

# Phase 1 Plan 01: Auth Guards and Middleware Summary

**One-liner:** Canonical auth guards (requireAdmin, requireCFI, requireUser) extracted into `lib/auth.ts` using `getUser()` + server-side middleware session refresh via `@supabase/ssr`.

## What Was Built

### lib/auth.ts

Three exported async functions that validate Bearer tokens via `supabase.auth.getUser()` (server-verified JWT — not `getSession()` which only reads cookies):

- **`requireAdmin(request)`** — validates token, checks `profiles.is_admin = true`. Returns 401 for missing/invalid token, 403 for non-admin, `{ user, profile }` on success.
- **`requireCFI(request)`** — validates token, checks `profiles.is_instructor OR profiles.is_admin`. Admin is superset of CFI per D-02. Returns 401/403 on failure, `{ user, profile }` on success.
- **`requireUser(request)`** — validates token only. No profile lookup (D-03). Returns 401 on failure, `{ user }` on success.

All functions follow the canonical pattern extracted from `app/api/admin/billing/checkout/route.ts` (D-04).

### lib/__tests__/auth.test.ts

11 test cases covering all three guards:
- 401 when Authorization header is missing
- 401 when token is invalid/expired
- 403 when authenticated but wrong role
- 200 (success) with correct role
- requireUser: verifies no `supabase.from()` call is made (no profile lookup)
- requireCFI: verifies admin passes (superset rule)

Written TDD — RED phase confirmed failures before GREEN phase implementation.

### middleware.ts

Next.js middleware at repo root using `@supabase/ssr` `createServerClient`:

- Refreshes Supabase session cookies on every matched request using the `getAll`/`setAll` cookie pattern (required for token propagation — T-1-04)
- Calls `supabase.auth.getUser()` to server-verify the session
- Redirects unauthenticated users to `/login` (no query string, no role checks)
- Matcher covers `/admin/:path*` and `/manage/*` only — student routes stay client-side until Phase 4 (STU-07) per D-06

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| c11ad3a | test | Add failing tests for requireAdmin, requireCFI, requireUser (RED phase) |
| 3935eac | feat | Implement lib/auth.ts with all three guards (GREEN phase) |
| 7b2f218 | feat | Create middleware.ts for session refresh and auth redirect |

## Verification Results

| Check | Result |
|-------|--------|
| `npx jest auth.test` | 11/11 passed |
| `grep -c 'export async function' lib/auth.ts` | 3 |
| `ls middleware.ts` | exists |
| `grep 'await.*getSession' middleware.ts lib/auth.ts` | 0 matches |
| `grep 'matcher' middleware.ts` | `/admin/:path*`, `/manage/:path*` |
| Pre-existing tests (availability-engine, slot-requests) | Unaffected |

## Deviations from Plan

None — plan executed exactly as written. The plan specified returning `{ user, profile }` from `requireAdmin` and `requireCFI` (the canonical `checkout/route.ts` returned only `{ user }`). The plan's spec was followed as it matches the architecture decisions (D-04 improved the return shape).

## Known Stubs

None. This plan creates infrastructure only — no data rendered to UI.

## Threat Flags

All four threats in the plan's threat register are mitigated:

| Threat | Mitigation | Verified |
|--------|------------|---------|
| T-1-01 Elevation of Privilege (requireAdmin) | getUser() + profiles.is_admin check | lib/auth.ts line 33, 43 |
| T-1-02 Elevation of Privilege (requireCFI) | getUser() + is_instructor OR is_admin check | lib/auth.ts line 73, 83 |
| T-1-03 Spoofing (middleware session) | getUser() not getSession() in middleware | middleware.ts line 51 |
| T-1-04 Info Disclosure (cookie propagation) | setAll reassigns supabaseResponse | middleware.ts line 45 |

No new threat surface was introduced.

## Self-Check

Files created:
- `/home/homecomputer/Desktop/isaac-cfi/.claude/worktrees/agent-a0609da8/lib/auth.ts` — FOUND
- `/home/homecomputer/Desktop/isaac-cfi/.claude/worktrees/agent-a0609da8/lib/__tests__/auth.test.ts` — FOUND
- `/home/homecomputer/Desktop/isaac-cfi/.claude/worktrees/agent-a0609da8/middleware.ts` — FOUND

Commits: c11ad3a, 3935eac, 7b2f218 — all present in git log.

## Self-Check: PASSED
