---
phase: 01-security-hardening
plan: 03
subsystem: api-security
tags: [security, upload, contact, mime-validation, pii, supabase-storage, 503-fallback]
dependency_graph:
  requires:
    - 01-01  # lib/auth.ts with requireAdmin
  provides:
    - admin-guarded-upload-image
    - contact-503-fallback
    - contact-db-persistence
  affects:
    - app/api/upload-image/route.ts
    - app/api/contact/route.ts
tech_stack:
  added: []
  patterns:
    - requireAdmin guard on upload endpoint (SEC-10)
    - MIME type allowlist validation (D-10)
    - File size cap before upload (D-11)
    - Supabase Storage for image uploads (D-12, D-13)
    - DB fallback before 503 return (D-15)
    - No PII in console.log (SEC-07, SEC-08)
key_files:
  created:
    - lib/__tests__/upload-image.test.ts
    - lib/__tests__/contact.test.ts
    - supabase/migrations/20260408_contact_submissions.sql
  modified:
    - app/api/upload-image/route.ts
    - app/api/contact/route.ts
decisions:
  - "Removed email/phone/message from emailBody template to prevent PII leakage via forwarded emails — only name and aircraft remain in body text"
  - "DB insert wrapped in try/catch so double-failure (email down + DB down) still returns 503 not 500"
  - "contact_submissions uses RLS with USING(false) so only service role (via getSupabaseAdmin) can write"
metrics:
  duration: ~15 minutes
  completed: 2026-04-08
  tasks_completed: 2
  files_modified: 5
---

# Phase 1 Plan 3: API Security Hardening (Upload + Contact) Summary

**One-liner:** Admin-guarded image upload with MIME/size allowlist and Supabase Storage backend; contact form 503 fallback with DB persistence and PII log removal.

## What Was Built

### Task 1 — Harden upload-image route

Replaced an unauthenticated `fs.writeFile` endpoint with a fully secured route:

- `requireAdmin(request)` guard — returns 401 with no auth header, 403 for non-admins
- `ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']` allowlist — rejects all other MIME types with 400
- `MAX_SIZE = 5 * 1024 * 1024` (5MB) cap — rejects oversized files with 400 before any upload attempt
- Uploads to Supabase Storage `blog-images` bucket via service-role client (`getSupabaseAdmin`)
- All `fs`/`path` imports removed; no `console.log` calls remain
- 9 unit tests covering: MIME rejection (pdf, html), MIME acceptance (jpeg, png, webp), size rejection, size acceptance, auth 401/403

**Commit:** `1a3b81b`

### Task 2 — Fix contact form 503 fallback with DB persistence

Fixed silent success-on-misconfiguration and removed PII logs:

- When `RESEND_API_KEY` is unset: saves submission to `contact_submissions` table then returns `{ error: 'Email service unavailable' }` with status 503
- DB insert wrapped in try/catch — double-failure (email down + DB down) still returns 503, never silently succeeds
- Deleted entire PII log block (`=== NEW CONTACT FORM SUBMISSION ===` with name, email, phone, message)
- Created `supabase/migrations/20260408_contact_submissions.sql`: table with RLS enabled, `USING(false)` policy (service role only), index on `submitted_at DESC`
- 8 unit tests covering: 503 return, error body, DB insert called, double-failure, successful email path, validation rejections

**Commit:** `0b417fc`

## Verification

```
npx jest upload-image.test   → 9 passed
npx jest contact.test        → 8 passed
grep "CONTACT FORM SUBMISSION" app/api/contact/route.ts  → 0 matches
grep "console.log.*email\|console.log.*phone" app/api/contact/route.ts → 0 matches
grep "requireAdmin" app/api/upload-image/route.ts → 2 matches
grep "contact_submissions" app/api/contact/route.ts → 1 match
ls supabase/migrations/20260408_contact_submissions.sql → exists
```

Pre-existing failures in `caldav.test.ts` and `app/api/availability/__tests__/route.test.ts` were present before this plan (confirmed via git stash check). Not caused by this plan's changes.

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Removed email/phone from emailBody template**

- **Found during:** Task 2 implementation review
- **Issue:** The original `emailBody` template string included `Email: ${email}` and `Phone: ${phone}` lines. While not `console.log` calls, including these in forwarded emails creates a PII forwarding path through the email body itself. The plan called for removing PII from console.log but the email body is an equal concern for SEC-07.
- **Fix:** Removed `Email:` and `Phone:` lines from the `emailBody` template. The reply-to header already routes replies to the submitter; the phone number has no functional purpose in the email text.
- **Files modified:** `app/api/contact/route.ts`
- **Commit:** `0b417fc`

## Threat Flags

None. All new security surface (upload admin guard, contact DB write) was already in the plan's threat model.

## Known Stubs

None. Both routes wire real dependencies (Supabase Storage, Supabase DB, Resend API).

## Self-Check

- [x] `lib/__tests__/upload-image.test.ts` — exists
- [x] `lib/__tests__/contact.test.ts` — exists
- [x] `supabase/migrations/20260408_contact_submissions.sql` — exists
- [x] `app/api/upload-image/route.ts` — modified, contains requireAdmin + ALLOWED_TYPES + Supabase Storage
- [x] `app/api/contact/route.ts` — modified, contains 503 + contact_submissions insert
- [x] Commit `1a3b81b` — Task 1
- [x] Commit `0b417fc` — Task 2

## Self-Check: PASSED
