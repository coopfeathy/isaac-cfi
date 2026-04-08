# Phase 4: Student Self-Service + Billing - Research

**Researched:** 2026-04-08
**Domain:** Student booking flow, Stripe invoices/Setup Intents/Billing Portal, Supabase RPC atomic cancellation, server-side auth hardening
**Confidence:** HIGH

---

## Summary

Phase 4 is primarily a wiring problem, not an invention problem. The database schema is nearly complete. The Stripe billing infrastructure (customers, payment intents, webhook idempotency log) already exists and works. The two Netlify functions (`book.ts`, `stripe-webhook.ts`) are legacy duplicates of the App Router routes — the App Router routes are authoritative and more capable. The main gaps are: (1) new booking flow without upfront payment, (2) atomic cancellation with conditional $50 charge, (3) Stripe Invoice API for post-lesson billing, (4) Setup Intent for card-on-file, (5) Stripe Billing Portal for student self-service, and (6) server-component layout guard on `/dashboard`.

The student portal already exists at `/dashboard` and `/bookings` but uses client-side auth guards (`useAuth` + `router.push`). STU-07 requires replacing this with a server-component layout guard matching the pattern being introduced for `/admin` (Phase 2) and `/cfi` (Phase 3). The CFI portal's `CFIGuard` is still client-side (a known issue from Phase 3), so the student portal layout guard must be implemented as a true server component using `@supabase/ssr` `createServerClient` + `cookies()`, not the CFIGuard client pattern.

Stripe invoices are NOT currently used anywhere in the codebase. The current billing flow uses Stripe Checkout Sessions (admin pushes a payment link; student pays). Phase 4 introduces Stripe Invoices as the primary billing primitive for lesson completion, alongside the existing Checkout flow. This is an additive change — existing checkout routes remain untouched.

**Primary recommendation:** Build net-new API routes for student booking, cancellation, Setup Intent, and invoice generation. Do not retrofit existing routes. Wire the Stripe Invoice API with `auto_advance: false` and `collection_method: 'send_invoice'` to support the one-click send and pay-without-login flows.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-04 | Admin can create and send invoices to students via Stripe | Stripe Invoice API: `stripe.invoices.create()` + `stripe.invoices.sendInvoice()` — new capability, no existing route |
| ADMIN-05 | Admin can view cancellations flagged for $50 fee (no card on file) | New `cancellation_fee_flags` table + admin view needed; `balance_cents` on profiles could serve as ledger |
| BOOK-01 | Student can view available slots without logging in | `slots` table has public SELECT RLS; `GET /api/student/slots` or reuse existing slot query |
| BOOK-02 | Student can request a lesson slot after logging in (no payment) | New `POST /api/student/bookings` — creates booking with status `pending_approval`, no Stripe |
| BOOK-03 | Student receives confirmation email when slot approved | Resend email on admin approval action; approval already has email infra (slot-requests pattern) |
| BOOK-04 | Student can cancel a booked lesson from their portal | New `POST /api/student/bookings/[id]/cancel` route |
| BOOK-05 | Cancellation charges $50 to card on file via Stripe | `stripe.paymentIntents.create({ amount: 5000, customer: stripe_customer_id, payment_method: default_pm, confirm: true })` |
| BOOK-06 | If no card on file, $50 fee flagged on student account | Write record to `cancellation_fee_flags` table (new) or `balance_cents` adjustment; must be visible in admin (ADMIN-05) |
| BOOK-07 | Slot and booking records updated atomically on cancellation | Supabase RPC: `cancel_booking_atomic(booking_id)` function in SECURITY DEFINER — updates both in one transaction |
| BOOK-08 | Discovery flight booking confirms without admin approval | `type = 'tour'` slots auto-confirm; `type = 'training'` slots go to `pending_approval` |
| STU-01 | Student can view full booking history | `/dashboard/bookings` — expand existing `bookings` query to include all statuses |
| STU-02 | Student can view logged flight hours and milestones | `students` table has `total_hours`, `dual_hours`, etc.; `syllabus_progress` table for milestones |
| STU-03 | Student can access training documents | Existing `/documents` page — needs server-side auth guard added |
| STU-04 | Student can view outstanding invoices and pay via Stripe | Fetch `stripe.invoices.list({ customer: stripe_customer_id, status: 'open' })` in student portal |
| STU-05 | Student can save a payment method on file (Setup Intent) | `stripe.setupIntents.create({ customer })` + webhook `setup_intent.succeeded` |
| STU-06 | Student can access Stripe Billing Portal | `stripe.billingPortal.sessions.create({ customer, return_url })` |
| STU-07 | Student portal server-component layout guard | `createServerClient` + `cookies()` in layout.tsx async server component |
| BILL-01 | CFI marks complete → admin generates invoice in one click | Admin UI button → `POST /api/admin/billing/invoice` → `stripe.invoices.create()` → `stripe.invoices.sendInvoice()` |
| BILL-02 | Invoices created via Stripe and emailed to student | `stripe.invoices.sendInvoice(invoiceId)` — Stripe sends the email natively |
| BILL-03 | Student can pay outstanding invoices via Stripe (no login wall) | Invoice `hosted_invoice_url` from Stripe — no login required |
| BILL-04 | $50 cancellation fee charged via Stripe when card on file | Same as BOOK-05 |
| BILL-05 | Stripe webhook marks lessons as paid, updates booking status (idempotent) | `invoice.paid` event handler in existing `/api/stripe-webhook`; idempotency via `stripe_webhook_events` table |
| BILL-06 | Admin can view all invoices, payments, outstanding balances | `stripe.invoices.list({ customer })` per student in billing overview |
| STRIPE-01 | Audit confirms single active webhook endpoint | Inspect Netlify dashboard + Stripe dashboard; `netlify/functions/stripe-webhook.ts` vs `/api/stripe-webhook/route.ts` |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — no new installs required)
[VERIFIED: package.json in repo]

| Library | Installed Version | Purpose | Note |
|---------|------------------|---------|------|
| `stripe` | 12.8.0 | Server-side Stripe API | Phase 5 upgrades to 17.x — do NOT upgrade here |
| `@stripe/stripe-js` | 1.54.0 | Client Stripe.js | Phase 5 upgrades — do NOT upgrade here |
| `@stripe/react-stripe-js` | 2.1.0 | React Stripe Elements | Phase 5 upgrades — do NOT upgrade here |
| `@supabase/ssr` | 0.9.0 | Server-side Supabase client | Used for server-component layout guard |
| `@supabase/supabase-js` | 2.38.0 | Client Supabase | Already in use |
| `resend` | 6.9.2 | Transactional email | Already in use for booking/slot emails |
| `next` | 16.1.6 | App Router + Server Components | Layout guard uses async server component |

**Installation:** None required. All libraries already present.

### New Stripe API Objects (not previously used in this codebase)
[ASSUMED — based on Stripe 12.x API surface; verify against docs before implementation]

| Object | Used For | Stripe SDK Call |
|--------|---------|----------------|
| `stripe.invoices` | Lesson billing | `create`, `addInvoiceItem`, `sendInvoice`, `list` |
| `stripe.setupIntents` | Card-on-file | `create` |
| `stripe.billingPortal.sessions` | Student self-service | `create` |
| `stripe.paymentMethods` | Check card on file | `list({ customer, type: 'card' })` |

---

## Architecture Patterns

### Recommended Project Structure (net-new files)
```
app/
├── api/
│   └── student/
│       ├── bookings/
│       │   ├── route.ts                  # GET: booking history, POST: request booking
│       │   └── [id]/
│       │       └── cancel/
│       │           └── route.ts          # POST: cancel + charge/flag fee
│       ├── setup-intent/
│       │   └── route.ts                  # POST: create Setup Intent for card save
│       ├── billing-portal/
│       │   └── route.ts                  # POST: create Billing Portal session
│       └── invoices/
│           └── route.ts                  # GET: fetch open invoices from Stripe
│   └── admin/
│       └── billing/
│           └── invoice/
│               └── route.ts             # POST: create + send invoice after lesson complete
├── dashboard/
│   ├── layout.tsx                        # Server component guard (REPLACES client-only guard)
│   └── page.tsx                          # Keep existing, widen booking history
├── bookings/
│   ├── layout.tsx                        # Server component guard (same pattern)
│   └── page.tsx                          # Add cancel button
└── schedule/
    └── page.tsx                          # Move to no-payment booking request flow

supabase/
└── migrations/
    └── 20260408_phase4_cancellation.sql  # New RPC + flag table
```

### Pattern 1: Server-Component Layout Guard (STU-07)
**What:** Replace `useRouter` + `useEffect` client redirect with `createServerClient` async layout
**When to use:** All student-facing routes requiring auth (dashboard, bookings, documents, progress)
**Reference:** Phase 1's `requireUser()` pattern is for API routes; the layout guard uses `@supabase/ssr` cookies

```typescript
// app/dashboard/layout.tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return <>{children}</>
}
// Source: @supabase/ssr pattern [ASSUMED — verify against 0.9.0 docs]
```

### Pattern 2: Supabase RPC for Atomic Cancellation (BOOK-07)
**What:** PostgreSQL function runs as a single transaction — both `bookings` and `slots` updates either both commit or both roll back. Callers use `supabase.rpc('cancel_booking_atomic', { p_booking_id })`.
**When to use:** Any operation that requires multiple table mutations to be atomic

```sql
-- supabase/migrations/20260408_phase4_cancellation.sql
CREATE OR REPLACE FUNCTION cancel_booking_atomic(p_booking_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_slot_id UUID;
  v_current_status TEXT;
BEGIN
  -- Lock the booking row
  SELECT slot_id, status INTO v_slot_id, v_current_status
  FROM bookings
  WHERE id = p_booking_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'booking_not_found');
  END IF;

  IF v_current_status NOT IN ('pending_approval', 'confirmed', 'paid') THEN
    RETURN jsonb_build_object('error', 'booking_not_cancellable', 'status', v_current_status);
  END IF;

  -- Update booking
  UPDATE bookings SET status = 'canceled' WHERE id = p_booking_id;

  -- Release slot
  UPDATE slots SET is_booked = false WHERE id = v_slot_id;

  RETURN jsonb_build_object('ok', true, 'slot_id', v_slot_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Source: Supabase RPC pattern [ASSUMED — standard PostgreSQL; verify SECURITY DEFINER works with RLS]
```

### Pattern 3: Cancellation Fee — Card on File Branch (BOOK-05, BILL-04)
**What:** Check if student has a Stripe payment method on file; if yes, charge immediately; if no, write flag record.
**When to use:** Student-initiated cancellation only (admin cancellation may differ)

```typescript
// POST /api/student/bookings/[id]/cancel
const paymentMethods = await stripe.paymentMethods.list({
  customer: student.stripe_customer_id,
  type: 'card',
})

if (paymentMethods.data.length > 0) {
  // Charge immediately
  await stripe.paymentIntents.create({
    amount: 5000, // $50.00
    currency: 'usd',
    customer: student.stripe_customer_id,
    payment_method: paymentMethods.data[0].id,
    confirm: true,
    off_session: true, // required for card-not-present charge
    description: `Cancellation fee — booking ${bookingId}`,
    metadata: { bookingId, type: 'cancellation_fee' },
  })
} else {
  // Flag for next invoice
  await supabaseAdmin.from('cancellation_fee_flags').insert({
    student_id: student.id,
    booking_id: bookingId,
    amount_cents: 5000,
    reason: 'No card on file at cancellation',
  })
}
// Source: Stripe PaymentIntents off_session pattern [ASSUMED — standard Stripe; confirm off_session behavior]
```

### Pattern 4: Stripe Invoice for Lesson Billing (BILL-01, BILL-02, BILL-03)
**What:** Admin clicks "Invoice" after CFI marks lesson complete. Creates Stripe Invoice, adds line item, finalizes, sends. Student gets email with `hosted_invoice_url` — no login required to pay.

```typescript
// POST /api/admin/billing/invoice
const invoice = await stripe.invoices.create({
  customer: stripeCustomerId,
  collection_method: 'send_invoice',
  days_until_due: 30,
  auto_advance: false, // don't auto-finalize; we finalize explicitly
  metadata: { bookingId, type: 'lesson_completion' },
})

await stripe.invoiceItems.create({
  customer: stripeCustomerId,
  invoice: invoice.id,
  amount: lessonAmountCents,
  currency: 'usd',
  description: `Flight lesson — ${slotDate}`,
})

const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
await stripe.invoices.sendInvoice(finalized.id)
// hosted_invoice_url on finalized object — no login wall for payment
// Source: Stripe Invoices API [ASSUMED — verify against stripe 12.x docs]
```

### Pattern 5: Setup Intent for Card-on-File (STU-05)
**What:** Student visits dashboard, clicks "Save Payment Method". Creates Setup Intent, renders `<SetupElement>`, on success webhook saves payment method to customer.

```typescript
// POST /api/student/setup-intent
const setupIntent = await stripe.setupIntents.create({
  customer: stripeCustomerId,
  payment_method_types: ['card'],
  usage: 'off_session', // required for later off-session charges
})
return { clientSecret: setupIntent.client_secret }
// Source: Stripe Setup Intents [ASSUMED — verify against stripe 12.x docs]
```

### Pattern 6: Stripe Billing Portal (STU-06)
**What:** Student clicks "Manage Billing" → server creates portal session → redirect to Stripe-hosted portal.

```typescript
// POST /api/student/billing-portal
const session = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
})
return { url: session.url }
// Source: Stripe Billing Portal [ASSUMED — verify against stripe 12.x docs]
```

### Anti-Patterns to Avoid
- **Client-side auth guards:** `useRouter().push('/login')` in `useEffect` — race condition, flash of content, SEC-01 violation. Use server-component `redirect()` instead.
- **Non-atomic cancellation:** Two separate Supabase calls (update booking, then update slot) — if the process crashes between them, slot stays `is_booked=true` with no booking. Always use the RPC.
- **Charging without `off_session: true`:** Stripe requires this flag for card-not-present charges against a saved payment method. Omitting it causes 3DS challenges that fail silently.
- **Upgrading Stripe in this phase:** Phase 5 is the isolated upgrade. Do not touch `stripe` package version or `apiVersion` string in Phase 4.
- **Using `req.json()` for webhook body:** The existing `/api/stripe-webhook/route.ts` already correctly uses `req.text()`. New invoice webhook handlers must do the same.
- **Creating a second Stripe Customer:** The `students.stripe_customer_id` column is the canonical Stripe customer ID. Always check for it before calling `stripe.customers.create()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic slot + booking cancel | Two separate Supabase updates in JS | Supabase RPC (`SECURITY DEFINER` function) | Race conditions, partial failure leaves orphaned records |
| Pay-without-login invoice link | Custom tokenized payment page | Stripe `hosted_invoice_url` | Already on Invoice object after `sendInvoice()`; Stripe handles auth, 3DS, receipts |
| Student billing self-service | Custom invoice list + card management UI | Stripe Billing Portal | Portal handles card updates, invoice history, receipts — zero maintenance |
| Idempotency for webhook events | Custom dedup logic | `stripe_webhook_events` table already exists | Already implemented in `/api/stripe-webhook/route.ts` — reuse the pattern |
| Cancellation fee email | Custom email | Stripe payment receipt | Stripe sends a receipt automatically on `payment_intent.succeeded` |

**Key insight:** The hardest problems in this phase (atomicity, idempotency, pay-without-login, billing portal) are already solved by Stripe and Supabase. Build thin wiring, not infrastructure.

---

## Runtime State Inventory

> This phase is not a rename/refactor. Skip.

Not applicable — Phase 4 adds new routes and tables. No existing runtime state is being renamed or migrated.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Stripe CLI / dashboard | STRIPE-01 audit | Unknown — not checked programmatically | — | Manual dashboard inspection |
| `stripe` npm package | All billing routes | ✓ | 12.8.0 (installed) | — |
| Resend API key | Booking approval email | ✓ (already in use) | 6.9.2 | 503 on missing key (existing pattern) |
| `SUPABASE_SERVICE_ROLE_KEY` | RPC, admin billing | ✓ (already used in `getSupabaseAdmin()`) | — | Hard error thrown by `getSupabaseAdmin()` |
| `STRIPE_WEBHOOK_SECRET` | Webhook handler | ✓ (already used) | — | Hard reject on missing |

**Missing with no fallback:**
- Stripe Billing Portal requires the customer to have a Stripe customer ID (`stripe_customer_id` in `students` table). Students who were never charged don't have one. The Setup Intent flow (STU-05) creates the customer if needed — STU-05 must run before STU-06 is available to that student.

**STRIPE-01 blocker:** The dual webhook endpoint issue must be audited during plan 04-05. Two endpoints exist: `netlify/functions/stripe-webhook.ts` (older, handles basic `payment_intent.succeeded` and `checkout.session.completed`) and `app/api/stripe-webhook/route.ts` (current, handles same events plus `charge.refunded`, `payment_intent.payment_failed`, and full idempotency via `stripe_webhook_events`). The App Router route is authoritative. The Netlify function must be confirmed inactive in the Stripe dashboard before Phase 5 begins.

---

## Common Pitfalls

### Pitfall 1: `off_session` missing on cancellation charge
**What goes wrong:** Stripe raises a `requires_action` error requiring 3DS authentication, which fails silently for an automated charge. Student is not charged; fee is not flagged either.
**Why it happens:** `off_session: true` is required for any server-initiated charge against a saved payment method when the customer is not present.
**How to avoid:** Always set `off_session: true` when charging without the customer in the flow. Also set `error_on_requires_action: true` so the error surfaces immediately.
**Warning signs:** Stripe event `payment_intent.payment_failed` with `error.code: 'authentication_required'`.

### Pitfall 2: Booking status `pending` vs `pending_approval` ambiguity
**What goes wrong:** The existing `bookings.status` enum is `('pending', 'paid', 'confirmed', 'canceled', 'completed')`. The new no-payment booking flow needs a state for "requested but not yet approved by admin." If `pending` is reused, the webhook handler (`payment_intent.succeeded`) may mistakenly process bookings that have no payment intent.
**Why it happens:** `pending` currently means "waiting for Stripe payment." The new flow needs "waiting for admin approval."
**How to avoid:** Two options: (A) add `pending_approval` to the enum (requires a migration), or (B) use `pending` but set `stripe_session_id = NULL` as the discriminator, and update webhook handler to skip bookings with no session. Option A is cleaner but requires a migration. Document the decision.
**Warning signs:** Webhook fires on a new slot request, finds a `pending` booking, and incorrectly updates its status.

### Pitfall 3: Stripe customer not created before Setup Intent / Billing Portal
**What goes wrong:** `stripe.setupIntents.create({ customer: undefined })` succeeds but creates an unattached Setup Intent that cannot be charged off-session. `stripe.billingPortal.sessions.create({ customer: undefined })` throws.
**Why it happens:** A student may exist in Supabase but never have had a Stripe checkout — so `students.stripe_customer_id` is NULL.
**How to avoid:** All student-facing Stripe routes must ensure-or-create the customer first:
```typescript
let customerId = student.stripe_customer_id
if (!customerId) {
  const customer = await stripe.customers.create({ email: student.email, name: student.full_name })
  customerId = customer.id
  await supabaseAdmin.from('students').update({ stripe_customer_id: customerId }).eq('id', student.id)
}
```

### Pitfall 4: Invoice webhook handler missing from `/api/stripe-webhook`
**What goes wrong:** `invoice.paid` event fires from Stripe when student pays, but nothing updates the booking status or notifies admin.
**Why it happens:** Current webhook only handles `payment_intent.succeeded`, `checkout.session.completed`, `charge.refunded`, `payment_intent.payment_failed`. Stripe Invoices use `invoice.paid` — a different event type.
**How to avoid:** Add `invoice.paid` handler to existing webhook route. Must include idempotency check against `stripe_webhook_events` table (existing pattern).

### Pitfall 5: `hosted_invoice_url` only available after finalization
**What goes wrong:** Calling `stripe.invoices.create()` returns an Invoice object but `hosted_invoice_url` is null until the invoice is finalized.
**Why it happens:** Stripe invoices are drafts until explicitly finalized. The URL is generated at finalization.
**How to avoid:** Call `stripe.invoices.finalizeInvoice(invoice.id)` before reading `hosted_invoice_url`. Call `stripe.invoices.sendInvoice()` after finalizing to trigger the Stripe email.

### Pitfall 6: Student portal pages use `useAuth` client guard — flash of content
**What goes wrong:** `/dashboard` and `/bookings` currently do `router.push('/login')` in `useEffect`. Unauthenticated users briefly see the authenticated view before redirect.
**Why it happens:** Client-side navigation happens after hydration.
**How to avoid:** Add server-component layout guard with `redirect('/login')`. Existing `useAuth` guard in the page components can remain as a belt-and-suspenders UX check but is no longer the security boundary.

### Pitfall 7: Netlify function `book.ts` is still deployed and reachable
**What goes wrong:** The Netlify function `book.ts` creates a `confirmed` booking without auth. If any existing UI calls it, bookings will be confirmed without approval.
**Why it happens:** Two booking implementations exist. The Netlify function is a legacy path from before App Router APIs.
**How to avoid:** STRIPE-01 audit (plan 04-05) should verify this function is not being called. Check `netlify.toml` and any client-side code referencing `/.netlify/functions/book`.

---

## Code Examples

### Ensure-or-Create Stripe Customer (shared helper pattern)
```typescript
// lib/stripe-customer.ts
import Stripe from 'stripe'
import { getSupabaseAdmin } from './supabase-admin'

export async function ensureStripeCustomer(
  stripe: Stripe,
  studentId: string,
  { email, name }: { email: string | null; name: string }
): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('stripe_customer_id')
    .eq('id', studentId)
    .single()

  if (student?.stripe_customer_id) {
    return student.stripe_customer_id
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name,
    metadata: { studentId },
  })

  await supabaseAdmin
    .from('students')
    .update({ stripe_customer_id: customer.id })
    .eq('id', studentId)

  return customer.id
}
// Source: derived from existing checkout/overview route patterns [VERIFIED: codebase]
```

### Webhook: Add `invoice.paid` handler (idempotent, same pattern as existing handlers)
```typescript
// In /api/stripe-webhook/route.ts — add after existing handlers
if (event.type === 'invoice.paid') {
  const invoice = event.data.object as Stripe.Invoice
  const bookingId = invoice.metadata?.bookingId

  if (bookingId) {
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'paid' })
      .eq('id', bookingId)
      .in('status', ['confirmed', 'pending_approval']) // idempotent guard
  }
}
// Source: derived from existing payment_intent.succeeded handler [VERIFIED: codebase pattern]
```

### New: `cancellation_fee_flags` table migration
```sql
-- supabase/migrations/20260408_phase4_cancellation.sql

CREATE TABLE IF NOT EXISTS cancellation_fee_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL DEFAULT 5000,
  reason TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cancellation_fee_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cancellation fee flags"
  ON cancellation_fee_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Service role manages cancellation fee flags"
  ON cancellation_fee_flags FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_cancellation_fee_flags_student
  ON cancellation_fee_flags(student_id, resolved);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Checkout Session for all payments | Stripe Invoices for lesson billing | Phase 4 introduces | Admin has one-click send; student pays without login via `hosted_invoice_url` |
| No atomic cancellation | Supabase RPC `SECURITY DEFINER` function | Phase 4 introduces | Eliminates orphaned slot records |
| Client-side `useRouter().push()` guard | Server-component `redirect()` in layout | Phase 4 for student routes | Eliminates flash, enforces at render time |

**Dual-implementation problem currently in codebase:**
- `netlify/functions/stripe-webhook.ts` — older, no idempotency, handles basic events. Uses `event.body` (string) correctly.
- `app/api/stripe-webhook/route.ts` — current, idempotent, handles all events. Uses `req.text()` correctly.
- These SHOULD NOT both be registered with Stripe. STRIPE-01 confirms which is active. [VERIFIED: codebase]

**Duplicate `requireAdmin` inline copies:**
- `app/api/admin/billing/checkout/route.ts`, `overview/route.ts`, `push-checkout-link/route.ts` all copy the `requireAdmin` function locally instead of importing from `lib/auth.ts`. Phase 1 plan 01-04 addresses this for existing routes. New routes in Phase 4 MUST import from `lib/auth.ts`.

---

## Schema Gaps (new tables/columns needed)

| Item | Type | Required By | Action |
|------|------|-------------|--------|
| `cancellation_fee_flags` table | New table | BOOK-06, ADMIN-05 | Migration in plan 04-02 |
| `bookings.status` enum | Possible new value `pending_approval` | BOOK-02 | Migration OR discriminator-based approach |
| `bookings.stripe_invoice_id` | New column | BILL-01, BILL-05 | Migration in plan 04-04 |
| `students.stripe_customer_id` | Already exists | STU-05, STU-06 | No change needed |

**Open schema decision:** Whether to add `pending_approval` to `bookings.status` enum or repurpose `pending` with NULL `stripe_session_id` as discriminator. Both work. The migration approach (`pending_approval`) is cleaner and avoids webhook handler fragility. This decision affects plan 04-01 and 04-02.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.9 |
| Config file | `jest.config.js` (exists) |
| Quick run command | `npx jest --testPathPattern=04` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOK-07 | Cancellation RPC returns ok, slot released, booking canceled | unit (mock supabase) | `npx jest --testPathPattern=cancel` | ❌ Wave 0 |
| BILL-04/05 | $50 charge fires when card on file; flag written when no card | unit (mock stripe) | `npx jest --testPathPattern=cancellation-fee` | ❌ Wave 0 |
| BILL-05 | Webhook `invoice.paid` marks booking paid, idempotent on replay | unit (mock event) | `npx jest --testPathPattern=stripe-webhook` | ❌ Wave 0 |
| STU-07 | Unauthenticated request to `/dashboard` redirects to `/login` | manual smoke | N/A | N/A — manual |
| STRIPE-01 | Only one active webhook endpoint | manual audit | N/A | N/A — manual |

### Wave 0 Gaps
- [ ] `lib/__tests__/cancellation-fee.test.ts` — covers BOOK-05/06, BILL-04
- [ ] `lib/__tests__/stripe-webhook-invoice.test.ts` — covers BILL-05 invoice.paid handler
- [ ] `app/api/student/__tests__/bookings-cancel.test.ts` — covers BOOK-07 RPC flow

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireUser()` from `lib/auth.ts` on all student API routes |
| V3 Session Management | yes | `createServerClient` + `cookies()` for server-component guard |
| V4 Access Control | yes | Student can only cancel their own booking; enforce `user_id = auth.uid()` in RPC |
| V5 Input Validation | yes | Validate `bookingId` is UUID; validate `studentId` ownership before charge |
| V6 Cryptography | no | Stripe handles all payment data; no custom crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on booking cancel | Tampering | RPC parameter `p_user_id` + RLS `user_id = auth.uid()` double check |
| Replay cancellation charge | Tampering | Check booking status before charging; only charge if `status` transitions from active |
| Webhook replay charging | Tampering | `stripe_webhook_events` idempotency table (already exists) |
| Unauthenticated student portal | Spoofing | Server-component `redirect()` in layout — not client-side guard |
| Admin-only Stripe customer creation | Elevation of privilege | Student Setup Intent route only creates customer for authenticated user's own student record |

**Critical:** The cancellation API route (`POST /api/student/bookings/[id]/cancel`) must verify that the booking's `user_id` matches the authenticated user BEFORE the RPC call AND inside the RPC. Both checks are needed — the client-side Bearer token check prevents impersonation; the RPC's `p_user_id` check prevents database-level IDOR.

---

## Open Questions

1. **`pending_approval` vs reusing `pending` as booking status**
   - What we know: `pending` currently means "awaiting Stripe payment." New flow is "awaiting admin approval (no payment)."
   - What's unclear: Whether the webhook handler needs to distinguish between the two, or whether `stripe_session_id IS NULL` is a reliable discriminator.
   - Recommendation: Add `pending_approval` to the enum. Cleaner, explicit, no webhook fragility. Migration cost is low.

2. **Discovery flight (`type = 'tour'`) auto-confirm behavior**
   - What we know: BOOK-08 says discovery flights confirm without admin approval when a slot is available.
   - What's unclear: Should the student still be required to log in, or can discovery flights be booked without an account? BOOK-02 says "after logging in."
   - Recommendation: Require login for all bookings (BOOK-02 is the governing requirement). BOOK-08 means auto-status-confirmed, not anonymous booking.

3. **Stripe Billing Portal configuration**
   - What we know: Billing Portal must be configured in the Stripe dashboard (which payment methods are allowed, which features are shown).
   - What's unclear: Whether Isaac's Stripe account already has a portal configuration. If not, it must be created before STU-06 can work.
   - Recommendation: Plan 04-03 should include a note to verify portal configuration in Stripe dashboard before testing STU-06.

4. **`invoice.paid` vs `payment_intent.succeeded` for invoice payments**
   - What we know: When a student pays a Stripe Invoice, both `invoice.paid` AND `payment_intent.succeeded` fire. The existing `payment_intent.succeeded` handler looks for `bookingId` in metadata — which the invoice payment won't have in the same place.
   - What's unclear: Whether to put `bookingId` in the Invoice metadata (so `payment_intent.succeeded` can still process it) or rely exclusively on `invoice.paid`.
   - Recommendation: Put `bookingId` in Invoice metadata AND add a dedicated `invoice.paid` handler. Belt-and-suspenders, both are idempotent.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `stripe.setupIntents`, `stripe.billingPortal.sessions`, `stripe.invoices` are available in stripe 12.8.0 | Standard Stack | These features are old (pre-2022) and definitely in 12.x, but specific method signatures should be verified before implementation |
| A2 | `off_session: true` is required and sufficient for charging a saved card without 3DS intervention on Stripe 12.x | Pitfall 1 / Code Examples | If Isaac's Stripe account requires 3DS for off-session, the charge will fail and fee must be flagged; implement error handling for `authentication_required` |
| A3 | `@supabase/ssr` 0.9.0 `createServerClient` with `cookies()` from `next/headers` works in Next.js 16 App Router | Pattern 1 | If API changed in 0.9.0, server component guard may not compile; verify against installed version |
| A4 | Stripe Billing Portal `hosted_invoice_url` is present on Invoice object after `finalizeInvoice()` | Pattern 4 / Pitfall 5 | If field is named differently in 12.x, pay-without-login flow breaks |
| A5 | The Netlify `book.ts` function is NOT being called by any current client-side code | Pitfall 7 | If it IS being called, disabling it would break existing booking flows — audit required in STRIPE-01 plan |

---

## Sources

### Primary (HIGH confidence)
- `/home/homecomputer/Desktop/isaac-cfi/supabase/SETUP.sql` — complete schema, all table definitions, RLS policies [VERIFIED: codebase]
- `/home/homecomputer/Desktop/isaac-cfi/app/api/stripe-webhook/route.ts` — current authoritative webhook handler, idempotency pattern [VERIFIED: codebase]
- `/home/homecomputer/Desktop/isaac-cfi/package.json` — all installed versions [VERIFIED: codebase]
- `/home/homecomputer/Desktop/isaac-cfi/lib/auth.ts` — `requireAdmin()`, `requireCFI()`, `requireUser()` canonical implementations [VERIFIED: codebase]
- `/home/homecomputer/Desktop/isaac-cfi/netlify/functions/stripe-webhook.ts` — legacy webhook (no idempotency) [VERIFIED: codebase]
- `/home/homecomputer/Desktop/isaac-cfi/.planning/REQUIREMENTS.md` — requirement definitions [VERIFIED: planning docs]

### Secondary (MEDIUM confidence)
- Stripe Invoices API, Setup Intents, Billing Portal — standard Stripe API objects available in all versions post-2020; method names verified against training knowledge but should be cross-checked against Stripe 12.x changelog before implementation [ASSUMED]
- Supabase `SECURITY DEFINER` RPC pattern — standard PostgreSQL; verified against existing `increment_student_hours` function in codebase [VERIFIED: SETUP.sql]

### Tertiary (LOW confidence — verify before implementation)
- `@supabase/ssr` 0.9.0 exact `createServerClient` + `cookies()` API — training knowledge, should be verified against installed package or SSR docs
- `off_session: true` behavior on Stripe 12.8.0 — standard Stripe behavior; verify `error_on_requires_action` parameter name in 12.x

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json
- Schema gaps: HIGH — derived from verified SETUP.sql + requirements
- Stripe API patterns: MEDIUM — standard API objects exist but exact 12.x method signatures should be verified
- Architecture: HIGH — derived from existing codebase patterns
- Pitfalls: HIGH — all derived from actual code in the repo

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (Stripe API stable, supabase/ssr 0.9.x stable)
