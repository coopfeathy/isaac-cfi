'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Prospect, Communication } from '@/lib/supabase'

export default function ProspectsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [showCommsLog, setShowCommsLog] = useState(false)
  const [communications, setCommunications] = useState<Communication[]>([])
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    meeting_location: '',
    meeting_date: '',
    notes: '',
    interest_level: 'warm' as 'hot' | 'warm' | 'cold',
    source: '',
    next_follow_up: '',
    follow_up_frequency: 7
  })

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (user && isAdmin) {
      fetchProspects()
    }
  }, [user, isAdmin])

  const fetchProspects = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('next_follow_up', { ascending: true, nullsFirst: false })

      if (error) throw error
      setProspects(data || [])
    } catch (error) {
      console.error('Error fetching prospects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCommunications = async (prospectId: string) => {
    try {
      const { data, error } = await supabase
        .from('communications')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('sent_at', { ascending: false })

      if (error) throw error
      setCommunications(data || [])
      setShowCommsLog(true)
    } catch (error) {
      console.error('Error fetching communications:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const prospectData = {
        ...formData,
        created_by: user?.id
      }

      if (selectedProspect) {
        // Update existing prospect
        const { error } = await supabase
          .from('prospects')
          .update(prospectData)
          .eq('id', selectedProspect.id)

        if (error) throw error
      } else {
        // Create new prospect
        const { error } = await supabase
          .from('prospects')
          .insert([prospectData])

        if (error) throw error
      }

      setShowAddForm(false)
      setSelectedProspect(null)
      resetForm()
      fetchProspects()
    } catch (error) {
      console.error('Error saving prospect:', error)
      alert('Failed to save prospect')
    }
  }

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect)
    setFormData({
      full_name: prospect.full_name,
      email: prospect.email || '',
      phone: prospect.phone || '',
      meeting_location: prospect.meeting_location || '',
      meeting_date: prospect.meeting_date || '',
      notes: prospect.notes || '',
      interest_level: prospect.interest_level || 'warm',
      source: prospect.source || '',
      next_follow_up: prospect.next_follow_up || '',
      follow_up_frequency: prospect.follow_up_frequency
    })
    setShowAddForm(true)
  }

  const handleDelete = async (prospectId: string) => {
    if (!confirm('Are you sure you want to delete this prospect?')) return

    try {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', prospectId)

      if (error) throw error
      fetchProspects()
    } catch (error) {
      console.error('Error deleting prospect:', error)
      alert('Failed to delete prospect')
    }
  }

  const handleLogCommunication = async (prospectId: string, type: string) => {
    const message = prompt(`Enter ${type} details:`)
    if (!message) return

    try {
      const { error } = await supabase
        .from('communications')
        .insert([{
          prospect_id: prospectId,
          type,
          message,
          sent_by: user?.id
        }])

      if (error) throw error
      alert('Communication logged successfully')
    } catch (error) {
      console.error('Error logging communication:', error)
      alert('Failed to log communication')
    }
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      meeting_location: '',
      meeting_date: '',
      notes: '',
      interest_level: 'warm',
      source: '',
      next_follow_up: '',
      follow_up_frequency: 7
    })
  }

  const getInterestColor = (level: string | null) => {
    switch (level) {
      case 'hot': return 'bg-red-100 text-red-800'
      case 'warm': return 'bg-yellow-100 text-yellow-800'
      case 'cold': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'converted': return 'bg-purple-100 text-purple-800'
      case 'lost': return 'bg-red-100 text-red-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-darkText">Prospects</h1>
          <button
            onClick={() => {
              setSelectedProspect(null)
              resetForm()
              setShowAddForm(!showAddForm)
            }}
            className="px-6 py-3 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
          >
            {showAddForm ? 'Cancel' : 'Add Prospect'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-darkText mb-4">
              {selectedProspect ? 'Edit Prospect' : 'Add New Prospect'}
            </h2>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Where You Met
                </label>
                <input
                  type="text"
                  value={formData.meeting_location}
                  onChange={(e) => setFormData({ ...formData, meeting_location: e.target.value })}
                  placeholder="e.g., EAA Meeting, Airport"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Date
                </label>
                <input
                  type="date"
                  value={formData.meeting_date}
                  onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="e.g., Referral, Facebook, Event"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interest Level
                </label>
                <select
                  value={formData.interest_level}
                  onChange={(e) => setFormData({ ...formData, interest_level: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                >
                  <option value="hot">Hot - Ready to Book</option>
                  <option value="warm">Warm - Interested</option>
                  <option value="cold">Cold - Just Looking</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  value={formData.next_follow_up}
                  onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Frequency (days)
                </label>
                <input
                  type="number"
                  value={formData.follow_up_frequency}
                  onChange={(e) => setFormData({ ...formData, follow_up_frequency: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Notes about this prospect..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
                >
                  {selectedProspect ? 'Update Prospect' : 'Add Prospect'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Prospects List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prospects.map((prospect) => (
            <div key={prospect.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-darkText">{prospect.full_name}</h3>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getInterestColor(prospect.interest_level)}`}>
                    {prospect.interest_level}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(prospect.status)}`}>
                    {prospect.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {prospect.email && <p>📧 {prospect.email}</p>}
                {prospect.phone && <p>📞 {prospect.phone}</p>}
                {prospect.meeting_location && <p>📍 Met at: {prospect.meeting_location}</p>}
                {prospect.source && <p>🔗 Source: {prospect.source}</p>}
                {prospect.next_follow_up && (
                  <p className={new Date(prospect.next_follow_up) < new Date() ? 'text-red-600 font-bold' : 'text-green-600'}>
                    📅 Follow up: {new Date(prospect.next_follow_up).toLocaleDateString()}
                  </p>
                )}
              </div>

              {prospect.notes && (
                <p className="text-sm text-gray-600 mb-4 italic border-l-2 border-golden pl-2">
                  {prospect.notes}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleEdit(prospect)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleLogCommunication(prospect.id, 'note')}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Log Contact
                </button>
                <button
                  onClick={() => fetchCommunications(prospect.id)}
                  className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  History
                </button>
                <button
                  onClick={() => handleDelete(prospect.id)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {prospects.length === 0 && !showAddForm && (
          <div className="text-center text-gray-500 py-12">
            No prospects yet. Click "Add Prospect" to get started.
          </div>
        )}

        {/* Communications Log Modal */}
        {showCommsLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-darkText">Communication History</h2>
                <button
                  onClick={() => setShowCommsLog(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                {communications.map((comm) => (
                  <div key={comm.id} className="border-l-4 border-golden pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-darkText">{comm.type.toUpperCase()}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(comm.sent_at).toLocaleDateString()}
                      </span>
                    </div>
                    {comm.subject && <p className="text-sm font-medium mt-1">{comm.subject}</p>}
                    {comm.message && <p className="text-sm text-gray-600 mt-1">{comm.message}</p>}
                  </div>
                ))}
                {communications.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No communications logged yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
