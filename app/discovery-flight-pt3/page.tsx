'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DiscoveryFlightPt3() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('')

  const locations = [
    {
      id: 'lumberton',
      name: 'Lumberton, NJ',
      airport: 'N14 - Flying W Airport',
      address: '68 Stacy Haines Rd, Lumberton, NJ',
    },
    {
      id: 'long-island',
      name: 'Long Island, NY',
      airport: 'FRG - Republic Airport',
      address: 'Farmingdale, New York',
    },
    {
      id: 'warwick',
      name: 'Warwick, NY',
      airport: 'N72 - Warwick Municipal',
      address: 'Warwick, New York',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Save form data
      await fetch('/api/discovery-flight-pt3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedLocation }),
      })
    } catch (error) {
      console.error('Error submitting form:', error)
    }

    // Navigate to next page regardless of fetch success/failure
    router.push('/discovery-flight-pt4')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Section 3 of 4</h2>
            <span className="text-golden font-semibold">75%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-golden via-yellow-400 to-golden h-full rounded-full" style={{ width: '75%' }} />
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-8 sm:p-12 shadow-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Discovery Flight
            </span>
          </h1>
          <p className="text-gray-400 text-lg mb-8">Select Flight Training Location</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-white font-semibold mb-6">
                Which location interests you the most?
              </label>

              <div className="space-y-4">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="relative"
                  >
                    <input
                      type="radio"
                      id={location.id}
                      name="selectedLocation"
                      value={location.id}
                      checked={selectedLocation === location.id}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      required
                      className="sr-only"
                    />
                    <label
                      htmlFor={location.id}
                      className={`block p-6 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                        selectedLocation === location.id
                          ? 'border-golden bg-golden/10'
                          : 'border-golden/30 bg-white/5 hover:border-golden/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex-shrink-0 w-6 h-6 border-2 rounded-full mt-1 transition-all duration-300 ${
                            selectedLocation === location.id
                              ? 'border-golden bg-golden'
                              : 'border-golden/50'
                          }`}
                        >
                          {selectedLocation === location.id && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-black rounded-full" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg mb-1">
                            {location.name}
                          </h3>
                          <p className="text-golden font-semibold mb-2">
                            {location.airport}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {location.address}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedLocation}
              className="w-full px-6 py-3 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              {isSubmitting ? 'Submitting...' : 'Continue to Next Step'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
