# Feature Research

**Domain:** Flight school management platform — solo-CFI scaling to multi-instructor
**Researched:** 2026-04-08
**Confidence:** MEDIUM (web research unavailable; analysis drawn from training knowledge of FlightBridge, Flight Schedule Pro, ScheduleMaster, Dispatch, and SimFlight plus deep reading of existing codebase)

---

## Context: What Already Exists

The platform is not greenfield. These features are already shipped and working:

- Public marketing site with SEO, blog, FAQ, aircraft pages
- Magic-link authentication (passwordless OTP)
- Stripe payments — Payment Intents, Checkout Sessions, Connect split payouts
- Discovery flight multi-step funnel (4 steps, slot-request model)
- Student portal — booking history, learning hub, progress tracker, documents
- Admin zone — bookings, billing, students, calendar, prospects, syllabus
- Transactional email via Resend (confirmations, receipts)
- CalDAV two-way sync for scheduling
- Availability engine — weekly templates + date-specific overrides

The research below is scoped to **what comes next**: features this milestone adds, how they compare to best-in-class competitors, and what to avoid.

---

## Competitor Landscape Summary

**Confidence: MEDIUM** — based on training knowledge, not live site access.

| Platform | Positioning | Strength | Weakness |
|----------|-------------|----------|----------|
| **Flight Schedule Pro** | Mid-market flight school SaaS | Full scheduling, resource management, maintenance tracking | Complex for solo operators; expensive |
| **FlightBridge** | Enterprise FBO / airline scheduling | Real-time dispatch, crew management, fuel optimization | Overkill for Part 61 schools |
| **ScheduleMaster** | Aviation scheduling specialist | Instructor availability, dual booking prevention, resource calendars | UI dated; no integrated billing |
| **Dispatch (APDL)** | Pilot logbook + scheduling hybrid | Mobile-first, FAA-compliant logbook | No school-management features |
| **SimFlight** | Simulator booking focus | Sim resource scheduling, briefing rooms | Single-purpose; no student lifecycle |

**Key competitive gap FlightBridge/FSP share:** They are built for schools with 5–50 instructors. Solo-CFI operators are underserved — the onboarding friction, pricing, and feature surface area assumes a staff. Merlin's custom platform has a structural advantage here: it can be perfectly sized for Isaac's operation and scale deliberately.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features a student or instructor expects any booking platform to have. Missing these makes the product feel broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Student self-service booking** | Every modern scheduling tool lets users book without calling | MEDIUM | Core booking flow exists; needs to remove admin-approval gate for standard lessons. Slot-request model must shift to direct confirm. |
| **Student self-service reschedule / cancel** | Standard for any appointment system (doctors, salons, tutors) | MEDIUM | No reschedule/cancel path exists today. Requires cancel window policy (e.g., 24 hrs) and slot release logic. |
| **Booking confirmation email** | Expected immediately after any online transaction | LOW | Resend infrastructure already exists; confirmation template exists. Gap: currently confirmation fires on admin approval, not student self-booking. |
| **Reminder emails** | Standard for appointment-based services | LOW | Email infra exists. Need a scheduled job (Netlify cron) to send 24-hr and 2-hr reminders. |
| **Student can view invoice / balance** | Any billing relationship requires transparency | MEDIUM | Student portal exists. Need to expose invoice list and outstanding balance from Stripe. |
| **Student can pay outstanding balance online** | Standard for any service with payment terms | MEDIUM | Stripe checkout flow exists for admin-generated links. Need student-initiated payment path from portal. |
| **CFI sees own schedule** | Any calendar-based tool shows you your own appointments | LOW | Admin zone shows all bookings. CFI-specific filtered view is a display change, not a data change. |
| **CFI can set availability** | Required if students are self-booking — someone has to define open slots | MEDIUM | Weekly templates exist in `/manage`. Need to move this control to CFI portal without admin access. |
| **Admin can see all students with status** | Operational requirement for any school with more than a handful of students | LOW | Admin zone already has a students tab. Gap: training status per student needs to be visible at a glance. |
| **Automated billing on lesson completion** | Reduces admin burden; expected by professional services | HIGH | Currently manual. Requires a trigger (lesson marked complete) → Stripe charge or invoice creation. Significant logic. |
| **Lead status tracking** | Any CRM-adjacent tool tracks where prospects are in the funnel | MEDIUM | Prospects table exists in admin. Gap: status field, follow-up scheduling, and state transitions. |

---

### Differentiators (Competitive Advantage)

Features that neither competitors nor other local schools offer at this scale. These are where Merlin wins.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Career pipeline page (Student → CFI → Cargo)** | No other Part 61 school in the NYC metro offers a defined hire-back pathway. Converts training interest into long-term commitment. | LOW | Content work + one new page. The narrative ("train here, get hired here") is the differentiator, not the technology. Hooks into blog and pricing pages. |
| **Discovery flight auto-confirm (no approval gate)** | Competitors require phone tag or admin review. Instant confirmation converts more discovery flight leads. | MEDIUM | Slot-request model currently requires admin approval. Auto-confirm requires availability rules to be tight enough to trust without review. Needs conflict-checking logic. |
| **Automated follow-up sequences for discovery flight leads** | Competitors send one email. A 3-step sequence (immediate, day 3, day 7) recovers leads who didn't convert immediately. | MEDIUM | Resend supports sequences. Needs a `prospect_followup_queue` table and a Netlify cron job. Most local flight schools do none of this. |
| **CFI logbook integration (hours + endorsements per student)** | Flight Schedule Pro has this but it's buried in enterprise tiers. For a solo CFI who wants to track students professionally, this is table stakes that feels premium. | MEDIUM | New schema: `flight_logs` table. CFI portal UI for per-lesson log entry. Student-visible read-only view. |
| **Unified admin — single operational surface** | Competitors' fragmented UIs (FlightBridge has 5 different views for one operation) frustrate instructors. Isaac's admin should feel like a cockpit: everything in one place. | HIGH | Merging `/manage` into `/admin` + decomposing the 3,275-line monolith. High effort but directly addresses the existing tech debt. |
| **"Merlin graduates" hiring hook** | Anchors the marketing to a concrete outcome (a job, not just a certificate). Differentiates from every other school advertising the same FAA certificates. | LOW | Copy + one section on career page. Future hook: link to cargo company website when it exists. |
| **Prospect-to-student pipeline visibility** | Most small schools track leads in a spreadsheet. Having funnel stages visible in the admin (lead → contacted → discovery flown → enrolled → active → graduated) gives Isaac data to improve conversion. | MEDIUM | Extend existing `prospects` table with status enum and follow-up timestamps. Not a full CRM — just enough to manage 20–50 leads. |

---

### Anti-Features (Deliberately Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full LMS / course authoring** | "Let's build our own Teachable" | Massive scope, maintenance burden, never as good as purpose-built tools. The learning hub already covers Merlin's actual need. | Use existing learning hub structure. Content lives in Markdown/JSON. No custom video hosting or quiz engine. |
| **Native mobile app (iOS/Android)** | "Students want an app" | High build cost, two app stores to maintain, OS updates break things. Merlin's volume doesn't justify it. | Responsive web works fine. PWA (add-to-homescreen) can be added in one afternoon if push comes to shove. |
| **Multi-school / franchise management** | "What if Isaac opens a second location?" | Premature optimization. Multi-tenancy requires schema changes, auth scoping, billing isolation — all of which add complexity now for a problem that may never materialize. | Keep everything single-location. If a second location opens, evaluate at that time. |
| **Live chat / support ticketing** | "Students want real-time support" | Chat widgets (Intercom, Drift) add tracking scripts, GDPR exposure, and ongoing cost. At Merlin's scale, direct email/phone is faster. | Contact form + Isaac's direct email is sufficient. |
| **Real-time flight tracking / ADS-B integration** | "Cool to show where the plane is" | High complexity, data licensing, adds zero value to the booking/billing/student-management use case. | Out of scope. |
| **Student-to-student social / forums** | "Build community" | Flight training is individual. Community features require moderation, have low engagement at small scale, and distract from the operations focus. | The existing social feed (Instagram/TikTok) aggregator covers community signaling without needing a forum. |
| **Custom payment terms / installment plans** | "Some students want to pay monthly" | Complex billing logic, collections risk, Stripe subscription edge cases. Adds significant support burden for a solo operator. | Stripe Checkout for per-lesson or block payment is sufficient. Defer payment plans until Isaac has staff to manage them. |
| **Automated grade/score imports from FAA systems** | "Connect to IACRA" | FAA APIs are not publicly available for third-party integration. Any "integration" would be scraping, which is fragile and against ToS. | Manual endorsement logging by CFI is correct. IACRA stays separate. |

---

## Feature Dependencies

```
Student Self-Service Booking
    └──requires──> Availability Engine (EXISTS — weekly templates + overrides)
    └──requires──> Auth (EXISTS — Supabase OTP)
    └──requires──> Remove admin-approval gate from slot-request flow

Student Self-Service Reschedule/Cancel
    └──requires──> Student Self-Service Booking (same slot model)
    └──requires──> Cancellation policy config (new: cancel window, fee rules)
    └──requires──> Slot release logic (mark slot available again on cancel)

Student Pay Outstanding Balance
    └──requires──> Invoice visible in student portal
    └──requires──> Stripe Checkout (EXISTS — admin-generated links)
    └──requires──> Student-initiated checkout session (new API endpoint)

Automated Billing on Lesson Completion
    └──requires──> Lesson marked-complete trigger (new: CFI logs lesson)
    └──requires──> Stripe charge or invoice creation (EXISTS — Payment Intent infra)
    └──requires──> Student billing method on file (new: saved payment method)

CFI Portal (schedule + student roster)
    └──requires──> Auth role: CFI (partial — is_admin exists; need is_instructor or role enum)
    └──requires──> Instructor-scoped data queries (new: filter bookings by instructor_id)
    └──requires──> CFI availability self-service (moves /manage/schedule → CFI portal)

CFI Logbook (hours + endorsements)
    └──requires──> CFI Portal (above)
    └──requires──> flight_logs schema (new table)

Automated Discovery Flight Follow-up Sequences
    └──requires──> Prospect record in DB (EXISTS — prospects table)
    └──requires──> prospect_followup_queue table (new)
    └──requires──> Netlify cron job to process queue (new scheduled function)
    └──requires──> Resend email templates for sequence (new)

Discovery Flight Auto-Confirm
    └──requires──> Availability engine (EXISTS)
    └──requires──> Conflict-checking logic tightened (new: verify no double-booking before auto-confirm)
    └──requires──> Remove admin-approval gate from discovery slot flow (same as self-service booking)

Unified Admin Portal
    └──requires──> /manage functionality audited and migrated (some /manage pages are stubs)
    └──requires──> Admin monolith (3,275-line page.tsx) decomposed into tab components
    └──conflicts──> keeping /manage alive (dual admin zones cause confusion)

Prospect-to-Student Pipeline
    └──requires──> prospects table status field (new enum column)
    └──enhances──> Automated Follow-up Sequences (pipeline state drives sequence triggers)

Career Pipeline Page
    └──requires──> nothing technical — content + one new page
    └──enhances──> Homepage + Pricing (add "career path" hook to existing pages)
```

### Dependency Notes

- **Automated Billing requires Saved Payment Method:** Without a payment method on file, auto-billing can't fire silently. This is a meaningful UX ask — students must opt-in to autopay, which requires a dedicated flow and careful Stripe Setup Intent handling.
- **CFI Portal requires role differentiation:** Today the system is binary (admin vs. not-admin). Adding a CFI portal that is not full admin access requires either a role enum (`admin`, `instructor`, `student`) or an `is_instructor` boolean on profiles. This decision cascades into every auth check.
- **Discovery Auto-Confirm conflicts with manual slot approval:** The current slot-request model is designed around admin approval. Switching to auto-confirm requires confidence that the availability engine has no gaps (no double-booking possible). This is a logic trust decision, not just a UI change.
- **Unified Admin requires /manage audit first:** Several `/manage` pages query tables that may not exist in production schema (see CONCERNS.md). Merging without auditing risks bringing dead pages into the unified admin.

---

## MVP Definition

### This Milestone Must Ship (v2 core)

These are the features the PROJECT.md Active scope defines. They are not optional.

- [ ] **Security hardening** — server-side auth guards on `/manage`, remove `NEXT_PUBLIC_ADMIN_EMAIL`, fix `api/create-user`, remove PII logging, fix contact form silent failure, retire legacy `/booking/` route, extract `requireAdmin()`. Not user-facing but prerequisite to everything else.
- [ ] **Student self-service booking/reschedule/cancel** — removes admin as bottleneck for standard lessons.
- [ ] **Automated billing on lesson completion** — lessons billed based on completed bookings without manual admin action.
- [ ] **Student invoice view + pay outstanding balance** — students see what they owe and can pay from portal.
- [ ] **CFI portal (schedule view + student roster + log hours)** — Isaac sees his students, upcoming lessons, and can log flight time and endorsements.
- [ ] **Unified admin** — retire `/manage`, merge into `/admin`, decompose monolith.
- [ ] **Discovery flight follow-up sequences** — automated 3-step email sequence after funnel submission.
- [ ] **Prospect management with lead status** — admin can track lead state and follow-up scheduling.
- [ ] **Career pipeline page** — "Student → Private Pilot → CFI → hired at Merlin" narrative page.

### Add After Core Stabilizes (v2.x)

- [ ] **Discovery flight auto-confirm** — remove admin approval gate once availability engine is trusted and conflict-checking is hardened. Trigger: Isaac has gone 2 weeks with zero double-booking incidents after self-service booking ships.
- [ ] **Booking reminder emails (24hr + 2hr)** — Netlify cron job. Low complexity, high polish impact.
- [ ] **Saved payment method / autopay opt-in** — reduces friction for regular students. Requires Stripe Setup Intent flow and student consent UI.
- [ ] **"Train here, get hired here" hook on Homepage + Pricing** — content integration after career page exists.

### Future Consideration (v3+)

- [ ] **Multi-instructor availability management** — when Isaac hires a second CFI. Requires role system to be complete.
- [ ] **Student-facing logbook view** — read-only view of their own logged hours. Useful for students tracking progress toward certificates.
- [ ] **Block lesson packages (pay for 10, use over time)** — common in flight schools. Complex billing state. Defer until autopay is stable.
- [ ] **Stripe Connect payout expansion** — when there are multiple instructors, each needing split payouts. Connect infrastructure already exists; expansion is schema + UI work.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Security hardening (Phase 1) | HIGH (protects existing users) | LOW-MEDIUM | P1 |
| Student self-service book/reschedule/cancel | HIGH | MEDIUM | P1 |
| Automated billing | HIGH | HIGH | P1 |
| Student invoice view + pay | HIGH | MEDIUM | P1 |
| CFI portal — schedule + roster | HIGH | MEDIUM | P1 |
| CFI logbook (hours + endorsements) | MEDIUM | MEDIUM | P1 |
| Unified admin (merge /manage) | MEDIUM (admin UX) | HIGH | P1 |
| Discovery flight follow-up sequences | HIGH (conversion) | MEDIUM | P1 |
| Prospect pipeline with status | MEDIUM | LOW-MEDIUM | P1 |
| Career pipeline page | HIGH (differentiation) | LOW | P1 |
| Discovery flight auto-confirm | MEDIUM | MEDIUM | P2 |
| Booking reminder emails | MEDIUM | LOW | P2 |
| Saved payment method / autopay | MEDIUM | MEDIUM | P2 |
| Homepage career hook integration | MEDIUM | LOW | P2 |
| Student-facing logbook view | LOW-MEDIUM | LOW | P3 |
| Block lesson packages | MEDIUM | HIGH | P3 |

---

## Competitor Feature Analysis

**Confidence: MEDIUM** — based on training knowledge of these platforms, not live research.

| Feature | Flight Schedule Pro | ScheduleMaster | Merlin (this milestone) |
|---------|---------------------|----------------|--------------------------|
| Student self-service booking | YES — full self-booking with resource selection | YES — instructor + aircraft selection | YES — slot-based, streamlined |
| Reschedule / cancel self-service | YES — with configurable cancel windows | YES | YES — with policy config |
| CFI availability management | YES — complex weekly templates | YES — calendar drag-drop | YES — weekly templates exist, moving to CFI-owned |
| Automated billing | YES — invoice generation on lesson close | NO — manual invoicing | YES — on lesson-complete trigger |
| Student invoice portal | YES | NO | YES |
| Lead / prospect CRM | NO (separate tool needed) | NO | YES — lightweight built-in pipeline |
| Automated follow-up sequences | NO | NO | YES — Resend-powered sequences |
| Career pathway content | NO | NO | YES — unique differentiator |
| CFI logbook / endorsements | YES — FAA-format logs | Partial | YES — lightweight log per student |
| Unified admin UX | NO — multiple modules, complex nav | NO — fragmented | YES — after merge |
| Hiring pipeline hook | NO | NO | YES — "Train here, get hired here" |

**Key insight:** Flight Schedule Pro and ScheduleMaster both win on raw feature count for large schools. They lose on: (a) simplicity for a solo operator, (b) integrated lead nurturing, and (c) any career/pipeline narrative. Merlin's competitive moat is the full student lifecycle — from "I googled flight lessons" to "I'm a hired CFI" — in one coherent system. No competitor touches that narrative.

---

## Sources

- PROJECT.md and ARCHITECTURE.md (existing platform context) — HIGH confidence
- CONCERNS.md (tech debt and missing features) — HIGH confidence
- FlightBridge feature set — MEDIUM confidence (training knowledge, no live access)
- Flight Schedule Pro feature set — MEDIUM confidence (training knowledge, no live access)
- ScheduleMaster feature set — MEDIUM confidence (training knowledge, no live access)
- Dispatch / APDL — MEDIUM confidence (training knowledge)
- SimFlight — LOW confidence (limited training data)

---

*Feature research for: Merlin Flight Training — flight school management platform*
*Researched: 2026-04-08*
