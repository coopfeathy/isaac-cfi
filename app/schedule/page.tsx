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

function PaymentForm({ totalCents, slotId }: { totalCents: number; slotId: string }) {
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
        return_url: `${window.location.origin}/booking/success?slot_id=${slotId}`,
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
        {isLoading ? 'Processing...' : `Pay $${(totalCents / 100).toFixed(2)}`}
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
  const [subtotalCents, setSubtotalCents] = useState(slot.price)
  const [processingFeeCents, setProcessingFeeCents] = useState(Math.round(slot.price * 0.035))
  const [totalCents, setTotalCents] = useState(slot.price + Math.round(slot.price * 0.035))

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
        setSubtotalCents(Number(data.subtotalCents || slot.price))
        setProcessingFeeCents(Number(data.processingFeeCents || Math.round(slot.price * 0.035)))
        setTotalCents(Number(data.totalCents || slot.price + Math.round(slot.price * 0.035)))
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
              {slot.description || (slot.type === 'tour' ? 'Discovery Flight' : 'Flight Lesson')}
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
              ${(totalCents / 100).toFixed(2)}
            </p>
            <div className="border-t border-gray-200 pt-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Lesson subtotal</span>
                <span>${(subtotalCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Card fee (3.5%)</span>
                <span>${(processingFeeCents / 100).toFixed(2)}</span>
              </div>
            </div>
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
              <PaymentForm totalCents={totalCents} slotId={slot.id} />
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
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
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

  const toDateKey = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const slotsByDate = filteredSlots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const key = toDateKey(slot.start_time)
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})

  const availableDateKeys = Object.keys(slotsByDate).sort()

  useEffect(() => {
    if (availableDateKeys.length === 0) {
      return
    }

    // Only auto-pick an available date when nothing is selected yet.
    // Keep the user's manual selection even if that day has no slots.
    if (!selectedDateKey) {
      setSelectedDateKey(availableDateKeys[0])
    }
  }, [filter, selectedDateKey, availableDateKeys.length])

  const selectedDaySlots = selectedDateKey ? (slotsByDate[selectedDateKey] || []) : []

  const calendarLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
  const startOffset = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()
  const dateTypeMap = filteredSlots.reduce<Record<string, { hasTraining: boolean; hasDiscovery: boolean }>>((acc, slot) => {
    const key = toDateKey(slot.start_time)
    if (!acc[key]) {
      acc[key] = { hasTraining: false, hasDiscovery: false }
    }
    if (slot.type === 'tour') acc[key].hasDiscovery = true
    if (slot.type === 'training') acc[key].hasTraining = true
    return acc
  }, {})

  const calendarDays: Array<{ dateKey: string | null; dayNumber: number | null; hasSlots: boolean; hasTraining: boolean; hasDiscovery: boolean }> = []

  for (let index = 0; index < startOffset; index += 1) {
    calendarDays.push({ dateKey: null, dayNumber: null, hasSlots: false, hasTraining: false, hasDiscovery: false })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const typeInfo = dateTypeMap[dateKey] || { hasTraining: false, hasDiscovery: false }
    calendarDays.push({
      dateKey,
      dayNumber: day,
      hasSlots: Boolean(slotsByDate[dateKey]?.length),
      hasTraining: typeInfo.hasTraining,
      hasDiscovery: typeInfo.hasDiscovery,
    })
  }

  const formatSelectedDayHeading = (dateKey: string) => {
    const date = new Date(`${dateKey}T12:00:00`)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

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

  const openRequestModal = () => {
    setRequestStatus(null)
    setRequestForm((prev) => ({
      ...prev,
      preferredDate: selectedDateKey || prev.preferredDate,
    }))
    setRequestModalOpen(true)
  }

  const closeRequestModal = () => {
    setRequestModalOpen(false)
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
        preferredDate: selectedDateKey || '',
        preferredStartTime: '',
        durationMinutes: '90',
        notes: '',
      })
      setRequestModalOpen(false)
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

          {selectedDateKey && selectedDaySlots.length === 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
              <h3 className="text-2xl font-bold text-darkText mb-2">Need a Different Discovery Flight Time?</h3>
              <p className="text-gray-600 mb-5">
                There are no available slots on this day. Submit a custom request and our team can approve or suggest an alternative.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={openRequestModal}
                  className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800"
                >
                  Request a Discovery Flight Slot
                </button>
                {requestStatus && <p className="text-sm text-gray-700">{requestStatus}</p>}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
              <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Prev
                  </button>
                  <h3 className="text-xl font-bold text-darkText">{calendarLabel}</h3>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => {
                    if (!day.dateKey || !day.dayNumber) {
                      return <div key={`blank-${index}`} className="aspect-square rounded-xl bg-transparent" />
                    }

                    const isSelected = selectedDateKey === day.dateKey
                    return (
                      <button
                        key={day.dateKey}
                        onClick={() => setSelectedDateKey(day.dateKey)}
                        className={`relative aspect-square rounded-xl border text-sm font-semibold transition-colors ${
                          day.hasSlots
                            ? isSelected
                              ? 'bg-golden text-darkText border-golden'
                              : 'bg-golden/30 text-darkText border-golden/50 hover:bg-golden/50'
                            : isSelected
                              ? 'bg-gray-200 text-darkText border-gray-300'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {day.dayNumber}
                        {(day.hasTraining || day.hasDiscovery) && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
                            {day.hasTraining && <span className="w-1.5 h-1.5 rounded-full bg-green-700" />}
                            {day.hasDiscovery && <span className="w-1.5 h-1.5 rounded-full bg-blue-700" />}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p>Yellow days have available slots. White days have none.</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-700" /> Training available</span>
                    <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-700" /> Discovery Flight available</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 border border-gray-100">
                <div className="mb-5">
                  <h3 className="text-2xl font-bold text-darkText">
                    {selectedDateKey ? formatSelectedDayHeading(selectedDateKey) : 'Select a day'}
                  </h3>
                  <p className="text-gray-600 mt-1">Choose a highlighted day to view and book the available time slots.</p>
                </div>

                {selectedDateKey && selectedDaySlots.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDaySlots.map((slot) => (
                      <article key={slot.id} className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div>
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide mb-3 ${
                              slot.type === 'tour' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {slot.type === 'tour' ? 'discovery flight' : 'training'}
                            </span>
                            <h4 className="text-lg font-bold text-darkText">
                              {slot.description || (slot.type === 'tour' ? 'Discovery Flight' : 'Flight Training Lesson')}
                            </h4>
                            <p className="text-gray-600 mt-1">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-sm text-gray-500">Price</p>
                            <p className="text-2xl font-bold text-darkText">${(slot.price / 100).toFixed(2)}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleBook(slot)}
                          className="w-full sm:w-auto px-5 py-3 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                          Book This Slot
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
                    {selectedDateKey
                      ? 'No slots are available on this day.'
                      : 'Pick a day on the calendar to see available slots.'}
                  </div>
                )}
              </div>
            </div>

          {filteredSlots.length === 0 && (
            <div className="bg-white rounded-xl shadow-md p-8 mt-6 text-center">
              <h3 className="text-2xl font-bold text-darkText mb-2">No slots available right now</h3>
              <p className="text-gray-600">Try another date, change filters, or request a custom time below.</p>
            </div>
          )}

        </div>
      </section>

      {/* Discovery Request Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-start gap-3">
              <h2 className="text-lg sm:text-2xl font-bold text-darkText leading-tight">Need a Different Discovery Flight Time?</h2>
              <button
                onClick={closeRequestModal}
                className="flex-shrink-0 text-gray-500 hover:text-gray-700 text-2xl leading-none mt-0.5"
              >
                ×
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <p className="text-gray-600 mb-5">
                Share your preferred timing and our team can approve or suggest an alternative.
              </p>

              <form onSubmit={handleSubmitRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-hidden">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={requestForm.fullName}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={requestForm.email}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={requestForm.phone}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={requestForm.preferredDate}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
                    className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Start Time</label>
                  <input
                    type="time"
                    required
                    value={requestForm.preferredStartTime}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, preferredStartTime: e.target.value }))}
                    className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <select
                    value={requestForm.durationMinutes}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                    className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                  >
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                    <option value="120">120 minutes</option>
                  </select>
                </div>
                <div className="md:col-span-2 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    rows={3}
                    value={requestForm.notes}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                    placeholder="Tell us ideal times, occasion, or any constraints."
                  />
                </div>
                <div className="md:col-span-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    type="submit"
                    disabled={requestSubmitting}
                    className="w-full sm:w-auto px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {requestSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button
                    type="button"
                    onClick={closeRequestModal}
                    className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
