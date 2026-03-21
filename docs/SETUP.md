# Merlin Flight Training — Complete Setup Guide

This is the single source of truth for setting up and running the platform from scratch.

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Supabase Setup](#2-supabase-setup)
3. [Make Yourself Admin](#3-make-yourself-admin)
4. [Stripe Setup](#4-stripe-setup)
5. [Resend Email Setup](#5-resend-email-setup)
6. [Google Calendar Setup](#6-google-calendar-setup)
7. [Netlify Deployment](#7-netlify-deployment)
8. [Admin Dashboard Guide](#8-admin-dashboard-guide)
9. [CRM — Prospects & Students](#9-crm--prospects--students)
10. [Learn Platform](#10-learn-platform)
11. [Social Media Posts](#11-social-media-posts)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Environment Variables

Create a `.env.local` file in the project root with these keys. Also add them to Netlify → Site settings → Environment variables.

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

# Google Calendar
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# App
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
ADMIN_EMAIL=your-admin-email@gmail.com

# E-sign (DocuSeal default)
ESIGN_PROVIDER=docuseal
DOCUSEAL_FORM_URL=https://your-docuseal-host/d/your-template-slug
ESIGN_WEBHOOK_SECRET=choose-a-long-random-secret
# Set your DocuSeal webhook URL to:
# https://your-site.netlify.app/api/onboarding/esign-webhook?secret=choose-a-long-random-secret

# Optional Dropbox Sign fallback (only if using ESIGN_PROVIDER=dropbox_sign)
DROPBOX_SIGN_API_KEY=...
DROPBOX_SIGN_CLIENT_ID=...
DROPBOX_SIGN_TEMPLATE_ID=...
DROPBOX_SIGN_SIGNER_ROLE=Student
DROPBOX_SIGN_TEST_MODE=1
DROPBOX_SIGN_REDIRECT_URL=https://your-site.netlify.app/onboarding
```

> **Never commit `.env.local` to GitHub.** It's already in `.gitignore`.

---

## 2. Supabase Setup

### Step 1 — Create Project
1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name, password, and region
3. Copy your **Project URL** and **API Keys** (Settings → API)

### Step 2 — Run Database Setup
1. In Supabase → **SQL Editor** → **+ New query**
2. Copy the entire contents of `supabase/SETUP.sql`
3. Paste and click **Run**

This creates all tables, RLS policies, and indexes in one shot. It's safe to re-run if needed.

### Step 3 — Configure Auth
1. Supabase → **Authentication** → **Settings**
2. Set **Site URL** to your Netlify URL (e.g., `https://your-site.netlify.app`)
3. Add to **Redirect URLs**: `https://your-site.netlify.app/auth/callback`
4. Also add `http://localhost:3000/auth/callback` for local dev

### Step 4 — Enable Email Auth
1. Authentication → **Providers** → **Email**
2. Enable **"Magic Link"** (no password sign-in)
3. Optionally disable "Confirm email" for easier local testing

### Step 5 — Configure Storage (for blog images / videos)
1. Supabase → **Storage** → **New Bucket**
2. Create a bucket named `blog-images` (public)
3. Create a bucket named `lesson-videos` (if using video hosting)
4. Ensure `onboarding-private` exists (private)
5. Ensure `lesson-documents` exists (public for student-accessible lesson docs)

---

## 3. Make Yourself Admin

After signing in once with your email, run this in Supabase SQL Editor:

```sql
UPDATE profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@gmail.com'
);
```

The admin nav link appears in gold once your session refreshes.

---

## 4. Stripe Setup

### Get API Keys

1. Sign up at [stripe.com](https://stripe.com)
2. Dashboard → **Developers** → **API keys**
3. Copy **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)
4. Add both to `.env.local` and Netlify

### Set Up Webhook (for booking confirmations)

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://your-site.netlify.app/api/stripe-webhook`
3. Events to listen for: `checkout.session.completed`
4. Copy the **signing secret** (`whsec_...`) → add as `STRIPE_WEBHOOK_SECRET`

### Going Live

1. Complete Stripe account verification (business details, banking info)
2. Switch toggle from **Test mode** to **Live mode**
3. Grab the live keys (`pk_live_...`, `sk_live_...`) and update Netlify env vars
4. Update webhook endpoint to use live mode

> **Prices are in cents.** $150.00 = `15000`. Always enter cents in slot creation.

---

## 5. Resend Email Setup

Used for transactional emails and admin broadcast campaigns.

### Get API Key

1. Sign up at [resend.com](https://resend.com)
2. **API Keys** → **Create API Key** (name it "Merlin Production")
3. Copy the key (`re_...`) → add as `RESEND_API_KEY` in `.env.local` and Netlify

### Verify Domain (Recommended for Production)

1. Resend → **Domains** → **Add Domain**
2. Enter your domain (e.g., `merlinflight.com`)
3. Add the DNS TXT/CNAME records to your DNS provider
4. Wait for verification (a few minutes)
5. Update `from:` in `/app/api/send-email/route.ts`:
   ```typescript
   from: 'Merlin Flight Training <hello@merlinflight.com>',
   ```

### Features Available

- **Email Broadcasts** — Admin → Email tab → pick recipients, compose, send
- **Recipient groups**: All Users, Students, Prospects, Discovery Flight Leads, or custom list
- **Transactional emails**: booking confirmations, magic links (handled automatically)

---

## 6. Google Calendar Setup

Automatically creates calendar events when bookings are confirmed.

### Step 1 — Create Google Cloud Project

1. [console.cloud.google.com](https://console.cloud.google.com) → **New Project** → name it "Merlin Flight Training"

### Step 2 — Enable Google Calendar API

1. ☰ Menu → **APIs & Services** → **Library**
2. Search "Google Calendar API" → **Enable**

### Step 3 — Create Service Account

1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **Service Account**
2. Name: `flight-booking-calendar`
3. Click through, skip optional steps

### Step 4 — Download Key

1. Click the service account → **Keys** tab → **Add Key** → **JSON**
2. A `.json` file downloads — keep it safe

### Step 5 — Add to Environment

From the downloaded JSON, copy these values to `.env.local`:
```env
GOOGLE_CLIENT_EMAIL=flight-booking-calendar@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

For Netlify, paste the private key value with literal `\n` characters (no actual newlines).

### Step 6 — Share Your Calendar

1. Google Calendar → find your calendar → **Settings** → **Share with specific people**
2. Add your service account email (`...@...iam.gserviceaccount.com`)
3. Set permission to **"Make changes to events"**
4. Copy the **Calendar ID** (under "Integrate calendar") → set as `GOOGLE_CALENDAR_ID`

---

## 7. Netlify Deployment

The site auto-deploys from the `main` branch on push.

### Initial Setup

1. [netlify.com](https://netlify.com) → **Add new site** → **Import from Git** → connect GitHub → select this repo
2. Build settings (should be auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Add all environment variables (see Section 1)
4. Click **Deploy**

### Custom Domain

1. Netlify → **Domain settings** → **Add custom domain**
2. Follow DNS instructions for your domain registrar
3. Netlify handles SSL automatically

### Re-deploying

Any push to `main` triggers a new deploy. You can also trigger manually:
Netlify → **Deploys** → **Trigger deploy** → **Deploy site**

---

## 8. Admin Dashboard Guide

Access at `/admin` (link appears in nav for admin users only).

### Slots — Managing Availability

1. Admin → **Slots** tab → **Add New Slot**
2. Fill in start/end time, type (Training or Tour), price in **cents**, and optional description
3. Click **Create Slot**

**Types:**
- **Training** — one-on-one instruction, shows green badge on schedule
- **Tour** — NYC sightseeing, shows blue badge

> You cannot delete a booked slot. Cancel the booking first.

### Bookings

Admin → **Bookings** tab shows all bookings with customer details.

Status options: `pending`, `paid`, `confirmed`, `canceled`, `completed`

Click a booking to update its status.

### Prospects

Admin → **Prospects** tab. See [Section 9](#9-crm--prospects--students).

### Blog Posts

Admin → **Blog** tab:
- **Add Post** — title, slug, content (rich text), excerpt
- Toggle **Published** to make it live on `/blog`
- Click a post to edit or delete it

### Social Media Feed

Admin → **Social** tab — manually add social media posts that appear on `/blog`:
- Platform: Instagram, TikTok, YouTube, Facebook
- URL, title, thumbnail, date, type (video / image / carousel)

### Email Campaigns

Admin → **Email** tab:
- Choose recipient group (All Users / Students / Prospects / Discovery Leads / Custom)
- Write subject and body
- Click **Send**

---

## 9. CRM — Prospects & Students

### Prospects (`/admin/prospects`)

Track everyone you've met who might become a student.

**Adding a prospect:**
- Admin → Prospects tab → **Add Prospect**
- Fill: name, email, phone, where/when you met them, interest level (hot/warm/cold)
- Set a next follow-up date and follow-up frequency (days)

**Working the pipeline:**
- Filter by status (Active / Converted / Lost / Inactive)
- Click any row or card to expand full details
- Update status as the lead progresses

**Statuses:** `active` → `converted` (enrolled as student) | `lost` | `inactive`

### Students (`/admin/students`)

Full student records with training history and currency tracking.

**What's tracked:**
- Certificate type and number
- Medical class and expiration
- Flight Review (BFR) date and due date
- IPC (Instrument Proficiency Check) date and due
- Rental currency date and due
- Total flight hours (PIC, dual, instrument)
- Training stage and notes

**Currency alerts:**
- Red badge = overdue
- Yellow badge = due within threshold (30 days for BFR, 14 for IPC, 7 for rental)

---

## 10. Learn Platform

Course-based learning system for enrolled students.

### Creating a Course

1. Admin → **Courses** tab → **New Course**
2. Add title and description
3. Inside the course → add **Units** (modules)
4. Inside each unit → add **Lessons**
5. Inside each lesson → upload **Videos**
6. Toggle **Published** when ready

### Enrolling a Student

Admin → **Enrollments** tab → **Add Enrollment** → select student and course.

Students see their courses at `/learn` once enrolled.

### Syllabus and Progress Tracking

Admin → **Debriefs** tab:
- Add **Syllabus Items** to a course (checklist of maneuvers/topics)
- Mark each item per student: `not_started` → `introduced` → `practiced` → `proficient` / `needs_work`
- Add a **Lesson Evaluation** after each flight (performance rating 1–5, strengths, improvements, homework)

Students see their progress at `/progress`.

---

## 11. Social Media Posts

Manually curate a social media feed that shows up in the Blog section.

1. Admin → **Social** tab → **Add Post**
2. Fill in: platform, URL, title, optional thumbnail URL, date, type
3. Posts appear in chronological order at `/blog` (Social Feed tab)

No API keys required — this is fully manual curation.

---

## 12. Troubleshooting

### Login / Magic Link Issues

**"Email link is invalid or has expired"**
- Magic links expire after 1 hour
- Check spam folder
- Make sure the redirect URL in Supabase Auth settings matches your actual site URL exactly
- If on Netlify preview URL (not the main domain), add that URL to Supabase's Redirect URLs list

**User stuck in loop after clicking magic link**
- Go to Supabase → Authentication → Settings
- Confirm **Site URL** matches your deployed URL (no trailing slash)
- Add `/auth/callback` to the Redirect URLs list

**Profile not created after signup**
- A trigger should auto-create the profile. If missing, run:
  ```sql
  INSERT INTO profiles (id) VALUES ('the-user-uuid-from-auth.users');
  ```

### Admin Access Denied

If you're logged in but can't access `/admin`, run this in SQL Editor:
```sql
UPDATE profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```
Then sign out and back in.

### Stripe Payments Not Confirming

1. Check that `STRIPE_WEBHOOK_SECRET` is correct in Netlify env vars
2. Verify the webhook endpoint URL in Stripe matches your actual site URL
3. In Stripe → Developers → Webhooks → click your endpoint → check recent events for errors

### Emails Not Sending

1. Verify `RESEND_API_KEY` is set correctly in Netlify
2. Check the Resend dashboard for failed delivery logs
3. If using a custom domain, confirm it's verified in Resend

### Onboarding E-sign Status Not Updating

1. Confirm `ESIGN_PROVIDER=docuseal` and `ESIGN_WEBHOOK_SECRET` are set in Netlify
2. In DocuSeal, point webhook URL to `https://your-site.netlify.app/api/onboarding/esign-webhook?secret=YOUR_SECRET`
3. Run one test signing and verify a new `esign_webhook_received` row appears in `onboarding_events`
4. If events exist but status is unchanged, check `onboarding_documents.provider_status` for the same user

### Database Errors on Re-deploy

All SQL in `SETUP.sql` uses `IF NOT EXISTS` and `DROP POLICY IF EXISTS`, so it's safe to re-run from scratch.

If you need to fully reset: Supabase → Table Editor → select table → **Delete all rows**, or drop and recreate via SQL Editor.
