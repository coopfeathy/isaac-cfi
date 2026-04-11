'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function DiscoveryFlightPt4Content() {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''
  const startTrainingHref = email
    ? `/start-training?email=${encodeURIComponent(email)}`
    : '/start-training'

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Section 4 of 4</h2>
            <span className="text-golden font-semibold">100%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-golden via-yellow-400 to-golden h-full rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-5 sm:p-8 lg:p-12 shadow-2xl text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Thank You!
            </span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-3">
            Your discovery flight questionnaire has been completed. We&apos;ll be in touch within one business day to confirm your flight.
          </p>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-8">
            Ready to go a step further? Most of our students decide to start real training right after
            their discovery flight. Here&apos;s exactly what that looks like and how to begin.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={startTrainingHref}
              className="inline-flex items-center justify-center w-full sm:w-auto min-h-[52px] px-8 py-3 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105"
            >
              Start My Flight Training →
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full sm:w-auto min-h-[52px] px-8 py-3 bg-transparent text-white border-2 border-white/30 hover:border-golden hover:bg-white/10 font-semibold rounded-lg transition-all duration-300"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DiscoveryFlightPt4() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-golden animate-pulse">Loading...</div>
      </div>
    }>
      <DiscoveryFlightPt4Content />
    </Suspense>
  )
}
