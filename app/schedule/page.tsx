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

function BookingModal({ slot, onClose }: BookingModalProps) {
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
  const { loading: authLoading } = useAuth()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'training' | 'tour'>('all')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  useEffect(() => {
    fetchSlots()
  }, [])

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
                  Tour
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
                      {slot.type}
                    </span>
                    <span className="text-xl font-bold text-darkText">${(slot.price / 100).toFixed(2)}</span>
                  </div>

                  <h3 className="text-lg font-bold text-darkText mb-1">
                    {slot.description || (slot.type === 'tour' ? 'NYC Flight Tour' : 'Flight Training Lesson')}
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
        </div>
      </section>

      {/* Booking Modal */}
      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
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
