---
phase: 6
slug: lead-nurturing-career-content
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 + ts-jest 29.4.9 |
| **Config file** | `jest.config.js` at project root |
| **Quick run command** | `npx jest --testPathPattern="discovery-flight\|ratelimit\|careers\|followup" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="discovery-flight-signup" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | LEAD-01, LEAD-02 | T-06-01 | DB insert succeeds even when Resend throws | unit | `npx jest app/api/discovery-flight-signup/__tests__/route.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 0 | LEAD-01 | — | Day-3 function skips converted/already-sent prospects | unit | `npx jest netlify/functions/__tests__/prospect-followup-day3.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 0 | LEAD-01 | — | Day-7 function skips converted/already-sent prospects | unit | `npx jest netlify/functions/__tests__/prospect-followup-day7.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 0 | LEAD-04, LEAD-05 | T-06-02 | 429 returned on 11th request from same IP | unit | `npx jest lib/__tests__/ratelimit.test.ts` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 1 | PUB-01 | — | /careers page renders all 5 career stages | smoke | manual browser check | — | ⬜ pending |
| 06-03-02 | 03 | 1 | PUB-02 | — | Career callout links exist in homepage, pricing, discovery flight | unit | `grep -r "/careers" app/page.tsx app/pricing/page.tsx app/discovery-flight/page.tsx` | ✅ (after impl) | ⬜ pending |
| 06-03-03 | 03 | 1 | PUB-03 | — | Blog JSON-LD schema present (no regression) | unit | existing blog tests | ✅ | ⬜ pending |
| 06-03-04 | 03 | 1 | PUB-04 | — | Social feed renders (no regression) | unit | existing tests | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/api/discovery-flight-signup/__tests__/route.test.ts` — covers LEAD-01 (day-0 email) and LEAD-02 (DB-first guarantee). Mock Resend, mock Supabase. Tests: (a) new prospect → insert + email send; (b) email throws → insert succeeds, 200 returned; (c) existing prospect → update only, no email.
- [ ] `netlify/functions/__tests__/prospect-followup-day3.test.ts` — covers LEAD-01 (day-3 idempotency). Mock Supabase + Resend. Tests: `sequence_step=1` prospects get email + step incremented to 2; `sequence_step=2` prospects skipped; `lead_stage='converted'` prospects skipped.
- [ ] `netlify/functions/__tests__/prospect-followup-day7.test.ts` — same pattern for day-7 (`sequence_step=2` → send + increment to 3; `sequence_step>=3` → skip).
- [ ] `lib/__tests__/ratelimit.test.ts` — covers LEAD-04/LEAD-05. Mock `@upstash/ratelimit`. Tests: helper returns 429 JSON when `success=false`; passes through when `success=true`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| /careers page visual appearance | PUB-01 | Visual layout and step-by-step pathway formatting | Navigate to `/careers`, verify 5 career stages visible: Student → PPL → Instrument Rating → CFI Certificate → Hired at Merlin |
| "Train here, get hired here" callouts render correctly | PUB-02 | Visual placement in existing page sections | Check homepage near instructor section, pricing near CFI tier, discovery flight page near CTA — each has 1-2 sentence callout with `/careers` link |
| Day-0 follow-up email arrives in inbox | LEAD-01 | Requires live Resend + real email address | Submit discovery flight form with real email, verify confirmation email arrives within 60 seconds |
| Rate limit UI error message | LEAD-04 | Browser-level UX check | Submit discovery flight form 11 times rapidly from same IP, verify graceful "Too many requests" error displayed (not silent failure) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
