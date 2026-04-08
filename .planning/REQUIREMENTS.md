# Requirements: Merlin Flight Training Platform

**Defined:** 2026-04-08
**Core Value:** A student can discover, book, pay for, and manage their entire flight training journey online without Isaac manually touching anything.

---

## v1 Requirements

### Security & Auth (SEC)

- [ ] **SEC-01**: All `/manage/*` routes redirect unauthenticated users to `/login` server-side (not client-side)
- [ ] **SEC-02**: All `/manage/*` routes redirect non-admin users to `/dashboard` server-side
- [ ] **SEC-03**: `middleware.ts` handles session refresh for all authenticated zones using `@supabase/ssr` `getUser()` (not `getSession()`)
- [ ] **SEC-04**: `lib/auth.ts` exports `requireAdmin()`, `requireCFI()`, and `requireUser()` used by all API route handlers (no more inline copies)
- [ ] **SEC-05**: `api/create-user` requires admin authentication before creating any user account
- [ ] **SEC-06**: `NEXT_PUBLIC_ADMIN_EMAIL` environment variable is removed from code and Netlify dashboard
- [ ] **SEC-07**: All PII-logging `console.log` calls removed from production API routes (email, phone, form submissions)
- [ ] **SEC-08**: Contact form returns HTTP 503 when `RESEND_API_KEY` is unset (no silent no-op)
- [ ] **SEC-09**: Legacy `/booking/` route redirects to `/schedule` (no longer reachable, dead Netlify function retired)
- [ ] **SEC-10**: `api/upload-image` requires admin authentication, validates MIME type (jpeg/png/webp only), and enforces 5MB size limit

### Booking (BOOK)

- [ ] **BOOK-01**: Student can view available lesson slots for the current and upcoming weeks without logging in
- [ ] **BOOK-02**: Student can request a lesson slot after logging in (no payment required to book)
- [ ] **BOOK-03**: Student receives a booking confirmation email when their slot request is approved
- [ ] **BOOK-04**: Student can cancel a booked lesson from their portal
- [ ] **BOOK-05**: Cancellation charges a $50 fee to the student's card on file via Stripe
- [ ] **BOOK-06**: If no card on file at cancellation, a $50 fee is flagged on the student's account to be added to their next invoice
- [ ] **BOOK-07**: Slot and booking records are updated atomically on cancellation (no orphaned slots)
- [ ] **BOOK-08**: Discovery flight booking confirms without admin approval when a slot is available

### Student Portal (STU)

- [ ] **STU-01**: Student can view their full booking history (past and upcoming)
- [ ] **STU-02**: Student can view their logged flight hours and milestones
- [ ] **STU-03**: Student can access their training documents (endorsements, certificates)
- [ ] **STU-04**: Student can view outstanding invoices and pay them online via Stripe
- [ ] **STU-05**: Student can save a payment method on file (Stripe Setup Intent)
- [ ] **STU-06**: Student can view the Stripe Billing Portal (hosted invoice management) from their portal
- [ ] **STU-07**: Student portal enforces authentication via server-component layout guard (not client-side)

### CFI Portal (CFI)

- [ ] **CFI-01**: A user with `is_instructor = true` can access the `/cfi` zone (denied to unauthenticated users and non-instructor/non-admin users)
- [ ] **CFI-02**: CFI can view their upcoming lesson schedule
- [ ] **CFI-03**: CFI can set and edit their weekly availability (replaces `/manage/schedule` for CFIs)
- [ ] **CFI-04**: CFI can view their full student roster (students assigned to them via `instructor_id`)
- [ ] **CFI-05**: CFI can log flight hours for a specific student/lesson
- [ ] **CFI-06**: CFI can log endorsements and training milestones per student
- [ ] **CFI-07**: Admin users can also access the CFI portal (admin is a superset of CFI)

### Admin Portal (ADMIN)

- [ ] **ADMIN-01**: Single unified `/admin` zone — `/manage` is fully retired with redirects
- [ ] **ADMIN-02**: Admin can view and manage all bookings (approve, deny, cancel)
- [ ] **ADMIN-03**: Admin can view and manage all students and their profiles
- [ ] **ADMIN-04**: Admin can create and send invoices to students via Stripe
- [ ] **ADMIN-05**: Admin can view cancellations flagged for $50 fee (students without card on file)
- [ ] **ADMIN-06**: Admin can manage instructor availability and the fleet (aircraft)
- [ ] **ADMIN-07**: Admin can manage the discovery flight slot auto-generation schedule
- [ ] **ADMIN-08**: Admin dashboard decomposes into independently-loaded tabs (Bookings, Students, Billing, Calendar, Prospects, Blog, Settings) — not a single 3,275-line component
- [ ] **ADMIN-09**: Admin can view and update prospect pipeline (discovery flight leads with follow-up status)

### Billing (BILL)

- [ ] **BILL-01**: After a CFI logs a lesson as complete, admin can generate an invoice for that lesson in one click
- [ ] **BILL-02**: Invoices are created via Stripe and emailed to the student automatically
- [ ] **BILL-03**: Student can pay outstanding invoices via Stripe Checkout (no login wall for payment)
- [ ] **BILL-04**: Cancellation fee ($50) is charged via Stripe immediately when card is on file
- [ ] **BILL-05**: Stripe webhook marks lessons as paid and updates booking status (idempotent, duplicate-safe)
- [ ] **BILL-06**: Admin can view all invoices, payments, and outstanding balances per student

### Lead Intake (LEAD)

- [ ] **LEAD-01**: Discovery flight funnel (4-step) sends automatic follow-up email sequence (immediate, day 3, day 7) via Resend when a prospect doesn't convert
- [ ] **LEAD-02**: All discovery flight form submissions are saved to the `prospects` table (even if email fails)
- [ ] **LEAD-03**: Admin can update prospect status (new / contacted / booked / no-show / converted)
- [ ] **LEAD-04**: Rate limiting on discovery flight funnel endpoints (max 10 requests/IP/hour) via Upstash Redis
- [ ] **LEAD-05**: Rate limiting on contact form and slot request endpoints

### Public Content (PUB)

- [ ] **PUB-01**: Dedicated career pipeline page: Student → Private Pilot → Instrument Rating → CFI → Hired at Merlin (→ cargo pilot pathway mentioned as future opportunity)
- [ ] **PUB-02**: "Train here, get hired here" narrative woven into homepage, pricing page, and discovery flight landing page
- [ ] **PUB-03**: Blog supports SEO-optimized posts with JSON-LD Article schema and OG images (existing pipeline maintained)
- [ ] **PUB-04**: Social media feed displays on homepage (existing Instagram/TikTok/YouTube integration maintained)

### Stripe Upgrade (STRIPE)

- [ ] **STRIPE-01**: Stripe dashboard audit confirms exactly one active webhook endpoint (`/api/stripe-webhook`) before any SDK changes
- [ ] **STRIPE-02**: `stripe` package upgraded from `12.18.0` to `^17.x` across all 12 route files and Netlify functions
- [ ] **STRIPE-03**: `apiVersion` updated to `'2025-02-24.acacia'` in all Stripe client instantiations
- [ ] **STRIPE-04**: Webhook handler uses `req.text()` (not `req.json()`) for signature verification after upgrade
- [ ] **STRIPE-05**: `@stripe/stripe-js` and `@stripe/react-stripe-js` client packages updated to match server SDK

---

## v2 Requirements

### Booking

- **BOOK-V2-01**: Student can reschedule a booked lesson (currently cancel + re-book; direct reschedule is v2)
- **BOOK-V2-02**: Booking reminder emails sent 24 hours and 2 hours before each lesson
- **BOOK-V2-03**: Discovery flight slots auto-confirmed without admin approval (requires 2+ weeks of zero double-booking after self-service ships)
- **BOOK-V2-04**: Block lesson packages (e.g., pay for 5 lessons at a discount)

### Billing

- **BILL-V2-01**: Student opt-in autopay — save card and auto-charge after each completed lesson (Setup Intent → automatic Invoice charge)
- **BILL-V2-02**: Lesson packages with prepaid credit deducted per lesson

### CFI Portal

- **CFI-V2-01**: CFI can message students directly through the portal
- **CFI-V2-02**: CFI can view a student's full syllabus progress and mark curriculum items complete

### Admin

- **ADMIN-V2-01**: Admin can create and assign curriculum tracks to students
- **ADMIN-V2-02**: Error tracking integration (Sentry or similar) for production monitoring

### Infrastructure

- **INFRA-V2-01**: CSP (Content Security Policy) header added to `next.config.js` in report-only mode
- **INFRA-V2-02**: RLS policy on `profiles` tightened to `auth.uid() = id` (currently public SELECT)
- **INFRA-V2-03**: Test coverage for Stripe webhook handler (payment_intent.succeeded, charge.refunded branches)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cargo company website | Future business; Merlin must be self-operating first |
| Native mobile app | Web-responsive is sufficient at current scale |
| Multi-school / franchise features | Single location only (FRG) |
| Custom LMS course authoring | Existing learning hub structure is sufficient |
| Live chat / ticketing | Email and direct contact sufficient |
| IACRA / FAA API integration | High complexity, no immediate student value |
| Student-to-student social features | Not core to flight training value |
| Real-time collaborative scheduling | Not required at current instructor headcount |
| Autopay (v1) | Complexity of Setup Intent → auto-invoice deferred to v2 after manual billing is stable |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 through SEC-10 | Phase 1 | Pending |
| ADMIN-08 | Phase 2 | Pending |
| ADMIN-01 through ADMIN-07, ADMIN-09 | Phase 2 | Pending |
| CFI-01 through CFI-07 | Phase 3 | Pending |
| BOOK-01 through BOOK-08 | Phase 4 | Pending |
| STU-01 through STU-07 | Phase 4 | Pending |
| BILL-01 through BILL-06 | Phase 4 | Pending |
| STRIPE-01 through STRIPE-05 | Phase 5 | Pending |
| LEAD-01 through LEAD-05 | Phase 6 | Pending |
| PUB-01 through PUB-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after initial definition*
