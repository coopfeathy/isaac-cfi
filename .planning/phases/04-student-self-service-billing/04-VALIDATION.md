---
phase: 4
slug: student-self-service-billing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 + ts-jest 29.4.9 |
| **Config file** | `jest.config.js` (exists) |
| **Quick run command** | `npx jest --testPathPattern=04` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=04`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-xx | 01 | 1 | BOOK-01, BOOK-02, BOOK-03, BOOK-08 | — | N/A | manual smoke | N/A | N/A | ⬜ pending |
| 04-02-xx | 02 | 1 | BOOK-04, BOOK-05, BOOK-06, BOOK-07, BILL-04 | — | $50 charge fires when card on file; flag written when no card | unit (mock stripe/supabase) | `npx jest --testPathPattern=cancellation-fee` | ❌ Wave 0 | ⬜ pending |
| 04-02-rpc | 02 | 1 | BOOK-07 | — | Cancellation RPC returns ok, slot released, booking canceled | unit (mock supabase) | `npx jest --testPathPattern=cancel` | ❌ Wave 0 | ⬜ pending |
| 04-03-xx | 03 | 1 | STU-01, STU-02, STU-03, STU-05, STU-06, STU-07 | — | Unauthenticated request to /dashboard redirects to /login | manual smoke | N/A | N/A — manual | ⬜ pending |
| 04-04-xx | 04 | 2 | ADMIN-04, ADMIN-05, BILL-01, BILL-02, BILL-03, BILL-05, BILL-06 | — | Webhook invoice.paid marks booking paid, idempotent on replay | unit (mock event) | `npx jest --testPathPattern=stripe-webhook` | ❌ Wave 0 | ⬜ pending |
| 04-05-xx | 05 | 2 | STRIPE-01, STU-04 | — | Only one active webhook endpoint | manual audit | N/A | N/A — manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/__tests__/cancellation-fee.test.ts` — stubs for BOOK-05/06, BILL-04
- [ ] `lib/__tests__/stripe-webhook-invoice.test.ts` — stubs for BILL-05 invoice.paid handler
- [ ] `app/api/student/__tests__/bookings-cancel.test.ts` — stubs for BOOK-07 RPC flow

*Existing Jest infrastructure covers test framework — no additional installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Unauthenticated request to /dashboard redirects to /login | STU-07 | Next.js server-component redirect; no headless test harness set up | Open incognito, navigate to /dashboard, confirm redirect to /login |
| Only one active Stripe webhook endpoint registered | STRIPE-01 | Requires Stripe dashboard access | Log into Stripe, go to Webhooks, confirm exactly one active endpoint |
| Student receives invoice email and can pay without logging in | BILL-02 | Requires email delivery + live Stripe link | Trigger invoice, check email, click pay link, confirm payment completes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
