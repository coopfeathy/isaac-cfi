'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Slot } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// ─── Helpers ────────────────────────────────────────────────────────────────

const toDateKey = (dateString: string) => {
  const d = new Date(dateString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

const formatFullDate = (dateKey: string) =>
  new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

const durationMins = (start: string, end: string) =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

// ─── Payment form (step 2) ───────────────────────────────────────────────────

function StripePaymentForm({ totalCents, slotId }: { totalCents: number; slotId: string }) {
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
    if (error) setMessage(error.message || 'An unexpected error occurred.')
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {message && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {message}
        </div>
      )}
      <button
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-golden text-black font-bold py-4 px-6 rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
      >
        {isLoading ? 'Processing...' : `Pay $${(totalCents / 100).toFixed(2)}`}
      </button>
    </form>
  )
}

// ─── Booking Modal ───────────────────────────────────────────────────────────

interface BookingModalProps {
  slot: Slot
  userId: string
  userEmail?: string
  onClose: () => void
}

function BookingModal({ slot, userId, userEmail, onClose }: BookingModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [subtotalCents, setSubtotalCents] = useState(slot.price)
  const [processingFeeCents, setProcessingFeeCents] = useState(Math.round(slot.price * 0.035))
  const [totalCents, setTotalCents] = useState(slot.price + Math.round(slot.price * 0.035))
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const slotType = slot.type === 'tour' ? 'Discovery Flight' : 'Flight Training'
  const duration = durationMins(slot.start_time, slot.end_time)

  const appearance = { theme: 'stripe' as const, variables: { colorPrimary: '#FFBF00' } }

  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setLoadingPayment(true)
    setPaymentError(null)
    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: slot.price, slotId: slot.id, userId, email: userEmail, name, phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to initialize payment')
      setClientSecret(data.clientSecret)
      setSubtotalCents(Number(data.subtotalCents || slot.price))
      setProcessingFeeCents(Number(data.processingFeeCents || Math.round(slot.price * 0.035)))
      setTotalCents(Number(data.totalCents || slot.price + Math.round(slot.price * 0.035)))
      setStep(2)
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Failed to initialize payment. Please try again.')
    } finally {
      setLoadingPayment(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-black">
              {step === 1 ? 'Your Details' : 'Payment'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-6 h-1.5 rounded-full ${step >= 1 ? 'bg-golden' : 'bg-gray-200'}`} />
              <div className={`w-6 h-1.5 rounded-full ${step >= 2 ? 'bg-golden' : 'bg-gray-200'}`} />
              <span className="text-xs text-gray-500 ml-1">Step {step} of 2</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-black transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Slot summary card — always visible */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${
                  slot.type === 'tour' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>
                  {slot.type === 'tour' ? '✈ Discovery Flight' : '🎓 Training'}
                </span>
                <p className="font-semibold text-black">
                  {slot.description || slotType}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  <span className="text-gray-400 ml-2">· {formatDuration(duration)}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatFullDate(toDateKey(slot.start_time))}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-black">${(slot.price / 100).toFixed(2)}</p>
                <p className="text-xs text-gray-400">+3.5% card fee</p>
              </div>
            </div>
          </div>

          {/* Step 1: Contact details */}
          {step === 1 && (
            <form onSubmit={handleContinueToPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-golden focus:border-transparent outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-golden focus:border-transparent outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any questions or special requests?"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-golden focus:border-transparent outline-none transition text-sm resize-none"
                />
              </div>
              {paymentError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {paymentError}
                </div>
              )}
              <button
                type="submit"
                disabled={loadingPayment || !name.trim() || !phone.trim()}
                className="w-full bg-black text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {loadingPayment ? 'Setting up payment...' : 'Continue to Payment →'}
              </button>
              <p className="text-center text-xs text-gray-400">
                You won't be charged until the next step
              </p>
            </form>
          )}

          {/* Step 2: Stripe payment */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-gray-500 hover:text-black transition-colors font-medium">
                  ← Back
                </button>
                <div className="text-right text-gray-600">
                  <span>Subtotal ${(subtotalCents / 100).toFixed(2)} + Card fee ${(processingFeeCents / 100).toFixed(2)}</span>
                  <span className="font-bold text-black ml-2">= ${(totalCents / 100).toFixed(2)}</span>
                </div>
              </div>
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
                  <StripePaymentForm totalCents={totalCents} slotId={slot.id} />
                </Elements>
              ) : (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-golden" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Request Modal ────────────────────────────────────────────────────────────

interface RequestModalProps {
  defaultDate: string
  userEmail: string
  onClose: () => void
  onSuccess: () => void
}

function RequestModal({ defaultDate, userEmail, onClose, onSuccess }: RequestModalProps) {
  const [form, setForm] = useState({
    fullName: '', email: userEmail, phone: '',
    preferredDate: defaultDate, preferredStartTime: '',
    durationMinutes: '90', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/slot-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to submit request')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-black">Request a Custom Time</h2>
            <p className="text-sm text-gray-500 mt-0.5">We'll review and confirm within 24 hours</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input type="text" required value={form.fullName} onChange={update('fullName')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-golden outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
              <input type="tel" required value={form.phone} onChange={update('phone')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-golden outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
              <input type="email" required value={form.email} onChange={update('email')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-golden outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preferred Date</label>
              <input type="date" value={form.preferredDate} onChange={update('preferredDate')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-golden outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preferred Time</label>
              <input type="time" value={form.preferredStartTime} onChange={update('preferredStartTime')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-golden outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Duration</label>
              <select value={form.durationMinutes} onChange={update('durationMinutes')} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-golden outline-none">
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea rows={2} value={form.notes} onChange={update('notes')} placeholder="Ideal times, occasion, constraints..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-golden outline-none resize-none" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="flex-1 bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50 text-sm">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Schedule Page ───────────────────────────────────────────────────────

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
  const [requestSuccess, setRequestSuccess] = useState(false)

  const todayKey = toDateKey(new Date().toISOString())

  useEffect(() => { fetchSlots() }, [])

  useEffect(() => {
    if (user?.email) return
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
    } catch (err) {
      console.error('Error fetching slots:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredSlots = slots.filter(s => filter === 'all' || s.type === filter)

  const slotsByDate = filteredSlots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const key = toDateKey(slot.start_time)
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})

  const availableDateKeys = Object.keys(slotsByDate).sort()

  useEffect(() => {
    if (!selectedDateKey && availableDateKeys.length > 0) {
      setSelectedDateKey(availableDateKeys[0])
    }
  }, [filter, availableDateKeys.length])

  const selectedDaySlots = selectedDateKey ? (slotsByDate[selectedDateKey] || []) : []

  // Calendar grid
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
  const startOffset = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()

  const dateTypeMap = filteredSlots.reduce<Record<string, { hasTraining: boolean; hasDiscovery: boolean }>>((acc, slot) => {
    const key = toDateKey(slot.start_time)
    if (!acc[key]) acc[key] = { hasTraining: false, hasDiscovery: false }
    if (slot.type === 'tour') acc[key].hasDiscovery = true
    if (slot.type === 'training') acc[key].hasTraining = true
    return acc
  }, {})

  const calendarDays = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const dateKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return { dateKey, day, ...( dateTypeMap[dateKey] || { hasTraining: false, hasDiscovery: false }) }
    }),
  ]

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golden" />
        <p className="text-gray-500 text-sm">Loading available slots...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <section className="relative py-12 sm:py-16 overflow-hidden bg-black">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url('/images/our-aircraft-header.jpg')` }} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-12 h-1 bg-golden mx-auto rounded-full mb-5" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Book Your <span className="bg-gradient-to-r from-golden via-yellow-400 to-golden bg-clip-text text-transparent">Flight</span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-xl mx-auto font-light">
            Pick a date, choose a time, and you're done. Secure checkout powered by Stripe.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><span className="text-golden">✓</span> Instant confirmation</span>
            <span className="flex items-center gap-1.5"><span className="text-golden">✓</span> Secure Stripe checkout</span>
            <span className="flex items-center gap-1.5"><span className="text-golden">✓</span> Republic Airport (FRG)</span>
          </div>
        </div>
      </section>

      {/* Success banner */}
      {requestSuccess && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3 text-center">
          <p className="text-green-800 text-sm font-medium">
            ✓ Request submitted! We'll review it and follow up within 24 hours.
            <button onClick={() => setRequestSuccess(false)} className="ml-3 text-green-600 underline text-xs">Dismiss</button>
          </p>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Filter tabs + sign-in notice */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
            {(['all', 'training', 'tour'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelectedDateKey(null) }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  filter === f ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:text-black hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'All Slots' : f === 'training' ? '🎓 Training' : '✈ Discovery'}
              </button>
            ))}
          </div>
          {!user && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>
                <Link href="/login" className="text-black font-semibold underline underline-offset-2">Sign in</Link>
                {' '}to book a slot
              </span>
            </div>
          )}
        </div>

        {filteredSlots.length === 0 ? (
          /* No slots at all */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">✈️</div>
            <h2 className="text-2xl font-bold text-black mb-2">No slots available right now</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              New slots are added regularly. Request a custom time and Isaac will confirm availability.
            </p>
            <button
              onClick={() => setRequestModalOpen(true)}
              className="px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition-colors"
            >
              Request a Custom Time
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">

            {/* ── Calendar panel ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">

              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                >
                  ‹
                </button>
                <h3 className="text-base font-bold text-black">
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                >
                  ›
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`blank-${i}`} />

                  const { dateKey, day: dayNum, hasTraining, hasDiscovery } = day as { dateKey: string; day: number; hasTraining: boolean; hasDiscovery: boolean }
                  const hasSlots = Boolean(slotsByDate[dateKey]?.length)
                  const isSelected = selectedDateKey === dateKey
                  const isToday = dateKey === todayKey

                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDateKey(dateKey)}
                      className={`relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm font-semibold transition-all ${
                        isSelected
                          ? 'bg-golden text-black shadow-md scale-105'
                          : hasSlots
                          ? 'bg-golden/15 text-black hover:bg-golden/30 border border-golden/30'
                          : 'text-gray-400 hover:bg-gray-50'
                      } ${isToday && !isSelected ? 'ring-2 ring-black ring-offset-1' : ''}`}
                    >
                      <span>{dayNum}</span>
                      {(hasTraining || hasDiscovery) && (
                        <span className="absolute bottom-1 flex gap-0.5">
                          {hasTraining && <span className="w-1 h-1 rounded-full bg-green-600" />}
                          {hasDiscovery && <span className="w-1 h-1 rounded-full bg-blue-600" />}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-golden/15 border border-golden/30 flex-shrink-0" />
                  <span>Available slots</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-600" /> Training</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Discovery</span>
                </div>
              </div>

              {/* Request custom time */}
              <button
                onClick={() => setRequestModalOpen(true)}
                className="w-full mt-4 px-4 py-2.5 border border-dashed border-gray-300 text-gray-500 text-sm font-medium rounded-xl hover:border-black hover:text-black transition-colors"
              >
                + Request a different time
              </button>
            </div>

            {/* ── Slots panel ── */}
            <div className="space-y-4">
              {selectedDateKey ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-black">{formatFullDate(selectedDateKey)}</h2>
                      <p className="text-gray-500 text-sm mt-0.5">
                        {selectedDaySlots.length > 0
                          ? `${selectedDaySlots.length} slot${selectedDaySlots.length > 1 ? 's' : ''} available`
                          : 'No slots on this day'}
                      </p>
                    </div>
                  </div>

                  {selectedDaySlots.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDaySlots.map(slot => {
                        const dur = durationMins(slot.start_time, slot.end_time)
                        const isDiscovery = slot.type === 'tour'
                        return (
                          <div
                            key={slot.id}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:border-golden hover:shadow-md transition-all group"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${
                                  isDiscovery ? 'bg-blue-50' : 'bg-green-50'
                                }`}>
                                  {isDiscovery ? '✈️' : '🎓'}
                                </div>
                                <div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mb-1 ${
                                    isDiscovery ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {isDiscovery ? 'Discovery Flight' : 'Training'}
                                  </span>
                                  <h3 className="font-bold text-black text-base">
                                    {slot.description || (isDiscovery ? 'Discovery Flight' : 'Flight Training Lesson')}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {formatDuration(dur)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      </svg>
                                      FRG · Republic Airport
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-2 sm:flex-shrink-0">
                                <div className="text-left sm:text-right">
                                  <p className="text-2xl font-bold text-black">${(slot.price / 100).toFixed(2)}</p>
                                  <p className="text-xs text-gray-400">+3.5% card fee</p>
                                </div>
                                {user ? (
                                  <button
                                    onClick={() => setSelectedSlot(slot)}
                                    className="px-5 py-2.5 bg-golden text-black font-bold rounded-xl hover:bg-yellow-500 transition-all hover:shadow-lg text-sm whitespace-nowrap group-hover:scale-105"
                                  >
                                    Book Slot →
                                  </button>
                                ) : (
                                  <Link
                                    href="/login"
                                    className="px-5 py-2.5 bg-black text-white font-bold rounded-xl hover:bg-gray-900 transition-all text-sm whitespace-nowrap"
                                  >
                                    Sign in to Book
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                      <div className="text-4xl mb-3">📅</div>
                      <h3 className="text-lg font-bold text-black mb-1">No slots on this day</h3>
                      <p className="text-gray-500 text-sm mb-5">Choose another highlighted date, or request a custom time.</p>
                      <button
                        onClick={() => setRequestModalOpen(true)}
                        className="px-5 py-2.5 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition-colors text-sm"
                      >
                        Request a Custom Time
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                  <div className="text-4xl mb-3">👈</div>
                  <h3 className="text-lg font-bold text-black mb-1">Pick a date</h3>
                  <p className="text-gray-500 text-sm">Select a highlighted date on the calendar to see available slots.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Modals */}
      {requestModalOpen && (
        <RequestModal
          defaultDate={selectedDateKey || ''}
          userEmail={user?.email || ''}
          onClose={() => setRequestModalOpen(false)}
          onSuccess={() => { setRequestModalOpen(false); setRequestSuccess(true) }}
        />
      )}

      {selectedSlot && user && (
        <BookingModal
          slot={selectedSlot}
          userId={user.id}
          userEmail={user.email}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  )
}

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golden" />
      </div>
    }>
      <SchedulePageContent />
    </Suspense>
  )
}
