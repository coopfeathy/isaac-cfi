'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Flight {
  id: string
  date: string
  time: string
  instructor_id?: string
  aircraft_id?: string
  student_id?: string
  duration_minutes?: number
  notes?: string
  profiles?: { full_name: string | null }
  instructors?: { full_name: string | null }
  aircraft_records?: { tail_number: string }
  created_at?: string
}

function AddFlightModal({ isOpen, onClose, onAdd, users, instructors, aircraft }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: () => void;
  users: any[];
  instructors: any[];
  aircraft: any[];
}) {
  const [formData, setFormData] = useState({ date: '', time: '', student_id: '', instructor_id: '', aircraft_id: '', duration_minutes: '60', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.date || !formData.time) throw new Error('Date and time are required')

      const { error } = await supabase
        .from('flights')
        .insert([{
          date: formData.date,
          time: formData.time,
          student_id: formData.student_id || null,
          instructor_id: formData.instructor_id || null,
          aircraft_id: formData.aircraft_id || null,
          duration_minutes: parseInt(formData.duration_minutes),
          notes: formData.notes || null,
        }])

      if (error) throw new Error(error.message)

      onAdd()
      setFormData({ date: '', time: '', student_id: '', instructor_id: '', aircraft_id: '', duration_minutes: '60', notes: '' })
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '600px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Schedule Flight</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Date *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Time *</label>
            <input
              type="time"
              required
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Student</label>
              <select
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              >
                <option value="">Select student...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.full_name || 'Unnamed'}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Instructor</label>
              <select
                value={formData.instructor_id}
                onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              >
                <option value="">Select instructor...</option>
                {instructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.full_name || 'Unnamed'}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Aircraft</label>
              <select
                value={formData.aircraft_id}
                onChange={(e) => setFormData({ ...formData, aircraft_id: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              >
                <option value="">Select aircraft...</option>
                {aircraft.map((plane) => (
                  <option key={plane.id} value={plane.id}>{plane.tail_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Duration (minutes)</label>
              <input
                type="number"
                min="15"
                step="15"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px', fontFamily: 'inherit' }}
            />
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 20px', backgroundColor: '#C59A2A', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, border: 'none' }}
            >
              {loading ? 'Scheduling...' : 'Schedule Flight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SchedulePage() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [aircraft, setAircraft] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    Promise.all([loadFlights(), loadUsers(), loadInstructors(), loadAircraft()])
  }, [])

  async function loadFlights() {
    try {
      const { data, error } = await supabase
        .from('flights')
        .select('*, profiles:student_id(full_name), instructors:instructor_id(full_name), aircraft_records:aircraft_id(tail_number)')
        .order('date', { ascending: false })
      
      if (error) throw error
      setFlights(data || [])
    } catch (err) {
      console.error('Error loading flights:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true })
      
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  async function loadInstructors() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_instructor', true)
        .order('full_name', { ascending: true })
      
      if (error) throw error
      setInstructors(data || [])
    } catch (err) {
      console.error('Error loading instructors:', err)
    }
  }

  async function loadAircraft() {
    try {
      const { data, error } = await supabase
        .from('aircraft')
        .select('id, tail_number')
        .order('tail_number', { ascending: true })
      
      if (error) throw error
      setAircraft(data || [])
    } catch (err) {
      console.error('Error loading aircraft:', err)
    }
  }

  const handleDeleteFlight = async (flightId: string) => {
    if (!confirm('Are you sure you want to cancel this flight?')) return

    try {
      const { error } = await supabase
        .from('flights')
        .delete()
        .eq('id', flightId)

      if (error) throw error
      await loadFlights()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>Schedule</h1>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            style={{ backgroundColor: '#C59A2A', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Schedule Flight
          </button>
        </div>
      </div>
      
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Loading schedule...</div>
        ) : flights.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No flights scheduled. <br /><a href="#" onClick={() => setIsAddModalOpen(true)} style={{ color: '#C59A2A' }}>Schedule your first flight</a></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Time</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Student</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Instructor</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Aircraft</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Duration</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {flights.map((flight) => (
                  <tr key={flight.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{new Date(flight.date).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{flight.time}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{flight.profiles?.full_name || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{flight.instructors?.full_name || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{flight.aircraft_records?.tail_number || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{flight.duration_minutes} min</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>
                      <a href="#" style={{ color: '#C59A2A', textDecoration: 'none', fontWeight: 500, marginRight: '16px' }}>Edit</a>
                      <a href="#" onClick={() => handleDeleteFlight(flight.id)} style={{ color: '#dc2626', textDecoration: 'none', fontWeight: 500 }}>Cancel</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddFlightModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={() => loadFlights()} 
        users={users}
        instructors={instructors}
        aircraft={aircraft}
      />
    </div>
  )
}
