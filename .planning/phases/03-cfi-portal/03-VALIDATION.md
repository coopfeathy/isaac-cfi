---
phase: 3
slug: cfi-portal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest 29 |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --testPathPattern="cfi" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="cfi" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | CFI-01 | T-03-01 | Non-CFI redirect enforced server-side | unit | `npx jest --testPathPattern="cfi/layout"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 0 | CFI-02 | T-03-02 | Schedule returns only this CFI's bookings | unit | `npx jest --testPathPattern="cfi/schedule"` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 0 | CFI-03 | T-03-03 | Availability CRUD scoped to instructor_id = caller | unit | `npx jest --testPathPattern="cfi/availability"` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | CFI-07 | — | Admin can access /cfi zone | unit | covered in CFI-01 test | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 0 | CFI-04 | T-03-04 | Roster returns only CFI's students | unit | `npx jest --testPathPattern="cfi/students"` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 0 | CFI-05 | T-03-05 | Flight log inserts completion + increments hours atomically | unit | `npx jest --testPathPattern="cfi/flight-log"` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 0 | CFI-06 | T-03-06 | Endorsement POST only for students in CFI roster | unit | `npx jest --testPathPattern="cfi/endorsements"` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 2 | D-11 | — | Availability engine unions all active CFI templates | unit | `npx jest --testPathPattern="availability-engine"` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/api/cfi/schedule/__tests__/route.test.ts` — stubs for CFI-02 (schedule scoping)
- [ ] `app/api/cfi/students/__tests__/route.test.ts` — stubs for CFI-04 (roster scoping)
- [ ] `app/api/cfi/availability/__tests__/route.test.ts` — stubs for CFI-03 (availability CRUD)
- [ ] `app/api/cfi/flight-log/__tests__/route.test.ts` — stubs for CFI-05 (flight log insert)
- [ ] `app/api/cfi/endorsements/__tests__/route.test.ts` — stubs for CFI-06 (endorsement insert)
- [ ] Extend `lib/__tests__/availability-engine.test.ts` — adds multi-CFI union case for D-11

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Student-facing slot picker reflects CFI availability update | CFI-03 | Requires live Supabase + browser | 1. Log in as CFI; 2. Set availability template; 3. Log in as student; 4. Confirm slot appears |
| Admin can access /cfi zone in browser | CFI-07 | E2E browser flow | Log in as admin user, navigate to /cfi, verify no redirect |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
