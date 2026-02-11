'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function ApplicationForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    certificateGoal: '',
    experience: '',
    availability: '',
    message: ''
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subject: 'Flight Training Application'
        })
      })

      if (response.ok) {
        setStatus('success')
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          certificateGoal: '',
          experience: '',
          availability: '',
          message: ''
        })
      } else {
        setStatus('error')
      }
    } catch (error) {
      console.error('Application error:', error)
      setStatus('error')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-xl p-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Apply for Flight Training</h1>
          <p className="text-gray-600 mb-8">
            Start your journey to becoming a pilot. Fill out the form below and we'll get back to you within 24 hours.
          </p>

          {status === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                ✅ Application submitted successfully! We'll contact you soon.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">
                ❌ Something went wrong. Please try again or contact us directly.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="certificateGoal" className="block text-sm font-medium text-gray-700 mb-2">
                Certificate Goal *
              </label>
              <select
                id="certificateGoal"
                name="certificateGoal"
                required
                value={formData.certificateGoal}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a certificate</option>
                <option value="private">Private Pilot</option>
                <option value="instrument">Instrument Rating</option>
                <option value="commercial">Commercial Pilot</option>
                <option value="cfi">Certified Flight Instructor</option>
                <option value="recreational">Recreational Pilot</option>
                <option value="sport">Sport Pilot</option>
              </select>
            </div>

            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                Flight Experience *
              </label>
              <select
                id="experience"
                name="experience"
                required
                value={formData.experience}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select your experience level</option>
                <option value="none">No experience</option>
                <option value="discovery">Discovery flight only</option>
                <option value="student">Some training (0-20 hours)</option>
                <option value="advanced">Advanced student (20+ hours)</option>
                <option value="licensed">Licensed pilot</option>
              </select>
            </div>

            <div>
              <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-2">
                Availability *
              </label>
              <input
                type="text"
                id="availability"
                name="availability"
                required
                placeholder="e.g., Weekends, Tuesday/Thursday evenings"
                value={formData.availability}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Tell us about your aviation goals
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={formData.message}
                onChange={handleChange}
                placeholder="What motivates you to become a pilot? Any questions for us?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'submitting' ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
            <ul className="space-y-2 text-gray-600">
              <li>✈️ We'll review your application within 24 hours</li>
              <li>📞 A certified instructor will contact you to discuss your goals</li>
              <li>📅 Schedule your first lesson or discovery flight</li>
              <li>🚀 Begin your journey to the skies!</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
