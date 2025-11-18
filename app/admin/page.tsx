'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Slot, Booking } from '@/lib/supabase'

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings'>('slots')
  
  // New slot form
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [newSlot, setNewSlot] = useState({
    start_time: '',
    end_time: '',
    type: 'training' as 'training' | 'tour',
    price: '',
    description: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (!authLoading && user && !isAdmin) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (user && isAdmin) {
      fetchData()
    }
  }, [user, isAdmin])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [slotsData, bookingsData] = await Promise.all([
        supabase.from('slots').select('*').order('start_time', { ascending: true }),
        supabase.from('bookings').select('*, slots(*), profiles(full_name, phone)').order('created_at', { ascending: false })
      ])

      if (slotsData.data) setSlots(slotsData.data)
      if (bookingsData.data) setBookings(bookingsData.data as any)
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase.from('slots').insert([{
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        type: newSlot.type,
        price: parseInt(newSlot.price),
        description: newSlot.description || null
      }])

      if (error) throw error
      
      setShowAddSlot(false)
      setNewSlot({
        start_time: '',
        end_time: '',
        type: 'training',
        price: '',
        description: ''
      })
      fetchData()
    } catch (error) {
      console.error('Error creating slot:', error)
      alert('Failed to create slot')
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this slot?')) return

    try {
      const { error } = await supabase.from('slots').delete().eq('id', slotId)
      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error deleting slot:', error)
      alert('Failed to delete slot')
    }
  }

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error updating booking:', error)
      alert('Failed to update booking status')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-golden"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-darkText mb-8">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('slots')}
            className={`px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'slots'
                ? 'bg-golden text-darkText'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Manage Slots ({slots.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'bookings'
                ? 'bg-golden text-darkText'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            View Bookings ({bookings.length})
          </button>
        </div>

        {/* Slots Tab */}
        {activeTab === 'slots' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setShowAddSlot(!showAddSlot)}
                className="px-6 py-3 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
              >
                {showAddSlot ? 'Cancel' : 'Add New Slot'}
              </button>
            </div>

            {showAddSlot && (
              <form onSubmit={handleCreateSlot} className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-2xl font-bold text-darkText mb-4">Create New Slot</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newSlot.start_time}
                      onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newSlot.end_time}
                      onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      required
                      value={newSlot.type}
                      onChange={(e) => setNewSlot({ ...newSlot, type: e.target.value as 'training' | 'tour' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    >
                      <option value="training">Flight Training</option>
                      <option value="tour">NYC Tour</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (in cents)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="9900 = $99.00"
                      value={newSlot.price}
                      onChange={(e) => setNewSlot({ ...newSlot, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Introductory Flight Lesson"
                      value={newSlot.description}
                      onChange={(e) => setNewSlot({ ...newSlot, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 px-6 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
                >
                  Create Slot
                </button>
              </form>
            )}

            {/* Slots List */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot) => (
                <div key={slot.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      slot.type === 'tour' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {slot.type === 'tour' ? 'Tour' : 'Training'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      slot.is_booked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {slot.is_booked ? 'Booked' : 'Available'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {new Date(slot.start_time).toLocaleString()}
                  </p>
                  <p className="text-lg font-bold text-darkText mb-2">
                    ${(slot.price / 100).toFixed(2)}
                  </p>
                  {slot.description && (
                    <p className="text-sm text-gray-600 mb-2">{slot.description}</p>
                  )}
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="text-red-600 text-sm hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div>
            <div className="space-y-4">
              {bookings.map((booking: any) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-darkText mb-1">
                        {booking.slots?.type === 'tour' ? 'NYC Tour' : 'Flight Training'}
                      </h3>
                      {booking.profiles?.full_name && (
                        <p className="text-gray-600">Customer: {booking.profiles.full_name}</p>
                      )}
                      {booking.profiles?.phone && (
                        <p className="text-gray-600">Phone: {booking.profiles.phone}</p>
                      )}
                    </div>
                    <select
                      value={booking.status}
                      onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                  {booking.slots && (
                    <div className="text-sm text-gray-600">
                      <p>Date: {new Date(booking.slots.start_time).toLocaleString()}</p>
                      <p>Price: ${(booking.slots.price / 100).toFixed(2)}</p>
                    </div>
                  )}
                  {booking.notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Notes: {booking.notes}</p>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    Booked: {new Date(booking.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
