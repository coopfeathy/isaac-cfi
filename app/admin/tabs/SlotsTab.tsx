'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Slot } from '@/lib/supabase'
import Link from 'next/link'

type SlotRequest = {
  id: string
  user_id: string | null
  full_name: string
  email: string
  phone: string
  preferred_start_time: string
  preferred_end_time: string
  notes: string | null
  source: string | null
  status: 'pending' | 'approved' | 'denied'
  decision_notes: string | null
  approved_slot_id: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

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

export default function SlotsTab() {
  const searchParams = useSearchParams()
  const requestIdParam = searchParams.get('requestId')

  const [slots, setSlots] = useState<Slot[]>([])
  const [slotRequests, setSlotRequests] = useState<SlotRequest[]>([])
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)
  const [classAppointments, setClassAppointments] = useState<ClassAppointment[]>([])
  const [classGroups, setClassGroups] = useState<Array<{ id: string; name: string }>>([])
  const [classInstructors, setClassInstructors] = useState<Array<{ id: string; full_name: string | null }>>([])
  const [showClassForm, setShowClassForm] = useState(false)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [classSaving, setClassSaving] = useState(false)
  const [classMessage, setClassMessage] = useState<string | null>(null)
  const [classForm, setClassForm] = useState({
    groupId: '',
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    meetingLink: '',
    instructorId: '',
    maxSeats: '',
  })
  const [slotTypeFilter, setSlotTypeFilter] = useState<'all' | 'training' | 'tour' | 'custom'>('all')
  const [slotStatusFilter, setSlotStatusFilter] = useState<'all' | 'available' | 'booked'>('all')
  const [slotDateFilter, setSlotDateFilter] = useState('')
  const [slotMonthFilter, setSlotMonthFilter] = useState('')
  const [slotStartDateFilter, setSlotStartDateFilter] = useState('')
  const [slotEndDateFilter, setSlotEndDateFilter] = useState('')
  const [generatingSlots, setGeneratingSlots] = useState(false)
  const [generateSlotsResult, setGenerateSlotsResult] = useState<string | null>(null)
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)
  const [newSlot, setNewSlot] = useState({
    date: '',
    startTime: '',
    duration: '60',
    type: 'training',
    customType: '',
    price: '',
    description: ''
  })

  useEffect(() => {
    fetchData()
    fetchSlotRequests()
  }, [])

  useEffect(() => {
    if (!requestIdParam || slotRequests.length === 0) return
    const el = document.getElementById(`slot-request-${requestIdParam}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [slotRequests, requestIdParam])

  const fetchData = async () => {
    try {
      const [slotsData, classAppointmentsData, classGroupsData, classInstructorsData] = await Promise.all([
        supabase.from('slots').select('*').order('start_time', { ascending: true }),
        supabase
          .from('class_appointments')
          .select('id, group_id, title, description, start_time, end_time, location, meeting_link, instructor_id, max_seats, is_canceled, cancel_reason, created_at, groups(name), class_appointment_attendees(user_id, status)')
          .order('start_time', { ascending: true }),
        supabase.from('groups').select('id, name').order('name', { ascending: true }),
        supabase.from('profiles').select('id, full_name').eq('is_instructor', true).order('full_name', { ascending: true }),
      ])

      const instructorNameById = new Map(
        ((classInstructorsData.data || []) as Array<{ id: string; full_name: string | null }>).map((instructor) => [
          instructor.id,
          instructor.full_name,
        ])
      )

      if (slotsData.data) {
        setSlots(slotsData.data)
      }

      if (!classAppointmentsData.error) {
        const normalizedClassAppointments = ((classAppointmentsData.data || []) as any[]).map((row) => ({
          ...row,
          groups: Array.isArray(row.groups) ? row.groups[0] || null : row.groups,
          profiles: row.instructor_id
            ? { full_name: instructorNameById.get(row.instructor_id) || null }
            : null,
          class_appointment_attendees: Array.isArray(row.class_appointment_attendees)
            ? row.class_appointment_attendees
            : [],
        }))
        setClassAppointments(normalizedClassAppointments as ClassAppointment[])
      } else if ((classAppointmentsData.error as any)?.code === '42P01') {
        setClassAppointments([])
      } else {
        console.error('Error loading class appointments:', classAppointmentsData.error)
      }

      if (!classGroupsData.error) {
        setClassGroups((classGroupsData.data || []) as Array<{ id: string; name: string }>)
      }

      if (!classInstructorsData.error) {
        setClassInstructors((classInstructorsData.data || []) as Array<{ id: string; full_name: string | null }>)
      }
    } catch (error) {
      console.error('Error fetching slots data:', error)
    }
  }

  const fetchSlotRequests = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) return

      const response = await fetch('/api/admin/slot-requests', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json().catch(() => null)
      if (!response.ok || !result) {
        throw new Error(result?.error || 'Failed to load slot requests')
      }

      setSlotRequests(result.requests || [])
    } catch (error) {
      console.error('Error fetching slot requests:', error)
    }
  }

  const handleGenerateDiscoverySlots = async () => {
    setGeneratingSlots(true)
    setGenerateSlotsResult(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Unauthorized')
      }

      const res = await fetch('/api/admin/generate-discovery-slots', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate slots')
      setGenerateSlotsResult(data.message)
      await fetchData()
    } catch (err) {
      setGenerateSlotsResult(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGeneratingSlots(false)
    }
  }

  const toDateInput = (iso: string) => new Date(iso).toISOString().slice(0, 10)
  const toTimeInput = (iso: string) => new Date(iso).toISOString().slice(11, 16)

  const resetClassForm = () => {
    setEditingClassId(null)
    setShowClassForm(false)
    setClassForm({
      groupId: '',
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      meetingLink: '',
      instructorId: '',
      maxSeats: '',
    })
  }

  const handleEditClassAppointment = (appointment: ClassAppointment) => {
    setEditingClassId(appointment.id)
    setShowClassForm(true)
    setClassMessage(null)
    setClassForm({
      groupId: appointment.group_id,
      title: appointment.title,
      description: appointment.description || '',
      date: toDateInput(appointment.start_time),
      startTime: toTimeInput(appointment.start_time),
      endTime: toTimeInput(appointment.end_time),
      location: appointment.location || '',
      meetingLink: appointment.meeting_link || '',
      instructorId: appointment.instructor_id || '',
      maxSeats: appointment.max_seats ? String(appointment.max_seats) : '',
    })
  }

  const handleSaveClassAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setClassMessage(null)

    if (!classForm.groupId || !classForm.title || !classForm.date || !classForm.startTime || !classForm.endTime) {
      setClassMessage('Group, title, date, start time, and end time are required.')
      return
    }

    const startTimeIso = new Date(`${classForm.date}T${classForm.startTime}:00`).toISOString()
    const endTimeIso = new Date(`${classForm.date}T${classForm.endTime}:00`).toISOString()

    if (new Date(endTimeIso).getTime() <= new Date(startTimeIso).getTime()) {
      setClassMessage('End time must be after start time.')
      return
    }

    setClassSaving(true)
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      const payload = {
        group_id: classForm.groupId,
        title: classForm.title,
        description: classForm.description || null,
        start_time: startTimeIso,
        end_time: endTimeIso,
        location: classForm.location || null,
        meeting_link: classForm.meetingLink || null,
        instructor_id: classForm.instructorId || null,
        max_seats: classForm.maxSeats ? Number(classForm.maxSeats) : null,
        created_by: authUser?.id || null,
        updated_at: new Date().toISOString(),
      }

      if (editingClassId) {
        const { error } = await supabase
          .from('class_appointments')
          .update(payload)
          .eq('id', editingClassId)

        if (error) throw error
        setClassMessage('Class appointment updated.')
      } else {
        const { data: created, error } = await supabase
          .from('class_appointments')
          .insert([payload])
          .select('id, group_id')
          .single()

        if (error) throw error

        const { data: members, error: membersError } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', created.group_id)

        if (membersError) throw membersError

        if ((members || []).length > 0) {
          const attendeeRows = (members || []).map((member: { user_id: string }) => ({
            class_appointment_id: created.id,
            user_id: member.user_id,
            status: 'invited',
          }))

          const { error: attendeeError } = await supabase
            .from('class_appointment_attendees')
            .upsert(attendeeRows, { onConflict: 'class_appointment_id,user_id' })

          if (attendeeError) {
            console.error('Error adding class attendees:', attendeeError)
          }
        }

        setClassMessage('Class appointment created and group members invited.')
      }

      await fetchData()
      resetClassForm()
    } catch (error: any) {
      setClassMessage(error?.message || 'Failed to save class appointment.')
    } finally {
      setClassSaving(false)
    }
  }

  const handleCancelClassAppointment = async (id: string) => {
    const cancelReason = prompt('Optional cancellation reason:') || ''
    try {
      const { error } = await supabase
        .from('class_appointments')
        .update({ is_canceled: true, cancel_reason: cancelReason || null, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error canceling class appointment:', error)
      alert('Failed to cancel class appointment')
    }
  }

  const handleDeleteClassAppointment = async (id: string) => {
    if (!confirm('Delete this class appointment?')) return
    try {
      const { error } = await supabase.from('class_appointments').delete().eq('id', id)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting class appointment:', error)
      alert('Failed to delete class appointment')
    }
  }

  const filteredAdminSlots = slots.filter((slot) => {
    const slotDate = new Date(slot.start_time)
    const slotDateKey = slotDate.toISOString().split('T')[0]
    const slotMonthKey = slotDateKey.slice(0, 7)

    const matchesType =
      slotTypeFilter === 'all'
        ? true
        : slotTypeFilter === 'custom'
          ? slot.type !== 'training' && slot.type !== 'tour'
          : slot.type === slotTypeFilter

    const matchesStatus =
      slotStatusFilter === 'all'
        ? true
        : slotStatusFilter === 'available'
          ? !slot.is_booked
          : slot.is_booked

    const matchesDate = slotDateFilter ? slotDateKey === slotDateFilter : true
    const matchesMonth = slotMonthFilter ? slotMonthKey === slotMonthFilter : true
    const matchesStartDate = slotStartDateFilter ? slotDateKey >= slotStartDateFilter : true
    const matchesEndDate = slotEndDateFilter ? slotDateKey <= slotEndDateFilter : true

    return matchesType && matchesStatus && matchesDate && matchesMonth && matchesStartDate && matchesEndDate
  })

  const handleApplyThisWeekFilter = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - dayOfWeek)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    setSlotDateFilter('')
    setSlotMonthFilter('')
    setSlotStartDateFilter(start.toISOString().split('T')[0])
    setSlotEndDateFilter(end.toISOString().split('T')[0])
  }

  const handleApplyThisMonthFilter = () => {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    setSlotDateFilter('')
    setSlotMonthFilter(monthKey)
    setSlotStartDateFilter('')
    setSlotEndDateFilter('')
  }

  const handleApplyOnlyFutureAvailableFilter = () => {
    const todayKey = new Date().toISOString().split('T')[0]

    setSlotStatusFilter('available')
    setSlotDateFilter('')
    setSlotMonthFilter('')
    setSlotStartDateFilter(todayKey)
    setSlotEndDateFilter('')
  }

  const handleBulkDeleteSlots = async (scope: 'all' | 'filtered' | 'available') => {
    const targetSlots =
      scope === 'all'
        ? slots
        : scope === 'filtered'
          ? filteredAdminSlots
          : filteredAdminSlots.filter((slot) => !slot.is_booked)

    if (targetSlots.length === 0) {
      alert(
        scope === 'available'
          ? 'No available slots to delete in the current filter.'
          : `No ${scope === 'all' ? '' : 'filtered '}slots to delete.`,
      )
      return
    }

    const confirmMessage =
      scope === 'all'
        ? `Delete all ${targetSlots.length} slots? This cannot be undone.`
        : scope === 'filtered'
          ? `Delete ${targetSlots.length} filtered slots? This cannot be undone.`
          : `Delete ${targetSlots.length} available slots from the current filter? This cannot be undone.`

    if (!confirm(confirmMessage)) return

    try {
      const slotIds = targetSlots.map((slot) => slot.id)
      const { error } = await supabase.from('slots').delete().in('id', slotIds)
      if (error) throw error
      const statusMessage =
        scope === 'all'
          ? 'All slots deleted successfully.'
          : scope === 'filtered'
            ? 'Filtered slots deleted successfully.'
            : 'Available slots deleted successfully.'

      setGenerateSlotsResult(statusMessage)
      await fetchData()
      await fetchSlotRequests()
    } catch (error) {
      console.error('Error deleting slots:', error)
      alert(`Failed to delete ${scope} slots`)
    }
  }

  const handleEditSlot = (slot: Slot) => {
    const start = new Date(slot.start_time)
    const end = new Date(slot.end_time)
    const durationMinutes = Math.max(30, Math.round((end.getTime() - start.getTime()) / 60000))

    setEditingSlotId(slot.id)
    setShowAddSlot(true)
    setNewSlot({
      date: start.toISOString().split('T')[0],
      startTime: start.toISOString().slice(11, 16),
      duration: String(durationMinutes),
      type: slot.type === 'training' || slot.type === 'tour' ? slot.type : 'custom',
      customType: slot.type === 'training' || slot.type === 'tour' ? '' : slot.type,
      price: String(slot.price),
      description: slot.description || '',
    })
  }

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const slotType = newSlot.customType.trim() || newSlot.type
      const startDateTime = new Date(`${newSlot.date}T${newSlot.startTime}`)
      const endDateTime = new Date(startDateTime.getTime() + parseInt(newSlot.duration) * 60 * 1000)

      const payload = {
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        type: slotType,
        price: parseInt(newSlot.price),
        description: newSlot.description || null,
      }

      const { error } = editingSlotId
        ? await supabase.from('slots').update(payload).eq('id', editingSlotId)
        : await supabase.from('slots').insert([payload])

      if (error) throw error

      setShowAddSlot(false)
      setEditingSlotId(null)
      setNewSlot({
        date: '',
        startTime: '',
        duration: '60',
        type: 'training',
        customType: '',
        price: '',
        description: ''
      })
      fetchData()
      fetchSlotRequests()
    } catch (error) {
      console.error('Error saving slot:', error)
      alert(`Failed to ${editingSlotId ? 'update' : 'create'} slot`)
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

  const handleReviewSlotRequest = async (requestId: string, action: 'approve' | 'deny') => {
    try {
      setProcessingRequestId(requestId)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error('Missing admin session')

      const response = await fetch('/api/admin/slot-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ requestId, action }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process request')
      }

      await Promise.all([fetchSlotRequests(), fetchData()])
    } catch (error) {
      console.error('Error reviewing slot request:', error)
      alert(error instanceof Error ? error.message : 'Failed to process slot request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const pendingSlotRequestCount = slotRequests.filter((request) => request.status === 'pending').length

  return (
    <div>
      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-2xl font-bold text-darkText">Group Class Appointments</h3>
            <p className="text-sm text-gray-600">Create and manage class appointments for groups.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showClassForm) {
                resetClassForm()
              } else {
                setShowClassForm(true)
                setClassMessage(null)
              }
            }}
            className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-amber-300"
          >
            {showClassForm ? 'Close Form' : 'Add Class Appointment'}
          </button>
        </div>

        {showClassForm && (
          <form onSubmit={handleSaveClassAppointment} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group *</label>
                <select
                  required
                  value={classForm.groupId}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, groupId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select group</option>
                  {classGroups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructor</label>
                <select
                  value={classForm.instructorId}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, instructorId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Unassigned</option>
                  {classInstructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>{instructor.full_name || 'Unnamed Instructor'}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  required
                  value={classForm.title}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  required
                  value={classForm.date}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start *</label>
                  <input
                    type="time"
                    required
                    value={classForm.startTime}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End *</label>
                  <input
                    type="time"
                    required
                    value={classForm.endTime}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  value={classForm.location}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Link</label>
                <input
                  value={classForm.meetingLink}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, meetingLink: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Seats</label>
                <input
                  type="number"
                  min={1}
                  value={classForm.maxSeats}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, maxSeats: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={classForm.description}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={classSaving}
                className="px-5 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {classSaving ? 'Saving...' : editingClassId ? 'Update Class Appointment' : 'Create Class Appointment'}
              </button>
              {editingClassId && (
                <button
                  type="button"
                  onClick={resetClassForm}
                  className="px-5 py-2 border border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-100"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {classMessage && (
              <p className={`mt-3 text-sm ${classMessage.toLowerCase().includes('failed') ? 'text-red-600' : 'text-gray-700'}`}>
                {classMessage}
              </p>
            )}
          </form>
        )}

        {classAppointments.length === 0 ? (
          <p className="text-sm text-gray-500">No class appointments created yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {classAppointments.map((appointment) => {
              const attendees = appointment.class_appointment_attendees || []
              const confirmed = attendees.filter((entry) => entry.status === 'confirmed' || entry.status === 'attended').length
              const invited = attendees.filter((entry) => entry.status === 'invited').length
              return (
                <div key={appointment.id} className={`rounded-lg border p-4 ${appointment.is_canceled ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-semibold text-darkText">{appointment.title}</p>
                      <p className="text-sm text-gray-600">{appointment.groups?.name || 'Unknown Group'}</p>
                      <p className="text-sm text-gray-600 mt-1">{new Date(appointment.start_time).toLocaleString()} - {new Date(appointment.end_time).toLocaleTimeString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${appointment.is_canceled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {appointment.is_canceled ? 'Canceled' : 'Scheduled'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    <p>Instructor: {appointment.profiles?.full_name || 'Unassigned'}</p>
                    <p>Attendance: {confirmed} confirmed, {invited} invited</p>
                    {appointment.max_seats ? <p>Seats: {confirmed}/{appointment.max_seats}</p> : null}
                    {appointment.cancel_reason ? <p className="text-red-700">Reason: {appointment.cancel_reason}</p> : null}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button onClick={() => handleEditClassAppointment(appointment)} className="text-blue-600 text-sm hover:text-blue-800">Edit</button>
                    {!appointment.is_canceled && (
                      <button onClick={() => handleCancelClassAppointment(appointment.id)} className="text-amber-700 text-sm hover:text-amber-900">Cancel</button>
                    )}
                    <button onClick={() => handleDeleteClassAppointment(appointment.id)} className="text-red-600 text-sm hover:text-red-800">Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h3 className="text-2xl font-bold text-darkText mb-3">Requested Discovery Flight Slots</h3>
        <div className="mb-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
            Pending: {pendingSlotRequestCount}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">Approve to create a new available slot or deny if the request cannot be accommodated.</p>
        {slotRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-sm text-gray-500">No slot requests yet.</div>
        ) : (
          <div className="space-y-3">
            {slotRequests.map((request) => (
              <div
                key={request.id}
                id={`slot-request-${request.id}`}
                className={`bg-white rounded-lg shadow-md p-4 border ${requestIdParam === request.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-darkText">{request.full_name} • {request.email}</p>
                    <p className="text-sm text-gray-600">{request.phone}</p>
                    <p className="text-sm text-gray-700 mt-2">
                      Requested: {new Date(request.preferred_start_time).toLocaleString()} - {new Date(request.preferred_end_time).toLocaleTimeString()}
                    </p>
                    {request.notes && <p className="text-sm text-gray-600 mt-1">Notes: {request.notes}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      request.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : request.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleReviewSlotRequest(request.id, 'approve')}
                          disabled={processingRequestId === request.id}
                          className="px-3 py-2 text-sm font-semibold bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewSlotRequest(request.id, 'deny')}
                          disabled={processingRequestId === request.id}
                          className="px-3 py-2 text-sm font-semibold bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
                        >
                          Deny
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowAddSlot(!showAddSlot)}
          className="px-6 py-3 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
        >
          {showAddSlot ? 'Cancel' : 'Add New Slot'}
        </button>
        <button
          onClick={handleGenerateDiscoverySlots}
          disabled={generatingSlots}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generatingSlots ? 'Generating...' : 'Generate Discovery Slots'}
        </button>
        <button
          onClick={() => handleBulkDeleteSlots('filtered')}
          disabled={filteredAdminSlots.length === 0}
          className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          Delete Filtered Slots
        </button>
        <button
          onClick={() => handleBulkDeleteSlots('available')}
          disabled={filteredAdminSlots.filter((slot) => !slot.is_booked).length === 0}
          className="px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          Delete Available Slots
        </button>
        <button
          onClick={() => handleBulkDeleteSlots('all')}
          disabled={slots.length === 0}
          className="px-6 py-3 bg-red-900 text-white font-bold rounded-lg hover:bg-red-950 disabled:opacity-50"
        >
          Delete All Slots
        </button>
        <Link href="/schedule" className="px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100">
          Open Customer Schedule
        </Link>
        <Link href="/bookings" className="px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100">
          Open Customer Bookings
        </Link>
      </div>

      {generateSlotsResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          generateSlotsResult.toLowerCase().includes('error') || generateSlotsResult.toLowerCase().includes('failed')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {generateSlotsResult}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleApplyThisWeekFilter}
            className="px-3 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
          >
            This Week
          </button>
          <button
            onClick={handleApplyThisMonthFilter}
            className="px-3 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
          >
            This Month
          </button>
          <button
            onClick={handleApplyOnlyFutureAvailableFilter}
            className="px-3 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
          >
            Only Future Available
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={slotTypeFilter}
              onChange={(e) => setSlotTypeFilter(e.target.value as 'all' | 'training' | 'tour' | 'custom')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
            >
              <option value="all">All Types</option>
              <option value="training">Training</option>
              <option value="tour">Discovery Flight</option>
              <option value="custom">Custom Types</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={slotStatusFilter}
              onChange={(e) => setSlotStatusFilter(e.target.value as 'all' | 'available' | 'booked')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="booked">Booked</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <input
              type="month"
              value={slotMonthFilter}
              onChange={(e) => setSlotMonthFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={slotStartDateFilter}
              onChange={(e) => setSlotStartDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={slotEndDateFilter}
              onChange={(e) => setSlotEndDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={slotDateFilter}
              onChange={(e) => setSlotDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
            />
          </div>
          <div>
            <button
              onClick={() => {
                setSlotTypeFilter('all')
                setSlotStatusFilter('all')
                setSlotMonthFilter('')
                setSlotStartDateFilter('')
                setSlotEndDateFilter('')
                setSlotDateFilter('')
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Showing {filteredAdminSlots.length} of {slots.length} slots.
        </p>
      </div>

      {showAddSlot && (
        <form onSubmit={handleCreateSlot} className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-darkText mb-4">{editingSlotId ? 'Edit Slot' : 'Create New Slot'}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                required
                value={newSlot.date}
                onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input
                type="time"
                required
                value={newSlot.startTime}
                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
              <select
                required
                value={newSlot.duration}
                onChange={(e) => setNewSlot({ ...newSlot, duration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={newSlot.type}
                onChange={(e) => setNewSlot({ ...newSlot, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
              >
                <option value="training">Flight Training</option>
                <option value="tour">Discovery Flight</option>
                <option value="custom">Custom Type</option>
              </select>
            </div>
            {newSlot.type === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Type Name</label>
                <input
                  type="text"
                  placeholder="e.g., Discovery Flight, BFR, IPC"
                  value={newSlot.customType}
                  onChange={(e) => setNewSlot({ ...newSlot, customType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                  required={newSlot.type === 'custom'}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price (in cents)</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
              <input
                type="text"
                placeholder="e.g., Introductory Flight Lesson"
                value={newSlot.description}
                onChange={(e) => setNewSlot({ ...newSlot, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="submit" className="px-6 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90">
              {editingSlotId ? 'Update Slot' : 'Create Slot'}
            </button>
            {editingSlotId && (
              <button
                type="button"
                onClick={() => {
                  setEditingSlotId(null)
                  setShowAddSlot(false)
                  setNewSlot({ date: '', startTime: '', duration: '60', type: 'training', customType: '', price: '', description: '' })
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {filteredAdminSlots.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">No slots match the current filters.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdminSlots.map((slot) => (
            <div key={slot.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  slot.type === 'tour' ? 'bg-blue-100 text-blue-800' : slot.type === 'training' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {slot.type === 'tour' ? 'Discovery Flight' : slot.type === 'training' ? 'Training' : slot.type}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  slot.is_booked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {slot.is_booked ? 'Booked' : 'Available'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{new Date(slot.start_time).toLocaleString()}</p>
              <p className="text-lg font-bold text-darkText mb-2">${(slot.price / 100).toFixed(2)}</p>
              {slot.description && <p className="text-sm text-gray-600 mb-2">{slot.description}</p>}
              <div className="flex items-center gap-3">
                <a
                  href={`/api/calendar/booking-ics?slot_id=${encodeURIComponent(slot.id)}`}
                  className="text-sm text-gray-700 hover:text-black underline"
                >
                  Download .ics
                </a>
                <button onClick={() => handleEditSlot(slot)} className="text-blue-600 text-sm hover:text-blue-800">
                  Edit
                </button>
                <button onClick={() => handleDeleteSlot(slot.id)} className="text-red-600 text-sm hover:text-red-800">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
