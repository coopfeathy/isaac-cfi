# Phase 1: Security Hardening - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock down auth across all protected routes with server-side enforcement, extract shared auth utilities to a single location (`lib/auth.ts`), eliminate PII leaks from logs and client bundles, and retire the dead legacy `/booking/` route. This phase does NOT touch student portal UX, billing logic, or the admin UI — purely auth infrastructure and security cleanup.

</domain>

<decisions>
## Implementation Decisions

### Auth utility hierarchy (lib/auth.ts)
- **D-01:** `requireAdmin(request)` — passes if `profiles.is_admin = true`. Rejects all others with 401/403.
- **D-02:** `requireCFI(request)` — passes if `profiles.is_instructor = true OR profiles.is_admin = true`. Admin is a superset of CFI. Rejects all others with 401/403.
- **D-03:** `requireUser(request)` — passes if a valid Supabase session exists (any role). No profile row check required.
- **D-04:** Extract the canonical `requireAdmin()` implementation from `app/api/admin/billing/checkout/route.ts` into `lib/auth.ts`. All 20+ route files currently have inline copies — import replaces copy.
- **D-05:** `lib/auth.ts` uses `@supabase/ssr` `getUser()` (not `getSession()`) to comply with SEC-03.

### Next.js middleware scope
- **D-06:** `middleware.ts` covers `/admin/*` and `/manage/*` only. Student routes (`/dashboard`, `/learn`, `/bookings`, etc.) retain existing client-side auth via `AuthContext` — student server-side hardening is Phase 4 (STU-07).
- **D-07:** Middleware performs session refresh using `@supabase/ssr`. On auth failure (no session), redirect to `/login` (no return URL param).
- **D-08:** Middleware does NOT redirect based on role (admin vs CFI vs student). Role enforcement stays in individual route/layout guards.

### upload-image route fix
- **D-09:** Add `requireAdmin()` guard — unauthenticated or non-admin requests return 401/403.
- **D-10:** Validate MIME type via `file.type` against allowlist: `['image/jpeg', 'image/png', 'image/webp']`. Reject all others with 400.
- **D-11:** Enforce 5MB file size limit. Reject oversized files with 400.
- **D-12:** Replace `fs.writeFile` with `supabase.storage.from('blog-images').upload(filename, buffer)`. Return `supabase.storage.from('blog-images').getPublicUrl(filename).data.publicUrl` as the response URL. The `blog-images` bucket must be created if it doesn't exist.
- **D-13:** Use `getSupabaseAdmin()` (service role) for the storage upload so bucket policies don't block it.

### Contact form failure mode
- **D-14:** When `RESEND_API_KEY` is unset, return HTTP 503 (not `{ success: true }`).
- **D-15:** Before returning 503, save the submission to a `contact_submissions` Supabase table as a fallback. Fields: `name`, `email`, `phone`, `message`, `subject`, `submitted_at`. This ensures no inquiry is silently lost even if email is misconfigured.
- **D-16:** Remove the PII-logging `console.log` block that currently logs name, email, phone, and message to production logs.

### NEXT_PUBLIC_ADMIN_EMAIL removal
- **D-17:** Remove the env var check from `app/contexts/AuthContext.tsx`. The DB-backed `profile.is_admin` flag is authoritative — no email-list fallback. Admin bootstrap (if Isaac's profile row doesn't have `is_admin = true`) is handled via direct SQL update.

### PII log removal
- **D-18:** Remove the three module-level `console.log` calls from `app/api/create-user/route.ts` (lines 5–7 log env var presence at cold start).
- **D-19:** Remove the sign-in log from `app/contexts/AuthContext.tsx` that logs the user's email and redirect URL on every sign-in.

### Claude's Discretion
- Error response format for auth failures (JSON shape — follow existing `{ error: string }` pattern)
- `contact_submissions` table column types and indexes
- Whether to create the `blog-images` Supabase bucket via migration SQL or dashboard instruction

</decisions>

<specifics>
## Specific Ideas

- `requireCFI()` must be designed and exported even though Phase 3 is the first consumer — Phase 1's plan 01-01 is the literal code prerequisite for Phase 3
- The 20+ inline `requireAdmin()` copies should all be replaced with imports from `lib/auth.ts` during plan 01-03 (API route hardening) — not left as-is

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SEC-01 through SEC-10 (full requirement text for this phase)

### Existing auth pattern (canonical implementation to extract)
- `app/api/admin/billing/checkout/route.ts` — inline `requireAdmin()` implementation to be extracted to `lib/auth.ts`; this is the reference pattern used across 20+ files

### Files being modified
- `lib/supabase-admin.ts` — existing `getSupabaseAdmin()` helper (Phase 1 will import this in `lib/auth.ts`)
- `lib/supabase.ts` — anon client (used in existing requireAdmin for `getUser()` call)
- `app/manage/layout.tsx` — client-side-only layout to be replaced with server-side guard
- `app/api/create-user/route.ts` — needs `requireAdmin()` + PII log removal
- `app/api/upload-image/route.ts` — full fix: auth + MIME + size + Supabase Storage
- `app/api/contact/route.ts` — fix: 503 + contact_submissions insert + PII log removal
- `app/contexts/AuthContext.tsx` — remove NEXT_PUBLIC_ADMIN_EMAIL fallback + sign-in log

### Database schema
- `supabase/SETUP.sql` — profiles table definition (is_admin, is_instructor columns), existing RLS policies

### No external specs
- No ADRs or feature docs for this phase — decisions fully captured above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getSupabaseAdmin()` from `lib/supabase-admin.ts` — use inside `lib/auth.ts` for server-side user lookups
- `supabase.storage` pattern in `app/admin/lessons/[lessonId]/page.tsx` and `app/admin/progress/page.tsx` — established Supabase Storage upload pattern to follow for upload-image fix

### Established Patterns
- Auth pattern: `getUser(token from Authorization header)` → `profiles.is_admin` DB check → return `{ error: NextResponse }` or `{ user, profile }`. 20+ files use this — `lib/auth.ts` encapsulates it exactly.
- API error responses: `NextResponse.json({ error: string }, { status: N })` — maintain this shape

### Integration Points
- `middleware.ts` at repo root — does not exist yet, needs to be created
- `app/booking/page.tsx` — retire with redirect to `/schedule` (SEC-09). The Netlify function it calls (`/.netlify/functions/book`) is already deprecated.

</code_context>

<deferred>
## Deferred Ideas

- Student portal server-side auth hardening (`/dashboard`, `/learn`, `/bookings`, etc.) — Phase 4, STU-07
- CSP (Content Security Policy) header — mentioned in CONCERNS.md but not in Phase 1 requirements
- `getSupabaseAdmin()` singleton refactor (creates new client per call) — codebase concern, not in Phase 1 scope
- RLS policy tightening on `profiles` table (public SELECT) — future security phase

</deferred>

---

*Phase: 01-security-hardening*
*Context gathered: 2026-04-08*
