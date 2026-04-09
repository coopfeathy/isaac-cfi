---
phase: 01-security-hardening
fixed_at: 2026-04-08T00:00:00Z
review_path: .planning/phases/01-security-hardening/01-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 7
skipped: 1
status: partial
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-08T00:00:00Z
**Source review:** .planning/phases/01-security-hardening/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (CR-01, CR-02, CR-03, WR-01, WR-02, WR-03, WR-04, WR-05)
- Fixed: 7
- Skipped: 1

## Fixed Issues

### CR-01: Stack trace and internal details leaked in error response

**Files modified:** `app/api/create-user/route.ts`
**Commit:** 9946716
**Applied fix:** Replaced the catch block that returned `error.message`, `error.toString()`, and `error.stack` in the HTTP response with a generic `'Internal server error'` message. Removed the `JSON.stringify` full-error log; kept a single `console.error` with the raw error object for server-side diagnostics only.

---

### CR-02: Arbitrary profile fields passed through to DB without allowlist

**Files modified:** `app/api/create-user/route.ts`
**Commit:** ed4223b
**Applied fix:** Added an explicit allowlist `['full_name', 'phone', 'avatar_url']` for profile fields. Replaced the direct `...profile` spread with a loop that copies only allowlisted keys into `sanitizedProfile`. The `profileData` object now only ever contains `id` plus fields from that allowlist, preventing callers from setting arbitrary columns such as `is_admin`.

---

### CR-03: Transaction deletion via unvalidated LIKE pattern on caller-supplied PaymentIntent ID

**Files modified:** `app/api/admin/billing/delete-checkout/route.ts`
**Commit:** 0e6ce38
**Applied fix:** Added regex validation `PI_ID_RE = /^pi_[A-Za-z0-9_]{6,99}$/` immediately after the missing-ID check. If `paymentIntentId` does not match the Stripe format, a 400 is returned before any Stripe API call or DB query. The LIKE delete query is unchanged but now only executes with a known-safe ID.

---

### WR-01: No rate limiting on the public contact form endpoint

**Files modified:** `app/api/contact/route.ts`
**Commit:** c263127
**Applied fix:** Added a module-level in-memory rate limiter (`rateLimitMap`) that allows a maximum of 5 POST requests per IP address per 60-second window. The IP is extracted from `x-forwarded-for` or `x-real-ip` headers. Requests exceeding the limit receive a 429 response before any validation or email logic runs. Note: in-memory state resets on server restart; for persistent cross-instance rate limiting an Upstash Redis integration would be needed, but this provides meaningful protection for the common case.

---

### WR-02: `app/api/create-user/route.ts` accepts any password without strength enforcement

**Files modified:** `app/api/create-user/route.ts`
**Commit:** f1847d3
**Applied fix:** Added `password.length < 8` check immediately after the existing email/password presence check. Returns a 400 with `'Password must be at least 8 characters'` before calling the Supabase admin API.

---

### WR-03: `lib/auth.ts` uses the anon-key Supabase client for admin role lookups

**Files modified:** `lib/auth.ts`
**Commit:** 9db7989
**Applied fix:** Added `import { getSupabaseAdmin } from '@/lib/supabase-admin'`. In both `requireAdmin` and `requireCFI`, the profile DB query now uses `getSupabaseAdmin()` instead of the shared anon-key `supabase` client, making it RLS-immune. The `supabase.auth.getUser(token)` call for token verification remains on the anon client as required.

---

### WR-04: `app/manage/layout.tsx` — admin role check uses anon-key client subject to RLS

**Files modified:** `app/manage/layout.tsx`
**Commit:** a06e288
**Applied fix:** Added `import { getSupabaseAdmin } from '@/lib/supabase-admin'`. The profile lookup (`.from('profiles').select('is_admin')`) now uses `getSupabaseAdmin()` instead of the SSR anon client. The `supabase.auth.getUser()` session check remains on the SSR client (required for cookie-based session validation).

---

## Skipped Issues

### WR-05: `app/api/admin/billing/cash-payment/route.ts` — cash type detection relies on fragile string prefix matching

**File:** `app/api/admin/billing/cash-payment/route.ts:98-103`
**Reason:** This fix requires a DB schema migration (adding an `is_cash_payment` boolean column to the `transactions` table) plus coordinated changes across four route files (`cash-payment/route.ts`, `billing/checkout/route.ts`, `billing/overview/route.ts`, `billing/push-checkout-link/route.ts`). This is a multi-file, schema-breaking change that cannot be applied atomically without a migration and coordinated data backfill. Marking as skipped — recommend addressing in a dedicated billing-cleanup phase with a proper migration.
**Original issue:** Cash payment identification relies on description string prefix heuristics (`'CASH:'`, `'[CASH]'`, `'Partial cash payment'`) spread across four files. A drift in any prefix string causes silent data integrity failures.

---

_Fixed: 2026-04-08T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
