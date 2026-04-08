'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking } from '@/lib/supabase'
import AdminBookingPlanner from '@/app/components/AdminBookingPlanner'

type ClassAppointment = {
  id: string
  group_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  meeting_link: string | null
  instructor_id: string | null
  max_seats: number | null
  is_canceled: boolean
  cancel_reason: string | null
  created_at: string
  groups?: { name: string } | null
  profiles?: { full_name: string | null } | null
  class_appointment_attendees?: Array<{ user_id: string; status: 'invited' | 'confirmed' | 'declined' | 'attended' | 'no_show' }>
}

export default function BookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [classAppointments, setClassAppointments] = useState<ClassAppointment[]>([])
  const [slots, setSlots] = useState<any[]>([])

  useEffect(() => {
    fetchBookingsData()
  }, [])

  const fetchBookingsData = async () => {
    try {
      const [slotsData, bookingsData, classAppointmentsData, classInstructorsData] = await Promise.all([
        supabase.from('slots').select('*').order('start_time', { ascending: true }),
        supabase.from('bookings').select('*, slots(*)').order('created_at', { ascending: false }),
        supabase
          .from('class_appointments')
          .select('id, group_id, title, description, start_time, end_time, location, meeting_link, instructor_id, max_seats, is_canceled, cancel_reason, created_at, groups(name), class_appointment_attendees(user_id, status)')
          .order('start_time', { ascending: true }),
        supabase.from('profiles').select('id, full_name').eq('is_instructor', true).order('full_name', { ascending: true }),
      ])

      const instructorNameById = new Map(
        ((classInstructorsData.data || []) as Array<{ id: string; full_name: string | null }>).map((instructor) => [
          instructor.id,
          instructor.full_name,
        ])
      )

      if (slotsData.data) setSlots(slotsData.data)
      if (bookingsData.data) setBookings(bookingsData.data as any)

      if (!classAppointmentsData.error) {
        const normalized = ((classAppointmentsData.data || []) as any[]).map((row) => ({
          ...row,
          groups: Array.isArray(row.groups) ? row.groups[0] || null : row.groups,
          profiles: row.instructor_id
            ? { full_name: instructorNameById.get(row.instructor_id) || null }
            : null,
          class_appointment_attendees: Array.isArray(row.class_appointment_attendees)
            ? row.class_appointment_attendees
            : [],
        }))
        setClassAppointments(normalized as ClassAppointment[])
      } else if ((classAppointmentsData.error as any)?.code === '42P01') {
        setClassAppointments([])
      } else {
        console.error('Error loading class appointments:', classAppointmentsData.error)
      }
    } catch (error) {
      console.error('Error fetching bookings data:', error)
    }
  }

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) throw error
      fetchBookingsData()
    } catch (error) {
      console.error('Error updating booking:', error)
      alert('Failed to update booking status')
    }
  }

  return (
    <div className="space-y-4">
      <AdminBookingPlanner slots={slots} onCreated={fetchBookingsData} />

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-darkText mb-2">Class Appointment Attendance</h3>
        <p className="text-sm text-gray-600 mb-4">Live attendance and invitation status for group class appointments.</p>
        {classAppointments.length === 0 ? (
          <p className="text-sm text-gray-500">No class appointment records yet.</p>
        ) : (
          <div className="space-y-3">
            {classAppointments.slice(0, 8).map((appointment) => {
              const attendees = appointment.class_appointment_attendees || []
              const invited = attendees.filter((entry) => entry.status === 'invited').length
              const confirmed = attendees.filter((entry) => entry.status === 'confirmed' || entry.status === 'attended').length
              const declined = attendees.filter((entry) => entry.status === 'declined').length
              return (
                <div key={`booking-view-${appointment.id}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold text-darkText">{appointment.title}</p>
                      <p className="text-sm text-gray-600">{appointment.groups?.name || 'Unknown Group'} • {new Date(appointment.start_time).toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${appointment.is_canceled ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {appointment.is_canceled ? 'Canceled' : 'Active'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    <p>Confirmed: {confirmed} | Invited: {invited} | Declined: {declined}</p>
                    {appointment.max_seats ? <p>Capacity: {confirmed}/{appointment.max_seats}</p> : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {bookings.map((booking: any) => (
        <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-darkText mb-1">
                {booking.slots?.type === 'tour' ? 'Discovery Flight' : 'Flight Training'}
              </h3>
              {booking.user_id && <p className="text-gray-600">Customer ID: {booking.user_id}</p>}
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
          {booking.notes && <div className="mt-2 p-2 bg-gray-50 rounded"><p className="text-sm text-gray-600">Notes: {booking.notes}</p></div>}
          <div className="mt-2 text-xs text-gray-500">Booked: {new Date(booking.created_at).toLocaleString()}</div>
          {(booking.slot_id || booking.slots?.id) && (
            <div className="mt-3">
              <a
                href={`/api/calendar/booking-ics?slot_id=${encodeURIComponent(booking.slot_id ? booking.slot_id : booking.slots?.id || '')}`}
                className="inline-block px-3 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              >
                Add to Apple Calendar (.ics)
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
