# Phase 5: Stripe SDK Upgrade - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Source:** /gsd-discuss-phase 5

<domain>
## Phase Boundary

Upgrade the Stripe server SDK from `12.8.0` → `17.x`, update `apiVersion` to `'2025-02-24.acacia'` across all 19 active Stripe files, delete the 3 confirmed-dead Netlify functions, and bump both client packages (`@stripe/stripe-js`, `@stripe/react-stripe-js`) to their current stable versions. No new features, no UI changes. Fully isolated branch/deployment.

</domain>

<decisions>
## Implementation Decisions

### Netlify function fate
- **D-01:** Delete `netlify/functions/stripe-webhook.ts`, `netlify/functions/create-payment-intent.ts`, and `netlify/functions/create-checkout.ts`. STRIPE-01 audit confirmed `/api/stripe-webhook` is the single active endpoint — these files are dead code and should be removed entirely. No upgrades needed on them.

### Test validation gate
- **D-02:** After deployment, Isaac runs the test gate manually:
  1. Trigger a test payment in Stripe Dashboard (test mode)
  2. Replay the resulting webhook event from Stripe Dashboard → Developer → Webhooks
  3. Confirm both complete without error
  Plan must include an explicit step-by-step checklist for this manual gate.

### Client SDK version
- **D-03:** Bump `@stripe/stripe-js` from `^1.54.0` → `^7.x` (latest stable).
- **D-04:** Bump `@stripe/react-stripe-js` from `^2.1.0` → `^3.x` (latest stable compatible with @stripe/stripe-js ^7.x).
- Both packages should be upgraded together in a single commit.

### Webhook body handling
- **D-05:** The Next.js App Router webhook at `app/api/stripe-webhook/route.ts` already uses `req.text()` (fixed in Phase 4). STRIPE-04 is already satisfied for the active endpoint. No change needed here — the planner should verify this is still the case after the SDK upgrade and confirm the signature verification still works.

### Isolation
- **D-06:** Phase 5 must be executed on its own isolated branch. No feature work in the same branch or deployment window. This is a locked constraint from STATE.md.

### Claude's Discretion
- The exact 17.x version to pin (latest stable at time of execution)
- Order of file upgrades within the plans
- Whether any Stripe 12→17 breaking changes require API call signature updates beyond `apiVersion` (planner/researcher to audit changelog)
- Any TypeScript type changes introduced by the new SDK that need fixing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — STRIPE-01 through STRIPE-05 are the complete requirement set for this phase

### Project state
- `.planning/STATE.md` — Phase 5 isolation constraint (locked: no concurrent feature work)

### Active Stripe files (19 files to update)
All of these require `apiVersion` update and SDK version upgrade:
- `app/api/stripe-webhook/route.ts` — main webhook handler (already uses req.text())
- `app/api/create-payment-intent/route.ts`
- `app/api/admin/billing/accountant-text/route.ts`
- `app/api/admin/billing/send-reminder/route.ts`
- `app/api/admin/billing/sync-products/route.ts`
- `app/api/admin/billing/invoice/route.ts`
- `app/api/admin/billing/checkout/route.ts`
- `app/api/admin/billing/overview/route.ts`
- `app/api/admin/billing/delete-checkout/route.ts`
- `app/api/admin/billing/push-checkout-link/route.ts`
- `app/api/student/setup-intent/route.ts`
- `app/api/student/bookings/[id]/cancel/route.ts`
- `app/api/student/billing-portal/route.ts`
- `app/api/student/invoices/route.ts`
- `lib/stripe-customer.ts`
- `lib/stripe-connect.ts`

### Files to delete (Netlify legacy — confirmed dead)
- `netlify/functions/stripe-webhook.ts`
- `netlify/functions/create-payment-intent.ts`
- `netlify/functions/create-checkout.ts`

</canonical_refs>

<specifics>
## Specific Ideas

- The manual test gate checklist (D-02) should appear as a `[BLOCKING]` task at the end of the final plan — Isaac must confirm both a test payment and webhook replay before the phase is marked complete.
- Current `apiVersion: '2022-11-15'` appears in all 19 active files — a single grep-and-replace pass handles most of them, but planner should verify no Stripe object constructors have other version-specific options.
- `@stripe/stripe-js ^1.54.0` is SDK v1 — a very old API surface. The researcher should flag any client-side breaking changes (e.g., `loadStripe`, `Elements` props) introduced between v1 and v7.
</specifics>

<deferred>
## Deferred Ideas

None — phase scope is tightly defined by STRIPE-01 through STRIPE-05.

</deferred>

---

*Phase: 05-stripe-sdk-upgrade*
*Context gathered: 2026-04-09 via /gsd-discuss-phase*
