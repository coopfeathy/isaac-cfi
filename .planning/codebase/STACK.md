# Technology Stack

**Analysis Date:** 2026-04-08

This is a Next.js 16 application (App Router) built with TypeScript, deployed to Netlify, and backed by Supabase (Postgres + Auth). The frontend uses Tailwind CSS v3 with shadcn/ui components. Serverless business logic runs in both Next.js API routes and Netlify background/scheduled functions. The project is a full booking and student-management platform for a flight training school.

---

## Languages

**Primary:**
- TypeScript 5.9.3 — all source files in `app/`, `lib/`, `components/`, `netlify/functions/`

**Secondary:**
- CSS — `app/globals.css` for CSS custom properties / Tailwind base styles
- SQL — `supabase/*.sql` for schema migrations and seed data

---

## Runtime

**Environment:**
- Node.js `>=20.0.0` (required per `package.json` `engines` field)
- Local dev tested on Node 22.22.2 / npm 10.9.7

**Package Manager:**
- npm 10.x
- Lockfile: `package-lock.json` present and committed

---

## Frameworks

**Core:**
- Next.js `^16.1.6` — App Router, React Server Components, API routes under `app/api/`
- React `^18.2.0` — UI layer
- React DOM `^18.2.0` — DOM rendering

**Styling:**
- Tailwind CSS `^3.3.2` — utility-first CSS; config at `tailwind.config.ts`
- PostCSS `^8.4.24` — via `postcss.config.js`
- autoprefixer `^10.4.14`
- tailwindcss-animate `^1.0.5` — accordion and fade animations
- tailwind-merge `^1.13.2` — conditional class merging utility
- clsx `^1.2.1` — className conditionals

**Component Library:**
- shadcn/ui — "new-york" style, configured in `components.json`; components live in `components/ui/`
- Icon library: lucide (per `components.json`)
- Framer Motion `^10.12.16` — page transitions and micro-animations

**Testing:**
- Jest `^30.3.0` — test runner; config at `jest.config.js`
- ts-jest `^29.4.9` — TypeScript transform for Jest
- Test environment: `node`
- Test files: `**/__tests__/**/*.test.ts`

**Build/Dev:**
- Next.js CLI (`next dev`, `next build`, `next start`)
- Turbopack enabled via `turbopack: {}` in `next.config.js` (default config, silences warning)
- Webpack customization: `supports-color` aliased to `false` to suppress optional-dep warnings
- esbuild — used by Netlify to bundle `netlify/functions/`

---

## Key Dependencies

**Critical:**
- `@supabase/supabase-js ^2.38.0` — database client, auth, realtime
- `@supabase/ssr ^0.9.0` — server-side Supabase helpers for Next.js App Router
- `stripe ^12.8.0` — server-side Stripe SDK (payments, webhooks, Connect)
- `@stripe/stripe-js ^1.54.0` — client-side Stripe.js loader
- `@stripe/react-stripe-js ^2.1.0` — React hooks/components for Stripe Elements
- `resend ^6.9.2` — transactional email SDK
- `@netlify/functions ^2.0.0` — Netlify Function types + scheduled function support (`Config`)
- `tsdav ^2.1.8` — CalDAV client for Apple Calendar two-way sync

**Content & Data:**
- `gray-matter ^4.0.3` — front-matter parsing for blog Markdown files in `content/`
- `remark ^15.0.1` + `remark-html ^16.0.1` — Markdown-to-HTML rendering
- `googleapis ^118.0.0` — Google API client (legacy; Google Calendar code in `lib/google-calendar.ts` is deprecated and unused)

**UI Utilities:**
- `react-datepicker ^4.12.0` — date picker in booking flows
- `react-simple-maps ^3.0.0` — SVG map component (likely for service area visualization)
- `framer-motion ^10.12.16` — animations

**Misc:**
- `encoding ^0.1.13` — text encoding polyfill (likely a transitive requirement)
- `supports-color ^9.3.1` — present in deps but aliased away in Webpack; vestigial

---

## Configuration

**Path Aliases:**
- `@/*` → project root (set in `tsconfig.json` `paths`)

**TypeScript:**
- Strict mode enabled (`"strict": true`)
- Target: `es2020`, module resolution: `bundler`
- Includes: `app/`, `lib/`, `components/`, `global.d.ts`

**Environment:**
- Local: `.env.local` (present, not committed)
- Template: `.env.example` (committed — lists all required and optional vars)
- Production vars are set in Netlify dashboard

**Build:**
- `next.config.js` — security headers, image optimization, `serverExternalPackages: ['googleapis']`
- `netlify.toml` — build command `npm run build`, publish `.next`, Node 20, functions dir `netlify/functions/`, bundler esbuild
- `netlify/functions/` — separate serverless functions (scheduled and event-driven)

---

## Platform Requirements

**Development:**
- Node >= 20
- npm (lockfile present — use npm, not yarn/pnpm)
- Supabase project with service role key
- Stripe account (test keys)
- Resend API key for email

**Production:**
- Netlify (hosting + Functions + scheduled functions via cron)
- Custom domain: `merlinflighttraining.com` (set as `NEXT_PUBLIC_SITE_URL`)
- Staging/preview: `https://isaac-cfi.netlify.app` (referenced in email templates and `brand.logoUrl`)

---

*Stack analysis: 2026-04-08*
