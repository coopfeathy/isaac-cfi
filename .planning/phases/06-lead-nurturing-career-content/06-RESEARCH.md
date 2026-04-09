# Phase 6: Lead Nurturing + Career Content — Research

**Researched:** 2026-04-09
**Domain:** Resend email sequences, Upstash Redis rate limiting, Netlify scheduled functions, Next.js 16 App Router, React page composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `/careers` page uses a visual step-by-step pathway format — numbered stages with milestone info. Consistent with the existing `/private-pilot-timeline` page pattern.
- **D-02:** Career arc: Student → Private Pilot Certificate → Instrument Rating → CFI Certificate → Hired as Instructor at Merlin (→ future aviation opportunity as vague hint).
- **D-03:** Cargo/affiliate pathway: vague hint only — no company name, no specifics. "Merlin graduates may be considered for affiliated aviation opportunities as the organization grows." No cargo company name, no Cessna Caravan ops.
- **D-04:** "Train here, get hired here" narrative as subtle callouts in existing sections, not new standalone sections. Homepage: near instructor/training section. Pricing: near CFI cert tier. Discovery flight pages: near CTA.
- **D-05:** Each callout includes a link to `/careers`. Copy 1-2 sentences max.
- **D-06:** Claude's discretion on email copy/tone — warm, not high-pressure. Use `emailWrapper` + brand constants.
- **D-07:** Day-0 (immediate) email fires when prospect submission is saved — confirmation + next-steps, not hard sell.
- **D-08:** Day-3 and day-7 follow-ups are scheduled Netlify background functions. Query prospects where `created_at` is ~3 or ~7 days ago and `lead_stage` is `new` or `contacted`. Send only if not converted.
- **D-09:** Prospect persistence is guaranteed: DB write first, email after. Email failure does not roll back DB write. Log failures, don't surface as user errors.
- **D-10:** Claude's discretion on Upstash Redis implementation. Endpoints to protect: discovery flight funnel submission, `/api/contact`, slot request endpoint. Limit: 10 req/IP/hour.
- **D-11:** HTTP 429 with user-friendly message when rate limit exceeded. Frontend surfaces gracefully.
- **D-12:** `ProspectsTab.tsx` already has `lead_stage` column and update capability. LEAD-03 is substantially met. Phase 6 verifies and fills gaps, does not rebuild.

### Claude's Discretion

- Exact Netlify function names and cron schedule strings for day-3/day-7 jobs
- Number of email template variants (one per sequence step is fine)
- Upstash Redis client library choice and key naming scheme
- Visual design specifics of `/careers` pathway steps (colors, icons, card vs list)
- Whether to add `/careers` to site navigation or link from footer/homepage only
- Career page SEO metadata (title, description, JSON-LD if any)

### Deferred Ideas (OUT OF SCOPE)

None captured during this discussion.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEAD-01 | Discovery flight funnel sends automatic follow-up email sequence (immediate, day 3, day 7) via Resend when prospect doesn't convert | `discovery-flight-signup/route.ts` is the entry point; `emailTemplates` in `lib/resend.ts` is the pattern to extend; Netlify scheduled functions handle day-3/7 |
| LEAD-02 | All discovery flight form submissions saved to `prospects` table (even if email fails) | `discovery-flight-signup/route.ts` already inserts to `prospects`; need to add: `lead_stage='new'`, `sequence_step` column, and day-0 email send after insert |
| LEAD-03 | Admin can update prospect status (new / contacted / booked / no-show / converted) | `ProspectsTab.tsx` has full `lead_stage` dropdown in both card and list views; `handleLeadStageChange` calls Supabase directly; SUBSTANTIALLY MET — one gap identified (see below) |
| LEAD-04 | Rate limiting on discovery flight funnel endpoints (max 10 req/IP/hour) via Upstash Redis | `@upstash/ratelimit` 2.0.8 and `@upstash/redis` 1.37.0 verified on npm; zero existing rate limiting in codebase |
| LEAD-05 | Rate limiting on contact form and slot request endpoints | Same Upstash Redis pattern; `/api/contact/route.ts` and `/api/slot-requests/route.ts` identified as targets |
| PUB-01 | Dedicated career pipeline page: Student → PPL → IR → CFI → Hired at Merlin | `/private-pilot-timeline/page.tsx` is the exact visual template to follow |
| PUB-02 | "Train here, get hired here" narrative on homepage, pricing, and discovery flight landing | Anchor points identified in `app/page.tsx` (Services section ~line 562), `app/pricing/page.tsx`, `app/discovery-flight/page.tsx` |
| PUB-03 | Blog SEO-optimized posts with JSON-LD Article schema and OG images (existing pipeline maintained) | `app/blog/[slug]/page.tsx` has full Article + BreadcrumbList JSON-LD and OG metadata; no changes needed |
| PUB-04 | Social media feed displays on homepage (existing Instagram/TikTok/YouTube integration maintained) | `SocialMediaFeed` component and `app/api/social-media/posts/route.ts` exist; no changes needed |
</phase_requirements>

---

## Summary

Phase 6 adds three independent capability sets to an already-functioning Next.js 16 / Supabase / Netlify site. The discovery flight funnel already persists prospects to Supabase via `discovery-flight-signup/route.ts` — the integration point for LEAD-01/LEAD-02 is adding a `sequence_step` column, sending the day-0 email after the insert, and writing two new Netlify scheduled functions modeled exactly on `booking-monitor.ts`. Rate limiting (LEAD-04/LEAD-05) requires creating an Upstash Redis project and installing `@upstash/ratelimit` — zero rate limiting exists today. The career page (PUB-01) has a ready-made visual template in `/private-pilot-timeline/page.tsx`. Blog SEO (PUB-03) and social feed (PUB-04) are already complete and require no changes.

The biggest implementation risk is **idempotency for the scheduled follow-up functions**: the day-3 and day-7 jobs must not re-send emails to prospects who already received that step. A `sequence_step` integer column (or separate `follow_up_sent_at` timestamps) is needed to track progress. The cron window approach (query `created_at BETWEEN now()-3d-1h AND now()-3d+1h`) has a known edge case if the function misses a run; tracking the step in the DB is safer.

**Primary recommendation:** Add `sequence_step int DEFAULT 0` to `prospects` table, send day-0 email in `discovery-flight-signup/route.ts`, create two Netlify functions (`prospect-followup-day3.ts` and `prospect-followup-day7.ts`) that filter on `sequence_step < expected_step`, and apply Upstash rate limiting as shared middleware helper called from each protected route handler.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | ^6.9.2 (already installed) | Transactional email | Already in use; `emailWrapper` + `emailTemplates` pattern established |
| @upstash/ratelimit | 2.0.8 | Sliding window / fixed window rate limiting | Official Upstash rate limit package; designed for edge/serverless environments |
| @upstash/redis | 1.37.0 | Redis REST client for Upstash | Companion client to ratelimit; HTTP-based (no persistent connection needed in serverless) |
| @netlify/functions | ^2.0.0 (already installed) | Scheduled background functions | Already used for `booking-monitor.ts`; `Config.schedule` cron pattern established |

[VERIFIED: npm registry — all versions confirmed 2026-04-09]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.38.0 (already installed) | DB queries in Netlify functions | Scheduled functions use `createClient` with service role key — same pattern as `booking-monitor.ts` |
| next | ^16.1.6 (already installed) | App Router route handlers | All API endpoints are Next.js route handlers in `app/api/` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @upstash/ratelimit | custom Redis counter | ratelimit handles sliding window math, expiry, multi-region atomicity — never hand-roll |
| Netlify scheduled functions | Vercel cron / GitHub Actions | Project is already on Netlify; `booking-monitor.ts` pattern is established |
| sequence_step column | checking sent emails via Resend API | DB column is reliable, offline-safe, and queryable in a single Supabase call |

**Installation (new packages only):**
```bash
npm install @upstash/ratelimit @upstash/redis
```

---

## Architecture Patterns

### Discovery Flight Funnel — Current Data Flow

The four-step funnel works as follows (verified by reading all route files):

1. **`/api/discovery-flight-signup`** — email collected on landing page. Creates or updates `prospects` row. Sets `source='discovery_flight'`, `full_name=email_prefix`. Does NOT set `lead_stage` or send any email today.
2. **`/api/discovery-flight-pt1`** — updates prospect row: `full_name`, `phone`, notes Step 1 block.
3. **`/api/discovery-flight-pt2`** — updates prospect row: notes Step 2 block.
4. **`/api/discovery-flight-pt3`** — updates prospect row: `meeting_location`, notes Step 3 block.
5. **`/app/discovery-flight-pt4/page.tsx`** — static "thank you" page. No API call, no email.

**Integration point for LEAD-01/LEAD-02:** The day-0 email and `lead_stage='new'` + `sequence_step=0` assignment belong in `/api/discovery-flight-signup/route.ts`, because that is where the record is first created. Pt1–Pt3 are updates to an existing row and do not need email sends. The pt4 page receives no data — it only renders a thank-you.

**Gap identified:** `discovery-flight-signup/route.ts` currently inserts without `lead_stage` field. The `lead_stage` column has a `DEFAULT 'new'` (per migration), so the DB value is correct, but `sequence_step` column does not yet exist.

### Recommended Migration: `sequence_step`

```sql
-- Source: designed for this phase
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS sequence_step int NOT NULL DEFAULT 0;
-- 0 = no emails sent; 1 = day-0 sent; 2 = day-3 sent; 3 = day-7 sent
```

This single integer makes all three scheduled functions idempotent: query `sequence_step < N` to find prospects that need the next email.

### Pattern 1: Email Send After DB Write (LEAD-02 guarantee)

```typescript
// Source: [ASSUMED] — standard try/catch pattern consistent with booking-monitor.ts
// In /api/discovery-flight-signup/route.ts — after insert succeeds:

// 1. DB write (already done)
const { error: insertError } = await supabase.from('prospects').insert([...])
if (insertError) {
  return NextResponse.json({ error: insertError.message }, { status: 500 })
}

// 2. Email send — failure MUST NOT affect response
try {
  await resend.emails.send({
    from: 'Merlin Flight Training <noreply@merlinflighttraining.com>',
    to: [email],
    subject: emailTemplates.prospectWelcome(name).subject,
    html: emailTemplates.prospectWelcome(name).html,
  })
  // Update sequence_step to 1 after successful send
  await supabase.from('prospects').update({ sequence_step: 1 }).eq('email', email)
} catch (emailErr) {
  console.error('Day-0 email failed (prospect saved):', emailErr)
  // Do not return error — DB write succeeded
}

return NextResponse.json({ message: 'Email saved successfully' }, { status: 200 })
```

### Pattern 2: Netlify Scheduled Function (Day-3 / Day-7 Follow-ups)

Exact pattern from `booking-monitor.ts` — `export const config: Config` with schedule, `Handler` export, `createClient` with service role key. [VERIFIED: read `netlify/functions/booking-monitor.ts`]

```typescript
// Source: booking-monitor.ts pattern (verified)
import type { Config, Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

export const config: Config = {
  schedule: '0 14 * * *',  // daily at 14:00 UTC (10am ET)
}

const handler: Handler = async () => {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const windowStart = new Date(threeDaysAgo.getTime() - 2 * 60 * 60 * 1000) // 2h window
  const windowEnd   = new Date(threeDaysAgo.getTime() + 2 * 60 * 60 * 1000)

  const { data: prospects } = await supabaseAdmin
    .from('prospects')
    .select('id, email, full_name, lead_stage, sequence_step')
    .gte('created_at', windowStart.toISOString())
    .lte('created_at', windowEnd.toISOString())
    .lt('sequence_step', 2)  // haven't received day-3 email yet
    .in('lead_stage', ['new', 'contacted'])

  // send emails, update sequence_step
  ...
  return { statusCode: 200, body: JSON.stringify({ sent: count }) }
}

export { handler }
```

**Cron schedule recommendation (Claude's discretion):**
- `prospect-followup-day3.ts`: `'0 14 * * *'` — daily at 14:00 UTC, query window of ±2 hours around exactly-3-days-ago. This means any prospect created within the last 3 days ± 2h who has `sequence_step < 2`.
- `prospect-followup-day7.ts`: same schedule string, same window pattern, `sequence_step < 3`.

**Why daily + time window instead of exact timing:** Netlify scheduled functions are not guaranteed sub-minute precision. A daily function with a ±2 hour window around the target date is reliable and avoids missed sends if a run is delayed.

### Pattern 3: Upstash Rate Limiting in Next.js 16 App Router

[VERIFIED: npm registry for @upstash/ratelimit 2.0.8]

```typescript
// Source: @upstash/ratelimit README pattern [ASSUMED — training knowledge, package API stable]
// lib/ratelimit.ts — shared helper

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),  // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'merlin_rl',
})

// Usage in any route handler:
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests — please try again later.' },
      { status: 429 }
    )
  }
  // ... rest of handler
}
```

**Environment variables needed (new):**
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**Key naming:** `Redis.fromEnv()` is the canonical approach — no manual key management needed. The `prefix: 'merlin_rl'` ensures keys don't collide if the Redis instance is shared.

**Endpoints to protect (verified by reading code):**
1. `/api/discovery-flight-signup` — POST (funnel entry)
2. `/api/contact` — POST
3. `/api/slot-requests` — POST

### Pattern 4: `/careers` Page Following `/private-pilot-timeline` Pattern

[VERIFIED: read `app/private-pilot-timeline/page.tsx`]

The `/private-pilot-timeline` page uses:
- Dark hero section with background image + gradient overlay
- Sticky sidebar showing current phase + progress bar (`lg:sticky lg:top-28`)
- Vertical timeline with `IntersectionObserver` to highlight active step
- Each step: `phase` label (gold, uppercase), `title`, `duration`, bulleted `goals`, gold-bordered milestone callout box
- Tailwind classes: `text-golden`, `border-golden`, `bg-golden`, `text-darkText`, `bg-gradient-to-br from-black via-gray-900 to-black`
- `useRef` + `useState` for scroll-activated step tracking — `'use client'` directive required

**`/careers` page data shape (maps to same `TimelineItem` type):**

```typescript
type CareerStage = {
  phase: string       // "Stage 1", "Stage 2", etc.
  title: string       // "Student Pilot"
  duration: string    // "~6-12 months"
  goals: string[]     // key milestones / tasks
  milestone: string   // certification or hire event
}
```

Five stages: Student Pilot → Private Pilot Certificate → Instrument Rating → CFI Certificate → Hired at Merlin Flight Training (→ vague affiliate hint in the last card's milestone or a footer note).

### Pattern 5: Subtle Career Callouts on Existing Pages

**Homepage anchor** (`app/page.tsx`): The "Flight Training Programs" section (`~line 562`) lists PPL, Instrument, Commercial. Insert a 1-2 sentence callout + `/careers` link below or within the `Expert Instructors` feature card (`~line 529`).

**Pricing anchor** (`app/pricing/page.tsx`): Near the CFI certification tier — add a note: "Train to become an instructor here. [See careers →](/careers)"

**Discovery flight landing** (`app/discovery-flight/page.tsx`): Near the bottom CTA — add a brief line above or below the main CTA button.

All callouts use the gold/dark color scheme, `text-sm` sizing, and include `<Link href="/careers">`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom Redis counter + expiry logic | `@upstash/ratelimit` Ratelimit.slidingWindow | Sliding window math, race conditions, TTL cleanup, multi-region atomicity — highly non-trivial |
| Email HTML templating | Custom inline HTML builder | Existing `emailWrapper()` in `lib/resend.ts` | Brand consistency, tested rendering; just add new functions to `emailTemplates` object |
| Cron job scheduling | DIY timer / Netlify webhook | Netlify scheduled functions (`Config.schedule`) | Already used for `booking-monitor.ts`; zero new infrastructure |
| Follow-up idempotency | Timestamp comparison | `sequence_step` integer column | Single query, DB-guaranteed uniqueness, survives function restarts |

**Key insight:** The entire email sequence infrastructure (Resend client, HTML wrapper, branding) already exists. This phase extends it, not replaces it.

---

## Common Pitfalls

### Pitfall 1: Race Condition on Duplicate Signup (Discovery Flight Funnel)
**What goes wrong:** A user submits the email form twice in rapid succession. Two inserts race; one fails with a unique constraint violation or the prospect is created twice.
**Why it happens:** `discovery-flight-signup/route.ts` already handles this with `maybeSingle()` check → upsert pattern. The day-0 email could fire twice.
**How to avoid:** Only send day-0 email on the INSERT path (new prospect), not the UPDATE path (existing prospect touched again). The existing code already branches on `existingProspect`.
**Warning signs:** Two day-0 emails in Resend dashboard for same address.

### Pitfall 2: Scheduled Function Misses Run / Double-Fires
**What goes wrong:** Netlify misses a cron run (outage) or fires it twice. Day-3 email sent twice or never.
**Why it happens:** Serverless crons are best-effort; not exactly-once.
**How to avoid:** Use `sequence_step` in DB. Before sending, re-query `sequence_step < N` as a gate. After send, update `sequence_step = N`. This makes the function fully idempotent.
**Warning signs:** Multiple Resend deliveries for same prospect; or zero deliveries when expected.

### Pitfall 3: Email Fails, Sequence_Step Not Updated
**What goes wrong:** Email send to Resend throws; `sequence_step` is never incremented. Next day's run re-sends the email.
**Why it happens:** `try/catch` around email send doesn't update `sequence_step` on failure.
**How to avoid:** Only update `sequence_step` after a confirmed successful Resend response. Log failures separately. For day-3/7 functions, a failed send means the prospect stays eligible and will be retried next run — acceptable behavior.
**Warning signs:** Repeated email sends over multiple days.

### Pitfall 4: Upstash Redis Cold Start / Missing Env Vars
**What goes wrong:** `Redis.fromEnv()` throws at module initialization if `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are missing. All rate-limited routes crash with 500.
**Why it happens:** Missing Netlify environment variables in production.
**How to avoid:** Lazy-initialize the ratelimit client inside the route handler (not at module scope). Or wrap in a try/catch and fail open (allow request) rather than failing closed.
**Warning signs:** 500 errors on all protected routes after deployment.

### Pitfall 5: LEAD-03 Gap — `status` Field Confusion
**What goes wrong:** Admin UI has two overlapping status concepts: `status` (active/inactive/lost — old field) and `lead_stage` (new/contacted/booked/no-show/converted — new field). LEAD-03 specifies the five-stage `lead_stage` values.
**Why it happens:** The original schema had a generic `status` field; `lead_stage` was added later.
**How to avoid:** LEAD-03 is met by `lead_stage` dropdown in `ProspectsTab.tsx`. Confirm no requirement text refers to the old `status` field values. The `handleLeadStageChange` function handles `lead_stage` correctly.
**Warning signs:** Planner creates tasks to change `status` field when `lead_stage` is what's needed.

### Pitfall 6: `/careers` Route Conflict
**What goes wrong:** A file at `app/careers/page.tsx` is created but there's a conflict with navigation or existing layout guards.
**Why it happens:** Some layouts apply auth gates to all children.
**How to avoid:** `/careers` is a public page — ensure it is NOT inside any authenticated layout wrapper. Place it at `app/careers/page.tsx` (top-level app directory).
**Warning signs:** Redirect to `/login` when visiting `/careers`.

---

## Code Examples

### Adding a Template to `emailTemplates` in `lib/resend.ts`

```typescript
// Source: lib/resend.ts — existing pattern (VERIFIED)
// Add inside the emailTemplates export object:

prospectWelcome: (name: string) => ({
  subject: 'Your Discovery Flight is Confirmed — What Happens Next',
  html: emailWrapper(`
    <h1 style="color: ${brand.dark}; margin: 0 0 8px 0; font-size: 24px;">You're On Your Way, ${name}!</h1>
    <div style="width: 40px; height: 3px; background: ${brand.gold}; margin-bottom: 20px;"></div>
    <p>Thank you for completing your discovery flight questionnaire. We'll be in touch shortly to confirm your flight date and time.</p>
    <p>In the meantime, here's what to expect:</p>
    <ul>
      <li>A Merlin instructor will review your information and reach out within 1-2 business days</li>
      <li>Your flight takes approximately 60-90 minutes total</li>
      <li>No experience required — your CFI handles everything</li>
    </ul>
    <div style="margin-top: 24px; text-align: center;">
      <a href="https://merlinflighttraining.com/careers" style="display: inline-block; background: ${brand.gold}; color: ${brand.dark}; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px;">See Where Training Can Take You</a>
    </div>
    <p style="margin-top: 24px;">Blue skies ahead,<br/>The Merlin Flight Training Team</p>
  `),
}),
```

### Rate Limit Helper (`lib/ratelimit.ts`)

```typescript
// Source: @upstash/ratelimit docs pattern [ASSUMED — confirm against official docs at setup]
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let _ratelimit: Ratelimit | null = null

export function getRatelimit(): Ratelimit {
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'merlin_rl',
    })
  }
  return _ratelimit
}
```

---

## LEAD-03 Gap Analysis (Existing ProspectsTab.tsx)

[VERIFIED: read `app/admin/tabs/ProspectsTab.tsx`]

**What exists:**
- `lead_stage` dropdown in both card view and list view — values: new, contacted, booked, no-show, converted
- `handleLeadStageChange(prospectId, newStage)` calls `supabase.from('prospects').update({ lead_stage: newStage })`
- Color-coded badges: new=blue, contacted=yellow, booked=green, no-show=red, converted=purple
- Filter by stage pill buttons
- `fetchProspects()` queries all `lead_stage` values including fallback for missing column

**Gap:** The `fetchProspects` query selects the columns explicitly but does NOT include `sequence_step`. That is fine — admin doesn't need to display that field. No UI change needed.

**LEAD-03 verdict:** FULLY MET for admin status update. No code changes required to `ProspectsTab.tsx` for LEAD-03 compliance.

---

## Blog SEO + Social Feed Status (PUB-03 / PUB-04)

[VERIFIED: read `app/blog/[slug]/page.tsx`, `app/components/SocialMediaFeed.tsx`]

**PUB-03 (Blog SEO):** FULLY MET today.
- `generateMetadata()` produces `openGraph` with `type: 'article'`, `publishedTime`, `siteName`, OG image
- JSON-LD `Article` schema and `BreadcrumbList` schema both injected via `<script type="application/ld+json">`
- Twitter card `summary_large_image` configured
- Canonical URL set via `alternates.canonical`
- No changes needed to maintain this.

**PUB-04 (Social Feed):** FULLY MET today.
- `SocialMediaFeed` component handles Instagram, TikTok, YouTube, Facebook platforms
- Empty state gracefully shows links to all three social platforms
- `app/api/social-media/posts/route.ts` exists as data source
- No changes needed to maintain this.

**Risk of regression:** Plans 06-01 (prospect API changes) and 06-02 (rate limiting) do NOT touch blog or social files. Plan 06-03 (career page + callouts) edits `app/page.tsx` — the homepage file that also hosts the social feed section. The planner must ensure edits to `app/page.tsx` only add callout copy and do not disturb the social feed render section.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build / functions | ✓ | 20 (netlify.toml) | — |
| Resend | Email (LEAD-01) | ✓ | resend ^6.9.2 installed | — |
| @netlify/functions | Scheduled jobs | ✓ | ^2.0.0 installed | — |
| @supabase/supabase-js | DB queries | ✓ | ^2.38.0 installed | — |
| @upstash/ratelimit | Rate limiting | ✗ | not installed | n/a — must install |
| @upstash/redis | Rate limiting client | ✗ | not installed | n/a — must install |
| Upstash Redis project | Rate limiting | ✗ | — | — |
| UPSTASH_REDIS_REST_URL | Rate limiting | ✗ | — | Wave 0 task: create account + set env |
| UPSTASH_REDIS_REST_TOKEN | Rate limiting | ✗ | — | Wave 0 task: create account + set env |

**Missing dependencies with no fallback:**
- Upstash Redis account + env vars — required for LEAD-04/LEAD-05. Plan 06-02 Wave 0 must include: create Upstash account, create Redis database, copy REST URL + TOKEN to Netlify environment variables.
- `npm install @upstash/ratelimit @upstash/redis` — not in package.json yet.

**Missing dependencies with fallback:**
- None identified.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.9 |
| Config file | `jest.config.js` at project root |
| Quick run command | `npx jest --testPathPattern="discovery-flight\|ratelimit\|careers\|followup" --no-coverage` |
| Full suite command | `npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEAD-01 | Day-0 email fires after prospect insert | unit | `npx jest app/api/discovery-flight-signup/__tests__/route.test.ts` | ❌ Wave 0 |
| LEAD-01 | Day-3 function sends email for `sequence_step=1`, skips `sequence_step>=2` | unit | `npx jest netlify/functions/__tests__/prospect-followup-day3.test.ts` | ❌ Wave 0 |
| LEAD-01 | Day-7 function sends email for `sequence_step=2`, skips `sequence_step>=3` | unit | `npx jest netlify/functions/__tests__/prospect-followup-day7.test.ts` | ❌ Wave 0 |
| LEAD-02 | DB insert succeeds even when Resend throws | unit | (same file as LEAD-01 day-0 test) | ❌ Wave 0 |
| LEAD-03 | `lead_stage` update writes correct value | unit | `npx jest app/admin/tabs/__tests__/ProspectsTab.test.tsx` | ❌ Wave 0 (low priority — LEAD-03 already met) |
| LEAD-04 | 429 returned on 11th request from same IP | unit | `npx jest app/api/discovery-flight-signup/__tests__/ratelimit.test.ts` | ❌ Wave 0 |
| LEAD-05 | 429 returned from `/api/contact` and `/api/slot-requests` on 11th request | unit | (same ratelimit test file) | ❌ Wave 0 |
| PUB-01 | `/careers` page renders all 5 career stages | smoke | manual browser check | — |
| PUB-02 | Career callout links exist in homepage, pricing, discovery flight | unit/snapshot | manual check or link grep | — |
| PUB-03 | Blog JSON-LD schema present | unit | existing blog tests (no change needed) | ✅ |
| PUB-04 | Social feed renders | unit | existing (no change needed) | ✅ |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="discovery-flight-signup" --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `app/api/discovery-flight-signup/__tests__/route.test.ts` — covers LEAD-01 (day-0 email) and LEAD-02 (DB-first guarantee). Mock Resend, mock Supabase. Test: (a) new prospect → insert + email send; (b) email throws → insert succeeds, 200 returned; (c) existing prospect → update only, no email.
- [ ] `netlify/functions/__tests__/prospect-followup-day3.test.ts` — covers LEAD-01 (day-3 idempotency). Mock Supabase + Resend. Test: `sequence_step=1` prospects get email + step incremented to 2; `sequence_step=2` prospects skipped; `lead_stage='converted'` prospects skipped.
- [ ] `netlify/functions/__tests__/prospect-followup-day7.test.ts` — same pattern for day-7.
- [ ] `lib/__tests__/ratelimit.test.ts` — covers LEAD-04/LEAD-05. Mock `@upstash/ratelimit`. Test that helper returns 429 when `success=false`.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Prospect-facing routes are public by design |
| V3 Session Management | no | No session changes in this phase |
| V4 Access Control | partial | Upstash rate limiting (LEAD-04/LEAD-05) limits request volume per IP |
| V5 Input Validation | yes | Email validation already in `discovery-flight-signup/route.ts`; maintain for new code |
| V6 Cryptography | no | No new crypto; Upstash credentials stored as env vars (standard) |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Form spam / funnel flooding | DoS | Upstash slidingWindow(10, '1 h') per IP |
| Email enumeration via signup endpoint | Information Disclosure | Endpoint returns same success message for new vs. existing prospect (already implemented) |
| Resend API key exposure | Information Disclosure | Key only in server-side env vars; never in client bundle |
| Upstash REST token in client code | Information Disclosure | `Redis.fromEnv()` reads server-side env vars only; never use in 'use client' components |
| Scheduled function hitting deleted prospect | Tampering | Query `lead_stage IN ('new', 'contacted')` guards against acting on converted/deleted prospects |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@upstash/ratelimit` `Ratelimit.slidingWindow(10, '1 h')` is the correct API for v2.0.8 | Standard Stack, Code Examples | Planner writes wrong import or wrong method name — low risk, easily fixed at implementation |
| A2 | `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically | Code Examples | Need to check actual env var names in Upstash dashboard at account creation time |
| A3 | Netlify scheduled functions fire at most once per scheduled window (no duplicate fires) | Architecture Patterns | If Netlify fires twice in close succession, `sequence_step` update provides idempotency; risk is low |

**Claims tagged `[VERIFIED]`:** All four discovery flight route files, ProspectsTab.tsx, private-pilot-timeline/page.tsx, booking-monitor.ts, lib/resend.ts, blog/[slug]/page.tsx, SocialMediaFeed.tsx, all package versions, lead_stage migration.

---

## Open Questions

1. **Does Upstash free tier have sufficient throughput for this usage?**
   - What we know: Free tier at Upstash provides 10,000 commands/day
   - What's unclear: At 10 req/IP/hour limit with typical traffic, this is almost certainly sufficient — but not verified against Upstash's current pricing page
   - Recommendation: Proceed with free tier; monitor after launch

2. **Should `/careers` be in the site navigation or link from footer/homepage only?**
   - What we know: D-05 says each callout links to `/careers`; navigation placement is Claude's discretion
   - What's unclear: Current nav structure was not fully read
   - Recommendation: Add to footer links and homepage callout; defer nav addition to a follow-up unless nav reading reveals obvious slot

3. **Does `app/discovery-flight/page.tsx` CTA link to the funnel or directly to booking?**
   - What we know: Page exists and renders a CTA section; only the first 50 lines were read
   - What's unclear: Whether the career callout near the CTA would require reading the full page for exact insertion point
   - Recommendation: Planner task for 06-03 should specify "read full discovery-flight/page.tsx to identify CTA section line number before editing"

---

## Sources

### Primary (HIGH confidence)
- `lib/resend.ts` — emailWrapper signature, brand constants, emailTemplates pattern — VERIFIED by file read
- `netlify/functions/booking-monitor.ts` — scheduled function pattern, Config.schedule, Handler export — VERIFIED by file read
- `app/admin/tabs/ProspectsTab.tsx` — lead_stage UI, handleLeadStageChange, filter logic — VERIFIED by file read
- `app/private-pilot-timeline/page.tsx` — TimelineItem type, IntersectionObserver pattern, visual structure — VERIFIED by file read
- `app/api/discovery-flight-signup/route.ts` — prospect insert path, existing/new branch — VERIFIED by file read
- `app/api/discovery-flight-pt1/route.ts`, `pt2`, `pt3` — update-only pattern, no email sent — VERIFIED by file read
- `app/api/contact/route.ts` — no rate limiting present — VERIFIED by file read
- `app/api/slot-requests/route.ts` — no rate limiting present — VERIFIED by file read
- `app/blog/[slug]/page.tsx` — JSON-LD Article schema, OG metadata — VERIFIED by file read
- `app/components/SocialMediaFeed.tsx` — social feed component structure — VERIFIED by file read
- `supabase/migrations/20260408_add_lead_stage.sql` — lead_stage column, check constraint, default 'new' — VERIFIED by file read
- `npm view @upstash/ratelimit version` → 2.0.8 — VERIFIED
- `npm view @upstash/redis version` → 1.37.0 — VERIFIED
- `package.json` — all currently installed dependencies — VERIFIED

### Secondary (MEDIUM confidence)
- Upstash ratelimit README pattern for `Ratelimit.slidingWindow` and `Redis.fromEnv()` — [ASSUMED A1, A2] — standard API, low change risk

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions npm-verified, all existing packages confirmed in package.json
- Architecture: HIGH — every integration point verified by reading actual source files
- Pitfalls: HIGH — derived from reading actual code (duplicate signup branch exists, sequence_step idempotency reasoning is sound)
- Upstash API: MEDIUM — npm verified but specific method names not confirmed against current docs

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable stack; Upstash API is well-established)
