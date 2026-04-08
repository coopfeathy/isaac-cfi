# Phase 1: Security Hardening - Research

**Researched:** 2026-04-08
**Domain:** Next.js 16 server-side auth enforcement, @supabase/ssr middleware, API route hardening, PII log removal
**Confidence:** HIGH — all key findings verified against installed packages, live source files, and official SSR README

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth utility hierarchy (lib/auth.ts)**
- D-01: `requireAdmin(request)` — passes if `profiles.is_admin = true`. Rejects all others with 401/403.
- D-02: `requireCFI(request)` — passes if `profiles.is_instructor = true OR profiles.is_admin = true`. Admin is a superset of CFI. Rejects all others with 401/403.
- D-03: `requireUser(request)` — passes if a valid Supabase session exists (any role). No profile row check required.
- D-04: Extract the canonical `requireAdmin()` implementation from `app/api/admin/billing/checkout/route.ts` into `lib/auth.ts`. All 23 route files currently have inline copies — import replaces copy.
- D-05: `lib/auth.ts` uses `@supabase/ssr` `getUser()` (not `getSession()`) to comply with SEC-03.

**Next.js middleware scope**
- D-06: `middleware.ts` covers `/admin/*` and `/manage/*` only. Student routes retain existing client-side auth via `AuthContext` — student server-side hardening is Phase 4 (STU-07).
- D-07: Middleware performs session refresh using `@supabase/ssr`. On auth failure (no session), redirect to `/login` (no return URL param).
- D-08: Middleware does NOT redirect based on role. Role enforcement stays in individual route/layout guards.

**upload-image route fix**
- D-09: Add `requireAdmin()` guard — unauthenticated or non-admin requests return 401/403.
- D-10: Validate MIME type via `file.type` against allowlist: `['image/jpeg', 'image/png', 'image/webp']`. Reject all others with 400.
- D-11: Enforce 5MB file size limit. Reject oversized files with 400.
- D-12: Replace `fs.writeFile` with `supabase.storage.from('blog-images').upload(filename, buffer)`. Return `supabase.storage.from('blog-images').getPublicUrl(filename).data.publicUrl` as the response URL. The `blog-images` bucket must be created if it doesn't exist.
- D-13: Use `getSupabaseAdmin()` (service role) for the storage upload so bucket policies don't block it.

**Contact form failure mode**
- D-14: When `RESEND_API_KEY` is unset, return HTTP 503 (not `{ success: true }`).
- D-15: Before returning 503, save the submission to a `contact_submissions` Supabase table as a fallback. Fields: `name`, `email`, `phone`, `message`, `subject`, `submitted_at`. This ensures no inquiry is silently lost even if email is misconfigured.
- D-16: Remove the PII-logging `console.log` block that currently logs name, email, phone, and message to production logs.

**NEXT_PUBLIC_ADMIN_EMAIL removal**
- D-17: Remove the env var check from `app/contexts/AuthContext.tsx`. The DB-backed `profile.is_admin` flag is authoritative — no email-list fallback.

**PII log removal**
- D-18: Remove the three module-level `console.log` calls from `app/api/create-user/route.ts` (lines 5–7 log env var presence at cold start).
- D-19: Remove the sign-in log from `app/contexts/AuthContext.tsx` that logs the user's email and redirect URL on every sign-in.

### Claude's Discretion
- Error response format for auth failures (JSON shape — follow existing `{ error: string }` pattern)
- `contact_submissions` table column types and indexes
- Whether to create the `blog-images` Supabase bucket via migration SQL or dashboard instruction

### Deferred Ideas (OUT OF SCOPE)
- Student portal server-side auth hardening (`/dashboard`, `/learn`, `/bookings`, etc.) — Phase 4, STU-07
- CSP (Content Security Policy) header — Phase 5 / INFRA-V2-01
- `getSupabaseAdmin()` singleton refactor — codebase concern, not in Phase 1 scope
- RLS policy tightening on `profiles` table (public SELECT) — INFRA-V2-02
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | All `/manage/*` routes redirect unauthenticated users to `/login` server-side | middleware.ts with createServerClient + getUser(); manage/layout.tsx replacement |
| SEC-02 | All `/manage/*` routes redirect non-admin users to `/dashboard` server-side | middleware.ts is session-only (D-08); role check belongs in manage/layout.tsx as a Server Component |
| SEC-03 | `middleware.ts` handles session refresh for all authenticated zones using `@supabase/ssr` `getUser()` (not `getSession()`) | @supabase/ssr 0.9.0 README explicitly documents getUser() requirement; createServerClient pattern verified |
| SEC-04 | `lib/auth.ts` exports `requireAdmin()`, `requireCFI()`, and `requireUser()` used by all API route handlers (no more inline copies) | 23 inline copies confirmed in source; canonical pattern extracted from checkout/route.ts |
| SEC-05 | `api/create-user` requires admin authentication before creating any user account | File confirmed unguarded; requireAdmin() import fixes it |
| SEC-06 | `NEXT_PUBLIC_ADMIN_EMAIL` environment variable is removed from code and Netlify dashboard | Confirmed live in AuthContext.tsx lines 106–108; removal is a 3-line edit |
| SEC-07 | All PII-logging `console.log` calls removed from production API routes | Confirmed: create-user/route.ts lines 5–7, AuthContext.tsx lines 75–76/85, contact/route.ts lines 92–98 |
| SEC-08 | Contact form returns HTTP 503 when `RESEND_API_KEY` is unset (no silent no-op) | Confirmed: contact/route.ts line 102 currently returns `{ success: true }` with no error code |
| SEC-09 | Legacy `/booking/` route redirects to `/schedule` (no longer reachable) | booking/page.tsx confirmed as dead legacy page calling deprecated Netlify function |
| SEC-10 | `api/upload-image` requires admin auth, validates MIME type (jpeg/png/webp only), and enforces 5MB size limit | upload-image/route.ts confirmed: no auth, no MIME check, writes to public/ filesystem |
</phase_requirements>

---

## Summary

This phase is purely surgical: extract one auth pattern that already exists in 23 places into a single canonical file, wire up a `middleware.ts` that doesn't exist yet, and fix four routes that are either unguarded or behaving incorrectly in failure modes. There are no new architectural concepts — the project already uses Supabase auth correctly in most API routes; this phase codifies and enforces what's already the de facto standard.

The largest mechanical task is the 23-file inline `requireAdmin()` replacement (plan 01-03). The pattern is fully established by the existing checkout route — the extraction is straightforward and safe. The middleware is the only genuinely new file, and the `@supabase/ssr` 0.9.0 package installed in the project makes the cookie-handling pattern well-defined.

Two changes require new database objects: the `contact_submissions` table (D-15) and the `blog-images` Supabase Storage bucket (D-12). Neither is in `supabase/SETUP.sql` yet. The planner must include tasks to create both before the code that depends on them runs.

**Primary recommendation:** Build plan 01-01 (`lib/auth.ts` + `middleware.ts`) first, since all other plans depend on importing from it. The 23-file batch replacement in 01-03 is a mechanical find-and-replace once the module exists.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | 0.9.0 (installed) | Server-side Supabase client with cookie management for middleware and Server Components | Official Supabase package replacing deprecated `auth-helpers-nextjs`; only way to do server-side session refresh in Next.js App Router |
| `@supabase/supabase-js` | ^2.38.0 (installed) | Supabase client used by API routes via `supabase.auth.getUser(token)` | Existing project dependency; API routes use bearer-token auth pattern, not cookie auth |
| `next` | 16.1.6 (installed) | Next.js App Router | Project framework |

**No new dependencies needed for this phase.** All required libraries are already installed. [VERIFIED: node_modules inspection]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `getSupabaseAdmin()` from `lib/supabase-admin.ts` | (project utility) | Service-role Supabase client that bypasses RLS | Upload-image route (D-13); any server-side operation that must bypass user-scoped RLS policies |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bearer-token `getUser(token)` in API routes | Cookie-based `createServerClient` in API routes | Bearer token pattern is already established across 23 routes; migrating all to cookie-based would be Phase 4 scope (STU-07). Keeping bearer token for API routes is intentional. |
| `middleware.ts` redirect on role | Role check in `app/manage/layout.tsx` as Server Component | Middleware is kept session-only per D-08; role enforcement (is_admin) lives in the layout guard, not middleware |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
lib/
├── auth.ts          ← NEW: requireAdmin(), requireCFI(), requireUser()
├── supabase-admin.ts  (existing, imported by auth.ts)
└── supabase.ts        (existing, used by auth.ts for getUser token calls)

middleware.ts          ← NEW at repo root (same level as next.config.js)

supabase/
└── migrations/
    └── 20260408_contact_submissions.sql  ← NEW: contact_submissions table
```

### Pattern 1: lib/auth.ts — Canonical Auth Guard Functions

**What:** Three exported async functions that each accept a `NextRequest`, validate the bearer token, optionally check the `profiles` table, and return either `{ error: NextResponse }` or `{ user, profile }`.

**When to use:** Every API route handler that requires authentication. Call at the top of the handler and return early if `'error' in result`.

**Example (extracted from `app/api/admin/billing/checkout/route.ts`):**
```typescript
// Source: app/api/admin/billing/checkout/route.ts (canonical inline copy to extract)
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user }
}
```

**requireCFI() extension (new, not in existing inline copies):**
```typescript
// lib/auth.ts — new, no inline copy exists to extract
export async function requireCFI(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin, is_instructor')
    .eq('id', user.id)
    .single()

  if (profileError || (!profile?.is_instructor && !profile?.is_admin)) {
    return { error: NextResponse.json({ error: 'CFI or admin access required' }, { status: 403 }) }
  }

  return { user, profile }
}
```

**requireUser() (session-only, no profile check per D-03):**
```typescript
// lib/auth.ts
export async function requireUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user }
}
```

**Usage in each route (replace inline definition with import):**
```typescript
// Before (inline, 23 files)
async function requireAdmin(request: NextRequest) { ... }

// After (import)
import { requireAdmin } from '@/lib/auth'
```

### Pattern 2: middleware.ts — Session Refresh + Route Protection

**What:** Next.js middleware using `@supabase/ssr` `createServerClient` to refresh the Supabase session cookie on every request to protected routes, then redirect unauthenticated users to `/login`.

**When to use:** Routes under `/admin/*` and `/manage/*` (D-06).

**Example (based on @supabase/ssr 0.9.0 getAll/setAll pattern):**
```typescript
// middleware.ts — Source: @supabase/ssr 0.9.0 README + installed package type definitions [VERIFIED]
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() not getSession() — verified against SSR README
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/manage/:path*'],
}
```

**CRITICAL:** The `setAll` pattern that reassigns `supabaseResponse` is required. Omitting it causes session refresh failures. [VERIFIED: @supabase/ssr README installed at node_modules]

### Pattern 3: manage/layout.tsx — Role Guard as Server Component

**What:** Replace the current `'use client'` layout that has no auth check with a Server Component that calls `requireAdmin` using the session from cookies (or redirect to `/dashboard` for non-admin authenticated users).

**Current state:** `app/manage/layout.tsx` is `'use client'`, renders `ManageSidebar` with no auth check at all. [VERIFIED: file read]

**What it becomes:** A Server Component (remove `'use client'`) that fetches the user's profile and redirects non-admins. Since middleware already redirects unauthenticated users (SEC-01), the layout only needs to handle SEC-02 (non-admin → `/dashboard`).

**Note:** The layout needs a server-side Supabase client. Use `createServerClient` from `@supabase/ssr` with `cookies()` from `next/headers` (Next.js 16 App Router pattern). [ASSUMED — verify cookies() API in next@16]

### Pattern 4: upload-image Route — Full Replacement

**What:** Replace `fs.writeFile` to `public/` with Supabase Storage upload. The current route writes to the filesystem, which fails on Netlify (ephemeral filesystem) and has no auth. [VERIFIED: file read]

**Supabase Storage pattern (from existing admin pages in codebase):**
```typescript
// Source: app/admin/progress/page.tsx (existing working pattern) [VERIFIED]
const { error: uploadError } = await supabaseAdmin.storage
  .from('blog-images')
  .upload(filename, buffer, { upsert: false, cacheControl: '3600' })

const { data } = supabaseAdmin.storage
  .from('blog-images')
  .getPublicUrl(filename)

return NextResponse.json({ success: true, url: data.publicUrl })
```

**File size check (5MB = 5 * 1024 * 1024 bytes):**
```typescript
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
if (file.size > MAX_SIZE) {
  return NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 400 })
}
```

**MIME type check:**
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
if (!ALLOWED_TYPES.includes(file.type)) {
  return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are accepted' }, { status: 400 })
}
```

### Pattern 5: contact_submissions Table Design

**What:** New Supabase table for fallback storage when `RESEND_API_KEY` is unset. Columns match D-15 field list.

**Recommended schema (Claude's discretion):**
```sql
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  subject TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service role can insert (bypasses RLS for API route use)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON contact_submissions FOR ALL
  USING (false); -- No user-level access; only service role bypasses RLS
```

**Index recommendation:** `submitted_at DESC` for admin review queries. No PII index needed.

### Anti-Patterns to Avoid

- **Using `getSession()` instead of `getUser()` in middleware:** `getSession()` reads cookies without server verification and must never be used for auth decisions. [VERIFIED: @supabase/ssr README explicit warning]
- **Forgetting to reassign `supabaseResponse` in `setAll`:** The middleware cookie-reassignment pattern is required for session refresh to propagate correctly. [VERIFIED: @supabase/ssr README]
- **Using the deprecated `get`/`set`/`remove` cookie API instead of `getAll`/`setAll`:** The project's `@supabase/ssr` 0.9.0 type signatures mark the old API as deprecated and warn it won't be supported in the next major version. [VERIFIED: createServerClient.d.ts]
- **Redirecting based on role in middleware (D-08):** Middleware sees session only — role data requires a DB call. Role checks belong in layout guards, not middleware.
- **Leaving `'use client'` on manage/layout.tsx:** Server Component conversion is required for server-side redirect to work.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server cookie session refresh in Next.js middleware | Custom cookie parsing/writing | `@supabase/ssr` `createServerClient` with `getAll`/`setAll` | Multi-chunk cookie handling, token refresh timing, race condition mitigations already solved |
| MIME type detection | Magic-byte file inspection | `file.type` against allowlist | MIME type from `formData.get('file').type` is set by the client and sufficient for allowlist enforcement; magic bytes are out of scope for this phase |
| Supabase Storage file upload | `fs.writeFile` to public/ | `supabaseAdmin.storage.from(bucket).upload()` | Netlify has ephemeral filesystem; Storage is CDN-backed, persistent, and correctly handles public URL generation |

---

## Common Pitfalls

### Pitfall 1: middleware.ts Matcher Syntax for Nested Routes

**What goes wrong:** `matcher: ['/manage']` only matches the exact path, not sub-routes. `/manage/users` is unprotected.
**Why it happens:** Next.js matcher uses path patterns, not prefix matching by default.
**How to avoid:** Use `'/manage/:path*'` to match all sub-paths. Both `/admin/:path*` and `/manage/:path*` must be in the array.
**Warning signs:** Navigating to `/manage/users` directly renders without redirect.

### Pitfall 2: build Fails Because manage/layout.tsx Imports Client Component

**What goes wrong:** After converting `manage/layout.tsx` to a Server Component, it still imports `ManageSidebar`. If `ManageSidebar` has `'use client'` at the top, the import is fine. But if `ManageSidebar` tries to use hooks or context that require the server-to-client boundary to be marked, it can break.
**Why it happens:** The `'use client'` directive propagates down the import tree, not up. A Server Component can import a Client Component — but the layout itself must not use client-only APIs.
**How to avoid:** Remove `'use client'` from `manage/layout.tsx`, keep it in `ManageSidebar`. The layout calls `redirect()` server-side, not `useRouter()`.

### Pitfall 3: requireAdmin() Return Type Confusion in TypeScript

**What goes wrong:** Callers forget to check `'error' in result` and access `result.user` unconditionally, causing a TypeScript error or runtime crash.
**Why it happens:** The return type is a union: `{ error: NextResponse } | { user: User }`.
**How to avoid:** Document the return type explicitly in `lib/auth.ts`. The existing canonical usage pattern in `checkout/route.ts` is correct: `if ('error' in adminCheck) return adminCheck.error`.

### Pitfall 4: contact_submissions Insert Fails If Table Doesn't Exist

**What goes wrong:** If the migration runs after the code deploys, the 503 path crashes with a DB error instead of returning 503 cleanly.
**Why it happens:** Deployment order — code deploys before schema migration.
**How to avoid:** Plan 01-03 must include the migration as a Wave 0 task. The code should handle insert failure gracefully (log the error, still return 503 rather than 500).

### Pitfall 5: blog-images Bucket Not Created Before upload-image Route Is Called

**What goes wrong:** `supabase.storage.from('blog-images').upload(...)` returns an error if the bucket doesn't exist.
**Why it happens:** Supabase Storage buckets are not auto-created by uploads.
**How to avoid:** Document bucket creation as a required prerequisite step. The planner must include a task to create the `blog-images` bucket in the Supabase dashboard (or via service-role API call) before the route is deployed.

### Pitfall 6: 23-File Import Swap Leaves Orphaned Local Function

**What goes wrong:** A file gets `import { requireAdmin } from '@/lib/auth'` added but the local `async function requireAdmin(...)` declaration is not removed. TypeScript compile error or silent shadow.
**Why it happens:** Incomplete edit in a large batch change.
**How to avoid:** The plan task for 01-03 must explicitly say: remove the local function definition AND add the import in each of the 23 files. A post-edit grep verifying zero remaining `async function requireAdmin` definitions is a good verification step.

---

## Code Examples

### Inline requireAdmin in create-user/route.ts (current unguarded state)

```typescript
// Source: app/api/create-user/route.ts [VERIFIED: file read]
// Lines 4-7 — cold-start PII logs to remove (D-18):
console.log('CREATE-USER API: Initializing...')
console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

// Line 52 — profile data PII log to remove:
console.log('Creating profile with data:', profileData)
```

### AuthContext.tsx — items to remove (D-17 and D-19)

```typescript
// Source: app/contexts/AuthContext.tsx [VERIFIED: file read]

// Line 106-108 — NEXT_PUBLIC_ADMIN_EMAIL fallback to remove (D-17):
const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase().split(',').map(e => e.trim()) || []
const isAdmin = Boolean(profile?.is_admin) ||
  (user?.email ? adminEmails.includes(user.email.toLowerCase()) : false)

// After removal, isAdmin becomes:
const isAdmin = Boolean(profile?.is_admin)

// Lines 75-76, 85 — sign-in PII logs to remove (D-19):
console.log('Attempting sign in for:', email)
console.log('Redirect URL:', redirectUrl)
// ...
console.log('Sign in response:', { data, error })
```

### contact/route.ts — current silent failure to fix (D-14 to D-16)

```typescript
// Source: app/api/contact/route.ts [VERIFIED: file read]
// Lines 92-107 — current behavior: returns { success: true } when API key missing, logs PII
// After fix: insert to contact_submissions, return 503

// PII log block (lines 92-98) to remove entirely:
console.log('=== NEW CONTACT FORM SUBMISSION ===')
console.log('To:', TO_EMAIL)
console.log('Subject:', subject)
console.log('From:', `${name} <${email}>`)
console.log('Phone:', phone)
console.log('Message:', message)
console.log('===================================')
```

### booking/page.tsx — retire with Next.js redirect

```typescript
// Source: app/booking/page.tsx [VERIFIED: file read]
// Current: full multi-step form calling deprecated Netlify function
// Replace with:
import { redirect } from 'next/navigation'
export default function BookingPage() {
  redirect('/schedule')
}
```

**Alternative (next.config.js redirect for SEO):**
```javascript
// next.config.js redirects() — permanent redirect preserves any inbound links
async redirects() {
  return [
    {
      source: '/booking',
      destination: '/schedule',
      permanent: true,
    },
    {
      source: '/booking/:path*',
      destination: '/schedule',
      permanent: true,
    },
  ]
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023-2024 | Project already uses `@supabase/ssr` — no migration needed |
| `get`/`set`/`remove` cookie API in createServerClient | `getAll`/`setAll` | @supabase/ssr 0.5+ | Old API deprecated in 0.9.0 type defs; use `getAll`/`setAll` for new middleware |
| `getSession()` for auth decisions | `getUser()` | Documented in @supabase/ssr 0.9.0 README | `getSession()` not verified by server; `getUser()` is required for secure auth gates |

**Deprecated/outdated:**
- `NEXT_PUBLIC_ADMIN_EMAIL` env var: Was an emergency bootstrap workaround. DB-backed `is_admin` is the authoritative source. Remove per D-17.
- `fs.writeFile` to `public/blog-images/`: Non-functional on Netlify (ephemeral FS). Replace with Supabase Storage per D-12.

---

## Runtime State Inventory

> Not a rename/refactor phase — no runtime state migration required. Section included to confirm no hidden state issues.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No renamed strings; no existing `contact_submissions` table; no `blog-images` bucket | Create table (migration) + create bucket (dashboard) |
| Live service config | `NEXT_PUBLIC_ADMIN_EMAIL` on Netlify dashboard (D-06 success criterion) | Manual: remove from Netlify env vars after code ships |
| OS-registered state | None — no task scheduler, pm2, or systemd entries for this phase | None |
| Secrets/env vars | `NEXT_PUBLIC_ADMIN_EMAIL` in codebase and Netlify dashboard; no rename, just deletion | Remove from .env.local and Netlify |
| Build artifacts | None affected by this phase | None |

---

## Open Questions

1. **manage/layout.tsx Server Component: how to get current user for role check?**
   - What we know: Next.js App Router server components use `cookies()` from `next/headers` + `createServerClient` from `@supabase/ssr` to read the session.
   - What's unclear: Exact `cookies()` API in Next.js 16.1.6 (may be `await cookies()` vs sync).
   - Recommendation: The planner should use `import { cookies } from 'next/headers'` and `createServerClient` with `getAll`/`setAll` from the cookie store. [ASSUMED for exact Next.js 16 API — verify during implementation]

2. **blog-images bucket: create via migration SQL or dashboard?**
   - What we know: Supabase Storage buckets can be created via the Supabase dashboard, the management API, or `supabase.storage.createBucket()` in a setup script. They cannot be created via standard SQL migrations.
   - What's unclear: The project doesn't have a bucket provisioning script.
   - Recommendation (Claude's discretion): Document it as a one-time manual step in the plan. Include the `getSupabaseAdmin().storage.createBucket('blog-images', { public: true })` call as an option in the wave that creates the route.

3. **`contact_submissions` insert failure handling**
   - What we know: The insert is a fallback when email fails. The contact/route.ts code should handle insert error gracefully.
   - Recommendation: Wrap insert in try/catch; log the error server-side (without PII); still return 503. The inquiry may be lost if both email and DB fail, but a double-failure scenario is acceptable given the scope of this phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All build/dev | ✓ | 22.22.2 | — |
| npm | Package installs | ✓ | 10.9.7 | — |
| Next.js | Project framework | ✓ | 16.1.6 | — |
| @supabase/ssr | middleware.ts | ✓ | 0.9.0 | — |
| @supabase/supabase-js | lib/auth.ts | ✓ | 2.38.0 | — |
| jest + ts-jest | Tests | ✓ | jest@30.3.0, ts-jest@29.4.9 | — |

**Missing dependencies with no fallback:** None — all required packages are installed.

**Note:** Supabase project (remote) requires `contact_submissions` table and `blog-images` bucket to be provisioned before plan 01-03 deploys. These are setup tasks, not npm dependencies.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.9 |
| Config file | `jest.config.js` (exists at repo root) |
| Quick run command | `npx jest --testPathPattern=lib/__tests__/auth` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-04 | `requireAdmin()` returns `{ error: 401 }` when no Authorization header | unit | `npx jest --testPathPattern=auth.test` | ❌ Wave 0 |
| SEC-04 | `requireAdmin()` returns `{ error: 403 }` when user exists but `is_admin = false` | unit | `npx jest --testPathPattern=auth.test` | ❌ Wave 0 |
| SEC-04 | `requireAdmin()` returns `{ user }` when user has `is_admin = true` | unit | `npx jest --testPathPattern=auth.test` | ❌ Wave 0 |
| SEC-04 | `requireCFI()` returns `{ user, profile }` when `is_instructor = true` | unit | `npx jest --testPathPattern=auth.test` | ❌ Wave 0 |
| SEC-04 | `requireCFI()` returns `{ user, profile }` when `is_admin = true` (superset) | unit | `npx jest --testPathPattern=auth.test` | ❌ Wave 0 |
| SEC-03 | middleware.ts exists at repo root with correct matcher config | smoke | manual: `ls middleware.ts && grep 'manage' middleware.ts` | ❌ Wave 0 |
| SEC-01/02 | GET `/manage/users` without session returns 302 to `/login` | integration | manual — requires running server | manual-only |
| SEC-08 | Contact form returns 503 when `RESEND_API_KEY` unset | unit | `npx jest --testPathPattern=contact.test` | ❌ Wave 0 |
| SEC-10 | upload-image returns 400 for non-image MIME type | unit | `npx jest --testPathPattern=upload-image.test` | ❌ Wave 0 |
| SEC-10 | upload-image returns 400 for file > 5MB | unit | `npx jest --testPathPattern=upload-image.test` | ❌ Wave 0 |
| SEC-09 | `/booking` redirects to `/schedule` | smoke | manual: `curl -I localhost:3000/booking` | manual-only |
| SEC-06/07 | No `NEXT_PUBLIC_ADMIN_EMAIL` reference in built codebase | static | `grep -r NEXT_PUBLIC_ADMIN_EMAIL app/ lib/` | no Wave 0 setup needed |
| SEC-07 | No PII console.log calls remain | static | `grep -n "console.log.*email\|console.log.*phone" app/api/` | no Wave 0 setup needed |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern=auth.test` (once test file exists)
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `lib/__tests__/auth.test.ts` — covers SEC-04 requireAdmin/requireCFI/requireUser unit tests
- [ ] `lib/__tests__/contact.test.ts` — covers SEC-08 503 behavior (optional: can be tested manually given route complexity)
- [ ] `lib/__tests__/upload-image.test.ts` — covers SEC-10 MIME and size validation

*(Existing tests: `lib/__tests__/availability-engine.test.ts` and `lib/__tests__/caldav.test.ts` — these pass today and must continue passing after this phase.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `@supabase/ssr` `getUser()` (not `getSession()`) |
| V3 Session Management | yes | `@supabase/ssr` middleware cookie refresh pattern |
| V4 Access Control | yes | `requireAdmin()` / `requireCFI()` in `lib/auth.ts`; layout-level role guard |
| V5 Input Validation | yes | MIME type + file size allowlist on upload-image |
| V6 Cryptography | no | No custom crypto in this phase |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated admin API access | Elevation of Privilege | `requireAdmin()` guard on all 23 admin routes + `api/create-user` + `api/upload-image` |
| Session token spoofing via cookie manipulation | Spoofing | `getUser()` instead of `getSession()` — server-validates token on every middleware call |
| PII exposure in server logs | Information Disclosure | Remove all `console.log` calls containing email, phone, form data |
| Client-bundle exposure of admin identity | Information Disclosure | Remove `NEXT_PUBLIC_ADMIN_EMAIL` — any `NEXT_PUBLIC_*` var is bundled into client JS |
| Arbitrary file upload (malicious MIME) | Tampering | MIME type allowlist + 5MB cap on upload-image |
| Silent form submission loss | Denial of Service | `contact_submissions` DB fallback before 503 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js 16.1.6 App Router uses `import { cookies } from 'next/headers'` with `getAll()`/`setAll()` signature compatible with `@supabase/ssr` 0.9.0 for Server Component usage | Architecture Patterns (Pattern 2), Open Questions | manage/layout.tsx Server Component won't compile; requires alternative pattern |

**All other claims in this research were verified against installed packages, live source files, or official documentation in the installed node_modules.**

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@supabase/ssr/README.md` (installed 0.9.0) — `getUser()` vs `getSession()` guidance, middleware `getAll`/`setAll` pattern, concurrent refresh warning
- `node_modules/@supabase/ssr/dist/main/createServerClient.d.ts` — deprecated `get`/`set`/`remove` API confirmation, `getAll`/`setAll` as current API
- `app/api/admin/billing/checkout/route.ts` — canonical `requireAdmin()` implementation (D-04 reference)
- `app/api/upload-image/route.ts` — confirmed: no auth, no MIME check, filesystem write
- `app/api/create-user/route.ts` — confirmed: no auth guard, module-level PII logs at lines 5-7
- `app/api/contact/route.ts` — confirmed: returns `{ success: true }` when API key missing, PII logs at lines 92-98
- `app/contexts/AuthContext.tsx` — confirmed: `NEXT_PUBLIC_ADMIN_EMAIL` at lines 106-108, sign-in PII logs at lines 75-76/85
- `app/manage/layout.tsx` — confirmed: `'use client'`, no auth check
- `lib/supabase-admin.ts` — `getSupabaseAdmin()` signature confirmed
- `supabase/SETUP.sql` — `profiles` table confirmed (`is_admin BOOLEAN DEFAULT false`, `is_instructor BOOLEAN DEFAULT false`)
- `jest.config.js` — test framework confirmed (ts-jest, `__tests__/**/*.test.ts` pattern)

### Secondary (MEDIUM confidence)
- Inline `requireAdmin()` count: 23 files confirmed via `grep -l "async function requireAdmin"` across `app/`
- `app/admin/progress/page.tsx` — Supabase Storage upload pattern (`.from(bucket).upload()` + `.getPublicUrl()`)

### Tertiary (LOW confidence)
- None — all claims verified in this session.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified installed versions, no new packages needed
- Architecture: HIGH — all patterns extracted directly from live source files and installed package type definitions; one ASSUMED item (Next.js 16 `cookies()` API shape)
- Pitfalls: HIGH — verified against actual broken code in source files

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable stack — @supabase/ssr and Next.js versions pinned in project)
