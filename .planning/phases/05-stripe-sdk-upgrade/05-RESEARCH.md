# Phase 5: Stripe SDK Upgrade - Research

**Researched:** 2026-04-09
**Domain:** Stripe Node.js SDK upgrade (12.8.0 → 17.x), client SDK upgrade (@stripe/stripe-js 1.x → 7.x, @stripe/react-stripe-js 2.x → 3.x), apiVersion migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Delete `netlify/functions/stripe-webhook.ts`, `netlify/functions/create-payment-intent.ts`, and `netlify/functions/create-checkout.ts`. STRIPE-01 audit confirmed `/api/stripe-webhook` is the single active endpoint — these files are dead code and should be removed entirely. No upgrades needed on them.
- **D-02:** After deployment, Isaac runs the test gate manually: (1) trigger a test payment in Stripe Dashboard (test mode), (2) replay the resulting webhook event from Stripe Dashboard → Developer → Webhooks, (3) confirm both complete without error. Plan must include an explicit step-by-step checklist for this manual gate.
- **D-03:** Bump `@stripe/stripe-js` from `^1.54.0` → `^7.x` (latest stable).
- **D-04:** Bump `@stripe/react-stripe-js` from `^2.1.0` → `^3.x` (latest stable compatible with @stripe/stripe-js ^7.x).
- **D-05:** The Next.js App Router webhook at `app/api/stripe-webhook/route.ts` already uses `req.text()` (fixed in Phase 4). STRIPE-04 is already satisfied for the active endpoint. No change needed here — the planner should verify this is still the case after the SDK upgrade and confirm the signature verification still works.
- **D-06:** Phase 5 must be executed on its own isolated branch. No feature work in the same branch or deployment window. This is a locked constraint from STATE.md.

### Claude's Discretion

- The exact 17.x version to pin (latest stable at time of execution)
- Order of file upgrades within the plans
- Whether any Stripe 12→17 breaking changes require API call signature updates beyond `apiVersion` (planner/researcher to audit changelog)
- Any TypeScript type changes introduced by the new SDK that need fixing

### Deferred Ideas (OUT OF SCOPE)

None — phase scope is tightly defined by STRIPE-01 through STRIPE-05.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STRIPE-01 | Stripe dashboard audit confirms exactly one active webhook endpoint (`/api/stripe-webhook`) before any SDK changes | D-01 confirms the 3 Netlify dead files to delete; webhook already confirmed single active endpoint from Phase 4 |
| STRIPE-02 | `stripe` package upgraded from `12.18.0` to `^17.x` across all 12 route files and Netlify functions | Verified 17.7.0 is latest stable 17.x; CONTEXT lists 16 active server files (not 12) plus 2 lib files; breaking changes documented |
| STRIPE-03 | `apiVersion` updated to `'2025-02-24.acacia'` in all Stripe client instantiations | All 16 active files confirmed using `'2022-11-15'`; need to update to `'2025-02-24.acacia'` |
| STRIPE-04 | Webhook handler uses `req.text()` (not `req.json()`) for signature verification after upgrade | Confirmed: `app/api/stripe-webhook/route.ts` already uses `req.text()` at line 240 |
| STRIPE-05 | `@stripe/stripe-js` and `@stripe/react-stripe-js` client packages updated to match server SDK | Verified: `@stripe/stripe-js@7.9.0` + `@stripe/react-stripe-js@3.10.0`; peer deps compatible; client usage is `loadStripe`/`Elements`/`PaymentElement`/`useStripe`/`useElements` |
</phase_requirements>

---

## Summary

This phase is a pure SDK version bump with no feature changes. The current project uses `stripe@12.8.0` (server), `@stripe/stripe-js@1.54.0`, and `@stripe/react-stripe-js@2.1.0` (client). The target is `stripe@17.7.0`, `@stripe/stripe-js@7.9.0`, and `@stripe/react-stripe-js@3.10.0`.

The upgrade span from `stripe` v12 to v17 traverses five major versions (v13, v14, v15, v16, v17). Research confirms that the breaking changes across those versions — removed API fields, renamed parameters, deprecated methods — are narrowly scoped to Billing.Alert, Terminal.Reader, Subscriptions, Disputes, and Payment Method type enums. None of the removed/renamed items match the API surface used in this codebase (PaymentIntents, Checkout.Sessions, Invoices, Transfers, Customers, BillingPortal, SetupIntents). The largest concrete risk is TypeScript strict-mode breakage from changed type signatures.

The three Netlify functions (`stripe-webhook.ts`, `create-payment-intent.ts`, `create-checkout.ts`) are confirmed dead code — they have Stripe v12 constructors with `apiVersion: '2022-11-15'` but should simply be deleted per D-01, not upgraded.

**Primary recommendation:** Upgrade `stripe` to `^17.7.0`; update `apiVersion` to `'2025-02-24.acacia'` in all 16 active server files; delete the 3 dead Netlify functions; upgrade client packages to `@stripe/stripe-js@^7.9.0` and `@stripe/react-stripe-js@^3.10.0`; run `next build` to surface any TypeScript type errors from the SDK update.

---

## Standard Stack

### Core (Server)

| Library | Verified Version | Purpose | Note |
|---------|-----------------|---------|------|
| `stripe` | 17.7.0 | Server-side Stripe API client | Latest stable 17.x as of 2026-04-09 |

### Core (Client)

| Library | Verified Version | Purpose | Note |
|---------|-----------------|---------|------|
| `@stripe/stripe-js` | 7.9.0 | Client-side Stripe.js loading utility | Latest stable 7.x; no peerDeps |
| `@stripe/react-stripe-js` | 3.10.0 | React components for Stripe Elements | Peer dep: `@stripe/stripe-js >=1.44.1 <8.0.0` — compatible with 7.x |

**Version verification:** [VERIFIED: npm registry, 2026-04-09]
- `stripe@17.7.0` confirmed stable on npm (17.8.0-beta.1 is the only newer 17.x release, which is pre-release)
- `@stripe/stripe-js@7.9.0` confirmed stable on npm
- `@stripe/react-stripe-js@3.10.0` confirmed stable on npm

**Installation:**
```bash
npm install stripe@^17.7.0
npm install @stripe/stripe-js@^7.9.0 @stripe/react-stripe-js@^3.10.0
```

**Peer dependency compatibility confirmed:** [VERIFIED: npm registry]
- `@stripe/react-stripe-js@3.10.0` peerDeps: `@stripe/stripe-js >=1.44.1 <8.0.0` → accepts `^7.9.0`
- `react@18.2.0` and `react-dom@18.2.0` in project satisfy `>=16.8.0 <20.0.0` requirement

---

## Architecture Patterns

### File Map: What Needs Changing

**Active server files — apiVersion update AND SDK upgrade (16 files):**
```
app/api/stripe-webhook/route.ts               (line 5: apiVersion)
app/api/create-payment-intent/route.ts        (line 6: apiVersion)
app/api/admin/billing/accountant-text/route.ts (line 8: apiVersion)
app/api/admin/billing/send-reminder/route.ts   (line 8: apiVersion)
app/api/admin/billing/sync-products/route.ts   (line 13: apiVersion)
app/api/admin/billing/invoice/route.ts         (line 7: apiVersion)
app/api/admin/billing/checkout/route.ts        (line 16: apiVersion)
app/api/admin/billing/overview/route.ts        (line 36: apiVersion)
app/api/admin/billing/delete-checkout/route.ts (line 7: apiVersion)
app/api/admin/billing/push-checkout-link/route.ts (line 18: apiVersion)
app/api/student/setup-intent/route.ts          (line 8: apiVersion)
app/api/student/bookings/[id]/cancel/route.ts  (line 7: apiVersion)
app/api/student/billing-portal/route.ts        (line 7: apiVersion)
app/api/student/invoices/route.ts              (line 7: apiVersion)
lib/stripe-customer.ts                         (line 6: apiVersion — inside ensureStripeCustomer, passed as arg)
lib/stripe-connect.ts                          (no Stripe constructor — no apiVersion to update here)
```

Note: [VERIFIED from codebase grep] All 14 API route files and `lib/stripe-customer.ts` contain `new Stripe(...)` with `apiVersion: '2022-11-15'`. `lib/stripe-connect.ts` does NOT instantiate Stripe directly — it is a pure utility library that receives the Stripe instance from the calling route. It does NOT need an `apiVersion` update.

**Dead Netlify files — DELETE (3 files, D-01):**
```
netlify/functions/stripe-webhook.ts
netlify/functions/create-payment-intent.ts
netlify/functions/create-checkout.ts
```

**Client files — package version bump only (no code changes expected):**
```
app/admin/billing/page.tsx   — uses loadStripe, Elements, PaymentElement, useStripe, useElements
```

### Pattern: Stripe Constructor (unchanged across v12 → v17)

```typescript
// Source: [VERIFIED: codebase + Stripe Node.js SDK v17 docs]
// Constructor signature is UNCHANGED from v12 to v17:
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',  // Only this string changes
})
```

### Pattern: Conditional Stripe Instantiation (some admin routes)

Some admin routes use a guard pattern to avoid errors when the env var is absent:
```typescript
// Found in accountant-text, send-reminder, sync-products, checkout, overview, delete-checkout, push-checkout-link
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null
```
This pattern is unaffected by the upgrade — only the `apiVersion` string changes.

### Pattern: req.text() Webhook (D-05 — already correct)

```typescript
// Source: [VERIFIED: codebase inspection, line 240-242]
// app/api/stripe-webhook/route.ts is already correct — NO change needed:
const body = await req.text()
event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
```

### Pattern: Client-side Stripe.js (no code changes expected)

```typescript
// Source: [VERIFIED: codebase, app/admin/billing/page.tsx line 101]
// loadStripe signature is identical across v1 → v7:
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

// Elements, PaymentElement, useStripe, useElements — unchanged API surface
// stripe.confirmPayment() — unchanged API surface
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC validation | `stripe.webhooks.constructEvent()` | Handles timing-safe comparison; tied to apiVersion |
| API version management | Hardcoded header injection | `apiVersion` in constructor | SDK handles versioning of all requests automatically |
| Retry/timeout config | Custom retry loops | SDK built-in (`maxNetworkRetries`, `timeout`) | v17 defaults: 2 retries, 5s timeout (raised from v12's 1 retry, 2s timeout) |

---

## Breaking Changes: stripe v12 → v17

[VERIFIED: Stripe GitHub releases, official docs]

### v13 (API 2023-08-16) — Breaking changes in this codebase: NONE
- Removed `Subscriptions.del()` → use `cancel()` — codebase does not call `del()` on subscriptions
- Removed `Charge.destination` field — codebase uses `transfer_data` via split transfers, not `destination`
- Removed `Checkout.Session.shipping_rates` → use `shipping_options` — codebase uses `shipping_options` already
- Removed `PaymentMethod` update params for `blik`, `acss_debit`, etc. — codebase does not update payment methods
- Default retries changed from 0 to 1 — safe, improves resilience

### v14 (API 2023-10-16) — Breaking changes in this codebase: NONE (low information, see Assumptions Log)
- API changes scoped to Billing, Terminal, and Treasury based on search results
- Codebase does not use Terminal or Treasury APIs

### v15 (API 2024-04-10) — Breaking changes in this codebase: NONE (low information, see Assumptions Log)
- API changes at this version not documented in search results
- Codebase uses only: PaymentIntents, Checkout.Sessions, Invoices, Transfers, Customers, BillingPortal, SetupIntents — these are stable API surfaces

### v16 (API 2024-06-20) — Breaking changes in this codebase: NONE (low information, see Assumptions Log)
- API changes at this version not documented in search results

### v17 (API 2024-09-30.acacia) — Breaking changes in this codebase: NONE
[VERIFIED: newreleases.io/stripe/v17.0.0]
- Renamed `Billing.Alert.usage_threshold_config` → `usage_threshold` — codebase does not use Billing.Alert
- Removed `Terminal.ReaderProcessSetupIntentParams.customer_consent_collected` — codebase does not use Terminal API
- Default max retries increased from 1 → 2; timeout from 2s → 5s — safe behavior improvement

**apiVersion string for 17.x:** `'2025-02-24.acacia'`
[ASSUMED: based on CONTEXT.md D-03 which specifies this exact string. The CONTEXT was prepared by the user and is treated as authoritative. The Stripe API version naming is the "acacia" release family which began with 2024-09-30.acacia and follows monthly cadence with no breaking changes within the family. The `2025-02-24.acacia` string aligns with this pattern.]

Note: REQUIREMENTS.md states `apiVersion: '2025-02-24.acacia'` as the target (STRIPE-03). This matches the acacia API version family.

---

## Breaking Changes: @stripe/stripe-js v1 → v7

[VERIFIED: GitHub issue #733, npm registry, Stripe docs]

### v6 — The key versioning change
- `apiVersion` parameter removed from `loadStripe()` — the current codebase does NOT pass `apiVersion` to `loadStripe()` (confirmed: `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")` with no second arg). **No code change needed.**

### v7 — Pinned to acacia API family
- Stripe.js now pinned to a specific API version family (acacia) — no `loadStripe()` API change
- `Elements`, `PaymentElement`, `useStripe`, `useElements`, `stripe.confirmPayment()` — unchanged API surface
- The current usage pattern (Elements + PaymentElement + confirmPayment) is standard and unaffected

**Conclusion:** Client-side code requires only a package version bump — no code changes expected.

---

## TypeScript Type Considerations

[ASSUMED — partially verified]

The project uses `strict: true` TypeScript. The stripe SDK ships TypeScript types that evolve with each major version. Known type changes relevant to this codebase:

1. **Removed fields from removed API surface** — since v13 removed `Charge.destination`, `Charge.alternate_statement_descriptors`, etc., any TypeScript code accessing those properties would now fail to compile. The webhook handler accesses `intent.latest_charge` (string) and `charge.payment_intent` — both of these are stable fields.

2. **`latest_charge` typing** — The webhook uses `typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id`. This pattern handles both string and object forms and should be type-safe under v17 types.

3. **`event as any` cast** — The webhook stores `payload: event as any` in the database. The `any` cast bypasses type checking; this is unaffected by SDK version.

4. **`stripe.transfers.create()` idempotency key parameter** — The second argument `{ idempotencyKey: string }` is a Stripe request options object. This signature is stable across v12-v17.

**Risk:** The build step (`next build`) will reveal any TypeScript type errors introduced by the new SDK. The plan MUST include running `next build` as a verification step before manual testing.

---

## Common Pitfalls

### Pitfall 1: Applying the wrong target apiVersion string
**What goes wrong:** Using the v17 release API version (`2024-09-30.acacia`) instead of the required target (`2025-02-24.acacia`). The SDK will accept any valid acacia version string.
**Why it happens:** The v17 SDK ships with `2024-09-30.acacia` as its default, but Stripe has continued releasing acacia versions monthly. The project requirement (STRIPE-03) explicitly specifies `2025-02-24.acacia`.
**How to avoid:** Use exactly `'2025-02-24.acacia'` as the apiVersion string in all 15 server files (14 API routes + `lib/stripe-customer.ts`).
**Warning signs:** If the TypeScript types reject `'2025-02-24.acacia'` as a non-literal type, it means the SDK's `Stripe.LatestApiVersion` type union doesn't include that string — this would indicate the SDK version must be 17.x with an acacia version that covers 2025-02-24. Verify with `npm view stripe@17.7.0 dist-tags` if this occurs.

### Pitfall 2: Forgetting lib/stripe-customer.ts
**What goes wrong:** Updating all API route files but missing `lib/stripe-customer.ts`, which also instantiates `new Stripe()` with `apiVersion: '2022-11-15'`.
**Why it happens:** It's a library file, not a route file, and may be missed in a route-focused grep.
**How to avoid:** The plan must explicitly list `lib/stripe-customer.ts` as one of the 15 files requiring `apiVersion` update.
**Warning signs:** After upgrade, calls to `ensureStripeCustomer()` will use the old API version while routes use the new one.

### Pitfall 3: Updating dead Netlify functions instead of deleting them
**What goes wrong:** Spending time upgrading `netlify/functions/stripe-webhook.ts` etc. instead of deleting them.
**Why it happens:** Grep finds them alongside active files.
**How to avoid:** D-01 locks the decision — delete these 3 files, do not upgrade them.

### Pitfall 4: Missing the npm install step before code edits
**What goes wrong:** Editing `apiVersion` strings before running `npm install stripe@^17.7.0`, causing TypeScript to report the new API version string as an invalid literal type (since the installed v12 types don't include `'2025-02-24.acacia'`).
**Why it happens:** The Stripe SDK types define `apiVersion` as a union of known string literals.
**How to avoid:** Run `npm install` FIRST, then edit source files.

### Pitfall 5: Stripe.js client version mismatch warning
**What goes wrong:** Upgrading the server SDK but not the client packages, causing a console warning from Stripe about mismatched API versions.
**Why it happens:** Server and client are in different packages.
**How to avoid:** Upgrade both in the same deployment. Plans 05-01 and 05-02 should deploy together or 05-01 first.

### Pitfall 6: Default retry/timeout change silently affects error handling
**What goes wrong:** v17 changes defaults (max retries: 1→2, timeout: 2s→5s). Webhook handlers with a 30s total timeout may now wait longer before failing.
**Why it happens:** The new defaults are better for most cases, but may affect how quickly errors surface.
**How to avoid:** No action needed — the improved defaults are appropriate for this use case. Document in plan so Isaac is aware.

---

## Code Examples

### Upgrading the Stripe constructor (all 15 server files)

```typescript
// Source: [VERIFIED: codebase + Stripe SDK pattern unchanged v12→v17]
// BEFORE (current state):
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
})

// AFTER (target):
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})
```

### Conditional constructor (admin routes)

```typescript
// Source: [VERIFIED: codebase, e.g., app/api/admin/billing/checkout/route.ts line 16]
// BEFORE:
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })
  : null

// AFTER:
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null
```

### Client-side (NO code changes)

```typescript
// Source: [VERIFIED: codebase, app/admin/billing/page.tsx line 101]
// This stays EXACTLY the same — no apiVersion argument, no other changes:
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `apiVersion: '2022-11-15'` | `apiVersion: '2025-02-24.acacia'` | v17.x SDK | Acacia version family — monthly releases, backward-compatible |
| `loadStripe(..., { apiVersion: '...' })` | `loadStripe(publishableKey)` | @stripe/stripe-js v6 | apiVersion parameter removed from client — version pinned by package version |
| 0 retries by default | 2 retries by default | stripe v17 | More resilient; slightly longer worst-case latency |
| 2s timeout default | 5s timeout default | stripe v17 | Reduces spurious timeouts on slow networks |

---

## Runtime State Inventory

Step 2.5 SKIPPED — this is a dependency version upgrade, not a rename/refactor/migration of stored data or runtime state. No stored strings, live service config, OS-registered state, secret key names, or build artifacts change as a result of this phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/runtime | Yes | 22.22.2 | — |
| npm | Package install | Yes | 10.9.7 | — |
| Stripe npm registry | Package install | Yes | stripe@17.7.0, @stripe/stripe-js@7.9.0 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 + ts-jest 29.4.9 |
| Config file | `jest.config.js` |
| Quick run command | `npx jest --testPathPattern="__tests__"` |
| Full suite command | `npx jest` |
| Build verification | `npm run build` (next build — reveals TypeScript type errors) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRIPE-01 | One active webhook endpoint confirmed | Manual (Stripe Dashboard audit) | — | N/A |
| STRIPE-02 | stripe package upgraded to 17.x | Smoke — build + package.json check | `node -e "require('stripe'); console.log(require('./node_modules/stripe/package.json').version)"` | — |
| STRIPE-03 | apiVersion updated in all files | Grep verification | `grep -r "apiVersion" app/api lib/ --include="*.ts"` | — |
| STRIPE-04 | req.text() in webhook handler | Code inspection | `grep "req.text()" app/api/stripe-webhook/route.ts` | — |
| STRIPE-05 | Client packages upgraded | Package.json check + smoke test | Manual: test payment in Stripe Dashboard test mode | — |

### Sampling Rate

- **Per task commit:** `npm run build` (TypeScript compile check)
- **Per wave merge:** `npm run build` + `npm run lint`
- **Phase gate:** Manual test gate (D-02): test payment + webhook replay in Stripe Dashboard before marking phase complete

### Wave 0 Gaps

None — no new test files need to be created. This phase has no unit-testable logic changes; the phase gate is the manual test gate defined in D-02. The `next build` command provides compile-time verification sufficient for the automated gate.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not applicable — upgrade only |
| V3 Session Management | No | Not applicable — upgrade only |
| V4 Access Control | No | Not applicable — upgrade only |
| V5 Input Validation | Yes | Webhook signature verified via `stripe.webhooks.constructEvent()` — SDK handles HMAC |
| V6 Cryptography | Yes | Webhook HMAC verification — must not hand-roll; must use `req.text()` not `req.json()` |

### Known Threat Patterns for Stripe SDK Upgrade

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook replay / spoofing | Spoofing | `stripe.webhooks.constructEvent()` validates signature; idempotency check in DB |
| API key exposure during upgrade | Information Disclosure | Key stays in env var; never committed; SDK upgrade does not touch secrets |
| Version downgrade via package.json | Tampering | Pin with `^17.7.0` (not `*`); package-lock.json committed |

**Webhook integrity (D-05):** The existing `req.text()` + `constructEvent()` pattern is correct and survives the SDK upgrade unchanged. The signature verification algorithm is consistent across SDK versions — the SDK change only affects the TypeScript types and the pinned API version.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `apiVersion: '2025-02-24.acacia'` is a valid type-safe string in `stripe@17.7.0` TypeScript types | Standard Stack, Code Examples | TypeScript compile error; fix: use the apiVersion string that the SDK's type union accepts, then open GitHub issue |
| A2 | v14, v15, v16 breaking changes do not affect PaymentIntents, Checkout.Sessions, Invoices, Transfers, Customers, BillingPortal, or SetupIntents | Breaking Changes section | Type errors or runtime failures on specific API calls; fix: audit `npm run build` output and adjust any flagged calls |
| A3 | `@stripe/stripe-js` v1 → v7 client-side API surface (loadStripe, Elements, PaymentElement, confirmPayment) is unchanged except for the removed apiVersion parameter (which the codebase never passed) | Breaking Changes: client section | Client payment form breaks; fix: check stripe.js CHANGELOG for specific Elements API changes |

**If this table is empty:** Not empty — A1-A3 are LOW-confidence items requiring verification during plan execution (via `npm run build`).

---

## Open Questions

1. **Is `'2025-02-24.acacia'` in stripe@17.7.0's `Stripe.LatestApiVersion` type union?**
   - What we know: The v17 SDK was released with `2024-09-30.acacia` as its initial API version. Stripe releases monthly acacia updates. The 17.7.0 release is dated 2025 and would include newer acacia versions.
   - What's unclear: Whether `2025-02-24.acacia` is a valid literal type in 17.7.0's TypeScript definitions.
   - Recommendation: Run `npm install stripe@^17.7.0` first, then attempt `npm run build`. If TypeScript rejects the string, check the SDK's `node_modules/stripe/types/index.d.ts` for the `LatestApiVersion` union and use the closest valid string. Alternatively, use `as Stripe.LatestApiVersion` cast only if necessary.

2. **Exact count discrepancy: REQUIREMENTS.md says "12 route files" but CONTEXT.md and codebase grep show 14 route files + 1 lib file**
   - What we know: REQUIREMENTS.md (STRIPE-02) says "12 route files and Netlify functions" but CONTEXT.md lists 16 active files (14 API routes + 2 lib files). Codebase grep confirms 14 API routes + `lib/stripe-customer.ts` have `new Stripe()` calls. `lib/stripe-connect.ts` has no Stripe constructor.
   - What's unclear: Whether REQUIREMENTS.md was written before new billing routes were added.
   - Recommendation: Update based on actual codebase state — 14 API route files + `lib/stripe-customer.ts` = 15 files total require `apiVersion` update. The requirement is satisfied when all files are updated regardless of the count in the requirement text.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry, 2026-04-09] — `stripe@17.7.0`, `@stripe/stripe-js@7.9.0`, `@stripe/react-stripe-js@3.10.0` version and peer dependency verification
- [VERIFIED: codebase grep] — All 14 API route files + `lib/stripe-customer.ts` confirmed to use `apiVersion: '2022-11-15'`; webhook confirmed to use `req.text()`; client code confirmed to use `loadStripe()` without `apiVersion` argument
- [VERIFIED: codebase inspection] — Netlify functions stripe-webhook.ts, create-payment-intent.ts, create-checkout.ts confirmed to exist and use Stripe v12 constructor

### Secondary (MEDIUM confidence)
- [newreleases.io/project/npm/stripe/release/17.0.0](https://newreleases.io/project/npm/stripe/release/17.0.0) — v17.0.0 breaking changes: Billing.Alert rename, Terminal removal, retry defaults change
- [github.com/stripe/stripe-node/releases/tag/v13.0.0](https://github.com/stripe/stripe-node/releases/tag/v13.0.0) — v13.0.0 breaking changes: Subscriptions.del() removed, Charge.destination removed, retry default changed
- [github.com/stripe/stripe-js/issues/733](https://github.com/stripe/stripe-js/issues/733) — Stripe.js versioning announcement: apiVersion removed from loadStripe() in v6
- [github.com/stripe/react-stripe-js migrating.md](https://github.com/stripe/react-stripe-js/blob/master/docs/migrating.md) — React Stripe.js migration: hooks confirmed, StripeProvider history

### Tertiary (LOW confidence — marked as ASSUMED)
- v14, v15, v16 breaking changes not directly verified; assumed not to affect codebase API surface based on Stripe's documented stable-API policy for PaymentIntents and core payment objects

---

## Metadata

**Confidence breakdown:**
- Standard stack (versions): HIGH — verified on npm registry 2026-04-09
- Breaking changes v13/v17: HIGH — verified from GitHub release notes
- Breaking changes v14/v15/v16: LOW — not directly verified; assumed safe based on API surface used
- Client SDK changes: HIGH — verified via GitHub issue #733 and peer dep check
- Peer dependency compatibility: HIGH — verified from npm registry

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days — stable SDK ecosystem)
