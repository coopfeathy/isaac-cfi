---
phase: 1
slug: security-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 + ts-jest 29.4.9 |
| **Config file** | `jest.config.js` (exists at repo root) |
| **Quick run command** | `npx jest --testPathPattern=lib/__tests__/auth` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=lib/__tests__/auth` (once test file exists)
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | SEC-04 | T-1-01 | `requireAdmin()` returns `{ error: 401 }` when no session | unit | `npx jest --testPathPattern=auth.test` | ❌ Wave 0 | ⬜ pending |
| 1-01-02 | 01 | 1 | SEC-04 | T-1-01 | `requireAdmin()` returns `{ error: 403 }` when `is_admin = false` | unit | `npx jest --testPathPattern=auth.test` | ❌ Wave 0 | ⬜ pending |
| 1-01-03 | 01 | 1 | SEC-04 | T-1-01 | `requireAdmin()` returns `{ user }` when `is_admin = true` | unit | `npx jest --testPathPattern=auth.test` | ❌ Wave 0 | ⬜ pending |
| 1-01-04 | 01 | 1 | SEC-04 | T-1-02 | `requireCFI()` returns `{ user, profile }` when `is_instructor = true` | unit | `npx jest --testPathPattern=auth.test` | ❌ Wave 0 | ⬜ pending |
| 1-01-05 | 01 | 1 | SEC-04 | T-1-02 | `requireCFI()` returns `{ user, profile }` when `is_admin = true` (superset) | unit | `npx jest --testPathPattern=auth.test` | ❌ Wave 0 | ⬜ pending |
| 1-01-06 | 01 | 1 | SEC-03 | — | `middleware.ts` exists at repo root with matcher covering `/admin/:path*` and `/manage/:path*` | smoke | `ls middleware.ts && grep 'manage' middleware.ts` | ❌ Wave 0 | ⬜ pending |
| 1-02-01 | 02 | 2 | SEC-01/02 | T-1-03 | GET `/manage/users` without session returns 302 to `/login` | integration | manual — requires running server | manual-only | ⬜ pending |
| 1-02-02 | 02 | 2 | SEC-06/07 | T-1-04 | No `NEXT_PUBLIC_ADMIN_EMAIL` reference in built codebase | static | `grep -r NEXT_PUBLIC_ADMIN_EMAIL app/ lib/` | no Wave 0 needed | ⬜ pending |
| 1-03-01 | 03 | 3 | SEC-08 | T-1-05 | Contact form returns 503 when `RESEND_API_KEY` unset | unit | `npx jest --testPathPattern=contact.test` | ❌ Wave 0 | ⬜ pending |
| 1-03-02 | 03 | 3 | SEC-10 | T-1-06 | `upload-image` returns 400 for non-image MIME type | unit | `npx jest --testPathPattern=upload-image.test` | ❌ Wave 0 | ⬜ pending |
| 1-03-03 | 03 | 3 | SEC-10 | T-1-06 | `upload-image` returns 400 for file > 5MB | unit | `npx jest --testPathPattern=upload-image.test` | ❌ Wave 0 | ⬜ pending |
| 1-03-04 | 03 | 3 | SEC-07 | T-1-07 | No PII `console.log` calls remain in `app/api/` | static | `grep -n "console.log.*email\|console.log.*phone" app/api/` | no Wave 0 needed | ⬜ pending |
| 1-04-01 | 04 | 4 | SEC-09 | — | `/booking` redirects to `/schedule` | smoke | `curl -I localhost:3000/booking` | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/__tests__/auth.test.ts` — unit tests for `requireAdmin()`, `requireCFI()`, `requireUser()` covering SEC-04 (401/403/200 cases)
- [ ] `lib/__tests__/contact.test.ts` — unit test for 503 behavior when `RESEND_API_KEY` unset (SEC-08)
- [ ] `lib/__tests__/upload-image.test.ts` — unit tests for MIME type allowlist and 5MB size cap (SEC-10)

*Existing tests `lib/__tests__/availability-engine.test.ts` and `lib/__tests__/caldav.test.ts` must remain passing throughout this phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GET `/manage/users` without session redirects to `/login` | SEC-01/02 | Requires running Next.js dev server + Supabase session state | `npm run dev`, navigate to `/manage/users` in browser with no session, verify 302 redirect |
| `/booking` redirects to `/schedule` | SEC-09 | Next.js `redirect()` in App Router returns 307 during dev | `npm run dev`, run `curl -I localhost:3000/booking`, verify `Location: /schedule` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
