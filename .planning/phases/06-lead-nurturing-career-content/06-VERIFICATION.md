---
phase: 06-lead-nurturing-career-content
verified: 2026-04-09T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open /careers in a browser; scroll through all 5 stage cards"
    expected: "Sticky sidebar updates phase name, timeline, and progress bar as each card enters the viewport; IntersectionObserver transitions work smoothly"
    why_human: "IntersectionObserver behavior and CSS transition smoothness cannot be verified programmatically without a browser"
  - test: "Submit the discovery flight funnel with a new email; check Resend dashboard"
    expected: "Day-0 confirmation email arrives; prospect row in Supabase has sequence_step = 1"
    why_human: "Requires live Supabase DB (migration pushed by Isaac) and live RESEND_API_KEY — end-to-end email delivery cannot be tested without running services"
  - test: "Exceed 10 requests from a single IP to /api/discovery-flight-signup within 1 hour"
    expected: "11th request returns HTTP 429; funnel page shows AlertCircle 'Too many requests' UI"
    why_human: "Requires live Upstash Redis (Task 3 of 06-02: Isaac must create the account and set env vars); rate limiting is fail-open without those vars so the code path cannot be exercised in CI"
  - test: "Open /admin, navigate to Prospects tab, change a prospect's lead stage via the dropdown"
    expected: "Stage updates immediately in the UI and persists in Supabase; color-coded badge changes accordingly"
    why_human: "Requires a live admin session and live Supabase connection"
  - test: "Check homepage, pricing page, and discovery flight page callouts render in browser"
    expected: "Each page shows a 1–2 sentence 'train here, get hired here' callout with a golden /careers link"
    why_human: "Visual regression check — cannot confirm text renders in context without a browser"
---

# Phase 6: Lead Nurturing + Career Content Verification Report

**Phase Goal:** Discovery flight prospects receive automatic follow-up sequences; admin can manage the pipeline; the site makes the "train here, get hired here" case to every visitor
**Verified:** 2026-04-09T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A discovery flight form submission that doesn't convert triggers three follow-up emails: immediate, day 3, day 7 via Resend | VERIFIED (code) / HUMAN for live test | `discovery-flight-signup/route.ts` sends day-0 via `prospectWelcome`; `prospect-followup-day3.ts` and `prospect-followup-day7.ts` exist with correct `schedule: '0 14 * * *'`, query `sequence_step < 2/3`, filter `lead_stage IN (new, contacted)`, send `prospectFollowUpDay3/Day7`, increment step |
| 2 | Every discovery flight submission saves to the `prospects` table even if the email send fails | VERIFIED | DB INSERT at line 60–79 of route.ts; email in try/catch at lines 82–93; `insertError` returns 500 before email is attempted; email failure only logs, 200 still returned |
| 3 | Admin can update a prospect's status from the pipeline view | VERIFIED | `ProspectsTab.tsx`: `LeadStage` union type covers all 5 values; `handleLeadStageChange` calls `.update({ lead_stage: newStage })` on `prospects` table; bound to `<select onChange>` in both table and detail views |
| 4 | Rate limiting blocks more than 10 requests per IP per hour | VERIFIED (code) / HUMAN for live test | `lib/ratelimit.ts`: `slidingWindow(10, '1 h')`, prefix `merlin_rl`, fail-open pattern; `applyRateLimit` imported and called at top of POST in all three routes: `discovery-flight-signup`, `contact`, `slot-requests`; 429 UI on `discovery-flight-funnel/page.tsx` |
| 5 | `/careers` page exists with 5-stage pathway; "train here, get hired here" copy on homepage, pricing, and discovery flight pages | VERIFIED | `app/careers/page.tsx`: 5 `careerStages` (Start Your Journey, Private Pilot Certificate, Instrument Rating, CFI Certificate, Career at Merlin); hero heading "Fly Here. Get Hired Here."; homepage line 545 links `/careers`; pricing line 322 links `/careers`; discovery-flight line 166–167 says "Merlin pilots train here and get hired here" with `/careers` link |

**Score:** 5/5 truths verified (code complete; 5 items require human live-environment testing)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260409_add_sequence_step.sql` | sequence_step column | VERIFIED | `ALTER TABLE prospects ADD COLUMN IF NOT EXISTS sequence_step int NOT NULL DEFAULT 0` |
| `lib/resend.ts` | 3 prospect templates | VERIFIED | `prospectWelcome`, `prospectFollowUpDay3`, `prospectFollowUpDay7` all present with full HTML using `emailWrapper` |
| `app/api/discovery-flight-signup/route.ts` | DB-first + day-0 email + rate limit | VERIFIED | Rate limit at top; INSERT with `sequence_step: 0`; email in try/catch; `sequence_step` updated to 1 on success |
| `netlify/functions/prospect-followup-day3.ts` | Scheduled day-3 function | VERIFIED | `config.schedule: '0 14 * * *'`; queries `sequence_step < 2`; sends `prospectFollowUpDay3`; updates step to 2; per-prospect error isolation |
| `netlify/functions/prospect-followup-day7.ts` | Scheduled day-7 function | VERIFIED | Same pattern; queries `sequence_step < 3`; sends `prospectFollowUpDay7`; updates step to 3 |
| `lib/ratelimit.ts` | Upstash sliding-window helper | VERIFIED | `slidingWindow(10, '1 h')`, prefix `merlin_rl`, fail-open on missing env vars |
| `app/api/contact/route.ts` | Rate limit applied | VERIFIED | `applyRateLimit(request)` called at line 5; returns early on 429 |
| `app/api/slot-requests/route.ts` | Rate limit applied | VERIFIED | `applyRateLimit(request)` called at line 98; returns early on 429 |
| `app/careers/page.tsx` | 5-stage career pathway | VERIFIED | Full client component with IntersectionObserver, sticky sidebar, 5 career stages, CTAs |
| `app/careers/layout.tsx` | SEO metadata | VERIFIED | File exists (confirmed via directory listing) |
| `app/page.tsx` callout | /careers link | VERIFIED | Line 545: "The best candidates earn a spot on our team. Learn about the career path →" |
| `app/pricing/page.tsx` callout | /careers link | VERIFIED | Line 322: "CFI certification isn't just a rating — it's your entry to a paid flying career. Merlin hires from within. See how →" |
| `app/discovery-flight/page.tsx` callout | /careers link | VERIFIED | Line 166–167: "Merlin pilots train here and get hired here." with link |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `discovery-flight-signup/route.ts` | `prospects` table | Supabase INSERT | WIRED | Lines 60–79; includes `sequence_step: 0` |
| `discovery-flight-signup/route.ts` | `lib/resend.ts` `prospectWelcome` | import + send | WIRED | Line 4 import; lines 84–89 send |
| `discovery-flight-signup/route.ts` | `lib/ratelimit.ts` | import + applyRateLimit | WIRED | Line 5 import; line 8 call |
| `prospect-followup-day3.ts` | `prospects` table | Supabase query + update | WIRED | Lines 43–49 query; lines 68–71 update |
| `prospect-followup-day3.ts` | `lib/resend.ts` `prospectFollowUpDay3` | relative import | WIRED | Line 4: `../../lib/resend`; lines 63–67 send |
| `prospect-followup-day7.ts` | `prospects` table | Supabase query + update | WIRED | Same pattern as day-3 |
| `prospect-followup-day7.ts` | `lib/resend.ts` `prospectFollowUpDay7` | relative import | WIRED | Line 4: `../../lib/resend`; lines 63–67 send |
| `app/api/contact/route.ts` | `lib/ratelimit.ts` | import + applyRateLimit | WIRED | Line 2 import; line 5 call |
| `app/api/slot-requests/route.ts` | `lib/ratelimit.ts` | import + applyRateLimit | WIRED | Line 4 import; line 98 call |
| `app/careers/page.tsx` | `/discovery-flight` + `/private-pilot-timeline` | Next.js Link | WIRED | Bottom CTAs link both destinations |
| All 3 callout pages | `/careers` | Next.js Link | WIRED | Confirmed via grep: lines 545, 322, 166–167 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `discovery-flight-signup/route.ts` | prospect record | Supabase INSERT to `prospects` | Yes — real DB write | FLOWING |
| `prospect-followup-day3.ts` | prospects array | Supabase SELECT with `sequence_step < 2` filter | Yes — real DB query | FLOWING |
| `prospect-followup-day7.ts` | prospects array | Supabase SELECT with `sequence_step < 3` filter | Yes — real DB query | FLOWING |
| `app/careers/page.tsx` | `careerStages` / `activeIndex` | Static data + IntersectionObserver state | Static data (correct by design) | FLOWING |
| `ProspectsTab.tsx` | prospects state | Supabase SELECT on mount + update via `handleLeadStageChange` | Yes — real DB read/write | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Rate limit module exports correctly | `node -e "process.env.UPSTASH_REDIS_REST_URL='x';process.env.UPSTASH_REDIS_REST_TOKEN='y'; const {getRatelimit}=require('./lib/ratelimit'); console.log(typeof getRatelimit)"` | SKIPPED — TypeScript source, not compiled | SKIP |
| Netlify function schedules defined | Checked `config.schedule` in both function files | `'0 14 * * *'` in both | PASS |
| All 3 email templates non-empty | Read `lib/resend.ts` | Full HTML bodies present, no placeholders | PASS |
| DB-first guarantee on route | Read route.ts INSERT vs email try/catch structure | INSERT before try/catch; catch+log only | PASS |
| Career callouts present in 3 files | Grep for `/careers` in page.tsx, pricing/page.tsx, discovery-flight/page.tsx | All 3 confirmed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LEAD-01 | 06-01 | Automated follow-up email sequence (day-0, day-3, day-7) | SATISFIED | Route sends day-0; two Netlify functions send day-3/day-7 |
| LEAD-02 | 06-01 | Prospect saved to DB regardless of email outcome | SATISFIED | DB-first pattern verified in route.ts |
| LEAD-03 | 06-03 | Admin can update prospect lead stage | SATISFIED | `ProspectsTab.tsx` `handleLeadStageChange` wired to Supabase update |
| LEAD-04 | 06-02 | Rate limiting on discovery flight funnel (10 req/IP/hr) | SATISFIED | `applyRateLimit` in `discovery-flight-signup/route.ts` |
| LEAD-05 | 06-02 | Rate limiting on contact and slot request endpoints | SATISFIED | `applyRateLimit` in `contact/route.ts` and `slot-requests/route.ts` |
| PUB-01 | 06-03 | /careers page exists with career pathway content | SATISFIED | `app/careers/page.tsx` with 5-stage pipeline |
| PUB-02 | 06-03 | "Train here, get hired here" on homepage | SATISFIED | Line 542–548 of `app/page.tsx` |
| PUB-03 | 06-03 | "Train here, get hired here" on pricing | SATISFIED | Lines 319–325 of `app/pricing/page.tsx` |
| PUB-04 | 06-03 | "Train here, get hired here" on discovery flight page | SATISFIED | Lines 163–168 of `app/discovery-flight/page.tsx` |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/contact/route.ts` | 55–59 | Legacy comment block ("For now we'll use a simple mailto link approach…Option 1: Netlify Forms…Option 2: Resend") | Info | Pre-existing dead comments — does not affect behavior; rate limiting is correctly applied above them |

No blockers or stubs found. The one anti-pattern is a pre-existing comment artifact predating Phase 6 with no behavioral impact.

### Human Verification Required

#### 1. /careers Page Visual + IntersectionObserver Behavior

**Test:** Open `https://merlinflighttraining.com/careers` in a browser. Scroll slowly through all 5 stage cards.
**Expected:** Sticky sidebar updates "Current Stage" phase name, title, timeline, and progress bar fill as each card crosses 45% viewport threshold. Progress bar reaches 100% at Stage 5.
**Why human:** IntersectionObserver transitions and CSS animation smoothness require a live browser.

#### 2. End-to-End Discovery Flight Email Sequence

**Test:** Submit the discovery flight funnel with a new email address. Check Resend dashboard for delivery. After 3 days, verify the scheduled function sends the day-3 email.
**Expected:** Day-0 email arrives; `prospects` table row has `sequence_step = 1`; day-3 function sends follow-up and increments to 2; day-7 function sends final follow-up.
**Why human:** Requires live Supabase DB (migration pushed via `supabase db push` — Task 3 of 06-01), live RESEND_API_KEY, and waiting 3–7 days for cron windows.

#### 3. Rate Limit Live Test

**Test:** After creating the Upstash Redis database and setting `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` env vars (Task 3 of 06-02), send 11 POST requests from the same IP to `/api/discovery-flight-signup`.
**Expected:** First 10 succeed (200); 11th returns 429. The discovery flight funnel page shows the AlertCircle "Too many requests" error UI.
**Why human:** Requires Upstash account setup. Without env vars the code is fail-open (no rate limiting), so the 429 path cannot be exercised.

#### 4. Admin Prospect Pipeline Live Update

**Test:** Log in as admin, go to `/admin`, open the Prospects tab, change a prospect's lead stage from "new" to "contacted" via the dropdown.
**Expected:** Badge color changes immediately (blue → yellow); Supabase `prospects` row reflects the update; page reload preserves the new stage.
**Why human:** Requires live admin session and Supabase connection.

#### 5. Callout Rendering in Context

**Test:** Open homepage, pricing page, and discovery flight page in a browser.
**Expected:** Each page shows the 1–2 sentence career callout with a golden underlined link to `/careers` that is visually distinct and contextually placed.
**Why human:** Visual regression — confirms layout, color, and positioning are not broken by surrounding content.

### Gaps Summary

No code gaps found. All 5 success criteria are fully implemented in code. Two operational setup steps remain as human-action checkpoints:

1. **`supabase db push`** to apply the `sequence_step` migration to the live database (Task 3 of 06-01 — not a code gap).
2. **Upstash Redis account creation + env vars** for rate limiting to be active in production (Task 3 of 06-02 — not a code gap).

These are deployment prerequisites, not implementation gaps. The code is correct and complete. Status is `human_needed` because live-environment behavioral verification (email delivery, rate limit enforcement, IntersectionObserver UX, and admin pipeline) requires Isaac to execute the above setup steps and test in a browser.

---

_Verified: 2026-04-09T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
