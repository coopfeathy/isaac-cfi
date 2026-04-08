# Architecture

**Analysis Date:** 2026-04-08

## Executive Summary

Merlin Flight Training is a Next.js 16 application (App Router) deployed on Netlify, serving as a combined public marketing site, student portal, and CFI admin system. The architecture is a full-stack monolith: React Server and Client Components handle the frontend, Next.js Route Handlers serve as the API layer (all under `app/api/`), and Supabase provides both the PostgreSQL database and authentication. Stripe handles payments including Connect split payouts. Netlify Scheduled Functions handle background jobs. There is no separate backend service — everything runs within the Next.js process on Netlify.

## Pattern Overview

**Overall:** Full-stack Next.js monolith (App Router) with three distinct UI zones

**Key Characteristics:**
- No separate backend server — API routes live at `app/api/` as Next.js Route Handlers
- Three distinct layout zones: public site (root layout), admin zone (`/admin`), manage zone (`/manage`), and student learning hub (shared `LearningHubLayout` component)
- Authentication via Supabase magic-link OTP, stored in client-side `AuthContext`
- Admin authorization checked per-route by reading `profiles.is_admin` from Supabase (no middleware-level auth guard)
- Netlify Functions (`netlify/functions/`) run independently as background/scheduled jobs

## Authentication & Authorization

**Auth Provider:** Supabase magic-link (passwordless OTP via email)

**Flow:**
1. User submits email at `/login`
2. `AuthContext.signIn()` calls `supabase.auth.signInWithOtp()` → redirects to `/auth/callback`
3. Session persisted client-side; `AuthContext` wraps entire app at `app/layout.tsx`
4. `isAdmin` determined by `profile.is_admin` (DB field) OR email match against `NEXT_PUBLIC_ADMIN_EMAIL` env var (bootstrap fallback)

**API-Level Auth:** Every admin API route manually calls `supabase.auth.getUser(token)` from the `Authorization: Bearer` header, then re-queries `profiles.is_admin`. There is no shared auth middleware or Next.js `middleware.ts` file — each route implements its own `requireAdmin()` helper inline.

**Two Supabase Clients:**
- `lib/supabase.ts` — anon key client, used in browser and for user-scoped queries
- `lib/supabase-admin.ts` — service role client (`SUPABASE_SERVICE_ROLE_KEY`), used in server-only API routes to bypass RLS

## Data Flow

**Public Booking Flow (Slot-Based):**
1. Student views available slots via `GET /api/availability?week=YYYY-MM-DD` — runs `computeWeekAvailability()` from `lib/availability-engine.ts`
2. Student selects slot → `POST /api/slot-requests` creates a pending slot request
3. Admin approves/denies via `POST /api/admin/slot-requests/[id]/approve` or `/deny`
4. Approved slot triggers email notification via Resend, optionally creates CalDAV event

**Stripe Payment Flow:**
1. Admin generates a checkout link via `POST /api/admin/billing/checkout`
2. Student pays via Stripe Checkout Session or Payment Intent
3. Stripe fires webhook to `POST /api/stripe-webhook` (idempotent — checks `stripe_webhook_events` table)
4. Webhook updates `bookings.status = 'paid'`, marks `slots.is_booked = true`, sends confirmation email via Resend
5. For Stripe Connect split payouts: webhook parses `connect_payout_plan_v1` metadata JSON and calls `stripe.transfers.create()` per bucket; records in `stripe_connect_payout_ledger`

**Discovery Flight Funnel:**
- Multi-step funnel: `/discovery-flight-pt1` → pt2 → pt3 → pt4 (separate page per step)
- Also: `/discovery-flight-funnel` (alternate single-page variant) and `/discovery-flight` (legacy landing)
- Funnel APIs: `POST /api/discovery-flight-pt1`, `/pt2`, `/pt3`, `/discovery-flight-signup`

**Learning Hub (Student Portal):**
- Routes: `/learn`, `/learn/[courseId]`, `/learn/[courseId]/[lessonId]`, `/progress`, `/bookings`, `/lesson-scheduling`, `/documents`
- All wrapped in `LearningHubLayout` component with tab navigation
- Data fetched client-side from Supabase directly using anon key (no API route intermediary for most reads)

## Layers

**Public Marketing Pages:**
- Purpose: SEO-optimized marketing, lead capture, blog
- Location: `app/page.tsx`, `app/schedule/`, `app/pricing/`, `app/aircraft/`, `app/blog/`, `app/faq/`, `app/instructors/`, `app/training-options/`, `app/simulator/`
- Pattern: Mix of Server Components and `"use client"` pages; heavy use of `schema.ts` JSON-LD generators for SEO

**Student Portal:**
- Purpose: Authenticated student self-service
- Location: `app/dashboard/`, `app/learn/`, `app/progress/`, `app/bookings/`, `app/lesson-scheduling/`, `app/documents/`, `app/onboarding/`, `app/apply/`
- Depends on: `AuthContext`, `supabase` (anon client), `LearningHubLayout`

**Admin Zone (`/admin`):**
- Purpose: CFI-facing operational tools — bookings, billing, students, calendar, syllabus, prospects
- Location: `app/admin/` (13+ sub-sections), layout at `app/admin/layout.tsx`
- Layout: `AdminTopNav` + `AdminPageShell` wrapper component
- Auth gate: Client-side check via `useAuth().isAdmin` plus per-route server-side check in API handlers

**Manage Zone (`/manage`):**
- Purpose: System configuration — aircraft fleet, instructors, schedule templates, users, forms, groups
- Location: `app/manage/`
- Layout: `ManageSidebar` (fixed 280px sidebar) + main content area

**API Layer:**
- Purpose: All server-side mutations and authenticated reads
- Location: `app/api/` — split into `/admin/*` (admin-only) and public endpoints
- Pattern: Each `route.ts` implements its own auth check; no shared middleware

**Background Jobs (Netlify Functions):**
- Location: `netlify/functions/`
- `booking-monitor.ts` — cron every 5 min; checks booking/slot integrity, sends operational alerts via Resend
- `generate-discovery-slots.ts` — cron daily 07:00 UTC; auto-creates discovery flight slots
- `caldav-sync.ts` — CalDAV sync job
- `homework-email-dispatcher.ts` — processes homework email queue
- `book.ts`, `create-checkout.ts`, `create-payment-intent.ts`, `stripe-webhook.ts` — Netlify Function mirrors of some API routes (dual implementation — potentially legacy)

## Availability Engine

The core scheduling logic lives in `lib/availability-engine.ts`. It is a pure computation module with DB integration:

1. Reads `instructor_availability` table (weekly recurring template, by day_of_week)
2. Reads `availability_overrides` table (date-specific blocks or additions)
3. Reads booked `slots` table entries
4. Computes free ranges by subtracting busy from available using interval arithmetic
5. `computeAvailabilityFromData()` is exported as a pure function (testable without DB)
6. `computeWeekAvailability()` fetches data then calls the pure function

## State Management

**No global state library.** State is managed via:
- `AuthContext` (`app/contexts/AuthContext.tsx`) — global auth state (user, profile, isAdmin, session)
- Local `useState` within each page component — data fetched on mount via Supabase client or `fetch()` to API routes
- No Redux, Zustand, or React Query — all data fetching is ad-hoc `useEffect` + `useState` per page

## External Services

- **Supabase** — PostgreSQL DB + Auth (magic link OTP + session management)
- **Stripe** — Payments, Checkout Sessions, Payment Intents, Connect split transfers, webhooks
- **Resend** — Transactional email (booking confirmations, slot request decisions, payment receipts, homework emails, operational alerts)
- **Google Calendar API** — Calendar event creation (`lib/google-calendar.ts`, `app/api/book/`)
- **CalDAV (Apple Calendar)** — Two-way sync via `tsdav` library (`lib/caldav.ts`)
- **Dropbox Sign / DocuSeal** — E-signature for onboarding documents (`app/api/onboarding/esign/`)
- **Google Places API** — Live Google reviews displayed on homepage (`app/api/google-reviews/`)
- **Social Media APIs** — Instagram/TikTok/YouTube/Facebook feed aggregation (`lib/social-media.ts`)

## Deployment Model

- **Host:** Netlify
- **Build:** `npm run build` → Next.js output published at `.next/`
- **Functions:** `netlify/functions/` directory bundled with esbuild, includes scheduled cron jobs
- **Node version:** 20 (enforced via `.nvmrc` and `netlify.toml`)
- **Domain:** `merlinflighttraining.com` (also referenced as `isaac-cfi.netlify.app` in some email templates — legacy/dev URL still present in `lib/resend.ts`)
- **Caching:** Static assets and images cached with `max-age=31536000` via both `next.config.js` and `netlify.toml` headers

## Error Handling

**Strategy:** Inconsistent — no global error boundary pattern observed.

**Patterns:**
- API routes return JSON `{ error: string }` with HTTP status codes (400, 401, 403, 500)
- Client pages typically use local `useState` for error messages shown inline
- Webhook handler (`app/api/stripe-webhook/route.ts`) writes `status: 'failed'` + `error_message` to `stripe_webhook_events` table on exception — good resilience pattern
- `booking-monitor.ts` Netlify Function checks for data integrity issues and sends alert emails
- No Sentry or error tracking service detected

## Surprising / Non-Standard Patterns

1. **Dual implementation of some endpoints** — functions like `book.ts`, `stripe-webhook.ts`, `create-payment-intent.ts` exist in both `app/api/` (Next.js Route Handlers) AND `netlify/functions/` — it's unclear which is authoritative for production
2. **No Next.js middleware** — auth is enforced per-route rather than centrally; an unauthenticated user could theoretically load admin page HTML (though API calls would fail)
3. **Admin email bootstrap via env var** — `NEXT_PUBLIC_ADMIN_EMAIL` exposed to client as a comma-separated list of admin emails, used as fallback when `profiles.is_admin` is false
4. **`/manage` vs `/admin` split** — two separate admin zones with different layouts and purposes, which can be confusing; `/manage` appears to be system config, `/admin` is operational

---

*Architecture analysis: 2026-04-08*
