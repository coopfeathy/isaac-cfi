import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  // If there's an error in the URL, redirect back to login with error
  if (error) {
    console.error('Auth callback error:', error, error_description)
    return NextResponse.redirect(new URL(`/login?error=${error}`, requestUrl.origin))
  }

  // If there's a code, exchange it for a session
  if (code) {
    try {
      const cookieStore = await cookies()
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieStore.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.set({ name, value: '', ...options })
            },
          },
        }
      )
      
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(new URL('/login?error=exchange_failed', requestUrl.origin))
      }

      // Role-based post-login routing
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, is_instructor')
          .eq('id', user.id)
          .single()

        if (profile?.is_admin) {
          return NextResponse.redirect(new URL('/admin', requestUrl.origin))
        }
        if (profile?.is_instructor) {
          return NextResponse.redirect(new URL('/cfi', requestUrl.origin))
        }
      }

      return NextResponse.redirect(new URL('/schedule', requestUrl.origin))
    } catch (err) {
      console.error('Unexpected error in auth callback:', err)
      return NextResponse.redirect(new URL('/login?error=callback_failed', requestUrl.origin))
    }
  }

  // No code found, redirect to login
  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
}
