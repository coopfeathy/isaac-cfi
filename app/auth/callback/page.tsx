'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code from URL parameters (magic link)
        const code = searchParams?.get('code')
        
        if (!code) {
          console.error('No code found in URL parameters')
          router.push('/login?error=no_code')
          return
        }

        console.log('Exchanging code for session...')
        
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          console.error('Error exchanging code for session:', error)
          router.push('/login?error=exchange_failed')
          return
        }

        if (!data.session) {
          console.error('No session returned after code exchange')
          router.push('/login?error=no_session')
          return
        }

        console.log('Successfully authenticated!')
        
        // Successfully authenticated - redirect to schedule
        router.push('/schedule')
      } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        router.push('/login?error=callback_failed')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4 text-black">Completing sign in...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golden mx-auto"></div>
        <p className="mt-4 text-gray-600">Please wait while we log you in</p>
      </div>
    </div>
  )
}
