# External Integrations

**Analysis Date:** 2026-04-08

This application integrates with six active external services: Supabase (database + auth), Stripe (payments + Connect payouts), Resend (transactional email), Twilio (SMS), Apple Calendar via CalDAV (calendar sync), and Google Places (reviews widget). A seventh service, DocuSeal (e-signature), is wired up for student onboarding with a Dropbox Sign fallback path. Google Calendar was previously integrated but has been fully removed and replaced by `.ics` file export.

---

## Authentication & Identity

**Auth Provider:**
- Supabase Auth — email/password with PKCE flow
- Client: `@supabase/supabase-js`, configured in `lib/supabase.ts`
- Session options: `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: true`, `flowType: 'pkce'`
- Server-side auth (API routes): `getSupabaseAdmin()` in `lib/supabase-admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY`
- SSR cookies: `@supabase/ssr ^0.9.0`

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only; never exposed to client

---

## Data Storage

**Database:**
- Supabase (hosted Postgres)
- Two client modes:
  - Anon key client (`lib/supabase.ts`) — browser and lightweight server routes
  - Service role client (`lib/supabase-admin.ts`, `getSupabaseAdmin()`) — admin mutations and Netlify functions
- Schema migrations and seed SQL: `supabase/SETUP.sql`, `supabase/RULES.sql`, `supabase/SEED_SYLLABUS.sql`, `supabase/CALENDAR_REWORK.sql`, `supabase/DELETE_OLD_RULES.sql`
- Key tables: `profiles`, `slots`, `bookings`, `posts`, `caldav_settings`, `onboarding_profiles`, `stripe_connect_payout_rules`

**File Storage:**
- Local filesystem only — blog images are written to `public/blog-images/` by `app/api/upload-image/route.ts` using `fs/promises`
- No S3 or Supabase Storage integration detected

**Caching:**
- None (no Redis or in-memory cache layer)
- Next.js ISR/fetch cache used where applicable (e.g., Google Reviews route uses `next: { revalidate: 600 }`)

---

## Payments

**Provider:** Stripe

**Implementation files:**
- `lib/stripe-connect.ts` — Connect payout routing logic
- `netlify/functions/create-checkout.ts` — Stripe Checkout Session creation
- `netlify/functions/create-payment-intent.ts` — Payment Intents API flow
- `netlify/functions/stripe-webhook.ts` — Webhook handler; updates booking/slot status in Supabase after payment
- `app/api/create-payment-intent/` — Next.js API route counterpart

**API version:** `2022-11-15` (pinned in Stripe SDK instantiation)

**Features in use:**
- Checkout Sessions (`payment_method_types: ['card']`, one-time `mode: 'payment'`)
- Payment Intents
- Stripe Connect destination charges — payments routed to connected instructor accounts
- Webhook signature verification (`stripe.webhooks.constructEvent`)
- Payout rules stored in `stripe_connect_payout_rules` Supabase table; env vars are a fallback

**Required env vars:**
- `STRIPE_SECRET_KEY` — server-side Stripe key (`sk_live_...` or `sk_test_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — client-side key
- `STRIPE_WEBHOOK_SECRET` — webhook signature secret (`whsec_...`)
- `STRIPE_CONNECT_ENABLED` — set to `1` to enable destination charges
- `STRIPE_CONNECT_DEFAULT_DESTINATION_ACCOUNT` — fallback connected account ID
- `STRIPE_CONNECT_DEVELOPER_DESTINATION_ACCOUNT` — developer commission account
- `STRIPE_CONNECT_DEVELOPER_WEBSITE_TRANSACTION_BPS` — developer fee basis points for general transactions
- `STRIPE_CONNECT_DEVELOPER_DISCOVERY_FLIGHT_BPS` — developer fee basis points for discovery flights
- Optional per-type overrides: `STRIPE_CONNECT_DISCOVERY_FLIGHT_DESTINATION_ACCOUNT`, `STRIPE_CONNECT_WEBSITE_TRANSACTION_DESTINATION_ACCOUNT`, `STRIPE_CONNECT_DEFAULT_PLATFORM_FEE_BPS`, `STRIPE_CONNECT_DEFAULT_PLATFORM_FEE_CENTS`

---

## Email

**Provider:** Resend

**Implementation:** `lib/resend.ts` — exports `resend` client and `emailTemplates` object

**Templates defined in `lib/resend.ts`:**
- `welcome` — new student registration
- `flightReminder` — upcoming flight reminder
- `broadcast` — admin broadcast message
- `lessonEvaluation` — post-lesson debrief with performance rating and progress table
- `lessonScheduled` — lesson scheduled notification with ground topics and maneuvers

**Notification orchestration:** `lib/notifications/calendar-notifications.ts` — coordinates Resend email + Twilio SMS for booking lifecycle events (`request_submitted`, `request_approved`, `request_denied`, `payment_link`, `booking_confirmed`, `reminder_24h`, `cancellation_confirmed`, `cancellation_alert`)

**Operational alerts:** `netlify/functions/booking-monitor.ts` calls Resend REST API directly (not the SDK) to send integrity alerts

**Sending domain:** `noreply@merlinflighttraining.com`

**Required env vars:**
- `RESEND_API_KEY`
- `ADMIN_EMAIL` — recipient for booking/alert emails
- `ALERT_RECIPIENT_EMAIL` — recipient for operational monitoring alerts

---

## SMS

**Provider:** Twilio

**Implementation:** `lib/twilio.ts` — uses Twilio REST API directly via `fetch` (no Twilio SDK package installed; raw HTTP calls with Basic auth)

**Use cases:**
- Booking payment links sent to students via SMS
- Accountant weekly purchase/expense summary (`ACCOUNTANT_PHONE`, `ACCOUNTANT_TEXT_LOOKBACK_DAYS`)
- Notification events coordinated through `lib/notifications/calendar-notifications.ts`

**Required env vars:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `ACCOUNTANT_PHONE` — phone number to receive accountant summaries
- `ACCOUNTANT_TEXT_LOOKBACK_DAYS` — number of days in accountant summary window

---

## Calendar Integration

**Provider:** Apple Calendar (CalDAV)

**Implementation:**
- `lib/caldav.ts` — CalDAV client wrapper using `tsdav ^2.1.8`; handles push/pull/delete sync and ICS generation
- `netlify/functions/caldav-sync.ts` — scheduled Netlify function (every 10 minutes) that runs two-way sync between Supabase `slots` table and the CFI's Apple Calendar
- `app/api/calendar/booking-ics/route.ts` — generates `.ics` file for download by students after booking

**Sync model:** bi-directional with advisory locking via `caldav_settings.sync_in_progress` flag in Supabase to prevent concurrent runs

**Deprecated (not in use):**
- `lib/google-calendar.ts` — Google Calendar integration removed; file left for reference only. Requires `googleapis ^118.0.0` (still in `dependencies` but marked `serverExternalPackages` in Next config)
- Env vars `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` — only used by the deprecated file

---

## E-Signature / Document Signing

**Primary provider:** DocuSeal (self-hosted or SaaS)

**Fallback provider:** Dropbox Sign (Hellosign API)

**Implementation:**
- `app/api/onboarding/esign/create-embedded/route.ts` — creates an embedded signing session; supports both DocuSeal and Dropbox Sign based on `ESIGN_PROVIDER` env var
- `app/api/onboarding/esign-webhook/route.ts` — webhook handler; verifies signature for both providers; marks onboarding docs as signed in Supabase

**Document types required for onboarding:** `waiver`, `training_agreement`, `policy_acknowledgement`

**Required env vars:**
- `ESIGN_PROVIDER` — `docuseal` (default) or `dropbox_sign`
- `DOCUSEAL_FORM_URL` — DocuSeal template URL (`https://your-docuseal-host/d/your-template-slug`)
- `ESIGN_WEBHOOK_SECRET` — shared secret for webhook verification
- Optional Dropbox Sign fallback: `DROPBOX_SIGN_API_KEY`, `DROPBOX_SIGN_CLIENT_ID`, `DROPBOX_SIGN_TEMPLATE_ID`, `DROPBOX_SIGN_SIGNER_ROLE`, `DROPBOX_SIGN_TEST_MODE`, `DROPBOX_SIGN_REDIRECT_URL`

---

## Google Reviews / Places

**Provider:** Google Places API (New) — `places.googleapis.com/v1/places/:placeId`

**Implementation:** `app/api/google-reviews/route.ts` — fetches star rating, review count, and up to 5 reviews; ISR cached for 600 seconds

**Required env vars:**
- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_PLACE_ID` — the business's Google Place ID

---

## Scheduled / Background Jobs (Netlify Functions)

| Function | Schedule | Purpose |
|---|---|---|
| `netlify/functions/booking-monitor.ts` | Every 5 minutes (`*/5 * * * *`) | Integrity check: detects paid bookings with unbooked slots, stale pending bookings, and webhook failures |
| `netlify/functions/generate-discovery-slots.ts` | Daily at 07:00 UTC (`0 7 * * *`) | Auto-generates discovery flight slots in Supabase for a rolling 30-day window |
| `netlify/functions/caldav-sync.ts` | Every 10 minutes (`*/10 * * * *`) | Two-way CalDAV sync between Supabase slots and Apple Calendar |
| `netlify/functions/homework-email-dispatcher.ts` | Event-driven (delayed) | Sends homework/debrief emails after lesson completion with configurable delay |

**Configurable scheduling env vars:**
- `BOOKING_PENDING_TIMEOUT_MINUTES` (default: 30)
- `ALERT_MIN_AGE_MINUTES` (default: 15)
- `ALERT_EMAIL_COOLDOWN_MINUTES` (default: 60)
- `WEBHOOK_FAILURE_LOOKBACK_MINUTES` (default: 1440)
- `HOMEWORK_EMAIL_DELAY_MINUTES` (default: 60)
- `DISCOVERY_SLOT_ACTIVE_WEEKDAYS`, `DISCOVERY_SLOT_TEMPLATE_TIMES`, `DISCOVERY_SLOT_DURATION_MINUTES`, `DISCOVERY_SLOT_PRICE_CENTS`, `DISCOVERY_SLOT_GENERATION_DAYS_AHEAD`, `DISCOVERY_SLOT_MIN_DAYS_OUT`

---

## CI/CD & Deployment

**Hosting:** Netlify
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: 20 (pinned in `netlify.toml`)
- Functions directory: `netlify/functions/`, bundled with esbuild

**CI Pipeline:** Not detected (no `.github/workflows/` or CircleCI config found)

**Site URL:** `https://merlinflighttraining.com` (production), `https://isaac-cfi.netlify.app` (preview/staging referenced in email templates)

---

## Webhooks

**Incoming (this app receives):**
- `POST /api/stripe-webhook` — Stripe payment events (also handled by `netlify/functions/stripe-webhook.ts`)
- `POST /api/onboarding/esign-webhook` — DocuSeal or Dropbox Sign document completion events

**Outgoing (this app calls):**
- Resend REST API (`https://api.resend.com/emails`)
- Twilio REST API (`https://api.twilio.com/2010-04-01/Accounts/.../Messages.json`)
- Google Places API (`https://places.googleapis.com/v1/places/:placeId`)
- DocuSeal / Dropbox Sign API (`https://api.hellosign.com/v3`)
- Supabase REST API (via SDK)
- Stripe API (via SDK)
- Apple CalDAV server (via `tsdav`)

---

*Integration audit: 2026-04-08*
