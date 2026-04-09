---
phase: 5
slug: stripe-sdk-upgrade
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | next build (TypeScript compilation) + vitest (if tests exist) |
| **Config file** | `package.json` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | STRIPE-01 | — | Dead Netlify functions deleted | grep | `ls netlify/functions/ 2>/dev/null \| grep -v README \| wc -l` returns 0 | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | STRIPE-02 | — | stripe@17.7.0 installed | grep | `node -e "require('stripe/package.json').version" \| grep '^17\.'` | ✅ | ⬜ pending |
| 05-01-03 | 01 | 1 | STRIPE-03 | — | apiVersion updated in all files | grep | `grep -r "2022-11-15" app/ lib/ \| wc -l` returns 0 | ✅ | ⬜ pending |
| 05-01-04 | 01 | 1 | STRIPE-02 | — | TypeScript compiles clean | build | `npx tsc --noEmit` exits 0 | ✅ | ⬜ pending |
| 05-01-05 | 01 | 2 | STRIPE-04 | — | Webhook req.text() still present | grep | `grep -n "req.text()" app/api/stripe-webhook/route.ts` returns match | ✅ | ⬜ pending |
| 05-02-01 | 02 | 1 | STRIPE-05 | — | Client packages upgraded | grep | `grep "@stripe/stripe-js" package.json \| grep "7\."` matches | ✅ | ⬜ pending |
| 05-02-02 | 02 | 1 | STRIPE-05 | — | react-stripe-js upgraded | grep | `grep "@stripe/react-stripe-js" package.json \| grep "3\."` matches | ✅ | ⬜ pending |
| 05-02-03 | 02 | 2 | STRIPE-05 | — | Full build passes | build | `npm run build` exits 0 | ✅ | ⬜ pending |
| 05-02-04 | 02 | 2 | STRIPE-02+05 | — | Manual payment + webhook test | manual | See Manual-Only Verifications | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify `netlify/functions/` directory exists and contains only the 3 dead files before deletion

*Existing TypeScript + Next.js build infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Test payment completes in Stripe Dashboard (test mode) | STRIPE-02, STRIPE-05 | Requires live Stripe test environment interaction | 1. Open Stripe Dashboard in test mode. 2. Trigger a test payment through the app. 3. Confirm payment intent created and succeeded in Stripe Dashboard. |
| Webhook replay succeeds after upgrade | STRIPE-04 | Requires Stripe Dashboard webhook replay tool | 1. Go to Stripe Dashboard → Developers → Webhooks → select endpoint. 2. Replay most recent event. 3. Confirm 200 response in webhook logs. No signature errors. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
