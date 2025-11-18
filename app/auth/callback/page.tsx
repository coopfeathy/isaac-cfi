'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have hash params (access_token, etc.)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        console.log('Hash params:', { accessToken: accessToken ? 'present' : 'missing', refreshToken: refreshToken ? 'present' : 'missing' })
        
        if (accessToken && refreshToken) {
          console.log('Setting session from hash tokens...')
          
          // Set the session using the tokens from the hash
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          
          if (error) {
            console.error('Error setting session:', error)
            setError(error.message)
            return
          }
          
          if (!data.session) {
            console.error('No session created')
            setError('Failed to create session')
            return
          }
          
          console.log('Successfully authenticated!')
          router.push('/schedule')
          return
        }
        
        // Fallback: check for existing session
        console.log('Checking for existing session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error getting session:', sessionError)
          setError(sessionError.message)
          return
        }

        if (!session) {
          console.error('No session found')
          setError('No authentication found')
          return
        }

        console.log('Found existing session!')
        router.push('/schedule')
      } catch (error: any) {
        console.error('Unexpected error in auth callback:', error)
        setError(error?.message || 'Authentication failed')
      }
    }

    handleAuthCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Authentication Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

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
