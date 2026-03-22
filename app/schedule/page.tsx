'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Slot } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BookingModalProps {
  slot: Slot
  userId: string
  userEmail?: string
  onClose: () => void
}

function PaymentForm({ slot }: { slot: Slot }) {
  const stripe = useStripe()
  const elements = useElements()
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setIsLoading(true)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/success?slot_id=${slot.id}`,
      },
    })

    if (error) {
      setMessage(error.message || 'An unexpected error occurred.')
    }

    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {message && <div className="text-red-600 text-sm">{message}</div>}
      <button
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-golden text-darkText font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : `Pay $${(slot.price / 100).toFixed(2)}`}
      </button>
    </form>
  )
}

function BookingModal({ slot, userId, userEmail, onClose }: BookingModalProps) {
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    // Create PaymentIntent as soon as the modal loads
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: slot.price,
        slotId: slot.id,
        userId,
        email: userEmail,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error creating payment intent:', error)
        setLoading(false)
      })
  }, [slot, userId, userEmail])

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#C59A2A',
    },
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-darkText">Complete Booking</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Slot Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-lg">
              {slot.description || (slot.type === 'tour' ? 'NYC Flight Tour' : 'Flight Lesson')}
            </h3>
            <p className="text-gray-600">
              {new Date(slot.start_time).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className="text-gray-600">
              {new Date(slot.start_time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              -{' '}
              {new Date(slot.end_time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
            <p className="text-2xl font-bold text-darkText">
              ${(slot.price / 100).toFixed(2)}
            </p>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                placeholder="Any special requests or questions?"
              />
            </div>
          </div>

          {/* Payment Form */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golden"></div>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
              <PaymentForm slot={slot} />
            </Elements>
          ) : (
            <div className="text-red-600 text-center">
              Failed to initialize payment. Please try again.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SchedulePageContent() {
  const { user, loading: authLoading } = useAuth()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'training' | 'tour'>('all')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [requestStatus, setRequestStatus] = useState<string | null>(null)
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestForm, setRequestForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    preferredDate: '',
    preferredStartTime: '',
    durationMinutes: '90',
    notes: '',
  })

  useEffect(() => {
    fetchSlots()
  }, [])

  useEffect(() => {
    if (!user?.email) return

    setRequestForm((prev) => ({
      ...prev,
      email: prev.email || user.email || '',
    }))
  }, [user])

  const fetchSlots = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('slots')
        .select('*')
        .eq('is_booked', false)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (error) throw error
      setSlots(data || [])
    } catch (error) {
      console.error('Error fetching slots:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSlots = slots.filter(slot => 
    filter === 'all' || slot.type === filter
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const handleBook = (slot: Slot) => {
    setSelectedSlot(slot)
  }

  const handleCloseModal = () => {
    setSelectedSlot(null)
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    setRequestSubmitting(true)
    setRequestStatus(null)

    try {
      const response = await fetch('/api/slot-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestForm,
          userId: user?.id || null,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Unable to submit your request right now.')
      }

      setRequestStatus('Request submitted. We will review it and follow up shortly.')
      setRequestForm({
        fullName: '',
        email: user?.email || '',
        phone: '',
        preferredDate: '',
        preferredStartTime: '',
        durationMinutes: '90',
        notes: '',
      })
    } catch (error) {
      setRequestStatus(error instanceof Error ? error.message : 'Unable to submit your request right now.')
    } finally {
      setRequestSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-golden"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 overflow-hidden flex-shrink-0" style={{
        backgroundImage: `url('/images/our-aircraft-header.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 60%',
      }}>
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-4 inline-block">
            <div className="w-16 sm:w-20 h-1 bg-golden mx-auto rounded-full" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Schedule Your <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Flight</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
            Book your flight training session or discovery flight online
          </p>
        </div>
      </section>

      <section className="flex-1 py-10 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-darkText">Available Flight Slots</h2>
                <p className="text-gray-600 mt-1">Select a slot, complete payment, and add your booking to Apple Calendar from the confirmation screen.</p>
              </div>
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                    filter === 'all' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('training')}
                  className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                    filter === 'training' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Training
                </button>
                <button
                  onClick={() => setFilter('tour')}
                  className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                    filter === 'tour' ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Discovery Flight
                </button>
              </div>
            </div>
          </div>

          {filteredSlots.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-10 text-center">
              <h3 className="text-2xl font-bold text-darkText mb-2">No slots available right now</h3>
              <p className="text-gray-600">Please check back soon for newly published availability.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredSlots.map((slot) => (
                <article key={slot.id} className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      slot.type === 'tour' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {slot.type === 'tour' ? 'discovery flight' : 'training'}
                    </span>
                    <span className="text-xl font-bold text-darkText">${(slot.price / 100).toFixed(2)}</span>
                  </div>

                  <h3 className="text-lg font-bold text-darkText mb-1">
                    {slot.description || (slot.type === 'tour' ? 'Discovery Flight' : 'Flight Training Lesson')}
                  </h3>
                  <p className="text-gray-700 font-medium">{formatDate(slot.start_time)}</p>
                  <p className="text-gray-600 mb-5">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>

                  <button
                    onClick={() => handleBook(slot)}
                    className="w-full px-4 py-3 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90 transition-colors"
                  >
                    Book This Slot
                  </button>
                </article>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md p-6 mt-8 border border-gray-100">
            <h3 className="text-2xl font-bold text-darkText mb-2">Need a Different Discovery Flight Time?</h3>
            <p className="text-gray-600 mb-5">
              Request your preferred time and our team can approve or suggest an alternative.
            </p>

            <form onSubmit={handleSubmitRequest} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={requestForm.fullName}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={requestForm.email}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={requestForm.phone}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                <input
                  type="date"
                  required
                  value={requestForm.preferredDate}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Start Time</label>
                <input
                  type="time"
                  required
                  value={requestForm.preferredStartTime}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, preferredStartTime: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <select
                  value={requestForm.durationMinutes}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                >
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  rows={3}
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                  placeholder="Tell us ideal times, occasion, or any constraints."
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {requestSubmitting ? 'Submitting...' : 'Request a Discovery Flight Slot'}
                </button>
                {requestStatus && <p className="text-sm text-gray-700">{requestStatus}</p>}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {selectedSlot && user && (
        <BookingModal
          slot={selectedSlot}
          userId={user.id}
          userEmail={user.email}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading schedule...</div>
      </div>
    }>
      <SchedulePageContent />
    </Suspense>
  )
}
