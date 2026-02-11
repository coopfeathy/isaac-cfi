'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams?.get('error')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await signIn(email)
      setMessage('✉️ Check your email for the magic link! It may take a few minutes to arrive.')
    } catch (error: any) {
      console.error('Sign in error:', error)
      const errorMessage = error?.message || 'Error signing in. Please try again.'
      setMessage(`❌ ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-darkText">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We'll send you a magic link to sign in
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error === 'no_code' && (
              <div>
                <p className="font-semibold mb-2">Authentication setup required</p>
                <p className="text-xs">You need to configure Supabase redirect URLs:</p>
                <ol className="text-xs mt-2 ml-4 list-decimal space-y-1">
                  <li>Go to <a href="https://supabase.com/dashboard/project/fwttykpznnoupoxowvlg/auth/url-configuration" target="_blank" className="underline font-medium">Supabase Dashboard</a></li>
                  <li>Add <code className="bg-red-100 px-1 rounded">http://localhost:3000/auth/callback</code> to Redirect URLs</li>
                  <li>Click Save and try signing in again</li>
                </ol>
              </div>
            )}
            {error === 'exchange_failed' && 'Failed to complete sign in. The link may have expired.'}
            {error === 'callback_failed' && 'Authentication callback failed. Please try again.'}
            {error === 'no_session' && 'No active session found. Please sign in again.'}
            {!['no_code', 'exchange_failed', 'callback_failed', 'no_session'].includes(error) && 'Authentication failed. Please try again.'}
          </div>
        )}

        {message && (
          <div className={`${message.startsWith('❌') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'} border px-4 py-3 rounded`}>
            {message}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-golden focus:border-golden focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-darkText bg-golden hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-golden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account? The magic link will create one for you!
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
