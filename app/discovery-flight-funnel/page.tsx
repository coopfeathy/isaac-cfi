'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DiscoveryFlightFunnel() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Send email to backend to save to prospect_information table
      const response = await fetch('/api/discovery-flight-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to save email. Please try again.'
        try {
          const data = await response.json()
          errorMessage = data.error || errorMessage
        } catch (e) {
            // If JSON parse fails, use status text
            console.error('Failed to parse error response', e)
            errorMessage = `Server Error: ${response.status} ${response.statusText}`
        }
        setError(errorMessage)
        setIsSubmitting(false)
        return
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      setIsSubmitting(false)
      return
    }

    // Navigate to next page after successful submission
    router.push(`/discovery-flight-pt1?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center px-4 py-16">
      {/* Interior Title - Hidden from view but visible in code */}
      {/* Discovery Flight Funnel - Lead Capture Page */}
      
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-8 sm:p-12 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
                Ready to Fly?
              </span>
            </h1>
            <p className="text-gray-300 text-lg font-light">
              Get exclusive details about your discovery flight experience
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-white font-semibold mb-3">
                Enter your email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              {isSubmitting ? 'Getting Started...' : 'Get Started'}
            </button>

            <p className="text-center text-gray-400 text-xs">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
