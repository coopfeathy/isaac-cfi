# Stack Research

**Domain:** Flight school management platform — role-based portals, automated billing, auth hardening, rate limiting, content management
**Researched:** 2026-04-08
**Confidence:** HIGH (versions confirmed from installed node_modules and package changelogs)

---

## Context: What This Is NOT

This is not a greenfield stack recommendation. The base stack — Next.js 16.1.6, Supabase, Netlify, Stripe, Tailwind, shadcn/ui — is locked by project constraints. This file covers only **what to add or upgrade** to support the current milestone: role-based portal separation, automated billing, middleware-based auth guards, Stripe SDK upgrade, rate limiting, and career content management.

All recommendations below are **additive or replacement upgrades**. No migrations away from the core stack.

---

## Recommended Additions & Upgrades

### Auth & Middleware (Role-Based Access)

| Technology | From | To | Purpose | Why |
|------------|------|----|---------|-----|
| `@supabase/ssr` | `^0.9.0` (installed: 0.9.0) | `^0.9.0` (already current) | Cookie-based session in middleware | Already on the latest release (0.9.0, released 2026-03-02). No upgrade needed. |
| `middleware.ts` (new file) | Does not exist | Create in `app/` root | Route-level auth + RBAC enforcement | Without middleware, `/manage/*` and `/admin/*` are client-only guarded. Middleware intercepts at the edge before React renders. |

**Pattern for `middleware.ts`:**
The correct pattern uses `@supabase/ssr`'s `createServerClient` with the `request/response` cookie adapter. On each request, the middleware:
1. Creates a server Supabase client from cookies
2. Calls `supabase.auth.getUser()` — **not** `getSession()` (getSession trusts client-side JWT without server validation; getUser re-validates with Supabase auth server)
3. Reads `profiles.role` (or `profiles.is_admin`) to determine the user's role
4. Redirects to `/login` if unauthenticated, or `/unauthorized` if wrong role

**Role model recommendation:** Add a `role` enum column to the `profiles` table (`'admin' | 'cfi' | 'student'`) rather than a boolean `is_admin`. This supports the three-portal architecture (Admin, CFI, Student) without schema changes later. The boolean `is_admin` can remain for backwards compatibility during migration.

**Confidence:** HIGH — `@supabase/ssr` 0.9.0 is already installed and current; this is a code pattern, not a new dependency.

---

### Stripe SDK Upgrade

| Package | Currently Installed | Target | API Version | Breaking Changes |
|---------|--------------------|---------|-----------|----|
| `stripe` (server) | `12.18.0` | `^17.x` | `2025-02-24.acacia` | YES — see below |
| `@stripe/stripe-js` (client) | `1.54.2` | `^5.x` | n/a | YES — see below |
| `@stripe/react-stripe-js` | `^2.1.0` | `^3.x` | n/a | Minor |

**Why upgrade stripe server to 17.x:**
- `12.18.0` was released 2023-08-10 and is pinned to API version `2022-11-15`
- Stripe API version `2025-02-24.acacia` (codenamed "acacia") is the current stable version as of early 2025
- Running on a 3-year-old API version means: no access to new payment methods, outdated webhook event shapes, and accumulating divergence from Stripe's current data model
- The project has Connect split payouts, which have received significant API improvements since `2022-11-15`
- v17.x ships TypeScript types generated directly from Stripe's OpenAPI spec — substantially better type safety than v12

**Known breaking changes v12 → v17 (MEDIUM confidence — from Stripe changelog patterns, training data):**
- The `Stripe` constructor signature is stable; instantiation pattern unchanged
- `apiVersion` string must be updated from `'2022-11-15'` to `'2025-02-24.acacia'` in all 12 call sites (9 in `app/api/`, 3 in `netlify/functions/`)
- Some event types renamed or restructured between API versions — the webhook handler must be tested with Stripe CLI against the new version before deploying
- `stripe.webhooks.constructEvent()` signature is unchanged
- Connect transfer API is unchanged in structure

**Why upgrade @stripe/stripe-js client to 5.x:**
- `1.54.2` is from 2023; `@stripe/stripe-js` 5.x ships deferred loading improvements and better CSP compliance
- Required to match server-side API version for consistent behavior

**Migration approach:**
1. Upgrade `stripe` package: `npm install stripe@^17`
2. Search-replace `apiVersion: '2022-11-15'` → `apiVersion: '2025-02-24.acacia'` across all 12 files
3. Run `stripe trigger payment_intent.succeeded` with Stripe CLI against the new version to validate webhook handler
4. Deploy to preview, test a real test-mode payment end-to-end before production deploy

**Confidence:** MEDIUM — version numbers inferred from knowledge cutoff (August 2025) + changelog patterns. Verify exact latest 17.x version with `npm view stripe version` before pinning.

---

### Rate Limiting on Public API Endpoints

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@upstash/ratelimit` | `^2.x` | Per-IP rate limiting for form submission endpoints | Redis-backed sliding window algorithm; works in Next.js Edge Runtime and Netlify Edge Functions |
| `@upstash/redis` | `^1.x` | Redis client required by `@upstash/ratelimit` | Upstash provides a serverless Redis with an HTTP transport — no persistent connection required, which is mandatory for edge/serverless |

**Why Upstash and not something else:**
- Netlify Edge Functions and Next.js Route Handlers are stateless — in-memory rate limiters reset on every cold start and offer zero protection
- Upstash Redis is a serverless Redis with HTTP transport. No WebSocket connection, no persistent process — works in any serverless or edge runtime
- `@upstash/ratelimit` ships pre-built algorithms: `SlidingWindow`, `FixedWindow`, `TokenBucket` — no custom implementation needed
- The combination `@upstash/redis` + `@upstash/ratelimit` is the dominant pattern for rate limiting in the Next.js / Netlify ecosystem

**What to rate-limit:**
- `POST /api/discovery-flight-pt1` through `/pt3` and `/discovery-flight-signup` — 10 requests per IP per hour
- `POST /api/contact` — 5 requests per IP per hour
- `POST /api/slot-requests` — 20 requests per IP per day

**Implementation location:** Apply rate limiting inside each Route Handler (not in middleware), because the IP extraction logic differs between endpoints and some endpoints need looser limits than others. Middleware-level rate limiting is appropriate only when the limit applies uniformly across all routes.

**Upstash setup requirement:** Requires an Upstash account (free tier: 10,000 commands/day — sufficient for a single-location flight school). Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Netlify environment variables.

**Confidence:** MEDIUM — `@upstash/ratelimit` and `@upstash/redis` are the established pattern for this use case in the Next.js ecosystem as of knowledge cutoff. Verify current major version (likely 2.x for ratelimit, 1.x for redis) before installing.

---

### Automated Billing & Invoicing

No new npm packages are strictly required for automated billing. The existing Stripe SDK (after upgrade) has all the primitives needed. However, these patterns should be adopted:

**Stripe Billing Portal (existing SDK capability):**
- `stripe.billingPortal.sessions.create()` — generates a hosted Stripe billing portal URL
- Students can view invoices, download receipts, and update payment methods from this portal without custom UI
- Requires a Billing Portal configuration in the Stripe dashboard
- This eliminates the need to build a custom invoice UI inside the student portal

**Stripe Payment Links / Invoices API:**
- Use `stripe.invoices.create()` + `stripe.invoices.sendInvoice()` for automated post-lesson billing
- Invoices attach to a `stripe.Customer` — students need a Stripe Customer ID stored in the `profiles` table (add `stripe_customer_id` column)
- The existing webhook handler already processes `payment_intent.succeeded` — add a branch for `invoice.paid` to mark lessons as billed

**No new dependency needed.** These are Stripe API features already covered by the upgraded SDK.

**Confidence:** HIGH — these are documented Stripe API capabilities, no third-party library required.

---

### Career & Blog Content Management

| Approach | Recommendation | Why |
|----------|---------------|-----|
| Current (Markdown files in `content/`) | Keep for blog posts | Works, already in production, zero operational overhead |
| Career path page | Build as a Next.js Server Component page | Static content, no CMS needed for a single career pipeline page |
| CMS | Do NOT add a headless CMS (Contentful, Sanity, etc.) | Over-engineered for a single-instructor flight school with rare content updates |

**Why no CMS:**
- The existing `gray-matter` + `remark` pipeline handles Markdown → HTML at build time
- The career path page is a single page of structured content, not a feed of user-submitted posts
- A headless CMS adds: another service dependency, API keys to manage, webhook-triggered rebuilds, and a learning curve — none of which are justified for content Isaac edits a few times per year
- If content editing frequency increases, MDX (a drop-in upgrade from the current remark pipeline) is the next step

**MDX upgrade path (if needed later):**
Replace `remark` + `remark-html` with `next-mdx-remote ^4.x` or `@next/mdx`. MDX adds React component embedding in Markdown (useful for career pipeline CTAs inline in content). This is a future option, not a current requirement.

**No new dependency needed for the current milestone.** Build the career page as a standard Next.js Server Component with static content.

**Confidence:** HIGH — this is a deliberate non-recommendation; adding a CMS is a common over-engineering mistake for small content sites.

---

### Supporting Packages (Minor Upgrades)

| Package | From | To | Why |
|---------|------|----|-----|
| `tailwind-merge` | `^1.13.2` | `^2.x` | v2 is a full rewrite with better conflict resolution; `clsx` + `tailwind-merge` v2 is the canonical shadcn/ui pattern |
| `clsx` | `^1.2.1` | `^2.x` | v2 is ESM-first, smaller bundle, drop-in replacement |
| `framer-motion` | `^10.12.16` | `^11.x` | v11 ships a smaller bundle and better React 18 concurrent mode support; v10 still works but v11 is the current stable |

These are non-breaking upgrades and can be done in a separate PR from the Stripe upgrade.

**Confidence:** MEDIUM — version numbers based on knowledge cutoff; verify with `npm view [package] version` before pinning.

---

## Installation

```bash
# Stripe server upgrade (breaking change — requires API version update in 12 files)
npm install stripe@^17

# Stripe client upgrades (non-breaking to existing usage patterns)
npm install @stripe/stripe-js@^5 @stripe/react-stripe-js@^3

# Rate limiting (requires Upstash account + env vars)
npm install @upstash/ratelimit @upstash/redis

# Minor utility upgrades (drop-in replacements)
npm install tailwind-merge@^2 clsx@^2 framer-motion@^11
```

No dev dependency changes required for this milestone.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@upstash/ratelimit` + Upstash Redis | Netlify-native rate limiting | Netlify does not provide a built-in per-route IP rate limiter for background functions or Route Handlers. Only available at CDN level via WAF (paid plan). |
| `@upstash/ratelimit` + Upstash Redis | `express-rate-limit` | Designed for long-running Express servers; incompatible with serverless/edge runtimes that cold-start on each request. |
| `@upstash/ratelimit` + Upstash Redis | Vercel KV | This project is on Netlify, not Vercel. Upstash is platform-agnostic and the standard alternative. |
| Stripe Billing Portal (hosted) | Custom invoice UI | Building a custom invoice viewer requires: React components, Supabase invoice table, PDF generation, and ongoing maintenance. Stripe Billing Portal is production-quality and zero maintenance. |
| Keep Markdown pipeline for content | Sanity / Contentful CMS | CMS adds an external service, a monthly cost, and build webhook complexity for a site updated a few times per year. Markdown in git is simpler and sufficient. |
| `profiles.role` enum (`admin/cfi/student`) | Keep `profiles.is_admin` boolean | The boolean only encodes two states; a CFI portal requires a third state. Adding a `role` column now prevents a second migration later when CFI hiring begins. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `stripe@^12` with `apiVersion: '2022-11-15'` | 3-year-old API version; misses Connect payout improvements, current event shapes, and security patches | `stripe@^17` with `apiVersion: '2025-02-24.acacia'` |
| In-memory rate limiting (e.g., a `Map` in module scope) | Resets on every cold start in serverless — provides zero real protection on Netlify | `@upstash/ratelimit` backed by Upstash Redis |
| Next.js `middleware.ts` for rate limiting | Middleware runs on every request, including static assets. Rate limiting logic here adds latency to all requests, not just form endpoints | Rate limit inside each Route Handler where needed |
| `supabase.auth.getSession()` in middleware | `getSession()` trusts the JWT from the client cookie without server re-validation — an attacker can forge a session token. Security vulnerability. | `supabase.auth.getUser()` which validates server-side |
| Headless CMS (Contentful, Sanity, Prismic) | Adds a paid external service + webhook-triggered deploys for content that changes a few times per year | Keep Markdown in `content/`, upgrade to MDX if component embedding is needed |
| `@auth/nextjs` or NextAuth | Second auth provider; the project constraint explicitly prohibits adding a second auth system. Would conflict with existing Supabase magic-link sessions. | Supabase Auth (already in place) with hardened middleware |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `stripe@^17` | Node `>=16` | This project is on Node 20 — compatible |
| `stripe@^17` | `@stripe/stripe-js@^5` | Server and client SDK major versions should be kept in sync to ensure consistent API types |
| `@upstash/ratelimit@^2` | `@upstash/redis@^1` | ratelimit v2 requires redis v1 as peer dep; install both |
| `@upstash/ratelimit` | Next.js Edge Runtime + Netlify Edge Functions | The `@upstash/redis` HTTP transport is explicitly designed to work in edge runtimes (no `net` module dependency) |
| `@supabase/ssr@^0.9.0` | Next.js 16 App Router middleware | Current version (0.9.0, released 2026-03-02) — already installed and compatible |
| `tailwind-merge@^2` | `tailwindcss@^3` | Compatible; v2 of tailwind-merge works with Tailwind CSS v3.x and the existing shadcn/ui setup |

---

## Sources

- `node_modules/stripe/package.json` — confirms installed version is 12.18.0 (released 2023-08-10)
- `node_modules/stripe/CHANGELOG.md` — confirms 12.x top of chain; v12.8.0 was the semver range origin
- `node_modules/@supabase/ssr/CHANGELOG.md` — confirms 0.9.0 is current (released 2026-03-02)
- `node_modules/@supabase/supabase-js/package.json` — confirms installed supabase-js is 2.98.0
- `node_modules/@netlify/functions/package.json` — confirms 2.8.2 installed
- `app/api/stripe-webhook/route.ts` et al — confirms `apiVersion: '2022-11-15'` is hardcoded in 9 app/api routes
- `netlify/functions/stripe-webhook.ts` et al — confirms same old apiVersion in 3 Netlify functions
- Upstash rate limiting pattern: MEDIUM confidence (training data, knowledge cutoff August 2025; no live verification available in this environment)
- Stripe v17 version range: MEDIUM confidence (training data; confirm with `npm view stripe version` before upgrading)

---

*Stack research for: Merlin Flight Training — milestone additions*
*Researched: 2026-04-08*
