# Testing Patterns

**Analysis Date:** 2026-04-08

The project has a focused but meaningful test suite covering backend logic and API routes — there are no UI component tests, no E2E tests, and no CI pipeline. Tests are written with Jest + ts-jest targeting Node environment, and all 12 test files follow a consistent pattern: `__tests__/` subdirectory adjacent to the code under test, with heavy use of `jest.mock()` for Supabase and third-party dependencies. Test coverage is strongest on the availability scheduling engine and API route auth/validation; the large admin page components and all public-facing UI pages are entirely untested.

## Test Framework

**Runner:**
- Jest v30 with ts-jest preset
- Config: `jest.config.js` (repo root)
- Test environment: `node` (not `jsdom` — no DOM/React rendering tests)

**Assertion Library:**
- Jest built-in (`expect`, `toBe`, `toEqual`, `toHaveLength`, `toBeDefined`, `toBeNull`, `toBeUndefined`, `toBeGreaterThanOrEqual`)

**TypeScript support:**
- `ts-jest` v29 handles TypeScript compilation for tests
- Path alias `@/` mapped in `jest.config.js` via `moduleNameMapper`

**Run Commands:**
```bash
# No test script in package.json — run directly:
npx jest                          # Run all tests
npx jest --watch                  # Watch mode
npx jest --coverage               # Coverage report
npx jest lib/__tests__/           # Run specific directory
npx jest --testPathPattern=caldav # Run tests matching pattern
```

Note: `package.json` has no `"test"` script. Running `npm test` will fail. Tests must be invoked via `npx jest` or a direct `jest` call.

## Test File Organization

**Location:**
- Co-located in `__tests__/` subdirectory immediately adjacent to the file under test
- Never in a top-level `__tests__/` folder

**Naming:**
- Always `[module-name].test.ts` (`.ts` not `.tsx` — no React component tests)
- Matches the source file name exactly

**Structure:**
```
lib/
  availability-engine.ts
  __tests__/
    availability-engine.test.ts
  caldav.ts
  __tests__/
    caldav.test.ts
  types/
    calendar.ts
    __tests__/
      calendar.test.ts
  notifications/
    calendar-notifications.ts
    __tests__/
      calendar-notifications.test.ts

app/api/availability/
  route.ts
  __tests__/
    route.test.ts

app/api/admin/availability/
  route.ts
  __tests__/
    route.test.ts

app/api/admin/availability-overrides/
  route.ts
  __tests__/
    route.test.ts

app/api/admin/slot-requests/
  route.ts
  __tests__/
    route.test.ts
  [id]/approve/
    route.ts
    __tests__/
      route.test.ts
  [id]/deny/
    route.ts
    __tests__/
      route.test.ts

app/store/
  page.tsx
  __tests__/
    page.test.ts     ← only page-level test; checks exported metadata only
```

**Jest match pattern:** `'**/__tests__/**/*.test.ts'` — only `.ts` files, not `.tsx`.

## Test Structure

**Suite Organization:**
```typescript
// Standard pattern — describe with numbered test names (availability-engine)
describe('computeAvailabilityFromData', () => {
  it('1. empty template returns empty availability', () => { ... })
  it('2. template with no bookings returns full availability', () => { ... })
  // ...up to 15 numbered cases
})

// API route tests — describe by HTTP method and path
describe('GET /api/availability', () => {
  it('returns 401 without auth header', async () => { ... })
  it('returns 401 for invalid token', async () => { ... })
  // ...
})
```

**Setup/Teardown:**
```typescript
beforeEach(() => jest.clearAllMocks())      // Standard: clear between tests
beforeAll(() => { process.env.X = 'val' })  // Used for env var setup in notification tests
afterEach(() => { delete process.env.X })   // Used to clean up env vars in caldav tests
```

## Mocking

**Framework:** Jest built-in (`jest.mock()`, `jest.fn()`)

**Standard Supabase mock pattern** (repeated across all API route tests):
```typescript
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockAdminFrom = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

jest.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  }),
}))
```

**Supabase query chain builder** (shared pattern, duplicated in each test file):
```typescript
function chainBuilder(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.gte = jest.fn().mockReturnValue(chain)
  chain.order = jest.fn().mockReturnValue(chain)
  // Thenable — resolves with finalResult when awaited
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: unknown) => void) => resolve(finalResult),
    writable: true,
    configurable: true,
  })
  return chain
}
```
This `chainBuilder` pattern is repeated (not shared) across multiple test files — a DRY opportunity.

**Third-party mock examples:**
```typescript
// tsdav (caldav.test.ts)
jest.mock('tsdav', () => ({
  DAVClient: jest.fn().mockImplementation(() => ({
    login: mockLogin,
    fetchCalendars: mockFetchCalendars,
    // ...
  })),
}))

// Resend email + Twilio SMS (calendar-notifications.test.ts)
jest.mock('@/lib/resend', () => ({
  resend: { emails: { send: (...args: unknown[]) => mockSend(...args) } },
}))
jest.mock('@/lib/twilio', () => ({
  sendTwilioMessage: (...args: unknown[]) => mockSendTwilioMessage(...args),
}))
```

**What is mocked:**
- All Supabase calls (both `supabase` client and `getSupabaseAdmin()`)
- All third-party SDKs: `tsdav`, `resend`, `twilio`
- Environment variables: set directly on `process.env` in `beforeAll`/`beforeEach`

**What is NOT mocked:**
- The module under test itself
- `NextRequest` / `NextResponse` — imported from `next/server` directly
- Pure utility logic in `availability-engine.ts` — tested with real inputs

## Auth Helper Pattern

Admin route tests share a helper pattern for mocking different auth states:

```typescript
function mockAdminAuth() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
  mockFrom.mockReturnValue({
    select: () => ({ eq: () => ({ single: () => ({ data: { is_admin: true } }) }) }),
  })
}

function mockNonAdminAuth() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockReturnValue({
    select: () => ({ eq: () => ({ single: () => ({ data: { is_admin: false } }) }) }),
  })
}

function mockNoAuth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } })
}
```

This is duplicated across every admin route test file — not extracted to a shared helper.

## Request Factory Pattern

API tests use factory functions to build `NextRequest` instances:

```typescript
function makeRequest(url: string, method = 'GET', headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method,
    headers: { authorization: 'Bearer test-token', ...headers },
  })
}
```

## Test Types

**Unit Tests (`lib/__tests__/`):**
- `availability-engine.test.ts` — 15 numbered scenarios testing the core scheduling algorithm with direct function calls; no mocks needed (pure logic)
- `caldav.test.ts` — tests CalDAV wrapper functions with mocked `tsdav` client
- `calendar-notifications.test.ts` — tests notification dispatch with mocked Resend/Twilio/Supabase

**Type Validation Tests (`lib/types/__tests__/calendar.test.ts`):**
- Unusual pattern: tests that TypeScript types exist and accept correct shapes at runtime
- Each `describe` block corresponds to one exported type
- Assertions are on property values, not on TypeScript compilation (the TypeScript compiler itself enforces the types at build time)
- These tests function more as living documentation than functional assertions

**API Integration Tests (`app/api/.../__tests__/route.test.ts`):**
- Test actual route handler functions imported from `route.ts`
- Cover: missing auth header (401), invalid token (401), non-admin access (403), bad input (400), successful operations (200/201)
- Do not test the actual Supabase database — all DB interactions are mocked

**Page Metadata Test (`app/store/__tests__/page.test.ts`):**
- Only page-level test in the entire suite
- Tests only the exported `metadata` object — not the React component itself
- Verifies `title`, `description`, and `openGraph` fields

## Coverage

**Requirements:** None enforced — no coverage threshold configured in `jest.config.js`

**View Coverage:**
```bash
npx jest --coverage
```

**Known gaps (untested areas):**
- All React components (`app/components/*.tsx`) — zero component tests
- All page components (`app/**/page.tsx`, `app/**/layout.tsx`) — except store metadata
- All public API routes without `__tests__/`: `/api/google-reviews`, `/api/contact`, `/api/book`, `/api/stripe-webhook`, `/api/create-payment-intent`, `/api/upload-image`
- All admin API routes without `__tests__/`: billing, caldav, social, email, courses, students, bookings, aircraft, etc.
- `lib/supabase.ts`, `lib/supabase-admin.ts`, `lib/google-calendar.ts`, `lib/posts.ts`, `lib/resend.ts`, `lib/twilio.ts`, `lib/stripe-connect.ts`, `lib/social-media.ts`
- Webhook handling (`/api/stripe-webhook/route.ts`)
- Auth flows (`app/auth/`, `app/login/`)

## Async Testing

```typescript
// All route handler tests are async
it('returns 200 for valid request', async () => {
  mockAdminAuth()
  mockAdminFrom.mockReturnValue(chainBuilder({ data: rows, error: null }))
  const req = makeRequest('http://localhost/api/admin/availability', 'GET')
  const res = await GET(req)
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json).toEqual(rows)
})
```

## CI Configuration

**CI Pipeline:** None detected. No `.github/workflows/`, no `netlify.toml` test steps, no CircleCI/TravisCI config. Tests are run manually only.

**`netlify.toml`** exists but is for build/deploy config, not testing.

## Surprising / Non-Standard Aspects

1. **No `"test"` script in `package.json`** — tests cannot be run with `npm test`; must use `npx jest`
2. **Type validation tests** in `lib/types/__tests__/calendar.test.ts` are an unusual pattern — testing TypeScript types at runtime by asserting property values on constructed objects. These are more useful as documentation than as test coverage
3. **`chainBuilder` is duplicated** across 5+ test files without extraction to a shared fixture — the most obvious refactoring target
4. **No `.tsx` test files** — the jest config only matches `*.test.ts`; adding React component tests would require changing the `testMatch` pattern and adding a `jsdom` test environment
5. **`POST as _POST` cast pattern** appears in some route tests: `const POST = _POST as (...args: any[]) => Promise<Response>` — this works around TypeScript's strict route handler types for dynamic route segments

---

*Testing analysis: 2026-04-08*
