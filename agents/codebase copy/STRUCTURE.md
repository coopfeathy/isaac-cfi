# Codebase Structure

**Analysis Date:** 2026-04-08

## Executive Summary

The project is a Next.js 16 App Router monorepo with all routes under `app/`, shared server-side utilities under `lib/`, and background jobs under `netlify/functions/`. The `app/` directory doubles as both the page router and the API layer — `app/api/` contains all Route Handlers. There are three distinct admin/operator zones (`/admin`, `/manage`) plus a student-facing portal (`/learn`, `/dashboard`, etc.) and a public marketing site, all coexisting in the same directory tree.

## Directory Layout

```
isaac-cfi/
├── app/                    # Next.js App Router — all pages, layouts, API routes
│   ├── layout.tsx          # Root layout: AuthProvider, SimpleHeader, Footer
│   ├── page.tsx            # Homepage (marketing)
│   ├── globals.css         # Global CSS
│   ├── components/         # Shared React components (17 files)
│   ├── contexts/           # React context providers
│   ├── api/                # Next.js Route Handlers (API layer)
│   │   ├── admin/          # Admin-only API endpoints
│   │   └── ...             # Public/student API endpoints
│   ├── admin/              # Admin operational UI pages
│   ├── manage/             # System configuration UI pages
│   ├── learn/              # Student learning hub pages
│   ├── dashboard/          # Student dashboard
│   ├── store/              # Pilot store
│   ├── blog/               # Blog (markdown + DB posts)
│   └── ...                 # Public marketing pages
├── lib/                    # Server-side utilities, DB clients, types
│   ├── supabase.ts         # Anon Supabase client + DB type interfaces
│   ├── supabase-admin.ts   # Service role Supabase client (server-only)
│   ├── availability-engine.ts  # Core scheduling computation
│   ├── resend.ts           # Email templates + Resend client
│   ├── caldav.ts           # CalDAV (Apple Calendar) sync
│   ├── google-calendar.ts  # Google Calendar API integration
│   ├── stripe-connect.ts   # Stripe Connect helpers
│   ├── social-media.ts     # Social feed aggregation
│   ├── posts.ts            # Markdown blog post utilities
│   ├── schema.ts           # JSON-LD structured data generators
│   ├── utils.ts            # General utilities
│   ├── twilio.ts           # SMS (Twilio) — present but usage unclear
│   ├── notifications/      # Notification dispatch helpers
│   └── types/              # Shared TypeScript type definitions
│       └── calendar.ts     # Calendar, availability, slot request types
├── netlify/
│   └── functions/          # Netlify Scheduled Functions (background jobs)
├── content/
│   └── posts/              # Markdown files for blog posts
├── public/                 # Static assets
│   ├── images/             # Site images
│   ├── flight-simulator-images/
│   └── cms/                # CMS-uploaded media
├── supabase/               # Raw SQL migration/setup scripts
├── docs/
│   └── plan/               # Feature planning documents (markdown)
├── agents/                 # AI agent configuration files
├── skills/                 # AI skill definitions
├── .planning/
│   └── codebase/           # GSD codebase analysis documents (this file)
├── next.config.js          # Next.js config (headers, image config, webpack)
├── netlify.toml            # Netlify build + function config
├── tailwind.config.ts      # Tailwind CSS config
├── tsconfig.json           # TypeScript config (path alias: @/ → ./)
├── jest.config.js          # Jest test config
└── components.json         # shadcn/ui component config
```

## Directory Purposes

**`app/components/`**
- Purpose: Shared React components used across multiple pages
- Key files:
  - `SimpleHeader.tsx` — Sticky top nav with logo, primary links, auth state (login/logout), mobile menu
  - `Footer.tsx` — Site-wide footer
  - `AuthProvider` — in `contexts/AuthContext.tsx`, not here
  - `AdminPageShell.tsx` — Wrapper layout for admin pages (title, back links, action slot)
  - `AdminTopNav.tsx` — Top navigation for `/admin` zone
  - `ManageSidebar.tsx` — Fixed 280px sidebar for `/manage` zone
  - `LearningHubLayout.tsx` — Tab-based layout for student portal pages (Learn/Progress/Scheduling/Bookings/Documents/Blog)
  - `BookingForm.tsx` — Slot booking form
  - `PaymentForm.tsx` — Stripe payment form (uses `@stripe/react-stripe-js`)
  - `ApplicationForm.tsx` — Student application/onboarding form
  - `SocialMediaFeed.tsx` — Aggregated social feed display
  - `ImageCarousel.tsx`, `LocationsMap.tsx`, `TypingEffect.tsx`, `RedBirdSimulator.tsx` — Marketing page components

**`app/contexts/`**
- Purpose: React context providers
- Key file: `AuthContext.tsx` — Provides `user`, `profile`, `session`, `isAdmin`, `signIn()`, `signOut()` globally

**`app/api/`**
- Purpose: All server-side API logic as Next.js Route Handlers (`route.ts` files)
- Structure: Each subdirectory is one endpoint; dynamic segments use `[param]` folders
- Admin endpoints: `app/api/admin/` (require `is_admin` profile check)
- Public/student endpoints: at `app/api/` root level

**`app/api/admin/` Key Endpoints:**
- `billing/` — 8 sub-routes: checkout link generation, cash payments, Stripe product sync, payout rules, billing overview, send reminder, push checkout link, accountant text export
- `students/` — Student CRUD, normalize, sync, send-account-link
- `slot-requests/` — List + approve/deny with sub-routes `/[id]/approve`, `/[id]/deny`
- `availability/` + `availability-overrides/` — Instructor availability template CRUD
- `caldav/` — CalDAV settings, sync, push, test
- `bookings/` + `bookings/manual/` — Booking management
- `enrollments/` — Course enrollment management
- `prospects/` — CRM prospect management + convert to student
- `lesson-evaluations/` — Lesson grading
- `syllabus-items/` — Syllabus management
- `users/update/` — User profile updates
- `health/` — System health check

**`app/api/` Root-Level Endpoints:**
- `availability/` — Student-facing weekly availability query (runs availability engine)
- `slot-requests/` — Student submits scheduling requests
- `book/` — Legacy Google Calendar booking (older flow)
- `contact/` — Contact form submission
- `create-payment-intent/` — Stripe payment intent creation
- `stripe-webhook/` — Stripe event handler (idempotent, handles Connect split payouts)
- `onboarding/esign/` — Dropbox Sign / DocuSeal e-signature flow
- `discovery-flight-pt1/`, `pt2/`, `pt3/`, `discovery-flight-signup/` — Multi-step funnel APIs
- `google-reviews/` — Fetches live Google Places reviews
- `social-media/posts/` — Aggregated social media feed
- `lesson-completion/` — Student lesson completion + homework queue
- `send-email/`, `support/` — Email and support request
- `create-blog-post/`, `update-blog-post/`, `delete-blog-post/`, `list-blog-posts/` — Blog CMS
- `upload-image/` — Image upload
- `calendar/booking-ics/` — ICS calendar file generation

**`app/admin/`**
- Purpose: Operational admin UI — day-to-day CFI management tasks
- Layout: `app/admin/layout.tsx` (adds `AdminTopNav`)
- Sections:
  - `billing/` — Student billing, Stripe checkout, cash payments, payout management
  - `students/` — Student records, hours, medical, certifications
  - `bookings/` — Booking management
  - `calendar/` — Visual admin calendar with CalDAV sync
  - `slots/` — Manual slot creation/management
  - `prospects/` — CRM for leads/prospects
  - `leads/` — Lead tracking
  - `courses/` + `courses/[courseId]/edit` + `courses/create/` — Course management
  - `lessons/[lessonId]/` — Individual lesson detail
  - `enrollments/` — Student course enrollment
  - `syllabus/` — Syllabus structure
  - `progress/` — Student progress tracking
  - `blog/` — Blog post management
  - `email/` — Email tools
  - `social/` — Social media management
  - `support/` — Support ticket handling
  - `onboarding/` — Student onboarding workflow
  - `aircraft/` — Aircraft fleet management
  - `items/` — Billing items/products

**`app/manage/`**
- Purpose: System configuration (less frequently changed settings)
- Layout: `app/manage/layout.tsx` (adds `ManageSidebar` — fixed 280px sidebar)
- Sections: `schedule/`, `aircraft/`, `instructors/`, `administrators/`, `users/`, `items/`, `groups/`, `forms/`, `adjustments/`

**`app/learn/`**
- Purpose: Student course browsing and lesson content
- Routes: `app/learn/page.tsx` (course list), `app/learn/[courseId]/page.tsx` (course detail), `app/learn/[courseId]/[lessonId]/page.tsx` (lesson content)
- All use `LearningHubLayout`

**Public Marketing Pages:**
- `app/page.tsx` — Homepage with Google reviews, typing animation, map
- `app/schedule/` — Booking/scheduling page
- `app/pricing/` — Pricing information
- `app/aircraft/` + `app/aircraft/documents/` — Fleet showcase
- `app/blog/` + `app/blog/[slug]/` — Blog (renders markdown from `content/posts/`)
- `app/instructors/` — Instructor profiles
- `app/training-options/` — Training programs overview
- `app/simulator/` + `app/simulator/aatd-credit-details/` — Simulator info
- `app/faq/` — FAQ page
- `app/private-pilot-timeline/` — Training timeline
- `app/discovery-flight/`, `app/discovery-flight-funnel/`, `app/discovery-flight-pt1/` through `pt4/` — Discovery flight landing and funnel

**Student Portal Pages (outside `/learn`):**
- `app/dashboard/` — Student overview dashboard
- `app/progress/` — Training progress view
- `app/bookings/` — Booking history
- `app/lesson-scheduling/` — Request scheduling slots
- `app/documents/` — Student documents
- `app/onboarding/` — Onboarding flow
- `app/apply/` — Application form
- `app/login/` — Magic link login
- `app/auth/callback/` — Auth callback handler
- `app/payment-success/` + `app/booking/success/` — Post-payment pages
- `app/prospects/` — Prospect self-service (pre-student)
- `app/students/` — Student self-view

**`lib/`**
- Purpose: Server-side utilities, external service clients, shared types
- Never import `lib/supabase-admin.ts` in client components — it uses the service role key
- `availability-engine.ts` — Core scheduling logic; `computeAvailabilityFromData()` is pure/testable

**`netlify/functions/`**
- Purpose: Background/scheduled Netlify Functions (run outside Next.js request cycle)
- `booking-monitor.ts` — Scheduled every 5 min; data integrity checks + alert emails
- `generate-discovery-slots.ts` — Daily 07:00 UTC; auto-creates discovery flight slots
- `caldav-sync.ts` — CalDAV sync
- `homework-email-dispatcher.ts` — Processes homework email queue
- Note: `book.ts`, `create-checkout.ts`, `create-payment-intent.ts`, `stripe-webhook.ts` duplicate Next.js API routes — provenance unclear

**`supabase/`**
- Purpose: Raw SQL scripts for database setup and migrations
- Files: `SETUP.sql`, `SEED_SYLLABUS.sql`, `RULES.sql`, `CALENDAR_REWORK.sql`, `DELETE_OLD_RULES.sql`
- Not managed by Supabase CLI (no `supabase/migrations/` structure) — scripts applied manually

**`content/posts/`**
- Purpose: Markdown files for blog posts, parsed by `lib/posts.ts` using `gray-matter` + `remark`

**`public/`**
- `images/` — Site images (long-cached via headers)
- `flight-simulator-images/` — Simulator page photos
- `cms/` — CMS-uploaded media files

## Key File Locations

**Entry Points:**
- `app/layout.tsx` — Root layout, wraps all pages with `AuthProvider`, `SimpleHeader`, `Footer`
- `app/page.tsx` — Homepage
- `app/admin/layout.tsx` — Admin zone layout
- `app/manage/layout.tsx` — Manage zone layout

**Configuration:**
- `next.config.js` — Next.js config (cache headers, image settings, webpack alias)
- `netlify.toml` — Deploy config, function directory, cron schedules (documented in comments)
- `tailwind.config.ts` — Tailwind config
- `tsconfig.json` — TypeScript config; `@/` alias maps to project root (`./*`)
- `.env.example` — Documents all required environment variables

**Core Logic:**
- `lib/availability-engine.ts` — Scheduling computation (most critical business logic)
- `lib/supabase.ts` — DB type definitions + anon client
- `lib/supabase-admin.ts` — Service role client for server-side mutations
- `lib/resend.ts` — All email templates and sending logic
- `app/api/stripe-webhook/route.ts` — Payment confirmation + Connect payout logic
- `app/contexts/AuthContext.tsx` — Global auth state

**Testing:**
- Tests co-located with source in `__tests__/` subdirectories
- `app/api/admin/availability/__tests__/`, `app/api/admin/availability-overrides/__tests__/`
- `app/api/admin/slot-requests/__tests__/`, `app/api/admin/slot-requests/[id]/approve/__tests__/`, `/deny/__tests__/`
- `app/api/availability/__tests__/`, `app/api/slot-requests/__tests__/`
- `lib/__tests__/`, `lib/notifications/__tests__/`, `lib/types/__tests__/`
- `app/store/__tests__/`

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx`
- API routes: `route.ts`
- Components: PascalCase (`BookingForm.tsx`, `AdminPageShell.tsx`)
- Library modules: kebab-case (`availability-engine.ts`, `supabase-admin.ts`)

**Directories:**
- Route segments: kebab-case (`discovery-flight-pt1/`, `slot-requests/`)
- Dynamic segments: `[paramName]/` (`[courseId]/`, `[lessonId]/`, `[studentId]/`, `[id]/`)

## Where to Add New Code

**New student-facing page:**
- Page file: `app/[route-name]/page.tsx`
- If using the student hub layout: wrap content in `LearningHubLayout` with appropriate `activeTab`
- Tests: `app/[route-name]/__tests__/`

**New admin page:**
- Page file: `app/admin/[section]/page.tsx`
- Use `AdminPageShell` component for consistent layout
- Auth guard: add `useAuth()` check for `isAdmin` client-side

**New admin API endpoint:**
- Route: `app/api/admin/[feature]/route.ts`
- Pattern: Implement `requireAdmin()` at top checking `Authorization` header + `profiles.is_admin`
- Use `getSupabaseAdmin()` from `lib/supabase-admin.ts` for DB writes

**New public API endpoint:**
- Route: `app/api/[feature]/route.ts`
- Auth via `supabase.auth.getUser(token)` if authentication required

**New email template:**
- Add to `lib/resend.ts` following the `emailWrapper()` + brand constants pattern

**New background job:**
- File: `netlify/functions/[job-name].ts`
- Export `config: Config` with `schedule` property for cron syntax
- Document schedule in `netlify.toml` comment block

**New shared type:**
- For calendar/availability types: `lib/types/calendar.ts`
- For DB entity types: add to `lib/supabase.ts` as interface exports
- For JSON-LD schemas: `lib/schema.ts`

**New utility:**
- Shared helpers: `lib/utils.ts`
- Service-specific: new file in `lib/` (e.g., `lib/twilio.ts` pattern)

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents consumed by planning/execution tools
- Generated: Yes (by GSD mapper agent)
- Committed: Yes

**`docs/plan/`:**
- Purpose: Feature design documents and feasibility studies
- Contains: `apple-calendar-sync/`, `calendar-rework/`, `pilot-store/`, `scheduling-calendar/`, etc.
- Generated: No — written by developer/AI for planning
- Committed: Yes

**`supabase/`:**
- Purpose: Manual SQL scripts (not Supabase CLI migrations)
- Generated: No
- Committed: Yes — source of truth for DB schema changes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (in `.gitignore`)

**`agents/` and `skills/`:**
- Purpose: AI agent and skill definitions for development workflow
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-08*
