# Pitfalls Research

**Domain:** Flight school management platform — brownfield Next.js refactor
**Researched:** 2026-04-08
**Confidence:** HIGH (grounded in actual codebase audit, not speculation)

---

## Critical Pitfalls

### Pitfall 1: Middleware That Misses Routes

**Severity:** HIGH

**What goes wrong:**
You add `middleware.ts` to protect `/admin/*` and `/manage/*`, deploy, and declare the auth hardening done. Two weeks later you discover that `/api/admin/*` API routes, `/api/create-user`, and any new route added during CFI portal work are not covered by the matcher pattern. The middleware runs but silently passes requests it wasn't told to intercept.

**Why it happens:**
Next.js middleware uses a `config.matcher` array. Developers write it to match the pages they know about, forgetting: (a) API routes need separate matcher entries, (b) new routes added later won't automatically fall under the middleware unless the pattern is broad enough, and (c) Netlify Functions (`/.netlify/functions/*`) are completely outside the Next.js request pipeline and middleware has no effect on them at all.

This codebase has the additional trap of `netlify/functions/stripe-webhook.ts` and `netlify/functions/book.ts` — these run as separate Lambda functions, not Next.js route handlers. Middleware will never fire for them.

**How to avoid:**
- Write the matcher as a broad path prefix: `['/admin/:path*', '/manage/:path*', '/api/admin/:path*']` — not a hand-enumerated list of known routes.
- Treat middleware as a _redirect/UI guard only_. Do not remove the per-route `requireAdmin()` checks from API route handlers when you add middleware. Defense in depth: middleware for page routes, `requireAdmin()` for API routes, both are required.
- After implementing middleware, write a smoke test that hits `/manage/users` and `/api/admin/users` as an unauthenticated request and asserts a redirect/401 respectively.
- Explicitly note in `middleware.ts` that Netlify Functions are out of scope and must be secured at the function level.

**Warning signs:**
- The middleware matcher is a list of named paths rather than a wildcard pattern.
- `app/manage/layout.tsx` is still `'use client'` after the refactor (it cannot server-redirect if it's a client component).
- Any `console.log` showing middleware matching in dev doesn't appear for `/api/admin/*` routes.

**Recovery path:**
If discovered post-deploy: immediately add `requireAdmin()` to any unprotected route handlers. The middleware gap is a client-side exposure (page HTML), not necessarily an API exposure, so assess risk by route type. API routes that already use `requireAdmin()` are safe even if middleware doesn't cover them.

**Phase to address:** Security hardening (Phase 1) — must be verified complete before any new features are added.

---

### Pitfall 2: Client-Side Layout Is Not a Security Boundary

**Severity:** HIGH

**What goes wrong:**
`app/manage/layout.tsx` is a `'use client'` component. Adding an `isAdmin` check inside it (or inside `ManageSidebar`) hides the UI but does not block the page from loading. An unauthenticated user who navigates directly to `/manage/users` receives the full React component tree in their browser. If those components make direct Supabase anon-key queries (which all `/manage` pages currently do), the RLS policies — not the layout — are the only protection.

The same trap applies to `AdminTopNav` and `app/admin/page.tsx`. The admin page currently has a client-side `useAuth()` check, but the layout (`app/admin/layout.tsx`) is a Server Component with _no auth check_. The admin page HTML is delivered to any unauthenticated user; the React hydration then redirects. That's too late.

**Why it happens:**
Developers conflate "the user can't see the UI" with "the user is blocked." In Next.js App Router, only a Server Component layout or `middleware.ts` can redirect before HTML is sent. Client component checks run after hydration.

**How to avoid:**
- The `/manage` layout wrapper must become a Server Component that calls `createServerComponentClient`, checks the session, and `redirect('/login')` if not authenticated — before rendering children.
- Do not fix this by wrapping the existing client layout in a new server layout and passing `isAdmin` as a prop. The children still load.
- Verify by disabling JavaScript in the browser and navigating to `/manage/users`. If you see content, the guard is client-side only.

**Warning signs:**
- Any layout file that has `'use client'` at the top and performs auth.
- Auth checks using `useAuth()` or `useContext(AuthContext)` inside a layout component.

**Recovery path:**
Convert the layout to a Server Component. This is a one-file change per zone (`app/manage/layout.tsx`, `app/admin/layout.tsx`). No downstream component changes required — children can still be client components.

**Phase to address:** Security hardening (Phase 1).

---

### Pitfall 3: Stripe SDK Upgrade Breaks Webhook Signature Verification

**Severity:** HIGH

**What goes wrong:**
You upgrade the `stripe` npm package from 12.x to 17.x and update all `apiVersion` strings from `'2022-11-15'` to `'2025-02-24.acacia'`. You deploy. Stripe begins rejecting webhook signature verification (`stripe.webhooks.constructEvent` throws), or the webhook handler silently drops events because TypeScript types changed shape.

Two specific traps in this codebase:
1. `stripe.webhooks.constructEvent` requires the raw request body as a string (not parsed JSON). The current `app/api/stripe-webhook/route.ts` correctly does `await req.text()`. If this is refactored to `await req.json()` during the upgrade, signatures will always fail.
2. The webhook handler casts `event.data.object as Stripe.PaymentIntent`. Between API versions, the shape of `latest_charge` changed from a string to an expandable object. The current code handles both (`typeof intent.latest_charge === 'string'`), but if types drift during upgrade the TypeScript compiler may not catch the runtime behavior change.

**Why it happens:**
Stripe SDK major versions are tightly coupled to the API version. Upgrading the package without reading the migration guide for each major version (12→13, 13→14, 14→15, 15→16, 16→17) is the standard mistake. Stripe's changelog is thorough but long.

**How to avoid:**
- Upgrade one major version at a time and run in Stripe's test mode after each step.
- Keep a dedicated `STRIPE_WEBHOOK_SECRET_TEST` environment variable pointing to a test-mode webhook endpoint during migration. Do not cut over the production secret until verified.
- The `netlify/functions/stripe-webhook.ts` is a second, older implementation. If it is still receiving production events (unclear from codebase), it must be upgraded simultaneously or traffic must be confirmed to route only to `app/api/stripe-webhook/route.ts`. Upgrading one and not the other will cause split behavior.
- Do not change `apiVersion` until after the npm package is upgraded and TypeScript compiles cleanly. The `apiVersion` string is validated at runtime by Stripe — a mismatch throws.
- After upgrade, replay a set of test webhook events from the Stripe dashboard and confirm the `stripe_webhook_events` table shows `status: 'processed'` for each.

**Warning signs:**
- TypeScript errors on `event.data.object` casts after upgrading.
- `stripe.webhooks.constructEvent` throwing "No signatures found matching the expected signature for payload" in test mode.
- The Stripe dashboard showing webhook delivery failures after deploy.

**Recovery path:**
Revert the npm package version in `package.json`. The `apiVersion` string and SDK version are independent — you can pin the package back without affecting live payments. Then investigate the specific breaking change before re-attempting.

**Phase to address:** Stripe upgrade phase (dedicated phase, after security hardening is stable).

---

### Pitfall 4: Admin Zone Merge Breaks Existing Admin Workflows Silently

**Severity:** HIGH

**What goes wrong:**
You retire `/manage` and redirect its routes to `/admin` equivalents. The redirect map is incomplete — some `/manage` sub-routes either have no `/admin` equivalent (because the feature was never ported) or route to a page with a different data model. Isaac tries to manage aircraft fleet or instructor records and the UI is gone or broken. No error is thrown; the page simply doesn't have the data.

The specific risk: the `/manage` section queries Supabase tables (`groups`, `forms`, `flights`, `instructors`, `adjustments`) that may not exist in the current schema. These pages currently show "no items found" rather than errors. If they are redirected into `/admin` views that expect different table schemas, the error mode changes from silent to visible breakage.

**Why it happens:**
Merge tasks feel structural, not functional. Developers redirect the routes and consider it done without auditing whether the destination actually does what the source did.

**How to avoid:**
- Before redirecting any `/manage` route, write a two-column audit: "what this page does" vs. "what the `/admin` equivalent does." Only redirect when the functionality is confirmed equivalent.
- For `/manage` pages with no `/admin` equivalent, either port the functionality first or redirect to a new stub in `/admin` with a "this feature is being migrated" placeholder — not a 404.
- Do not delete `/manage` files until the redirect + functional parity has been in production for at least one usage cycle (one week of Isaac using admin daily).
- The `/manage/instructors`, `/manage/schedule`, `/manage/aircraft` pages are the highest-risk because they manage configuration data that affects the booking system. These need explicit parity verification, not just route redirection.

**Warning signs:**
- Any `/manage` page that queries a table not in `supabase/SETUP.sql`.
- A redirect that goes to an `/admin` tab that does not have a matching data model or CRUD interface.
- Isaac reporting he can't find something he used to do in `/manage`.

**Recovery path:**
Restore the `/manage` route (un-redirect it) while the gap is addressed. Because the files aren't deleted yet, this is a one-line revert.

**Phase to address:** Admin consolidation phase. Complete security hardening first so the merge work starts from a stable auth baseline.

---

### Pitfall 5: Student Cancellation Exposes Double-Booking or Orphaned Slots

**Severity:** HIGH

**What goes wrong:**
You add student self-service cancel/reschedule. A student cancels a booking. The cancellation handler updates `bookings.status` to `cancelled` but fails to set `slots.is_booked = false`. The slot is now permanently marked as booked even though no confirmed booking exists. It disappears from the availability calendar. Isaac can't rebook it. Money is also unresolved if the student paid — the booking is cancelled but no refund was initiated.

A second failure mode: two students cancel simultaneously for slots in the same time window, both get confirmation, both try to rebook — a race condition creates a double-booking.

**Why it happens:**
The current booking flow is exclusively admin-controlled, so the only writer to `slots.is_booked` is the Stripe webhook handler (on payment success). When student cancellation is added, a second code path must maintain `slots.is_booked` consistency. If the cancellation handler and the webhook handler don't coordinate, the slot state becomes inconsistent.

**How to avoid:**
- The cancellation operation must be a Supabase transaction: update `bookings.status = 'cancelled'` AND `slots.is_booked = false` atomically. Use a Supabase RPC (database function) for this, not two separate `update` calls in sequence — a server restart between the two calls will leave the data inconsistent.
- Define a clear refund policy before writing code: full refund auto-triggered? Credit only? Time-window-based? The code cannot be written without this decision. The Stripe Connect split transfer reversal logic in the webhook already handles `charge.refunded` — if a refund is issued, it will reverse the payout. But student-initiated cancellation does not automatically trigger a Stripe refund. This gap must be explicitly handled.
- Rate-limit cancellation: prevent a student from cancelling the same booking twice (idempotency check).
- For reschedule: implement as cancel + new booking atomically, not as two separate user actions. This prevents the window where the old slot is freed but the new slot is not yet claimed.

**Warning signs:**
- Cancellation handler makes two separate Supabase `update` calls without a transaction or RPC.
- No refund logic in the cancellation handler — it just marks the booking cancelled.
- No test covering the scenario where the slot update succeeds but the booking update fails (or vice versa).

**Recovery path:**
Write a data integrity script that finds `bookings.status = 'cancelled'` with `slots.is_booked = true` (orphaned slots) and resets the slot. Run it as a one-time fix and add it to the `booking-monitor` cron for ongoing detection.

**Phase to address:** Student self-service phase.

---

### Pitfall 6: Adding CFI Role to a Binary Admin Model Creates Permission Leaks

**Severity:** HIGH

**What goes wrong:**
You add a `role` field to `profiles` with values `admin | cfi | student`. You gate the CFI portal on `role === 'cfi'`. You forget that `isAdmin` in `AuthContext` still reads `profiles.is_admin` (a boolean), not the new `role` field. Isaac (who is both admin and CFI) has `is_admin = true` but no `role` value. New CFIs have `role = 'cfi'` but `is_admin = false`. The admin zone now accidentally becomes accessible by anyone with `role = 'cfi'` if you check the wrong field in one component, or the CFI portal becomes inaccessible to Isaac because the CFI portal checks `role === 'cfi'` and Isaac doesn't have that value set.

A second failure mode: API routes that used `requireAdmin()` are not updated to also accept CFI role, so CFIs can't call their own portal's API endpoints. Or conversely, they're updated too broadly and CFIs gain access to billing routes they shouldn't.

**Why it happens:**
Binary permission models (is_admin: boolean) are easy to reason about. Adding a third role requires a consistent convention across the entire API layer, client context, and database policies — in a codebase where that convention is currently copy-pasted across 5+ route files.

**How to avoid:**
- Before writing any CFI portal code, extract `requireAdmin()` to `lib/auth.ts` and add `requireCFI()` and `requireAdminOrCFI()` variants. This is the prerequisite — not an optimization. Doing it after means updating route files twice.
- The `AuthContext` `isAdmin` field should remain as-is for backward compatibility. Add a new `isCFI` field from the same `profiles` query. Do not repurpose `isAdmin` to mean "has elevated access."
- Decide explicitly: does admin imply CFI access? (Probably yes, since Isaac is sole CFI today.) Encode this in `requireAdminOrCFI()` rather than scattering `isAdmin || isCFI` checks throughout components.
- RLS policies on CFI-specific tables (availability, flight logs, endorsements) must be written to allow CFIs to read/write their own records only, not all records. Use `auth.uid()` scoped policies, not open-to-all policies.
- Migrating Isaac: after adding `role` column, run a migration that sets `role = 'admin'` for all rows where `is_admin = true`. This ensures the role field is consistent from day one.

**Warning signs:**
- Any component checking `isAdmin || role === 'cfi'` instead of a shared `isCFI` context value.
- `requireAdmin()` calls that were not reviewed when adding the CFI role.
- Isaac's account showing different behavior than a new CFI account during testing.

**Recovery path:**
The role model is a data model change. If a permission leak is discovered post-deploy: immediately set the affected user's `role` field to its correct value via Supabase dashboard (row-level fix, no deploy required). Then audit all `requireAdmin()`/`requireCFI()` call sites before the next deploy.

**Phase to address:** CFI portal phase — but the `lib/auth.ts` extraction must happen in Phase 1 (security hardening) so the role expansion has a clean foundation.

---

## Moderate Pitfalls

### Pitfall 7: The `NEXT_PUBLIC_ADMIN_EMAIL` Bootstrap Survives the Refactor

**Severity:** MEDIUM

**What goes wrong:**
`requireAdmin()` is extracted to `lib/auth.ts` (good). But the new version still includes the email-list fallback because "it's needed for Isaac's account." The `NEXT_PUBLIC_ADMIN_EMAIL` env var remains. Post-refactor, the client bundle still exposes the admin email list, and the auth bypass is still present — just in one file now instead of five.

**How to avoid:**
Remove the email fallback in `lib/auth.ts` from the start. If Isaac's `profiles.is_admin` is `true` in the DB, the fallback is not needed. If it's not true, fix the data, not the code. The fallback was a bootstrap convenience that became a permanent security hole.

**Warning signs:**
The `NEXT_PUBLIC_ADMIN_EMAIL` env var is still set in Netlify environment settings after the refactor.

**Phase to address:** Security hardening (Phase 1).

---

### Pitfall 8: The Netlify Function Stripe Webhook Is Still Active in Production

**Severity:** MEDIUM

**What goes wrong:**
You complete the Stripe SDK upgrade across all `app/api/` routes. You forget that `netlify/functions/stripe-webhook.ts` exists. It's still registered as a Stripe webhook endpoint in the Stripe dashboard. It runs the old SDK version with the old `apiVersion`. Stripe sends an event — both the Netlify function and the Next.js route handler receive it. The Netlify function processes it with the old type shapes and may fail silently (its error handling is minimal compared to the App Router version). The `stripe_webhook_events` idempotency guard prevents double-processing, but only if both handlers use the same `event.id` — which they do since Stripe sends the same event object.

The real risk: if the Netlify function's webhook secret (`STRIPE_WEBHOOK_SECRET`) differs from the App Router's, it may reject all events, causing missed payment confirmations.

**How to avoid:**
Before the Stripe upgrade begins, determine which endpoint Stripe is currently configured to call. Check the Stripe dashboard's "Webhooks" section. Confirm exactly one active webhook endpoint points to the correct URL (`https://merlinflighttraining.com/api/stripe-webhook`, not `/.netlify/functions/stripe-webhook`). Disable or delete the Netlify function endpoint in Stripe if it exists. Then proceed with the upgrade.

**Warning signs:**
Two webhook endpoints active in the Stripe dashboard pointing to the same domain.

**Phase to address:** Stripe upgrade phase (pre-upgrade audit step).

---

### Pitfall 9: Admin Monolith Split Creates Stale State Bugs

**Severity:** MEDIUM

**What goes wrong:**
`app/admin/page.tsx` (3,275 lines) is broken into per-tab components. Each tab previously shared state (data fetched on page mount, stored in top-level `useState`). After extraction, each tab component fetches its own data independently. Tab A updates a booking. Tab B was already mounted and still shows the old data. Admin sees inconsistent state and thinks something is broken.

**How to avoid:**
When extracting tabs, each tab should mount-and-fetch on activation (lazy load with `React.lazy`) rather than all fetching on page load. This eliminates stale state: when you switch to a tab, it fetches fresh data. Use `key` prop resets or a manual `refetch` trigger for cross-tab operations (e.g., approving a slot request in the slots tab should not affect the already-rendered bookings tab until it's next visited).

Do not extract all tabs simultaneously. Extract one tab per PR and verify in production before extracting the next. A partial extraction is safer than a big-bang refactor of 3,275 lines.

**Warning signs:**
Multiple tabs mounted simultaneously sharing a global `useState` in the parent component.

**Phase to address:** Admin consolidation phase.

---

### Pitfall 10: Discovery Flight Funnel Submits to Dead Endpoint During Transition

**Severity:** MEDIUM

**What goes wrong:**
The `/booking/` page posts to `/.netlify/functions/book`, which creates a Google Calendar event but no Stripe charge and no Supabase record. If any active marketing campaigns (Google Ads, Instagram) link to `/booking/` rather than the slot-based funnel, students will complete a "booking" with no payment and no record. Isaac receives no notification.

**How to avoid:**
Before retiring `/booking/`, audit all external links: check Google Ads campaigns, Instagram bio link, email templates in `lib/resend.ts` (which still references `isaac-cfi.netlify.app`), and any QR codes in physical materials. Add a redirect from `/booking` → `/schedule` or `/lesson-scheduling` immediately in Phase 1. Do not wait for the full admin consolidation phase.

**Warning signs:**
Any inbound link to `/booking` in Google Search Console or Netlify analytics.

**Phase to address:** Security hardening (Phase 1) — the redirect is a one-line `next.config.js` addition and should be treated as a bug fix.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy-paste `requireAdmin()` per route | Faster to ship each route | Role expansion requires N file edits; drift between implementations causes inconsistent behavior | Never — extract to `lib/auth.ts` before adding CFI role |
| Client-side-only layout auth check | Simple to write | Page HTML delivered to unauthenticated users; defeats purpose of the guard | Never for production admin routes |
| Keep `NEXT_PUBLIC_ADMIN_EMAIL` as fallback | Avoids breaking Isaac's access during migration | Admin email list exposed in client bundle permanently | Never — fix the data (set `is_admin = true`) instead |
| Upgrade all 12 Stripe files in one PR | Gets it done fast | One broken file kills the entire PR; large diff is hard to review; rollback is all-or-nothing | Only if accompanied by per-file test verification before merge |
| Redirect `/manage` before functional parity | Retire the old zone quickly | Isaac loses access to features he uses daily | Never — audit parity first, redirect second |
| Use `'use client'` layout for auth gate | Simpler code | Not a security boundary; page HTML still loads | Never for protected zones |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-----------------|
| Stripe webhooks | Parsing `req.json()` instead of `req.text()` before `constructEvent` | Always `req.text()` first; signature validation requires the raw body bytes |
| Stripe SDK upgrade | Changing `apiVersion` without upgrading the npm package first | Upgrade npm package, verify TypeScript compiles, then update `apiVersion` string |
| Stripe Connect | Not replaying events in Stripe test mode after upgrading | Use Stripe CLI `stripe trigger` and the dashboard's "Resend" for each event type after upgrade |
| Supabase RLS | Writing a policy with `USING (true)` (public SELECT on profiles) | Scope to `USING (auth.uid() = id)` for user data; service role bypasses RLS for admin routes anyway |
| Supabase service role | Creating a new client on every request via `getSupabaseAdmin()` | Module-level singleton with env-var guard; same pattern as `lib/supabase.ts` |
| Next.js middleware on Netlify | Assuming middleware covers Netlify Functions at `/.netlify/functions/*` | Middleware only runs in the Next.js request pipeline; Netlify Functions are independent Lambdas |
| Magic-link OTP + new roles | Assuming a user's session reflects DB role changes immediately | `profiles.is_admin` / `role` changes take effect on next session; current sessions use cached values until token refresh |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `NEXT_PUBLIC_ADMIN_EMAIL` in client bundle | Admin email addresses visible to any user who inspects the JS bundle; enables targeted social engineering | Remove immediately in Phase 1; use `profiles.is_admin` exclusively |
| `api/create-user` with no auth check | Any unauthenticated caller can create verified Supabase users | Add `requireAdmin()` as first line; do this before any public-facing feature work |
| Module-level `console.log` in API route | PII (email, phone) logged to Netlify function logs on every cold start, not just on request | Remove all module-level logs; use `console.error` in catch blocks only |
| Blog image upload with no auth + no MIME validation | Arbitrary file upload by unauthenticated users; files disappear between invocations anyway (serverless FS) | Add admin auth check, MIME allowlist, 5MB size limit; upload to Supabase Storage |
| `profiles` RLS allows public SELECT | Student PII (phone, DOB, emergency contacts, address, `is_admin` flag) readable by any authenticated user | Restrict to `USING (auth.uid() = id)` with admin service-role bypass |
| Dual Stripe webhook endpoints | Events processed twice or by old handler with different logic | Confirm single active endpoint in Stripe dashboard before upgrade |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Student cancels a paid booking with no refund messaging | Student expects money back, receives no communication, files a dispute | Show refund policy before confirmation dialog; send confirmation email stating refund timeline |
| Student reschedule fails mid-flow (old slot freed, new slot not claimed) | Student loses their original slot and gets no new booking | Implement as atomic swap; show "reschedule failed, your original booking is preserved" on error |
| CFI portal shows all students, not just their assigned students | CFIs see PII for students they don't teach (once multi-CFI is live) | Filter CFI portal data by `instructor_id = auth.uid()` from day one |
| Admin zone merge removes a manage feature Isaac uses daily | Isaac can't do his job; discovers the gap during busy operational period | Audit before redirect; keep `/manage` accessible until parity is confirmed |
| Discovery flight funnel redirects to dead page | Prospective student can't book a discovery flight; drops off | Verify `/booking` redirect and all external links before closing legacy route |

---

## "Looks Done But Isn't" Checklist

- [ ] **Auth middleware:** Middleware file exists — verify it covers `/api/admin/*` routes, not just page routes. Check with an unauthenticated curl request to `POST /api/admin/users`.
- [ ] **Manage retirement:** `/manage` redirects are in place — verify the destination pages have functional parity for aircraft management, instructor management, and schedule templates.
- [ ] **Stripe upgrade:** All 12 files updated — verify `netlify/functions/stripe-webhook.ts` is either upgraded or decommissioned. Check Stripe dashboard for duplicate webhook endpoints.
- [ ] **CFI role:** Role column added, `requireCFI()` exported from `lib/auth.ts` — verify Isaac's account has correct values in both `is_admin` and `role` columns. Test as Isaac; test as a new CFI account; test as a student.
- [ ] **Student cancellation:** Cancel button visible in student portal — verify `slots.is_booked` is reset atomically. Check `booking-monitor` cron will detect orphaned slots if it fails.
- [ ] **`requireAdmin()` extraction:** Single function in `lib/auth.ts` — grep for any remaining inline `requireAdmin` definitions in route files.
- [ ] **`NEXT_PUBLIC_ADMIN_EMAIL` removal:** Removed from `AuthContext.tsx` — verify it's also removed from Netlify environment variables, not just the code.
- [ ] **Legacy `/booking` redirect:** Redirect added — verify Resend email templates and any marketing links pointing to the old URL are updated.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Middleware misses API routes | MEDIUM | Add API routes to matcher without a full redeploy cycle; verify with curl; no data loss |
| Webhook breaks post Stripe upgrade | HIGH | Revert `stripe` package version in `package.json`; redeploy; investigate specific breaking change; no payment data is lost (Stripe retries for 3 days) |
| Admin merge breaks manage workflows | MEDIUM | Un-redirect affected `/manage` routes (one-line change); do not delete files until parity confirmed |
| Student cancellation leaves orphaned slots | MEDIUM | Run SQL: `UPDATE slots SET is_booked = false WHERE id IN (SELECT slot_id FROM bookings WHERE status = 'cancelled')` after audit; add to booking-monitor |
| CFI permission leak discovered post-deploy | LOW | Fix `role` field value for affected user in Supabase dashboard immediately; no code deploy required; audit route handlers before next feature deploy |
| Legacy `/booking` still receives traffic | LOW | Add Next.js redirect in `next.config.js`; deploy; verify in Netlify analytics; no data loss if students haven't paid (no Stripe charge created) |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Middleware misses routes | Phase 1: Security hardening | Unauthenticated curl to `/api/admin/users` returns 401 |
| Client layout not a security boundary | Phase 1: Security hardening | JS disabled, navigate to `/manage/users`, assert redirect to `/login` |
| `NEXT_PUBLIC_ADMIN_EMAIL` exposure | Phase 1: Security hardening | Grep client bundle for admin email; env var removed from Netlify |
| `api/create-user` unguarded | Phase 1: Security hardening | Unauthenticated POST to `/api/create-user` returns 401 |
| Legacy `/booking` dead endpoint | Phase 1: Security hardening | GET `/booking` returns redirect; no 200 |
| `requireAdmin()` duplication | Phase 1: Security hardening (prerequisite for all later phases) | Single definition in `lib/auth.ts`; grep finds zero inline copies |
| Admin monolith split creates stale state | Phase 2: Admin consolidation | Each tab fetches on activation; cross-tab update visible after tab switch |
| Admin merge breaks workflows | Phase 2: Admin consolidation | Isaac manually verifies aircraft, instructor, schedule management after redirect |
| CFI role leaks into wrong routes | Phase 3: CFI portal | Test matrix: admin can access billing, CFI cannot; CFI can access availability, student cannot |
| Student cancellation orphans slots | Phase 4: Student self-service | Cancel a paid booking; verify `slots.is_booked = false` in DB; verify refund state is correct |
| Stripe webhook breaks on upgrade | Phase 5: Stripe upgrade | Replay all event types in test mode; `stripe_webhook_events` shows `processed` for each |
| Dual Stripe webhook endpoints | Phase 5: Stripe upgrade (pre-upgrade audit) | Stripe dashboard shows exactly one active webhook endpoint |

---

## Sources

- Codebase audit: `.planning/codebase/CONCERNS.md` (2026-04-08)
- Codebase architecture: `.planning/codebase/ARCHITECTURE.md` (2026-04-08)
- Project requirements: `.planning/PROJECT.md` (2026-04-08)
- Direct code inspection: `app/api/stripe-webhook/route.ts`, `app/api/admin/billing/checkout/route.ts`, `app/manage/layout.tsx`, `app/admin/layout.tsx`, `app/contexts/AuthContext.tsx`, `netlify/functions/stripe-webhook.ts`
- Confidence: HIGH — all pitfalls grounded in actual code patterns found in this specific codebase, not generic best-practice speculation

---
*Pitfalls research for: Merlin Flight Training platform refactor*
*Researched: 2026-04-08*
