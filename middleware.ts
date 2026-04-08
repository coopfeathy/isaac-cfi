/**
 * Next.js middleware for server-side session refresh and auth redirect.
 *
 * Scope: /admin/* and /manage/* routes only.
 * Student routes (/dashboard, /learn, /bookings, etc.) retain client-side
 * auth via AuthContext until Phase 4 (STU-07).
 *
 * What this does:
 * 1. Refreshes the Supabase session cookie on every matched request.
 * 2. Redirects unauthenticated users to /login.
 *
 * What this does NOT do:
 * - Role checks (is_admin, is_instructor) — those live in individual route/layout guards (D-08).
 * - Return URL parameter — redirect is always /login with no query string (D-07).
 *
 * Session refresh pattern from @supabase/ssr 0.9.0.
 * Uses getUser() (not getSession()) per SEC-03 / D-05 — server-verifies the JWT
 * with the Supabase auth service instead of reading stale cookie data.
 */

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // CRITICAL: reassign supabaseResponse so refreshed session tokens
          // propagate to the browser — required by @supabase/ssr 0.9.0 (T-1-04).
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() performs a network call to verify the JWT server-side.
  // getSession() only reads the cookie without verification — do not use it (SEC-03 / T-1-03).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/manage/:path*'],
}
