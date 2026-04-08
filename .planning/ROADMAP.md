# Roadmap: Merlin Flight Training Platform

## Overview

Six phases transform a working but fragile flight school app into a self-operating business. Phase 1 locks down security vulnerabilities and extracts shared auth utilities — a hard prerequisite for everything that follows. Phase 2 consolidates the two admin UIs into one and kills the 3,275-line monolith. Phases 3 and 4 run in parallel: CFI portal and student self-service + billing ship simultaneously. Phase 5 performs the isolated Stripe SDK upgrade after the billing system is stable and the webhook audit is complete. Phase 6 adds the lead nurturing engine and career pipeline content that make Merlin a compelling destination for pilots who want a career, not just a license.

## Phases

- [ ] **Phase 1: Security Hardening** - Lock down auth, extract shared utilities, eliminate PII leaks
- [ ] **Phase 2: Admin Consolidation** - Retire /manage, decompose the monolith, unify admin into one zone
- [ ] **Phase 3: CFI Portal** - Instructors get their own zone for schedules, rosters, and flight logging
- [ ] **Phase 4: Student Self-Service + Billing** - Students can book, cancel, pay, and manage everything without Isaac
- [ ] **Phase 5: Stripe SDK Upgrade** - Isolated upgrade from stripe 12.x to 17.x across all 12 files
- [ ] **Phase 6: Lead Nurturing + Career Content** - Automated follow-up sequences and the "train here, get hired here" narrative

## Phase Details

### Phase 1: Security Hardening
**Goal**: Protected routes enforce auth server-side, shared auth utilities exist in one place, no PII leaks to logs or client bundles
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10
**Success Criteria** (what must be TRUE):
  1. Navigating to `/manage/users` without a session redirects server-side to `/login` (not a blank page or client-redirect flicker)
  2. `lib/auth.ts` exports `requireAdmin()`, `requireCFI()`, and `requireUser()` — importable by any route, no inline copies remain
  3. Production server logs contain zero email addresses, phone numbers, or form submission PII
  4. The `NEXT_PUBLIC_ADMIN_EMAIL` variable is gone from the codebase and Netlify dashboard
  5. `/booking/` redirects to `/schedule`; `api/upload-image` rejects unauthenticated requests and non-image MIME types
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Extract requireAdmin(), requireCFI(), requireUser() to lib/auth.ts with TDD + create middleware.ts (SEC-03, SEC-04)
- [x] 01-02-PLAN.md — Harden /manage layout, remove NEXT_PUBLIC_ADMIN_EMAIL, guard create-user API, remove PII logs (SEC-01, SEC-02, SEC-05, SEC-06, SEC-07)
- [x] 01-03-PLAN.md — Harden upload-image (auth + MIME + size + Storage) and contact form (503 + DB fallback + PII removal) (SEC-07, SEC-08, SEC-10)
- [x] 01-04-PLAN.md — Replace 23 inline requireAdmin copies with imports + retire /booking with redirect (SEC-04, SEC-09)

### Phase 2: Admin Consolidation
**Goal**: One unified `/admin` zone covers all operations; `/manage` is fully retired; the monolith is decomposed into lazy-loaded tabs
**Depends on**: Phase 1
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-06, ADMIN-07, ADMIN-08, ADMIN-09
**Success Criteria** (what must be TRUE):
  1. Navigating to any `/manage/*` URL redirects to the equivalent `/admin` page (no dead links)
  2. The admin dashboard loads in under 2 seconds — only the active tab's data fetches on mount
  3. Each admin tab (Bookings, Students, Billing, Calendar, Prospects, Blog, Settings) lives in its own component file, independently loadable
  4. Admin can view the prospect pipeline with follow-up status and update lead stage without leaving `/admin`
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Decompose `app/admin/page.tsx` monolith into lazy-loaded tab components (ADMIN-08)
- [x] 02-02-PLAN.md — Migrate unique `/manage` functionality into `/admin`, add redirects, retire `/manage` zone (ADMIN-01, ADMIN-06, ADMIN-07)
- [x] 02-03-PLAN.md — Wire admin prospect pipeline view with status updates (ADMIN-02, ADMIN-03, ADMIN-09)
**UI hint**: yes

### Phase 3: CFI Portal
**Goal**: An instructor can log in and access their own zone — schedule, student roster, flight hour logging, endorsements — without touching the admin interface
**Depends on**: Phase 1 (requireCFI() must exist in lib/auth.ts before this phase begins)
**Requirements**: CFI-01, CFI-02, CFI-03, CFI-04, CFI-05, CFI-06, CFI-07
**Success Criteria** (what must be TRUE):
  1. A user with `is_instructor = true` can access `/cfi`; a regular student hitting that URL is redirected away
  2. A CFI can view all upcoming lessons assigned to them without seeing other instructors' bookings
  3. A CFI can set their weekly availability template and see it reflected in the student-facing slot picker
  4. A CFI can log flight hours and endorsements for a specific student/lesson from the portal
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Create `/cfi` zone with `requireCFI()` layout guard, schedule view, and availability editor (CFI-01, CFI-02, CFI-03, CFI-07)
- [ ] 03-02-PLAN.md — Student roster view — CFI sees students assigned via `instructor_id` with training status (CFI-04)
- [ ] 03-03-PLAN.md — Flight hour logging and endorsement/milestone recording per student (CFI-05, CFI-06)
**UI hint**: yes

### Phase 4: Student Self-Service + Billing
**Goal**: A student can book a lesson, cancel it, receive a $50 cancellation fee charge, view their invoice, and pay it — all without Isaac touching anything
**Depends on**: Phase 1
**Note**: Runs in parallel with Phase 3. Stripe webhook dual-endpoint audit (STRIPE-01) must be completed during this phase, before Phase 5 begins.
**Requirements**: ADMIN-04, ADMIN-05, BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07, BOOK-08, STU-01, STU-02, STU-03, STU-04, STU-05, STU-06, STU-07, BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06
**Success Criteria** (what must be TRUE):
  1. A student can view available slots and request a booking from their portal with no payment upfront
  2. Cancelling a booked lesson charges $50 to the card on file immediately via Stripe; if no card exists, the fee is flagged on the student account for the next invoice
  3. Slot and booking records update atomically on cancellation — no orphaned slot records exist after any cancellation
  4. A CFI marking a lesson complete triggers admin to generate an invoice in one click; the invoice emails to the student and the student can pay via Stripe without logging in
  5. Students can save a payment method via Setup Intent and access the Stripe Billing Portal from their dashboard
  6. All student portal routes enforce server-side auth (no client-side-only guards remain)
**Plans**: 5 plans

Plans:
- [ ] 04-01: Slot viewing and lesson booking flow — no-payment request, approval email (BOOK-01, BOOK-02, BOOK-03, BOOK-08)
- [ ] 04-02: Cancellation flow — Supabase RPC for atomic slot+booking update, $50 Stripe charge or flagged-fee path (BOOK-04, BOOK-05, BOOK-06, BOOK-07, BILL-04)
- [ ] 04-03: Student portal auth hardening and self-service views — booking history, hours, documents, payment method save (STU-01, STU-02, STU-03, STU-05, STU-06, STU-07)
- [ ] 04-04: Invoice generation and payment flow — admin one-click invoice, Stripe invoice email, student pay-without-login link, webhook idempotency; admin cancellation fee visibility (ADMIN-04, ADMIN-05, BILL-01, BILL-02, BILL-03, BILL-05, BILL-06)
- [ ] 04-05: Stripe webhook dual-endpoint audit — confirm single active endpoint before Phase 5 begins; also: student invoice view in portal (STRIPE-01, STU-04)
**UI hint**: yes

### Phase 5: Stripe SDK Upgrade
**Goal**: The Stripe SDK runs on 17.x with the current API version across all files; webhook signature verification works correctly with the new SDK
**Depends on**: Phase 4 (billing system must be stable and STRIPE-01 audit complete before any SDK changes)
**Note**: Must be fully isolated — no feature work in the same branch or deployment window.
**Requirements**: STRIPE-01, STRIPE-02, STRIPE-03, STRIPE-04, STRIPE-05
**Success Criteria** (what must be TRUE):
  1. `stripe` package version in `package.json` is `^17.x`; `apiVersion` in all instantiations reads `'2025-02-24.acacia'`
  2. The Stripe webhook handler uses `req.text()` for signature verification and processes test events without error
  3. `@stripe/stripe-js` and `@stripe/react-stripe-js` client packages match the server SDK major version
  4. A test payment and test webhook replay in Stripe dashboard both succeed after the upgrade
**Plans**: 2 plans

Plans:
- [ ] 05-01: Upgrade `stripe` server package to 17.x, update `apiVersion` across all 12 route files and Netlify functions, fix `req.text()` webhook handler (STRIPE-02, STRIPE-03, STRIPE-04)
- [ ] 05-02: Upgrade `@stripe/stripe-js` and `@stripe/react-stripe-js` client packages; smoke-test payment flow end-to-end (STRIPE-05)

### Phase 6: Lead Nurturing + Career Content
**Goal**: Discovery flight prospects receive automatic follow-up sequences; admin can manage the pipeline; the site makes the "train here, get hired here" case to every visitor
**Depends on**: Phase 2 (prospect pipeline in admin), Phase 1 (rate limiting requires auth infrastructure)
**Requirements**: LEAD-01, LEAD-02, LEAD-03, LEAD-04, LEAD-05, PUB-01, PUB-02, PUB-03, PUB-04
**Success Criteria** (what must be TRUE):
  1. A discovery flight form submission that doesn't convert triggers three follow-up emails automatically: immediate, day 3, day 7 via Resend
  2. Every discovery flight submission saves to the `prospects` table even if the email send fails
  3. Admin can update a prospect's status (new / contacted / booked / no-show / converted) from the pipeline view
  4. Rate limiting blocks more than 10 discovery flight funnel or contact form requests per IP per hour
  5. The `/careers` page exists and tells the Student → PPL → Instrument → CFI → hired at Merlin story; "train here, get hired here" copy appears on the homepage, pricing, and discovery flight pages
**Plans**: 3 plans

Plans:
- [ ] 06-01: Prospect persistence and follow-up email sequences — save all submissions to `prospects`, Resend sequences at day 0 / 3 / 7 (LEAD-01, LEAD-02)
- [ ] 06-02: Rate limiting on discovery flight funnel, contact form, and slot request endpoints via Upstash Redis (LEAD-04, LEAD-05)
- [ ] 06-03: Career pipeline page and "train here, get hired here" content integration across homepage, pricing, and discovery flight pages; confirm blog SEO pipeline and social feed still functional (LEAD-03, PUB-01, PUB-02, PUB-03, PUB-04)
**UI hint**: yes

## Progress

**Execution Order:**
Phases 1 → 2 → (3 parallel with 4) → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Hardening | 0/4 | Not started | - |
| 2. Admin Consolidation | 0/3 | Not started | - |
| 3. CFI Portal | 0/3 | Not started | - |
| 4. Student Self-Service + Billing | 0/5 | Not started | - |
| 5. Stripe SDK Upgrade | 0/2 | Not started | - |
| 6. Lead Nurturing + Career Content | 0/3 | Not started | - |
