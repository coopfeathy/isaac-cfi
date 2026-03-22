# Merlin Flight Training — Complete Setup Guide

This guide is the production runbook for configuring, deploying, and operating the platform.

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Supabase Setup](#2-supabase-setup)
3. [Make Yourself Admin](#3-make-yourself-admin)
4. [Stripe Setup](#4-stripe-setup)
5. [Google Reviews Setup](#5-google-reviews-setup)
6. [Resend Email Setup](#6-resend-email-setup)
7. [Google Calendar Setup](#7-google-calendar-setup)
8. [Netlify Deployment](#8-netlify-deployment)
9. [Booking Integrity Monitor](#9-booking-integrity-monitor)
10. [Admin Health Panel](#10-admin-health-panel)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Environment Variables

Create `.env.local` and mirror these values in Netlify site environment variables.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...

# Google Reviews (Places API)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_PLACE_ID=your-google-business-place-id

# Google Calendar
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# App
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
ADMIN_EMAIL=your-admin-email@gmail.com
BOOKING_PENDING_TIMEOUT_MINUTES=30
ALERT_RECIPIENT_EMAIL=ops@your-domain.com
ALERT_MIN_AGE_MINUTES=15
ALERT_EMAIL_COOLDOWN_MINUTES=60
WEBHOOK_FAILURE_LOOKBACK_MINUTES=1440

# Discovery Slot Automation
APPLE_CALENDAR_ICS_URL=
DISCOVERY_SLOT_MIN_DAYS_OUT=14
DISCOVERY_SLOT_GENERATION_DAYS_AHEAD=45
DISCOVERY_SLOT_DURATION_MINUTES=90
DISCOVERY_SLOT_PRICE_CENTS=29900
DISCOVERY_SLOT_TEMPLATE_TIMES=09:00,12:00,15:00
DISCOVERY_SLOT_ACTIVE_WEEKDAYS=1,2,3,4,5,6

# E-sign (DocuSeal default)
ESIGN_PROVIDER=docuseal
DOCUSEAL_FORM_URL=https://your-docuseal-host/d/your-template-slug
ESIGN_WEBHOOK_SECRET=choose-a-long-random-secret

# Optional Dropbox Sign fallback
DROPBOX_SIGN_API_KEY=...
DROPBOX_SIGN_CLIENT_ID=...
DROPBOX_SIGN_TEMPLATE_ID=...
DROPBOX_SIGN_SIGNER_ROLE=Student
DROPBOX_SIGN_TEST_MODE=1
DROPBOX_SIGN_REDIRECT_URL=https://your-site.netlify.app/onboarding
```

---

## 2. Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor and run the full contents of `supabase/SETUP.sql`.
3. Configure Auth redirect URLs:
   - `https://your-site.netlify.app/auth/callback`
   - `http://localhost:3000/auth/callback`
4. Ensure storage buckets exist:
   - `blog-images` (public)
   - `lesson-videos` (public)
   - `videos` (public)
   - `lesson-documents` (public)
   - `onboarding-private` (private)

Government ID uploads must stay in `onboarding-private` only. Do not expose public URLs for ID files.

---

## 3. Make Yourself Admin

Run in Supabase SQL Editor after first login:

```sql
UPDATE profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@gmail.com'
);
```

---

## 4. Stripe Setup

1. Create Stripe keys and set:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. Add webhook endpoint:
   - URL: `https://your-site.netlify.app/api/stripe-webhook`
   - Events: `payment_intent.succeeded`, `checkout.session.completed`
3. Copy signing secret to `STRIPE_WEBHOOK_SECRET`.
4. Enable Apple Pay in Stripe dashboard (Payment methods).

Webhook processing persists every event in `stripe_webhook_events` for auditability:
- `event_id`
- `event_type`
- `booking_id`
- `slot_id`
- `processed_at`
- `error_message`

---

## 5. Google Reviews Setup

Homepage reviews are loaded live through `/api/google-reviews` from Google Places API.

1. Google Cloud Console → enable **Places API (New)**.
2. Create API key and restrict it to Places API.
3. Set:
   - `GOOGLE_MAPS_API_KEY`
   - `GOOGLE_PLACE_ID` (business place id)
4. Verify homepage Google Reviews section renders live content.

---

## 6. Resend Email Setup

1. Create `RESEND_API_KEY`.
2. Verify sending domain for production.
3. Confirm booking confirmation emails are sending from `/api/stripe-webhook` flow.

---

## 7. Google Calendar Setup

If using calendar integration:

1. Enable Google Calendar API.
2. Create service account.
3. Add:
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_CALENDAR_ID`
4. Share target calendar with service account (edit permissions).

---

## 8. Netlify Deployment

1. Connect GitHub repo in Netlify.
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Configure all env vars from section 1.
4. Deploy from `main`.

---

## 9. Booking Integrity Monitor

A scheduled job runs every 5 minutes:
- File: `netlify/functions/booking-monitor.ts`
- Schedule: `*/5 * * * *`

Checks and actions:
1. Paid booking with unbooked slot: flagged
2. Booked slot without paid booking: flagged
3. Pending booking older than threshold: flagged and auto-canceled
4. Slot release: stale-pending slots are released when no paid/confirmed/completed booking exists

Data tables:
- `booking_integrity_runs`
- `booking_integrity_alerts`

Timeout is controlled by `BOOKING_PENDING_TIMEOUT_MINUTES` (default 30).

Operational alert emails are sent by the same monitor with dedupe/cooldown using `operational_alert_state`:

- Failed Stripe webhook events (lookback window)
- Unresolved booking integrity alerts older than minimum age

Alert email settings:

- `ALERT_RECIPIENT_EMAIL` (falls back to `ADMIN_EMAIL` if unset)
- `ALERT_MIN_AGE_MINUTES` (default 15)
- `ALERT_EMAIL_COOLDOWN_MINUTES` (default 60)
- `WEBHOOK_FAILURE_LOOKBACK_MINUTES` (default 1440)

Discovery slot automation runs separately via `netlify/functions/auto-discovery-slots.ts` (every 6 hours):

- Creates future Discovery Flight slots only for dates at least `DISCOVERY_SLOT_MIN_DAYS_OUT` days away
- Generates out to `DISCOVERY_SLOT_GENERATION_DAYS_AHEAD`
- Uses `DISCOVERY_SLOT_TEMPLATE_TIMES` and `DISCOVERY_SLOT_ACTIVE_WEEKDAYS`
- Optionally reads `APPLE_CALENDAR_ICS_URL` and removes conflicting unbooked Discovery Flight slots
- Uses `DISCOVERY_SLOT_DURATION_MINUTES` and `DISCOVERY_SLOT_PRICE_CENTS` for generated slots

---

## 10. Admin Health Panel

Admin dashboard health panel reads:
1. Unreviewed onboarding docs
2. Failed Stripe webhook events
3. Open support tickets
4. Prospect conversion rate
5. Unresolved booking integrity alerts + latest monitor run stats

Route used: `/api/admin/health`

---

## 11. Troubleshooting

### Stripe webhook not updating bookings

1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe endpoint secret.
2. Confirm webhook endpoint points to `/api/stripe-webhook`.
3. Inspect `stripe_webhook_events` rows for `status='failed'` and `error_message`.

### Booking monitor not running

1. Confirm Netlify Scheduled Functions are enabled.
2. Check function logs for `booking-monitor`.
3. Verify env vars exist: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### Google reviews not showing

1. Verify `GOOGLE_MAPS_API_KEY` and `GOOGLE_PLACE_ID`.
2. Confirm Places API is enabled and billing is active.
3. Check `/api/google-reviews` response in browser/network tab.

### Onboarding ID security

1. Ensure IDs are uploaded to `onboarding-private` only.
2. Never use public URLs for onboarding ID files.
3. Access should use signed URLs and admin-only workflows.
