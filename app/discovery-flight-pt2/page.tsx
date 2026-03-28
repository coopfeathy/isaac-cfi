'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function DiscoveryFlightPt2Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    englishFirstLanguage: '',
    flightInstructorInterest: '',
    medicalConcerns: '',
    pilotCertificates: '',
    heightFeet: '',
    heightInches: '',
    weight: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/discovery-flight-pt2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, email }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to save form data. Please try again.')
        setIsSubmitting(false)
        return
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setError('An error occurred. Please try again.')
      setIsSubmitting(false)
      return
    }

    router.push(`/discovery-flight-pt3?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Section 2 of 4</h2>
            <span className="text-golden font-semibold">50%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-golden via-yellow-400 to-golden h-full rounded-full" style={{ width: '50%' }} />
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-8 sm:p-12 shadow-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Discovery Flight
            </span>
          </h1>
          <p className="text-gray-400 text-lg mb-8">Tell us a little bit more about yourself</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-golden/20 bg-white/5 p-5 sm:p-6">
                <label className="block text-white font-semibold mb-3">Is English your first language</label>
                <select
                  name="englishFirstLanguage"
                  value={formData.englishFirstLanguage}
                  onChange={handleChange}
                  required
                  className="w-full min-h-[52px] px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white text-base focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="rounded-2xl border border-golden/20 bg-white/5 p-5 sm:p-6">
                <label className="block text-white font-semibold mb-3">Are you interested in working for Merlin Flight Training as a flight instructor?</label>
                <select
                  name="flightInstructorInterest"
                  value={formData.flightInstructorInterest}
                  onChange={handleChange}
                  required
                  className="w-full min-h-[52px] px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white text-base focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="recreational">This flight is for recreational purposes</option>
                  <option value="someone-else">For someone else</option>
                  <option value="unsure">Unsure</option>
                </select>
              </div>

              <div className="rounded-2xl border border-golden/20 bg-white/5 p-5 sm:p-6">
                <label className="block text-white font-semibold mb-3">Do you know anything that could prevent you from obtaining a first class medical</label>
                <select
                  name="medicalConcerns"
                  value={formData.medicalConcerns}
                  onChange={handleChange}
                  required
                  className="w-full min-h-[52px] px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white text-base focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unsure">Unsure</option>
                </select>
              </div>

              <div className="rounded-2xl border border-golden/20 bg-white/5 p-5 sm:p-6">
                <label className="block text-white font-semibold mb-3">What Pilot Certificates do you hold</label>
                <select
                  name="pilotCertificates"
                  value={formData.pilotCertificates}
                  onChange={handleChange}
                  required
                  className="w-full min-h-[52px] px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white text-base focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select</option>
                  <option value="none">None</option>
                  <option value="student">Student</option>
                  <option value="sport">Sport</option>
                  <option value="private">Private</option>
                  <option value="private-instrument">Private with Instrument Rating</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              <div className="rounded-2xl border border-golden/20 bg-white/5 p-5 sm:p-6">
                <label className="block text-white font-semibold mb-3">Your Height</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <input
                      type="number"
                      inputMode="numeric"
                      name="heightFeet"
                      value={formData.heightFeet}
                      onChange={handleChange}
                      placeholder="Feet"
                      min="0"
                      max="9"
                      className="w-full min-h-[56px] px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                    />
                    <p className="text-gray-400 text-sm mt-2">Feet</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      inputMode="numeric"
                      name="heightInches"
                      value={formData.heightInches}
                      onChange={handleChange}
                      placeholder="Inches"
                      min="0"
                      max="11"
                      className="w-full min-h-[56px] px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                    />
                    <p className="text-gray-400 text-sm mt-2">Inches</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-golden/20 bg-white/5 p-5 sm:p-6">
                <label className="block text-white font-semibold mb-3">Your Weight</label>
                <input
                  type="number"
                  inputMode="numeric"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="LBS"
                  min="0"
                  className="w-full min-h-[56px] px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                />
                <p className="text-gray-400 text-sm mt-2">LBS</p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-300"
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-golden text-black font-semibold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
              >
                {isSubmitting ? 'Submitting...' : 'Continue to Next Step'}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg mt-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default function DiscoveryFlightPt2() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-golden animate-pulse">Loading...</div>
      </div>
    }>
      <DiscoveryFlightPt2Content />
    </Suspense>
  )
}
