# Coding Conventions

**Analysis Date:** 2026-04-08

This codebase is a Next.js 16 App Router project using TypeScript strict mode, Tailwind CSS for all styling, and Supabase for auth/data. Conventions are mostly consistent but informal — there is no Prettier config and no pre-commit hooks, so style is enforced only by ESLint (next/core-web-vitals) and TypeScript strict mode. Component patterns are straightforward functional React with local state; there are no shared UI primitives beyond a thin `cn()` utility.

## Naming Patterns

**Files:**
- Page files: `page.tsx`, `layout.tsx` — Next.js convention, always lowercase
- Component files: PascalCase, named after the component: `AdminPageShell.tsx`, `BookingForm.tsx`, `TypingEffect.tsx`
- All component files live in `app/components/` (no top-level `components/` directory)
- API route files: always `route.ts` in their segment directory
- Library/utility files: camelCase: `availability-engine.ts`, `supabase-admin.ts`, `google-calendar.ts`
- Test files: `*.test.ts` inside `__tests__/` subdirectories alongside the code under test

**Functions and Components:**
- React components: PascalCase, exported as `export default function ComponentName`
- API route handlers: named exports matching HTTP verbs — `export async function GET(...)`, `export async function POST(...)`
- Helper functions: camelCase — `computeAvailabilityFromData`, `fetchCalendars`, `slotToVEvent`
- Context hooks: `use` prefix — `useAuth()`, `useBooking()`
- Async functions in components: descriptive camelCase — `fetchReviews`, `loadSettings`, `saveSettings`, `getAuthHeader`

**Variables and Types:**
- Local state: camelCase, descriptive — `reviewsLoading`, `connStatus`, `lastSyncAt`
- TypeScript types local to a file: defined at the top of the file with `type` keyword (not `interface`) for union/simple shapes
- TypeScript types in `lib/types/`: use `interface` for objects, `type` for unions and aliases
- Database column names in types follow Postgres snake_case: `day_of_week`, `start_time`, `override_date`
- Enum-like string literals preferred over enums: `'pending' | 'approved' | 'denied' | 'canceled'`

**Examples from codebase:**
```typescript
// Local type alias (app/admin/page.tsx)
type AdminTab = 'slots' | 'bookings' | 'prospects' | 'blog' | 'social' | 'email' | 'settings'
type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

// Interface in lib/types (lib/types/calendar.ts)
export interface InstructorAvailability {
  id: string
  day_of_week: number // 0=Sunday, 6=Saturday
  start_time: string  // "HH:MM:SS" format from Postgres TIME
  end_time: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
```

## Code Style

**Formatting:**
- No Prettier config detected — formatting is handled by editor defaults and ESLint
- Indentation: 2 spaces (TypeScript/TSX files)
- Single quotes preferred in most files (`'use client'`, `import ... from '...'`), though double quotes appear in JSX attribute strings and some older files
- Trailing commas: generally yes on multi-line objects/arrays
- Semicolons: not used (no-semicolon style)

**Linting:**
- Config: `.eslintrc.json` extends `next/core-web-vitals`
- Only one explicit rule override: `"react/no-unescaped-entities": "off"` — indicates JSX text with apostrophes is common and not escaped
- TypeScript strict mode (`"strict": true` in `tsconfig.json`) — enforced at compile time

**TypeScript strictness:**
- `strict: true` — all strict checks enabled
- `forceConsistentCasingInFileNames: true`
- `noEmit: true` — TypeScript is type-check only; Next.js handles transpilation
- Path alias `@/` maps to repo root

## Directive Usage

Client/server split follows Next.js App Router conventions:

- `'use client'` at top of file when component uses hooks, browser APIs, or event handlers
- Pages with data fetching via `useEffect` + `fetch` are client components
- API routes are always server-side (`route.ts` files, no directive needed)
- Server components (no directive) are used for static pages and layouts

Examples:
- `app/page.tsx` — `'use client'` (uses `useEffect`, `useState`)
- `app/admin/page.tsx` — `'use client'` (uses hooks, router)
- `app/layout.tsx` — no directive (server component)
- `app/components/AdminPageShell.tsx` — no directive (pure render, no hooks)

## Import Organization

Imports are not formally sorted, but a consistent informal order is observed:

1. React and Next.js imports (`react`, `next/link`, `next/image`, `next/navigation`)
2. Third-party library imports (`framer-motion`, `@stripe/...`, `react-datepicker`)
3. Internal `@/lib/...` imports (Supabase clients, utilities, types)
4. Internal `@/app/...` imports (components, contexts)

**Path alias:**
- `@/` resolves to the repo root — used consistently for lib and component imports
- Relative imports (`../contexts/AuthContext`) also appear for within-app imports

```typescript
// Example import block (app/admin/billing/page.tsx)
import { useEffect, useMemo, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AdminPageShell from "@/app/components/AdminPageShell"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
```

## Component Patterns

**Standard page component:**
- `export default function PageName()` — always default export, PascalCase
- Props typed inline with a destructured parameter or a local `interface`/`type`
- State declared at top of component body
- Data fetching in `useEffect` with cleanup pattern (cancelled flag for async)
- JSX returned directly from function body (no wrapper variable)

**Reusable component pattern (AdminPageShell):**
```typescript
export default function AdminPageShell({
  title,
  description,
  backLinks = [],
  actions,
  maxWidthClassName = 'max-w-6xl',
  children,
}: {
  title: string
  description?: string
  backLinks?: AdminLink[]
  actions?: React.ReactNode
  maxWidthClassName?: string
  children: React.ReactNode
}) { ... }
```
Props typed as inline object literal in the destructured parameter — no separate `Props` interface for small components.

**Context pattern:**
- Contexts live in `app/contexts/` — `AuthContext.tsx`, `BookingContext.tsx`
- Consumed via named hooks: `useAuth()`, `useBooking()`
- Wrapped at root in `app/layout.tsx` via `<AuthProvider>`

**Async cancellation pattern** (consistent across pages with data fetching):
```typescript
useEffect(() => {
  let cancelled = false
  const fetchData = async () => {
    try { ... if (!cancelled) { setState(...) } }
    catch (error) { if (!cancelled) { setError(...) } }
    finally { if (!cancelled) { setLoading(false) } }
  }
  fetchData()
  return () => { cancelled = true }
}, [])
```

**`void` for floating promises:**
`void loadSettings()` pattern used when calling async functions from sync event handlers or useEffect without awaiting.

## Styling Approach

**Framework:** Tailwind CSS v3 with custom theme extensions

**Custom tokens defined in `tailwind.config.ts`:**
- `golden`: `#FFBF00` — brand accent color
- `darkText`: `#0B0B0B` — near-black for primary text
- CSS variable-based semantic colors: `border`, `input`, `ring`, `background`, `foreground`, `primary`, `secondary`, `destructive`, `muted`, `accent`, `popover`, `card` — all via `hsl(var(--...))` pattern (shadcn/ui convention)
- Custom `borderRadius`: `lg`, `md`, `sm` via `--radius` CSS variable
- Font: `Inter` as primary sans-serif

**Class patterns observed:**
- Utility composition directly in JSX — no CSS modules or styled-components
- `cn()` from `lib/utils.ts` (`clsx` + `tailwind-merge`) for conditional class merging
- Responsive prefixes used consistently: `sm:`, `lg:`, `md:`
- Dark mode config: `["class"]` strategy (class-based, not media query)

**`cn()` utility:**
```typescript
// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## API Route Conventions

All API routes follow this pattern:

1. Extract `Authorization: Bearer <token>` header and validate with Supabase
2. Parse and validate query params / request body
3. Use `getSupabaseAdmin()` (from `lib/supabase-admin.ts`) for privileged DB operations
4. Return `NextResponse.json({ ... }, { status: NNN })`
5. Wrap operations in `try/catch`, return `{ error: message }` with appropriate status on failure

Admin routes add an extra check for `is_admin: true` in the profiles table after auth.

```typescript
// Standard API route structure (app/api/availability/route.ts)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ... validation and logic ...
  try {
    const result = await someOperation()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

## Error Handling

- API routes: `try/catch` with `err instanceof Error ? err.message : 'Internal server error'` pattern
- Client components: `try/catch` in async handlers, errors stored in local state (`setError(...)`)
- No global error boundary pattern detected beyond Next.js default
- `console.error(...)` used for non-critical failures (e.g., failed settings load in `app/admin/calendar/page.tsx`)

## Comments

- Comments are sparse; used primarily to explain non-obvious logic
- Format strings and timezone offsets documented inline: `// "HH:MM:SS" format from Postgres TIME`, `// 08:00 EDT = 12:00 UTC`
- Section dividers with `// ===` or `// ---` used in longer test files
- JSDoc not used on component functions; used occasionally on lib functions

## Notable Non-Standard Patterns

- **`app/admin/page 2.tsx`** — a file with a space in the name exists; likely a duplicate/leftover that should be cleaned up
- **Mixed quote styles** — single quotes in `.ts` files, double quotes common in `.tsx` JSX; no enforced consistency
- **No barrel files** — each module imported by its direct path; no `index.ts` re-exports in components or lib
- **Local type definitions in page files** — large pages like `app/admin/page.tsx` define many types inline rather than importing from `lib/types/`

---

*Convention analysis: 2026-04-08*
