# Codebase Concerns

**Analysis Date:** 2026-04-08

## Executive Summary

The Merlin Flight Training codebase is a production Next.js 16 app handling real student bookings and Stripe payments. The core payment and webhook infrastructure is well-structured with idempotency keys and duplicate-event guards. However, several concerns need attention: the `/app/booking/` page routes through a legacy Netlify function that bypasses the Supabase auth system entirely; the `/app/admin/page.tsx` is a 3,275-line monolith that mixes concerns across bookings, prospects, blog, social, and email management; the `/manage` section has no server-side auth protection; file uploads are written to the local filesystem (breaking in serverless); and the Stripe SDK is pinned to a 2022 API version across 12+ files. None of these are showstoppers today, but they represent increasing risk as the business grows.

---

## Security

### MEDIUM — Admin routes protected client-side only in `/manage` section

The entire `/app/manage/*` tree (users, administrators, instructors, groups, aircraft, schedule, items, adjustments, forms) is protected only by `ManageSidebar` checking `isAdmin` and hiding the sidebar if false. There is no server-side auth check, no layout-level redirect, and no middleware guard on these routes. An unauthenticated user who navigates directly to `/manage/users` receives the page HTML and can interact with Supabase directly from the browser using the anon key.

- **Files:** `app/manage/layout.tsx`, `app/components/ManageSidebar.tsx`, `app/manage/users/page.tsx`, `app/manage/administrators/page.tsx`
- **Fix:** Add a server component layout wrapper that checks session and redirects to `/login` if not admin, mirroring the pattern already in `app/admin/page.tsx`. Alternatively, add Next.js middleware to block `/manage/*` for unauthenticated users.

### MEDIUM — `NEXT_PUBLIC_ADMIN_EMAIL` env var used as admin auth fallback

`AuthContext.tsx` grants admin access to any email listed in `NEXT_PUBLIC_ADMIN_EMAIL`, which is a `NEXT_PUBLIC_` variable — meaning it is embedded in the client-side JS bundle and visible to anyone who loads the site. An attacker who reads this value and gains access to that email address (or any auth system that accepts it) gets admin access. This was likely added as a bootstrap fallback but was never removed.

- **Files:** `app/contexts/AuthContext.tsx` line 106–108
- **Fix:** Remove the email fallback entirely. The DB-backed `profile.is_admin` flag is sufficient and already works. If bootstrapping is needed, use a one-time SQL update or a protected setup script.

### MEDIUM — `api/create-user` route has no admin authentication check

`app/api/create-user/route.ts` accepts a POST request and creates a Supabase auth user with `email_confirm: true` (bypassing email verification), then inserts a profile row. There is no `requireAdmin()` check — any caller with network access to the API can create users. Debug `console.log` statements at module load time also log environment variable presence to production logs.

- **Files:** `app/api/create-user/route.ts`
- **Fix:** Add the standard `requireAdmin(request)` guard (already used in billing, slot-request, and availability routes). Remove the top-level `console.log` statements.

### LOW — `private Annotated.pdf` committed to git history

A file named `private Annotated.pdf` (9.6 MB) is tracked by git and present at the repo root. The filename suggests annotated private content. Even if the file itself is not sensitive, it is permanently in git history.

- **Files:** `private Annotated.pdf` (repo root)
- **Fix:** Determine if the file contains sensitive content. If so, use `git filter-repo` to remove it from history entirely. Add `*.pdf` to `.gitignore` unless PDFs in `public/` are intentionally served.

### LOW — RLS policy on `profiles` allows public SELECT

`supabase/SETUP.sql` creates the policy `"Public profiles are viewable by everyone"` using `USING (true)`, meaning any authenticated or anonymous user can SELECT all rows from `profiles`. This table includes phone numbers, emergency contacts, address, date of birth, and the `is_admin` flag.

- **Files:** `supabase/SETUP.sql` lines 44–49
- **Fix:** Change the SELECT policy to `USING (auth.uid() = id)` for regular users plus a separate admin bypass via service role. The service role key (used in all admin API routes) bypasses RLS anyway, so restricting public SELECT has no operational impact.

### LOW — Blog image upload writes to local filesystem

`app/api/upload-image/route.ts` saves uploaded files to `public/blog-images/` using `fs.writeFile`. On Netlify (serverless), the filesystem is ephemeral — files written here disappear between function invocations. There is also no authentication check, no file type validation, and no file size limit, meaning any unauthenticated request can upload arbitrary files.

- **Files:** `app/api/upload-image/route.ts`
- **Fix:** Add admin auth check, validate MIME type against an allowlist (`image/jpeg`, `image/png`, `image/webp`), enforce a size limit (~5 MB), and upload to Supabase Storage instead of the local filesystem.

---

## Performance

### MEDIUM — `app/admin/page.tsx` is 3,275 lines — all loaded eagerly

The main admin dashboard (`app/admin/page.tsx`) renders all admin sections (slots, bookings, prospects, social posts, email campaigns, settings) in a single client component. Every tab's data is fetched on mount, all JSX is in one file. This creates a large JS bundle for the admin view and makes the file extremely hard to maintain.

- **Files:** `app/admin/page.tsx`
- **Fix:** Extract each tab (Slots, Bookings, Prospects, Blog, Social, Email, Settings) into its own component file under `app/admin/components/`. Use lazy loading (`React.lazy` + `Suspense`) per tab so JS and data fetches happen only when the tab is visited.

### MEDIUM — `getSupabaseAdmin()` creates a new client on every API call

`lib/supabase-admin.ts` calls `createClient(...)` fresh inside `getSupabaseAdmin()`. This function is called at the top of nearly every admin API route handler, meaning a new client object is instantiated on every request. While Supabase clients are lightweight, this pattern prevents connection pooling and adds unnecessary overhead.

- **Files:** `lib/supabase-admin.ts`, called in ~25 route files
- **Fix:** Initialize the admin client once as a module-level singleton (with a guard for missing env vars) and export the instance directly. This is the pattern used in `lib/supabase.ts`.

### LOW — Google Reviews API has no client-side caching layer

`app/api/google-reviews/route.ts` uses `next: { revalidate: 600 }` for the fetch, which relies on Next.js ISR caching. This is correct. However, if the Google Places API is unavailable or rate-limited, there is no stale-while-revalidate fallback and the route returns a 502 to the homepage, potentially breaking the reviews section entirely.

- **Files:** `app/api/google-reviews/route.ts`
- **Fix:** Cache the last successful response in Supabase or a simple key-value store. On failure, return the cached result with a warning flag rather than a 502.

---

## Tech Debt

### HIGH — Legacy booking flow (`/app/booking/`) uses a dead Netlify function

`app/components/BookingForm.tsx` POSTs to `/.netlify/functions/book`, which calls the Google Calendar API to create an event. However, the Netlify function's stripe-webhook handler has an explicit comment: "Google Calendar integration removed in favor of Apple-compatible .ics export." The modern booking flow is handled by `app/api/create-payment-intent/route.ts` and the Stripe webhook. The `/app/booking/` page and `BookingForm.tsx` component appear to be a legacy flow that is no longer correct — it does not create a Supabase booking record or charge Stripe.

- **Files:** `app/booking/page.tsx`, `app/components/BookingForm.tsx`, `netlify/functions/book.ts`, `app/api/book/route.ts`
- **Impact:** If any user reaches `/booking`, their "booking" goes to Google Calendar only, no payment is taken, no Supabase record is created. Dual booking systems cause data inconsistency.
- **Fix:** Determine if `/app/booking/` is reachable from any nav link or ad campaign. If not, add a redirect to the active scheduling flow (`/schedule` or `/lesson-scheduling`). Remove or archive the dead components.

### HIGH — Debug `console.log` statements in production API routes

`app/api/create-user/route.ts` has three `console.log` calls at module-load time (not inside a request handler) — they fire on every cold start in production. `app/contexts/AuthContext.tsx` logs the user's email and redirect URL on every sign-in attempt. `app/api/contact/route.ts` logs the full contact form submission (name, email, phone, message) when `RESEND_API_KEY` is not set, as a "fallback."

- **Files:** `app/api/create-user/route.ts` lines 5–7, `app/contexts/AuthContext.tsx` lines 75–86, `app/api/contact/route.ts` lines 92–98
- **Impact:** PII (email addresses, phone numbers) appears in server logs. Module-level logs fire on cold start regardless of whether the route is called.
- **Fix:** Remove all debug `console.log` calls. Use `console.error` only in catch blocks. The contact fallback should either silently succeed or return an error — not log PII.

### MEDIUM — Stripe SDK pinned to `2022-11-15` API version across 12+ files

The Stripe Node SDK is pinned to API version `'2022-11-15'` in `app/api/stripe-webhook/route.ts`, `app/api/create-payment-intent/route.ts`, `app/api/admin/billing/checkout/route.ts`, and 9 other files. Stripe's current stable API version (as of April 2026) is `'2025-02-24.acacia'`. The installed `stripe` package is `^12.8.0` but the current major is 17.x. Staying on old versions risks missing security patches, webhook validation improvements, and new payment method support.

- **Files:** 12 route files across `app/api/admin/billing/` and `app/api/`; `netlify/functions/`
- **Fix:** Upgrade `stripe` package to latest major. Update `apiVersion` in all Stripe client instantiations. Test webhook handling in a Stripe test environment before deploying. Note: this is a breaking change — review Stripe's migration guide.

### MEDIUM — Duplicate `requireAdmin` function defined in multiple route files

The `requireAdmin(request)` function is copy-pasted identically (or near-identically) in at least 5 route files: `app/api/admin/billing/checkout/route.ts`, `app/api/admin/billing/push-checkout-link/route.ts`, `app/api/admin/availability-overrides/route.ts`, `app/api/admin/health/route.ts`, and others. Any change to admin auth logic (e.g., adding role-based access) must be updated in each file separately.

- **Files:** All `app/api/admin/*/route.ts` files
- **Fix:** Extract `requireAdmin` to `lib/auth.ts` and import it in each route. One-line fix per file, eliminates drift risk.

### MEDIUM — `/manage` section is a separate admin UI with duplicated functionality

The `/app/manage/` directory is a second admin interface (with dark sidebar, emoji icons, inline styles) that overlaps with `/app/admin/`. Both manage users, aircraft, and schedules. The `/manage` section appears to be an older iteration that was partially replaced by `/admin` but never removed. Most `/manage` sub-pages query Supabase directly from the client component without server-side auth.

- **Files:** `app/manage/` (all files), `app/components/ManageSidebar.tsx`
- **Fix:** Audit which `/manage` pages are still actively used vs. replaced by `/admin` equivalents. Remove or redirect stale pages. Migrate any unique functionality into the `/admin` structure.

### LOW — `app/admin/page 2.tsx` is a stale duplicate file

A file named `app/admin/page 2.tsx` (with a space in the filename) exists alongside `app/admin/page.tsx`. It appears to be an abandoned alternate version of the admin dashboard. Files with spaces in their names cause issues with some build tools and scripts.

- **Files:** `app/admin/page 2.tsx`
- **Fix:** Delete the file. Confirm it is not referenced anywhere (no imports found).

### LOW — `app/api/book/route.ts` hardcodes a personal Gmail address

`app/api/book/route.ts` line 31 hardcodes `calendarId: "isaacthecfi@gmail.com"` directly in the source code. While this route appears to be part of the legacy booking flow (see above), hardcoded credentials or identifiers in source code become a maintenance problem and a risk if the email changes or the account is compromised.

- **Files:** `app/api/book/route.ts` line 31
- **Fix:** Move to `process.env.GOOGLE_CALENDAR_ID`. Address as part of the legacy booking flow cleanup.

### LOW — Passwords displayed in plaintext in the UI during user creation

`app/manage/users/page.tsx` renders `<code>{formData.password}</code>` directly in the form when a password is set. `app/manage/administrators/page.tsx` generates a random password and (implicitly) displays it. While these are admin-only pages, displaying passwords in plaintext HTML is poor practice.

- **Files:** `app/manage/users/page.tsx` lines 449–452, `app/manage/administrators/page.tsx` line 24
- **Fix:** Use a "reveal" toggle with `type="password"` input. For generated passwords, copy to clipboard instead of rendering in the DOM.

---

## Scalability

### MEDIUM — No rate limiting on public API endpoints

Public-facing API routes — `app/api/contact/route.ts`, `app/api/discovery-flight-pt1/route.ts`, `app/api/discovery-flight-pt2/route.ts`, `app/api/discovery-flight-pt3/route.ts`, `app/api/discovery-flight-signup/route.ts`, and `app/api/slot-requests/route.ts` — have no rate limiting. A bot can submit the discovery flight funnel or slot request form thousands of times per minute, flooding the `prospects` and `slot_requests` tables and potentially triggering many Twilio SMS/Resend email sends.

- **Files:** All `app/api/discovery-flight-*/route.ts`, `app/api/contact/route.ts`, `app/api/slot-requests/route.ts`
- **Fix:** Implement rate limiting using Netlify Edge Functions or an in-memory store (e.g., `@upstash/ratelimit` with Redis). Minimum: 10 requests per IP per hour on form submission endpoints.

### LOW — Stripe Connect payout rules hardcode real Stripe account IDs in SQL

`supabase/RULES.sql` hardcodes production Stripe account IDs (`acct_1FbdK6Cus0IiI5gg`, `acct_1TGjHxE14NEZerCV`, `acct_1TEH7GENasfvDHGO`) in the SQL seed file that is committed to git. These are not secrets — account IDs are not API keys — but they couple the repo to specific production accounts and would need to be updated if accounts change.

- **Files:** `supabase/RULES.sql`
- **Fix:** Acceptable as-is for a small operation. Consider parameterizing account IDs in environment-specific seed files if a staging environment is ever added.

---

## Missing Features / Gaps

### HIGH — Contact form silently no-ops when `RESEND_API_KEY` is unset

`app/api/contact/route.ts` returns `{ success: true }` even when no email is sent, logging the submission to console instead. If `RESEND_API_KEY` is missing in production, every contact form submission appears to succeed to the user but Isaac never receives the message.

- **Files:** `app/api/contact/route.ts` lines 89–107
- **Fix:** Return a 503 error when the email service is not configured, so the UI can show an appropriate message. Do not silently succeed. Alternatively, save the submission to a `contact_submissions` Supabase table as a fallback.

### MEDIUM — `/manage` sub-pages (groups, forms, schedule, instructors, adjustments) appear incomplete

Several `/manage` pages query Supabase tables (`groups`, `forms`, `flights`, `instructors`, `adjustments`) that may not exist in the current schema (`supabase/SETUP.sql`). These pages render "no items found" or throw runtime errors if the tables are missing. There is no indication these features are planned or actively maintained.

- **Files:** `app/manage/groups/page.tsx`, `app/manage/forms/page.tsx`, `app/manage/schedule/page.tsx`, `app/manage/instructors/page.tsx`, `app/manage/adjustments/page.tsx`
- **Fix:** Audit whether these tables exist in production. Remove pages for features that are not implemented. If they are planned, add stub UI with a "coming soon" message instead of live Supabase queries.

### MEDIUM — No CSP (Content Security Policy) header configured

`next.config.js` sets `X-Frame-Options`, `X-Content-Type-Options`, and `X-XSS-Protection` headers but does not set a `Content-Security-Policy` header. The site loads inline Stripe JS, Resend-sent emails, and inline SVGs — all of which need to be accounted for in a CSP. Without CSP, XSS attacks have no additional browser-level mitigation.

- **Files:** `next.config.js` lines 15–67
- **Fix:** Add a CSP header allowing `'self'`, `js.stripe.com`, and required CDN domains. Start in report-only mode (`Content-Security-Policy-Report-Only`) to identify violations before enforcing.

### LOW — No test coverage for billing, student management, or admin pages

Existing tests cover: `availability-engine`, `caldav`, `calendar types`, `slot-requests` routes, and `availability` routes. The billing system (`app/api/admin/billing/*`), student management (`app/api/admin/students/*`), and the Stripe webhook handler (`app/api/stripe-webhook/route.ts`) — all handling real money and PII — have zero test coverage.

- **Files:** `app/api/admin/billing/`, `app/api/admin/students/`, `app/api/stripe-webhook/route.ts`
- **Risk:** A regression in the Stripe webhook could result in payments being marked as paid without transferring funds, or transfers being double-created. No tests would catch this before production.
- **Fix:** Start with `app/api/stripe-webhook/route.ts` — write unit tests for the `payment_intent.succeeded` and `charge.refunded` branches using mocked Stripe event payloads.

---

*Concerns audit: 2026-04-08*
