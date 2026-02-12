'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function DiscoveryFlightPt1() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    isForSomeoneElse: false,
    citizenship: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    trainingObjective: '',
    trainingStart: '',
    agreeToSMS: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/discovery-flight-pt1', {
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

    router.push(`/discovery-flight-pt2?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Section 1 of 4</h2>
            <span className="text-golden font-semibold">25%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-golden via-yellow-400 to-golden h-full rounded-full" style={{ width: '25%' }} />
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white/5 backdrop-blur-md border border-golden/20 rounded-2xl p-8 sm:p-12 shadow-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">
              Discovery Flight
            </span>
          </h1>
          <p className="text-gray-400 text-lg mb-8">Get to know you pt.1</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Is this for someone else? */}
            <div className="border-t border-gray-600 pt-8">
              <label className="flex items-center gap-3 cursor-pointer mb-6">
                <input
                  type="checkbox"
                  name="isForSomeoneElse"
                  checked={formData.isForSomeoneElse}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-400 text-golden focus:ring-golden cursor-pointer"
                />
                <span className="text-white font-semibold">Is this for someone else?</span>
              </label>

              {/* Recipients Section - Appears when checkbox is checked */}
              {formData.isForSomeoneElse && (
                <div className="bg-white/5 border border-golden/20 rounded-lg p-6 mb-6">
                  <p className="text-white text-sm mb-6">
                    Please fill out this form with the recipients information to the best of your ability.
                  </p>
                </div>
              )}
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Citizenship */}
              <div className="md:col-span-2">
                <label htmlFor="citizenship" className="block text-white font-semibold mb-3">
                  Citizenship
                </label>
                <select
                  id="citizenship"
                  name="citizenship"
                  value={formData.citizenship}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select citizenship</option>
                  <option value="us-citizen">US Citizen</option>
                  <option value="permanent-resident">Permanent Resident</option>
                  <option value="visa-holder">Visa Holder</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-white font-semibold mb-3">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder=""
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                />
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-white font-semibold mb-3">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder=""
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-white font-semibold mb-3">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  placeholder=""
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dateOfBirth" className="block text-white font-semibold mb-3">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                  placeholder="MM/DD/YYYY"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                />
              </div>

              {/* Training Objective */}
              <div className="md:col-span-2">
                <label htmlFor="trainingObjective" className="block text-white font-semibold mb-3">
                  Training Objective
                </label>
                <select
                  id="trainingObjective"
                  name="trainingObjective"
                  value={formData.trainingObjective}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select an objective</option>
                  <option value="career-pilot">Career Pilot</option>
                  <option value="private-pilot">Private Pilot Training</option>
                  <option value="instrument-pilot">Instrument Pilot</option>
                  <option value="commercial-pilot">Commercial Pilot</option>
                  <option value="trying-something-new">Trying something new</option>
                  <option value="new-experience">New Experience</option>
                  <option value="unsure">Unsure</option>
                </select>
              </div>

              {/* Training Start */}
              <div className="md:col-span-2">
                <label htmlFor="trainingStart" className="block text-white font-semibold mb-3">
                  Training Start
                </label>
                <select
                  id="trainingStart"
                  name="trainingStart"
                  value={formData.trainingStart}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-golden/30 text-white focus:outline-none focus:ring-2 focus:ring-golden focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select timeframe</option>
                  <option value="within-3-months">Within 3 months</option>
                  <option value="more-than-3-months">More than 3 months</option>
                  <option value="researching">Researching</option>
                </select>
              </div>
            </div>

            {/* SMS Agreement */}
            <div className="border-t border-gray-600 pt-8">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeToSMS"
                  checked={formData.agreeToSMS}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-400 text-golden focus:ring-golden cursor-pointer mt-1"
                />
                <span className="text-gray-300 text-sm">
                  I agree to receive SMS messages from Merlin Flight Training at the number provided & agree to{' '}
                  <Link href="/privacy" className="text-golden hover:text-yellow-400 underline">
                    Privacy Policy
                  </Link>
                  {' '}&{' '}
                  <Link href="/terms" className="text-golden hover:text-yellow-400 underline">
                    Terms of Service
                  </Link>
                  . Message & data rates may apply. Reply STOP to cancel.
                </span>
              </label>
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
