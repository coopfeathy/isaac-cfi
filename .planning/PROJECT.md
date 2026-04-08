# Merlin Flight Training — Platform

## What This Is

Merlin Flight Training is a full-stack flight school platform for Republic Airport (FRG), Farmingdale, Long Island. It serves three audiences: prospective students discovering flight training, active students managing their own bookings and progress, and instructors/admins running day-to-day operations. The goal is an operation that runs itself — so Isaac can eventually expand into a cargo aviation business, with Merlin graduates as the talent pipeline.

## Core Value

A student can discover, book, pay for, and manage their entire flight training journey online without Isaac manually touching anything.

## Requirements

### Validated

<!-- Already shipped and working in production -->

- ✓ Public marketing site — homepage, pricing, aircraft, FAQ, instructors, blog, SEO schemas
- ✓ Magic-link authentication via Supabase (passwordless OTP)
- ✓ Stripe payment integration — Payment Intents, Checkout Sessions, webhooks, Connect split payouts
- ✓ Discovery flight multi-step funnel (4-step: pt1 → pt2 → pt3 → pt4)
- ✓ Student portal — lesson scheduling, booking history, learning hub, progress tracker, documents
- ✓ Admin zone (`/admin`) — bookings, billing, students, calendar, prospects, syllabus management
- ✓ Transactional email via Resend (booking confirmations, slot decisions, payment receipts)
- ✓ CalDAV (Apple Calendar) two-way sync for scheduling
- ✓ Google reviews integration on homepage
- ✓ Blog with Markdown content and JSON-LD schemas
- ✓ Social media feed aggregation (Instagram, TikTok, YouTube, Facebook)
- ✓ Availability engine — weekly templates + date-specific overrides + booked slot subtraction
- ✓ Netlify scheduled background jobs (booking monitor, slot generation, CalDAV sync)

### Active

<!-- Current milestone scope -->

**Security & Stability (fix before anything else)**
- [ ] Fix `/manage/*` routes — add server-side auth guard (currently client-side only, fully bypassable)
- [ ] Remove `NEXT_PUBLIC_ADMIN_EMAIL` fallback — exposes admin email list to client bundle
- [ ] Add `requireAdmin()` guard to `api/create-user` — currently open to any caller
- [ ] Remove all PII-logging `console.log` calls (email, phone in production logs)
- [ ] Fix contact form silent failure — returns `{ success: true }` when `RESEND_API_KEY` is unset
- [ ] Retire legacy `/booking/` route — uses dead Netlify function, takes no payment, creates no Supabase record
- [ ] Extract `requireAdmin()` to `lib/auth.ts` — eliminate copy-paste across 5+ route files

**Student Self-Service**
- [ ] Students can book, reschedule, and cancel their own lessons (no admin approval required for standard lessons)
- [ ] Automated billing — lessons billed automatically based on completed bookings
- [ ] Students can view invoices and pay outstanding balances from their portal
- [ ] Booking confirmation and reminder emails sent automatically

**CFI Portal**
- [ ] Instructors can set and manage their own weekly availability
- [ ] CFIs can view their full student roster with training status per student
- [ ] Instructors can log flight hours and endorsements per student
- [ ] CFIs see their own upcoming schedule without admin access

**Unified Admin Portal**
- [ ] Merge `/manage` into `/admin` — single unified admin interface, retire duplicate zone
- [ ] Break up 3,275-line `app/admin/page.tsx` monolith into per-tab components
- [ ] Add Next.js middleware to enforce auth at route level for all protected zones

**Automated Lead Intake**
- [ ] Discovery flight funnel sends automatic follow-up sequences (not just one-time submission)
- [ ] Prospect management in admin: lead status tracking, follow-up scheduling
- [ ] Slot request flow auto-confirms discovery flights without admin approval where possible

**Career Pipeline Content**
- [ ] Dedicated career path page: Student → Private Pilot → Instrument → CFI → hired at Merlin
- [ ] "Train here, get hired here" narrative integrated into homepage, pricing, and discovery flight pages
- [ ] Blog content strategy focused on aviation careers, not just flight training basics
- [ ] Future hook: "Merlin graduates may be considered for pilot positions in affiliated cargo operations"

### Out of Scope

- **Cargo company website / operations** — not started, future business; keep Merlin platform focused
- **Native mobile app** — web-responsive is sufficient for current scale
- **Multi-school / franchise features** — single location only (FRG)
- **Live chat / customer support ticketing** — email and direct contact sufficient
- **Custom LMS course authoring** — use existing learning hub structure, not a full LMS build

## Context

**Codebase state (as of 2026-04-08):**
- Production Next.js 16 app deployed on Netlify, ~3 years of active development
- Three overlapping admin zones: `/admin` (operational), `/manage` (system config — being retired), `LearningHubLayout` (student-facing)
- Stripe SDK pinned to `2022-11-15` API version across 12+ files (current: `2025-02-24.acacia`)
- Dual implementations of some endpoints in both `app/api/` and `netlify/functions/` — legacy functions not yet removed
- No Next.js middleware (`middleware.ts`) — all auth enforced per-route
- No global error tracking (no Sentry)
- No rate limiting on public API endpoints (contact, discovery flight funnel, slot requests)
- Test coverage exists for: availability engine, CalDAV, slot-requests route, availability route
- Zero test coverage for: billing system, Stripe webhook, student management

**Business context:**
- Isaac is the sole CFI today; eventually wants to hire additional instructors
- Students are primarily from Long Island / NYC metro area
- Discovery flight ($265) is the primary customer acquisition entry point
- Long-term vision: Merlin graduates pipeline into a cargo aviation company (Cessna Caravan operations)

**Codebase map:**
- `.planning/codebase/ARCHITECTURE.md` — full system architecture
- `.planning/codebase/STACK.md` — technology stack
- `.planning/codebase/CONCERNS.md` — security, performance, and tech debt findings

## Constraints

- **Tech Stack**: Next.js / Supabase / Netlify / Stripe / Tailwind / shadcn — stay on existing stack, no migrations
- **Deployment**: Netlify only — no Docker, no separate backend services
- **Auth**: Supabase magic-link OTP — don't introduce a second auth provider
- **Payments**: Stripe only — Connect split payouts already wired, don't swap payment providers
- **Database**: Supabase Postgres — schema changes via SQL migration files in `supabase/`
- **Single repo**: Full-stack monolith — API routes in `app/api/`, not a separate service

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix security issues in Phase 1 before new features | Protect real student PII and payments; reduce blast radius of any future bugs | — Pending |
| Retire `/manage` zone, merge into `/admin` | Two admin UIs cause confusion and duplication; unified admin reduces maintenance surface | — Pending |
| Extract `requireAdmin()` to `lib/auth.ts` | Any future auth change (e.g., role-based access) requires one edit, not 5+ | — Pending |
| Career pipeline content > generic flight training content | "Train here, get hired here" is a unique differentiator vs. other local flight schools | — Pending |
| No cargo company scope in this project | Cargo is a future business; Merlin must run autonomously first before expanding | — Pending |
| Upgrade Stripe SDK from 12.x to 17.x | 2022-era pinned version misses security patches, webhook improvements, new payment methods | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after initialization*
