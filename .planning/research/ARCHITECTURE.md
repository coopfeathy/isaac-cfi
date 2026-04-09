# Architecture Research

**Domain:** Multi-zone role-based flight school platform (Next.js 16 App Router monolith)
**Researched:** 2026-04-08
**Confidence:** HIGH — conclusions drawn from existing codebase, installed package internals (`@supabase/ssr` v0.9.0 type declarations), and established Next.js App Router patterns

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                             │
│  AuthContext (React Context)                                        │
│  Provides: user, profile, isAdmin, isCFI, session                  │
│  Source: @supabase/supabase-js (anon key, PKCE flow)               │
└────────────────────────┬────────────────────────────────────────────┘
                         │ HTTP (cookies carry Supabase session)
┌────────────────────────▼────────────────────────────────────────────┐
│                   middleware.ts  [NEW]                              │
│  Edge Runtime — runs before every matched route                     │
│  Uses: @supabase/ssr createServerClient (getAll/setAll cookies)     │
│  Does:                                                              │
│    1. Refreshes Supabase session token (MUST happen here)           │
│    2. Reads user.id from verified getUser() call                    │
│    3. Reads role from custom JWT claim (preferred) or cookie hint   │
│    4. Redirects unauthenticated requests to /login                  │
│    5. Redirects role-mismatched requests to appropriate zone        │
│  Does NOT: query DB, call external services, use service role key   │
└────┬─────────────────┬───────────────────┬───────────────┬──────────┘
     │                 │                   │               │
     ▼                 ▼                   ▼               ▼
┌─────────┐    ┌──────────────┐   ┌────────────┐  ┌─────────────┐
│  Public │    │   /student   │   │   /cfi     │  │   /admin    │
│  Zone   │    │   Zone       │   │   Zone     │  │   Zone      │
│         │    │              │   │            │  │             │
│ No auth │    │ Auth: any    │   │ Auth: cfi  │  │ Auth: admin │
│ required│    │ valid user   │   │ or admin   │  │ only        │
└─────────┘    └──────┬───────┘   └─────┬──────┘  └──────┬──────┘
                      │                 │                 │
               ┌──────▼─────────────────▼─────────────────▼──────┐
               │           Layout-Level Secondary Guard           │
               │  Server Component layouts — verify role server-  │
               │  side as defense-in-depth; redirect on mismatch  │
               └──────────────────────┬───────────────────────────┘
                                      │
               ┌──────────────────────▼───────────────────────────┐
               │                  API Layer                        │
               │  app/api/admin/* — requireAdmin() from lib/auth  │
               │  app/api/cfi/*  — requireCFI() from lib/auth     │
               │  app/api/*      — requireUser() from lib/auth    │
               └──────────────────────┬───────────────────────────┘
                                      │
               ┌──────────────────────▼───────────────────────────┐
               │              Supabase (Postgres + Auth)           │
               │  profiles.is_admin   → Admin role                │
               │  profiles.is_instructor → CFI role (exists now)  │
               │  RLS: service role key bypasses in API routes     │
               └──────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Notes |
|-----------|---------------|-------|
| `middleware.ts` | Session refresh + coarse route-level redirect | Edge Runtime only; no DB access; reads role from JWT claim or cookie hint |
| Layout server components | Secondary role guard per zone; renders zone chrome | Uses `@supabase/ssr` `createServerClient` to read verified session |
| `lib/auth.ts` | Shared `requireAdmin()`, `requireCFI()`, `requireUser()` | Used in all API route handlers; reads `profiles` table via service role |
| `AuthContext.tsx` | Client-side auth state; exposes `isAdmin`, `isCFI` | Drives client UI rendering only, not security decisions |
| `app/api/*` | All server mutations; enforces role at handler level | Defense-in-depth — never rely solely on middleware for API security |

---

## Recommended Project Structure

```
app/
├── (public)/               # Route group — no auth, public marketing
│   ├── page.tsx
│   ├── pricing/
│   ├── aircraft/
│   └── blog/
├── (student)/              # Route group — any authenticated user
│   ├── layout.tsx          # Server component: verify session, redirect to /login
│   ├── dashboard/
│   ├── learn/
│   ├── progress/
│   ├── bookings/
│   └── lesson-scheduling/
├── cfi/                    # CFI portal — is_instructor OR is_admin
│   ├── layout.tsx          # Server component: verify cfi/admin role
│   ├── schedule/           # CFI sets own availability
│   ├── students/           # CFI's student roster
│   ├── logbook/            # Log flight hours and endorsements
│   └── dashboard/
├── admin/                  # Unified admin — is_admin only
│   ├── layout.tsx          # Server component: verify admin role
│   ├── page.tsx            # Split into sub-components (not monolith)
│   ├── components/
│   │   ├── BookingsTab.tsx
│   │   ├── BillingTab.tsx
│   │   ├── StudentsTab.tsx
│   │   ├── ProspectsTab.tsx
│   │   ├── CalendarTab.tsx
│   │   └── SyllabusTab.tsx
│   ├── bookings/
│   ├── billing/
│   ├── students/
│   ├── aircraft/           # Merged from /manage/aircraft
│   ├── instructors/        # Merged from /manage/instructors
│   ├── schedule-templates/ # Merged from /manage/schedule
│   └── users/              # Merged from /manage/users
├── api/
│   ├── admin/              # Admin-only mutations — requireAdmin()
│   ├── cfi/                # CFI mutations — requireCFI()
│   └── (public)/           # Public endpoints — rate limiting required
middleware.ts               # Session refresh + zone routing guards
lib/
├── auth.ts                 # requireAdmin(), requireCFI(), requireUser()
├── supabase-server.ts      # createServerClient helper for layouts/routes
├── supabase.ts             # Browser anon client (existing)
└── supabase-admin.ts       # Service role client — singleton (fix existing)
```

### Structure Rationale

- **Route groups `(public)` and `(student)`:** Parentheses make them invisible in the URL path while allowing a shared layout per zone. Use for zones that share a URL prefix with other content.
- **`/cfi/` as a named segment:** The CFI portal lives at `/cfi/*` with its own nav. Keeps it distinct from admin without polluting top-level route namespace.
- **`/admin/` with merged `/manage/`:** Everything system-config that was in `/manage` moves into `/admin` sub-sections. One zone, one nav, one layout guard.
- **`lib/auth.ts` as single source of truth:** All API-level role checks live here. A future role change (e.g., adding a "manager" role) is one file edit.

---

## Architectural Patterns

### Pattern 1: Middleware for Session Refresh + Coarse Redirect

**What:** `middleware.ts` uses `@supabase/ssr`'s `createServerClient` with `getAll`/`setAll` cookie handlers to refresh the Supabase JWT on every request, then redirects unauthenticated users away from protected zones.

**When to use:** Always — this is mandatory for Supabase SSR to work correctly. Without it, session refresh tokens get lost between requests, causing random logouts.

**Trade-offs:** Middleware runs on the Edge Runtime — no Node.js APIs, no direct DB access, no service role key. Role checks in middleware must rely on what's in the JWT (custom claims) or a cookie set at login time.

**Critical constraint:** Use `getUser()` not `getSession()` for any authorization decision. `getSession()` reads from cookies without server validation and can be spoofed. `getUser()` validates against the Supabase Auth server on every call. For middleware (which runs on every request), the verified user is needed only to decide redirect/pass; the heavier DB role lookup belongs in layout server components.

**Example:**
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // MUST call getUser() to refresh the session — do not use getSession()
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = path.startsWith('/admin') || path.startsWith('/cfi') ||
    path.startsWith('/dashboard') || path.startsWith('/learn') ||
    path.startsWith('/bookings') || path.startsWith('/progress')

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(loginUrl)
  }

  // Pass role routing to layout-level guards (middleware can't query DB)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 2: Layout-Level Server Component Role Guard

**What:** Each zone's `layout.tsx` is a Server Component that creates a `createServerClient`, calls `getUser()`, queries `profiles` for the role flag, and redirects if the role doesn't match. This is the primary role enforcement layer.

**When to use:** On every protected zone's root layout. This is where DB-backed role checks live because Server Components can call the DB (via service role or anon client with RLS).

**Trade-offs:** Adds one DB round-trip per page navigation within a zone. Acceptable for an internal tool used by a handful of CFIs and one admin. At scale (thousands of concurrent admins) you'd cache role in a cookie/JWT claim.

**Example:**
```typescript
// app/admin/layout.tsx  (Server Component — no 'use client')
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AdminTopNav from '@/app/components/AdminTopNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only in layouts */ },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopNav />
      <main>{children}</main>
    </div>
  )
}
```

### Pattern 3: Centralized API Auth with `lib/auth.ts`

**What:** A single module exports `requireAdmin(request)`, `requireCFI(request)`, and `requireUser(request)`. Every API route imports and calls the appropriate function at the top of the handler.

**When to use:** Every API route handler — this is defense-in-depth. Even if middleware or layout guards are bypassed (e.g., a direct API call from curl), the API layer independently enforces role.

**Trade-offs:** Adds a small amount of boilerplate per route, but eliminates copy-paste drift. The existing `requireAdmin()` inline in each route file is the anti-pattern to remove.

**Example:**
```typescript
// lib/auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from './supabase'

export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()

  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { user }
}

export async function requireCFI(request: NextRequest) {
  // Same pattern — is_instructor OR is_admin qualifies
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles').select('is_admin, is_instructor').eq('id', user.id).single()

  if (!profile?.is_admin && !profile?.is_instructor)
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { user }
}

export async function requireUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  return { user }
}
```

### Pattern 4: Soft RBAC Using Two Boolean Flags

**What:** Two boolean columns on `profiles` (`is_admin`, `is_instructor`) cover four access levels without a full RBAC system: Public (no flags), Student (authenticated, no flags), CFI (`is_instructor = true`), Admin (`is_admin = true`). Admin is a superset of CFI — admin users can access the CFI portal.

**When to use:** When you have 2-4 fixed roles with known, stable permission sets. Appropriate for this flight school at current and projected scale. A full RBAC system (roles table, permissions table, role assignments) would be over-engineered for a single-location school with at most 10 instructors.

**Trade-offs:** Adding a 5th role requires a new boolean column and a schema migration. That's acceptable cost. If roles become dynamic or user-configurable, migrate to a `user_roles` join table at that point — not before.

**Do not:** Use `NEXT_PUBLIC_ADMIN_EMAIL` for any role check. Remove entirely (already flagged in CONCERNS.md).

---

## Data Flow

### Auth-Protected Page Request Flow

```
Browser navigates to /admin/bookings
    ↓
middleware.ts (Edge)
    → createServerClient (SSR, cookie-based)
    → supabase.auth.getUser()           ← validates JWT with Supabase Auth server
    → if no user: redirect to /login
    → if user: pass through (session cookies refreshed)
    ↓
app/admin/layout.tsx (Server Component)
    → createServerClient (SSR, cookie-based)
    → supabase.auth.getUser()           ← second verified call (defense-in-depth)
    → query profiles.is_admin           ← DB lookup, anon client + RLS or service role
    → if not admin: redirect to /
    → render AdminTopNav + <main>
    ↓
app/admin/bookings/page.tsx (Server or Client Component)
    → fetch data (server: direct Supabase query | client: fetch to api/admin/bookings)
    → render UI
```

### API Mutation Flow

```
Client calls fetch('/api/admin/billing/checkout', { headers: { Authorization: 'Bearer <token>' } })
    ↓
app/api/admin/billing/checkout/route.ts
    → import { requireAdmin } from '@/lib/auth'
    → const { user, error } = await requireAdmin(request)
    → if error: return error response
    → perform mutation with getSupabaseAdmin() (service role, bypasses RLS)
    → return result
```

### CFI Portal Data Flow

```
CFI navigates to /cfi/students
    ↓
middleware.ts — user authenticated, passes through
    ↓
app/cfi/layout.tsx — verifies is_instructor OR is_admin, redirects if neither
    ↓
app/cfi/students/page.tsx
    → fetch /api/cfi/students (server) or direct Supabase query
    → CFI sees only their assigned students (RLS policy: instructor_id = auth.uid())
```

### Session Refresh (Critical Path)

```
Every request:
middleware.ts
    → createServerClient reads session cookies
    → supabase.auth.getUser() triggers token refresh if near expiry
    → setAll() writes updated cookies to response
    ↓ (cookies forwarded on response)
Browser stores refreshed session cookie
```

Without this middleware path, Supabase SSR sessions expire without refresh, causing random logouts. The `@supabase/ssr` v0.9.0 docs (read from installed package) explicitly state middleware is mandatory for correct session handling.

---

## Component Boundaries

| Boundary | What Crosses It | Direction | Notes |
|----------|----------------|-----------|-------|
| Browser ↔ middleware | HTTP request with session cookies | Both | Middleware reads cookies; writes refreshed cookies on response |
| middleware ↔ layout | Next.js request object (no direct call) | Sequential | Middleware runs first, then layout renders |
| Layout ↔ page | React children prop | Down | Layout owns chrome + role gate; page owns content |
| Client component ↔ API | `fetch()` with `Authorization: Bearer` header | Both | Client reads session token from `useAuth()` context |
| API route ↔ Supabase | Supabase JS SDK calls | Both | Admin routes use service role; user routes use anon key |
| AuthContext ↔ child components | React context | Down | `useAuth()` hook; client-side only; drives UI state, not security |

---

## Build Order

The dependency chain below must drive phase sequencing:

### Step 1 — Foundation (must be first, unblocks everything)

1. **`lib/auth.ts`** — extract shared `requireAdmin()` from 5+ inline copies. Zero new behavior, just consolidation. This is the building block all API routes need.
2. **`middleware.ts`** — add Next.js middleware with `@supabase/ssr`. Session refresh starts working correctly. Add coarse unauthenticated-redirect guard for `/admin/*`, `/cfi/*`, student routes.
3. **Fix `/manage` layout** — convert from client component to server component with `createServerClient` + role check. Eliminates the MEDIUM security gap identified in CONCERNS.md.

### Step 2 — Merge /manage into /admin (depends on Step 1)

4. **Audit `/manage` pages** — determine which are live vs. dead. Move live ones to `/admin` sub-sections (aircraft, instructors, schedule templates, users).
5. **Retire `/manage`** — add redirects from old URLs, delete `ManageSidebar`, delete `app/manage/`.
6. **Break up `app/admin/page.tsx`** — extract 8 tab components into `app/admin/components/`. Use `React.lazy` + `Suspense` per tab.

### Step 3 — CFI Portal (depends on Step 1, Step 2)

7. **`app/cfi/` zone** — new layout with `is_instructor OR is_admin` guard. New pages: schedule, students, logbook, dashboard.
8. **`app/api/cfi/*` routes** — availability management, student roster view, flight hour logging.
9. **RLS policy for CFI** — CFI sees only their assigned students (new `instructor_id` FK on relevant tables if not present).

### Step 4 — Student Self-Service (depends on Step 1)

10. **Student booking/cancellation API** — `requireUser()` guard. No admin approval path.
11. **Student billing view** — invoice history, payment from portal.

Steps 3 and 4 can run in parallel after Step 1 is complete.

---

## Anti-Patterns

### Anti-Pattern 1: Client-Side-Only Auth Gate

**What people do:** Check `useAuth().isAdmin` in a `useEffect` and redirect if false.

**Why it's wrong:** React renders before the effect runs. The protected page HTML is delivered to the browser and rendered. An attacker can disable JS or race the redirect. This is exactly what `/manage` currently does.

**Do this instead:** Server Component layout with `createServerClient` + `getUser()` that redirects before rendering any children.

### Anti-Pattern 2: Inline `requireAdmin()` in Each Route

**What people do:** Copy-paste the same 15-line auth block into every route file.

**Why it's wrong:** Admin auth logic has drifted across files already (CONCERNS.md confirms). A future change (e.g., adding CFI role, adding suspended-user check) requires touching 5+ files and will be missed somewhere.

**Do this instead:** Single `lib/auth.ts` export. One import per route. One place to update.

### Anti-Pattern 3: Using `getSession()` for Authorization

**What people do:** Call `supabase.auth.getSession()` in middleware or layouts to check who the user is before deciding what to show.

**Why it's wrong:** `getSession()` reads directly from the cookie without validating with the Supabase Auth server. The JWT data is unverified — it could be a tampered or expired token. The `@supabase/ssr` package docs explicitly warn: "The user object it contains is therefore not verified and should not be used for authorization decisions."

**Do this instead:** Always use `getUser()` for auth decisions. It contacts the Auth server to verify the token. Accept the extra network round-trip.

### Anti-Pattern 4: DB Queries in Middleware

**What people do:** Put `profiles.is_admin` lookup inside `middleware.ts` to do role-based redirect at the edge.

**Why it's wrong:** Middleware runs on the Edge Runtime. The Supabase service role key cannot safely live in Edge Runtime environment (it's a server secret). Anon key + DB query from edge is slow and adds latency to every single page request. Edge Runtime does not have full Node.js APIs.

**Do this instead:** Middleware handles only authentication (is there a valid user?). Role enforcement lives in layout Server Components and API handlers, which run in the Node.js runtime with full DB access.

### Anti-Pattern 5: Using `NEXT_PUBLIC_*` for Role Data

**What people do:** Store admin email list in `NEXT_PUBLIC_ADMIN_EMAIL`, read it in `AuthContext` to grant admin access.

**Why it's wrong:** `NEXT_PUBLIC_` variables are embedded in the client JS bundle and visible to any user who opens DevTools. Anyone who reads the admin email can know which accounts to target.

**Do this instead:** Remove entirely. `profiles.is_admin` DB flag is the authoritative source. Bootstrapping a first admin is a one-time `UPDATE profiles SET is_admin = true WHERE id = '...'` in the Supabase dashboard.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 CFIs, ~100 students | Current pattern is fine. Boolean flags + layout guards + `lib/auth.ts` is all that's needed. |
| 10-50 CFIs, ~1,000 students | Cache role in JWT custom claim (Supabase Auth hook) to eliminate DB round-trip in layout guards. |
| 100+ CFIs (multi-school) | Move to `user_roles` join table, add `school_id` scoping, consider splitting into separate Supabase projects per school. Not in scope for Merlin. |

The bottleneck at current scale is not auth architecture — it is the 3,275-line admin page monolith causing slow load and hard maintenance. That is the first performance investment.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `AuthContext` ↔ layouts | Independent — context is client-only; layouts are server-only | Do not try to pass context to server components. Each reads session independently via `createServerClient`. |
| `/admin` ↔ `/cfi` | No direct communication | Shared data (student records, bookings) goes through the same Supabase tables and API routes. |
| `middleware.ts` ↔ layout guards | Sequential, not coupled | Middleware sets session cookies; layout reads those same cookies. No direct call between them. |
| `lib/auth.ts` ↔ API routes | Import at top of handler | Simple function call. Returns `{ user }` on success or `{ error: NextResponse }` on failure. |

### External Services

| Service | Integration Pattern | Auth Layer Notes |
|---------|---------------------|-----------------|
| Supabase Auth | `@supabase/ssr` `createServerClient` in middleware + layouts; `supabase.auth.getUser()` in API routes | Three distinct clients: browser (anon), server/middleware (anon + cookie), admin routes (service role) |
| Stripe | Server-only (API routes). No client-side Stripe key in protected zones | Stripe keys stay server-side. No change to auth architecture. |
| Resend, CalDAV, Google APIs | Server-only (API routes, Netlify functions) | No auth architecture interaction. |

---

## Sources

- `@supabase/ssr` v0.9.0 installed package type declarations (`createServerClient.d.ts`) — HIGH confidence. Confirms: middleware is mandatory for session refresh; `getUser()` required for auth decisions; `getSession()` is unverified.
- Existing codebase analysis (`app/admin/layout.tsx`, `app/manage/layout.tsx`, `AuthContext.tsx`, `app/api/admin/availability-overrides/route.ts`, `supabase/SETUP.sql`) — HIGH confidence. Direct code reading.
- `.planning/codebase/ARCHITECTURE.md` — HIGH confidence. Existing architecture analysis from codebase mapping session.
- `.planning/codebase/CONCERNS.md` — HIGH confidence. Known security gaps directly relevant to design decisions.

---

*Architecture research for: Multi-portal flight school platform (Merlin Flight Training)*
*Researched: 2026-04-08*
