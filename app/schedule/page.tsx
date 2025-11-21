'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Slot } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import BookingFormModal from '../components/BookingFormModal'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BookingModalProps {
  slot: Slot
  onClose: () => void
  onSuccess: () => void
}

function PaymentForm({ slot, onSuccess }: { slot: Slot; onSuccess: () => void }) {
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

function BookingModal({ slot, onClose, onSuccess }: BookingModalProps) {
  const { user } = useAuth()
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    // Create PaymentIntent as soon as the modal loads
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: slot.price,
        slotId: slot.id,
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
  }, [slot])

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
              <PaymentForm slot={slot} onSuccess={onSuccess} />
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

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'training' | 'tour'>('all')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    // Check if we should show the booking form from homepage
    if (searchParams?.get('showBooking') === 'true') {
      setShowBookingForm(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (user) {
      fetchSlots()
    }
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

  const handleBookingSuccess = () => {
    setSelectedSlot(null)
    fetchSlots() // Refresh available slots
    alert('Booking confirmed! Check your email for confirmation details.')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-golden"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-darkText mb-4">
            Available Slots
          </h1>
          <p className="text-gray-600">
            Choose from our available flight training sessions and NYC tours
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-golden text-darkText'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('training')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              filter === 'training'
                ? 'bg-golden text-darkText'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Flight Training
          </button>
          <button
            onClick={() => setFilter('tour')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              filter === 'tour'
                ? 'bg-golden text-darkText'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            NYC Tours
          </button>
        </div>

        {/* Slots Grid */}
        {filteredSlots.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              No available slots found. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow"
              >
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    slot.type === 'tour'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {slot.type === 'tour' ? 'NYC Tour' : 'Flight Training'}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-darkText mb-2">
                  {slot.description || (slot.type === 'tour' ? 'NYC Flight Tour' : 'Flight Lesson')}
                </h3>
                
                <div className="space-y-2 mb-4 text-gray-600">
                  <p className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(slot.start_time)}
                  </p>
                  <p className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-darkText">
                    ${(slot.price / 100).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleBook(slot)}
                    className="px-6 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90 transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          onClose={handleCloseModal}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Booking Form Modal - For homepage "Book Your Flight" button */}
      <BookingFormModal
        isOpen={showBookingForm}
        onClose={() => setShowBookingForm(false)}
      />
    </div>
  )
}
