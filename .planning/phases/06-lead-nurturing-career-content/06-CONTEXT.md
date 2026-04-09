# Phase 6: Lead Nurturing + Career Content — Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 delivers three things:
1. **Prospect persistence + follow-up email sequences** — every discovery flight funnel submission saves to `prospects` and triggers an automatic Resend sequence (immediate, day 3, day 7) for non-converted prospects
2. **Rate limiting** — Upstash Redis guards the discovery flight funnel, contact form, and slot request endpoints (10 req/IP/hour)
3. **Career content** — a `/careers` page telling the Student → PPL → Instrument → CFI → hired at Merlin story, plus subtle "train here, get hired here" callouts woven into the homepage, pricing, and discovery flight pages

This phase does NOT add new booking capabilities, billing changes, or admin portal features beyond what the prospects pipeline already has.

</domain>

<decisions>
## Implementation Decisions

### Career Page Structure
- **D-01:** `/careers` page uses a **visual step-by-step pathway** format — numbered stages with milestone info (hours, certifications, timeline estimates). Consistent with the existing `/private-pilot-timeline` page pattern in the codebase.
- **D-02:** The career arc to depict: Student → Private Pilot Certificate → Instrument Rating → CFI Certificate → Hired as Instructor at Merlin (→ future aviation opportunity as a vague hint).
- **D-03:** Cargo/affiliate pathway is referenced with a **vague hint only** — no company name, no specifics. Something like: "Merlin graduates may be considered for affiliated aviation opportunities as the organization grows." Do not name a cargo company or Cessna Caravan operations. Plant the seed without over-promising.

### Cross-Site "Train Here, Get Hired Here" Copy
- **D-04:** The "train here, get hired here" narrative is integrated as **subtle callouts in existing sections** — not new standalone sections. Examples:
  - Homepage: a short line/badge near the instructor or training program section
  - Pricing: a note near the CFI certification pricing tier
  - Discovery flight pages: a short line above or below the CTA
- **D-05:** Each callout should include a link to `/careers`. Keep copy concise (1-2 sentences max).

### Follow-up Email Sequences
- **D-06:** Claude's discretion on the specific email copy/tone. Use the established Merlin brand voice from `lib/resend.ts` (`emailWrapper`, brand constants). Emails should be warm but not high-pressure — this is a long sales cycle (flight training is a multi-thousand dollar commitment).
- **D-07:** The day-0 (immediate) email fires when a prospect submission is saved to the `prospects` table — whether from the discovery flight funnel or any other source that writes to `prospects`. It is a confirmation + next-steps email, not a hard sell.
- **D-08:** Day-3 and day-7 follow-ups are scheduled Netlify background functions (follow the existing `netlify/functions/booking-monitor.ts` pattern). Query `prospects` for rows where `created_at` is ~3 or ~7 days ago and `lead_stage` is still `new` or `contacted` (i.e., not yet `booked` or `converted`). Send follow-up only if not already converted.
- **D-09:** Prospect persistence is guaranteed: save to DB first, send email after. Email failure should not roll back the DB write. Log email failures but don't surface them as user errors.

### Rate Limiting
- **D-10:** Claude's discretion on Upstash Redis implementation details. Endpoints to protect: discovery flight funnel submission, contact form (`/api/contact`), and slot request endpoint. Limit: 10 requests/IP/hour per LEAD-04/LEAD-05.
- **D-11:** When rate limit is exceeded, return HTTP 429 with a user-friendly error message (e.g., "Too many requests — please try again later."). The frontend funnel should surface this gracefully (not a silent failure).

### Admin Prospect Pipeline (LEAD-03 status)
- **D-12:** `ProspectsTab.tsx` already has `lead_stage` column and update capability (migration `20260408_add_lead_stage.sql` already shipped). LEAD-03 is substantially met by existing code. Phase 6 should verify and fill any gaps rather than rebuild from scratch.

### Claude's Discretion
- Exact Netlify function names and cron schedule strings for day-3/day-7 jobs
- Number of email template variants (one template per sequence step is fine)
- Upstash Redis client library choice and key naming scheme
- Visual design specifics of the `/careers` pathway steps (colors, icons, card vs list)
- Whether to add `/careers` to the site navigation or link from footer/homepage only
- Career page SEO metadata (title, description, JSON-LD if any)

</decisions>

<specifics>
## Specifics

- The discovery flight funnel currently ends at `app/discovery-flight-pt4/page.tsx` with a bare "thank you" page and no email triggered. The submission API is the integration point for prospect persistence.
- `lib/resend.ts` has `emailWrapper()`, brand constants (gold `#FFBF00`, dark `#0B0B0B`), and an `emailTemplates` object. New follow-up templates should be added to this file following the established pattern.
- Netlify scheduled functions in `netlify/functions/` (e.g., `booking-monitor.ts`) are the established pattern for time-delayed jobs. Day-3 and day-7 follow-up jobs go here.
- The `prospects` table already has: `id`, `email`, `created_at`, `source`, `phone`, `full_name`, `interest_level`, `status`, `notes`, `meeting_location`, `meeting_date`, `next_follow_up`, `follow_up_frequency`, `updated_at`, `lead_stage`.
- If a `follow_up_sent_at` or `sequence_step` column is needed to track which emails have gone out, add it via a new migration.
- Upstash Redis is not currently installed. This requires a new account/project + `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars.

</specifics>

<canonical_refs>
## Canonical Refs

- `.planning/REQUIREMENTS.md` — LEAD-01, LEAD-02, LEAD-03, LEAD-04, LEAD-05, PUB-01, PUB-02, PUB-03, PUB-04 (full requirement text for this phase)
- `lib/resend.ts` — existing Resend client, `emailWrapper()`, brand constants, `emailTemplates` pattern to follow
- `netlify/functions/booking-monitor.ts` — pattern for Netlify scheduled background functions (day-3/day-7 jobs follow this)
- `app/admin/tabs/ProspectsTab.tsx` — existing admin prospects UI with `lead_stage` column
- `supabase/migrations/20260408_add_lead_stage.sql` — `lead_stage` column already migrated
- `app/discovery-flight-pt4/page.tsx` — current funnel end page (no email triggered here today)
- `app/private-pilot-timeline/` — existing visual pathway page; `/careers` follows same structural pattern
- `app/page.tsx` — homepage; career callout goes here (near instructor/training section)
- `app/pricing/page.tsx` — pricing page; callout near CFI cert tier
- `app/discovery-flight/page.tsx` — discovery flight landing; callout near CTA

</canonical_refs>

<deferred>
## Deferred Ideas

None captured during this discussion.
</deferred>
