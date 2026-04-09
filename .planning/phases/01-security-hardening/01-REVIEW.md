---
phase: 01-security-hardening
reviewed: 2026-04-08T00:00:00Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - app/api/admin/availability-overrides/route.ts
  - app/api/admin/availability/route.ts
  - app/api/admin/billing/accountant-text/route.ts
  - app/api/admin/billing/cash-payment/route.ts
  - app/api/admin/billing/checkout/route.ts
  - app/api/admin/billing/delete-checkout/route.ts
  - app/api/admin/billing/overview/route.ts
  - app/api/admin/billing/payout-rules/route.ts
  - app/api/admin/billing/push-checkout-link/route.ts
  - app/api/admin/billing/send-reminder/route.ts
  - app/api/admin/billing/sync-products/route.ts
  - app/api/admin/bookings/manual/route.ts
  - app/api/admin/caldav/push/route.ts
  - app/api/admin/caldav/settings/route.ts
  - app/api/admin/caldav/sync/route.ts
  - app/api/admin/caldav/test/route.ts
  - app/api/admin/enrollments/migrate-course/route.ts
  - app/api/admin/prospects/[prospectId]/route.ts
  - app/api/admin/slot-requests/[id]/approve/route.ts
  - app/api/admin/slot-requests/[id]/deny/route.ts
  - app/api/admin/students/normalize/route.ts
  - app/api/admin/students/route.ts
  - app/api/admin/students/send-account-link/route.ts
  - app/api/contact/route.ts
  - app/api/create-user/route.ts
  - app/api/upload-image/route.ts
  - app/booking/page.tsx
  - app/contexts/AuthContext.tsx
  - app/manage/layout.tsx
  - lib/__tests__/auth.test.ts
  - lib/__tests__/contact.test.ts
  - lib/__tests__/upload-image.test.ts
  - lib/auth.ts
  - middleware.ts
  - supabase/migrations/20260408_contact_submissions.sql
findings:
  critical: 3
  warning: 5
  info: 4
  total: 12
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

This review covers the full security hardening surface for the Merlin Flight Training application — all admin API routes, the public contact and user-creation endpoints, auth guards, middleware, the manage layout, and the migration for contact form fallback storage.

The auth architecture is well-designed overall. `lib/auth.ts` uses `supabase.auth.getUser()` (server-verified) rather than `getSession()`, every admin route calls `requireAdmin`, and the middleware correctly gates `/admin/*` and `/manage/*`. The Supabase admin client is segregated, input validation is consistent, and the test suite covers the critical paths.

Three critical issues were found:

1. `app/api/create-user/route.ts` leaks internal error stack traces and arbitrary `profile` fields to the caller, and accepts a user-supplied password without any length/complexity enforcement.
2. `app/api/contact/route.ts` is missing rate-limiting — the public endpoint can be abused to send unlimited emails via Resend or to flood the `contact_submissions` table.
3. `app/api/admin/billing/delete-checkout/route.ts` deletes DB transaction records using a `LIKE '%PI:<id>%'` pattern on the `paymentIntentId` supplied by the admin caller without first validating that the ID matches the format of a real Stripe PaymentIntent. A caller who passes a crafted string can delete unrelated transaction rows.

---

## Critical Issues

### CR-01: Stack trace and internal details leaked in error response

**File:** `app/api/create-user/route.ts:72-78`
**Issue:** The catch block at the bottom of the handler returns `error.stack`, `error.toString()`, and full JSON-stringified error details to the HTTP caller. In a production API, this leaks server internals (file paths, dependency versions, internal module structure) to anyone who can trigger an error — including unauthenticated callers if the admin guard is bypassed for any reason. It also logs the full error object with `JSON.stringify` at line 73, which can include credentials or PII depending on what the error contains.

```ts
// Current — leaks internals
return NextResponse.json({ 
  error: error.message,
  details: error.toString(),   // <-- leaks class name + message
  stack: error.stack           // <-- leaks full stack trace
}, { status: 500 })
```

**Fix:** Return only a generic message to the caller; keep the detailed log server-side only.

```ts
console.error('[create-user] Unexpected error:', error)
return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
```

Also remove the two `console.error` calls at lines 71-73 that log the full `JSON.stringify` of the error object — plain `console.error('[create-user] error:', error)` is sufficient.

---

### CR-02: Arbitrary profile fields passed through to DB without allowlist

**File:** `app/api/create-user/route.ts:16-53`
**Issue:** The `profile` field is spread directly from the parsed request body into the `profileData` object inserted into the `profiles` table (line 40-49). There is no allowlist of accepted profile fields. An admin caller can set any column on the `profiles` table — including `is_admin: true` — simply by including it in the request body. While this endpoint is gated by `requireAdmin`, the blast radius of a compromised admin session or misconfigured client is much larger than intended.

```ts
// Current — no field allowlist
const profileData = {
  id: authData.user.id,
  ...profile,           // <-- any key the caller sends goes to the DB
}
```

**Fix:** Explicitly allowlist the fields that are safe to set during creation.

```ts
const allowedProfileFields = ['full_name', 'phone', 'avatar_url'] // expand as needed
const sanitizedProfile: Record<string, unknown> = {}
for (const key of allowedProfileFields) {
  if (profile && key in profile && profile[key] !== undefined) {
    sanitizedProfile[key] = profile[key]
  }
}
const profileData = {
  id: authData.user.id,
  ...sanitizedProfile,
}
```

---

### CR-03: Transaction deletion via unvalidated LIKE pattern on caller-supplied PaymentIntent ID

**File:** `app/api/admin/billing/delete-checkout/route.ts:38-40`
**Issue:** The `paymentIntentId` from the request body is interpolated directly into a `LIKE` pattern for a bulk database delete: `.like('description', '%PI:${paymentIntentId}%')`. There is no format validation on `paymentIntentId` before this query. A malicious admin (or compromised session) can pass a value such as `"pi_"` to match every transaction whose description contains `PI:pi_`, effectively wiping the entire transaction history. Stripe PaymentIntent IDs follow the format `pi_[A-Za-z0-9]+` — this should be enforced before the DB operation.

```ts
// Current — unvalidated interpolation into a bulk delete pattern
await supabaseAdmin
  .from('transactions')
  .delete()
  .like('description', `%PI:${paymentIntentId}%`)
```

**Fix:** Validate the ID format before use, and prefer an exact match over a broad LIKE.

```ts
const PI_ID_RE = /^pi_[A-Za-z0-9_]{6,99}$/
if (!PI_ID_RE.test(paymentIntentId)) {
  return NextResponse.json({ error: 'Invalid paymentIntentId format' }, { status: 400 })
}

// Then the LIKE query is safe because the ID is a known-safe string
await supabaseAdmin
  .from('transactions')
  .delete()
  .like('description', `%PI:${paymentIntentId}%`)
```

---

## Warnings

### WR-01: No rate limiting on the public contact form endpoint

**File:** `app/api/contact/route.ts:4-106`
**Issue:** The contact form route has no rate limiting. With `RESEND_API_KEY` set, an attacker can trigger an unlimited number of outbound emails by sending POST requests in a loop, exhausting the Resend quota and potentially triggering usage charges. With `RESEND_API_KEY` unset, repeated requests flood the `contact_submissions` table. The endpoint is entirely unauthenticated — no IP-based or session-based throttle is in place.

**Fix:** Apply a rate limit at the Next.js middleware layer or within the route itself using a lightweight in-memory or Redis-backed counter (e.g., `upstash/ratelimit` with an Upstash Redis instance, which is free-tier compatible). At minimum, add the route to a middleware matcher and return `429` if more than N requests per minute are detected from the same IP.

---

### WR-02: `app/api/create-user/route.ts` accepts any password without strength enforcement

**File:** `app/api/create-user/route.ts:17-19`
**Issue:** The password field is passed directly to `supabase.auth.admin.createUser` with no length or complexity check. Supabase's admin API does not enforce a minimum password length by default when creating users server-side. An admin can create accounts with a one-character password.

**Fix:** Enforce a minimum length before calling the auth API.

```ts
if (!email || !password) {
  return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
}
if (password.length < 8) {
  return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
}
```

---

### WR-03: `lib/auth.ts` uses the anon-key Supabase client for admin role lookups

**File:** `lib/auth.ts:14, 36, 42-49`
**Issue:** `requireAdmin` and `requireCFI` verify the bearer token and then look up the `profiles` table using the shared `supabase` client imported from `@/lib/supabase`, which uses the anonymous key. This means the profile lookup is subject to Row Level Security policies on the `profiles` table. If those RLS policies change (or are misconfigured), the admin check could silently return `null` for a real admin, causing a 403. The token verification via `supabase.auth.getUser(token)` is correct, but the subsequent role check should use the service-role admin client (`getSupabaseAdmin()`) to guarantee it is never blocked by RLS.

**Fix:**
```ts
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// In requireAdmin — replace the anon-client profile query:
const supabaseAdmin = getSupabaseAdmin()
const { data: profile, error: profileError } = await supabaseAdmin
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single()
```

Note: the token validation step (`supabase.auth.getUser(token)`) must remain on the anon client — that is correct. Only the subsequent DB query should move to the admin client.

---

### WR-04: `app/manage/layout.tsx` — admin role check uses anon-key client subject to RLS

**File:** `app/manage/layout.tsx:34-41`
**Issue:** Same class of issue as WR-03. The layout queries `profiles` using the SSR client built with the anon key. If RLS on `profiles` denies reads to any user, `profile?.is_admin` resolves to `undefined` (falsy), and the user is redirected to `/dashboard` instead of getting an error or being treated correctly. A misconfigured RLS policy could silently lock all users out of the manage panel. Since this is a layout guard (not a middleware route guard), it does not benefit from the middleware's session refresh.

**Fix:** Query the profile using the service-role client to make the admin check RLS-immune, or confirm that the `profiles` table RLS policy explicitly allows users to read their own row.

---

### WR-05: `app/api/admin/billing/cash-payment/route.ts` — cash type detection relies on fragile string prefix matching

**File:** `app/api/admin/billing/cash-payment/route.ts:98-103`
**Issue:** Whether a transaction is a "cash payment" (and therefore deletable) is determined by checking if the description field starts with `'CASH:'`, `'[CASH]'`, or `'Partial cash payment'`. The same fragile check appears in `billing/checkout/route.ts` (line 116-119), `billing/overview/route.ts` (line 77-81), and `billing/push-checkout-link/route.ts` (line 248-254). If any of these prefix strings drift over time (a typo, a refactor of the description template), cash transactions become undeletable or, worse, non-cash transactions get incorrectly identified as cash. This is a logic correctness issue that could result in data integrity problems.

**Fix:** Add a dedicated boolean `is_cash_payment` column to the `transactions` table and set it explicitly when recording a cash payment. Replace the description-pattern heuristic with a direct column check.

---

## Info

### IN-01: `app/api/create-user/route.ts` — inline Supabase client creation instead of shared factory

**File:** `app/api/create-user/route.ts:5-9`
**Issue:** This file creates its own `supabase` client using `createClient(...)` at module initialization rather than using the shared `getSupabaseAdmin()` factory used by every other admin route. This is inconsistent and means any future changes to the admin client configuration (timeout, fetch options, etc.) must be made in two places.

**Fix:** Replace the inline client with `getSupabaseAdmin()` from `@/lib/supabase-admin`.

---

### IN-02: `app/api/admin/billing/push-checkout-link/route.ts` — hardcoded logo URL

**File:** `app/api/admin/billing/push-checkout-link/route.ts:39`
**Issue:** The brand logo URL `'https://isaac-cfi.netlify.app/merlin-logo.png'` is hardcoded in the email template. The same hardcoded URL appears in `billing/send-reminder/route.ts:67`. If the hosting URL changes, both email templates will silently show broken image placeholders.

**Fix:** Move the logo URL to an environment variable (`NEXT_PUBLIC_LOGO_URL` or similar) and reference it from there.

---

### IN-03: `app/api/admin/students/send-account-link/route.ts` — `listUsers` without pagination could miss users in large datasets

**File:** `app/api/admin/students/send-account-link/route.ts:46`
**Issue:** `supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })` retrieves at most 1000 auth users. If the auth user table grows beyond 1000 entries, the email match at line 47 could silently fail to find an existing user, triggering an unnecessary invite email to someone who already has an account.

**Fix:** Either paginate through all users until no more results are returned, or (more efficiently) use `supabaseAdmin.auth.admin.listUsers()` filtered by email if the Supabase Admin API supports it, or query the `profiles` table by email directly since it stores user emails.

---

### IN-04: `app/api/admin/caldav/sync/route.ts` — slot time updates from calendar accepted without overlap validation

**File:** `app/api/admin/caldav/sync/route.ts:139-155`
**Issue:** When an inbound CalDAV event has changed start/end times, the sync route updates the corresponding slot in the database directly (lines 144-152) without checking for overlaps with other bookings. This mirrors the validation done in `bookings/manual/route.ts` (lines 40-48) but omits it for the inbound sync path. An externally-edited calendar event could silently create an overlapping booking in the database.

**Fix:** Before updating the slot times, run the same overlap query used in `bookings/manual/route.ts`:

```ts
const { data: overlappingSlots } = await supabaseAdmin
  .from('slots')
  .select('id')
  .neq('id', slotId)
  .lt('start_time', calEnd)
  .gt('end_time', calStart)

if ((overlappingSlots || []).length > 0) {
  result.conflicts++
  result.errors.push(`Skipped inbound update for slot ${slotId}: would create overlap`)
  continue
}
```

---

_Reviewed: 2026-04-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
