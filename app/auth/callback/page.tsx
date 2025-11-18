'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.hash)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        router.push('/login?error=callback_failed')
      } else {
        router.push('/schedule')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Completing sign in...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golden mx-auto"></div>
      </div>
    </div>
  )
}
