---
phase: 01-security-hardening
plan: "02"
subsystem: auth
tags: [security, admin-guard, server-component, pii-cleanup]
dependency_graph:
  requires: [01-01]
  provides: [manage-admin-guard, create-user-guard, authcontext-clean]
  affects: [app/manage/layout.tsx, app/contexts/AuthContext.tsx, app/api/create-user/route.ts]
tech_stack:
  added: []
  patterns: [server-component-auth-check, requireAdmin-guard, createServerClient-cookies]
key_files:
  created: []
  modified:
    - app/manage/layout.tsx
    - app/contexts/AuthContext.tsx
    - app/api/create-user/route.ts
decisions:
  - "Server Component guard uses createServerClient with cookies() — consistent with @supabase/ssr pattern already in codebase"
  - "requireAdmin in create-user uses Bearer token (existing lib/auth.ts contract) — no session-cookie auth needed for API routes"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-08"
  tasks: 2
  files_modified: 3
---

# Phase 01 Plan 02: Manage Zone Guard + AuthContext Hardening Summary

**One-liner:** Server-side admin guard on /manage layout via createServerClient + cookies(), requireAdmin from lib/auth on create-user API, NEXT_PUBLIC_ADMIN_EMAIL and all PII console.log calls removed.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove NEXT_PUBLIC_ADMIN_EMAIL fallback and PII logs from AuthContext | fbf9be0 | app/contexts/AuthContext.tsx |
| 2 | Convert manage/layout.tsx to Server Component + harden create-user API | 7d2a92f | app/manage/layout.tsx, app/api/create-user/route.ts |

## What Was Built

### Task 1 — AuthContext cleanup

- Removed `adminEmails` variable and `NEXT_PUBLIC_ADMIN_EMAIL` env reference entirely (SEC-06)
- `isAdmin` is now `Boolean(profile?.is_admin)` — no email fallback, no client-bundle exposure
- Deleted three PII-logging console.log calls: "Attempting sign in for:", "Redirect URL:", "Sign in response:" (SEC-07/D-19)
- File remains `'use client'` — no structural change to auth flow

### Task 2A — manage/layout.tsx Server Component

- Removed `'use client'` directive — file is now an async Server Component
- Uses `createServerClient` from `@supabase/ssr` with `await cookies()` from `next/headers`
- `supabase.auth.getUser()` verifies session server-side (not just reading cookie)
- Unauthenticated users: `redirect('/login')` (SEC-01)
- Authenticated non-admin users: `redirect('/dashboard')` (SEC-02)
- Layout structure (ManageSidebar + children) preserved identically

### Task 2B — create-user API guard

- Added `import { requireAdmin } from '@/lib/auth'`
- Added guard at top of POST handler: `const adminCheck = await requireAdmin(request); if ('error' in adminCheck) return adminCheck.error`
- Removed three module-level console.log debug lines (SEC-07/D-18)
- Removed `console.log('Creating profile with data:', profileData)` PII log (SEC-07/D-18)

## Verification Results

```
grep -r 'NEXT_PUBLIC_ADMIN_EMAIL' app/ lib/  → 0 matches
grep -c "'use client'" app/manage/layout.tsx  → 0
grep 'requireAdmin' app/api/create-user/route.ts  → import + guard call present
PII console.log in create-user + AuthContext  → 0 matches
npx jest  → 181 passed, 6 pre-existing failures (caldav + availability — unrelated to this plan)
```

## Threat Model Coverage

| Threat ID | Status |
|-----------|--------|
| T-1-03 Elevation of Privilege — /manage/* | Mitigated — Server Component checks getUser() + profiles.is_admin |
| T-1-04 Information Disclosure — NEXT_PUBLIC_ADMIN_EMAIL | Mitigated — removed from AuthContext entirely |
| T-1-05 Information Disclosure — PII in console.log | Mitigated — all PII logs removed from create-user and AuthContext |
| T-1-06 Elevation of Privilege — api/create-user | Mitigated — requireAdmin guard rejects 401/403 |

## Deviations from Plan

None — plan executed exactly as written.

Pre-existing test failures (6 tests in caldav.test.ts and availability route tests) confirmed unrelated to this plan's changes by running tests before and after our changes.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check

- [x] app/manage/layout.tsx exists with Server Component pattern
- [x] app/contexts/AuthContext.tsx has no NEXT_PUBLIC_ADMIN_EMAIL
- [x] app/api/create-user/route.ts has requireAdmin import and guard
- [x] Commits fbf9be0 and 7d2a92f exist in git log
- [x] 0 console.log PII calls in modified files
