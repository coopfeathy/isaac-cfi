'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function DiscoveryFlightPt4() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

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
        <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-8 sm:p-12 shadow-2xl text-center">
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Thank You!
            </span>
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            Your discovery flight questionnaire has been completed. We'll be in touch with you soon to schedule your flight experience!
          </p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.back()}
              className="px-8 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-300"
            >
              Go Back
            </button>
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all duration-300"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
