import { createClient } from '@supabase/supabase-js'
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(new URL('/login?error=exchange_failed', requestUrl.origin))
    }

    // Redirect to schedule page after successful authentication
    return NextResponse.redirect(new URL('/schedule', requestUrl.origin))
  }

  // No code found, redirect to login
  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
}
