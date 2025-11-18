'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Slot } from '@/lib/supabase'

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'training' | 'tour'>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

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

  const handleBook = async (slot: Slot) => {
    if (!user) return

    try {
      // For paid slots, create Stripe checkout
      if (slot.price > 0) {
        const response = await fetch('/.netlify/functions/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slotId: slot.id,
            userId: user.id,
            successUrl: `${window.location.origin}/booking/success`,
            cancelUrl: `${window.location.origin}/schedule`
          })
        })

        const { url } = await response.json()
        if (url) {
          window.location.href = url
        }
      } else {
        // Free booking
        const response = await fetch('/.netlify/functions/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slotId: slot.id,
            userId: user.id,
            notes: 'Free introductory lesson'
          })
        })

        if (response.ok) {
          alert('Booking confirmed! Check your email for details.')
          fetchSlots() // Refresh slots
        }
      }
    } catch (error) {
      console.error('Booking error:', error)
      alert('Failed to create booking. Please try again.')
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
    </div>
  )
}
