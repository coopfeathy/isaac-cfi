'use client'

// Run this in Supabase SQL Editor if lead_stage column does not exist:
// ALTER TABLE prospects ADD COLUMN IF NOT EXISTS lead_stage text DEFAULT 'new' CHECK (lead_stage IN ('new', 'contacted', 'booked', 'no-show', 'converted'));
// UPDATE prospects SET lead_stage = 'new' WHERE lead_stage IS NULL;

import { Fragment, useEffect, useState } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

type LeadStage = 'new' | 'contacted' | 'booked' | 'no-show' | 'converted'

const stageColorClass = (stage: string | null | undefined): string => {
  switch (stage) {
    case 'new': return 'bg-blue-100 text-blue-800'
    case 'contacted': return 'bg-yellow-100 text-yellow-800'
    case 'booked': return 'bg-green-100 text-green-800'
    case 'no-show': return 'bg-red-100 text-red-800'
    case 'converted': return 'bg-purple-100 text-purple-800'
    default: return 'bg-blue-100 text-blue-800'
  }
}

export default function ProspectsTab() {
  const { user } = useAuth()

  const [prospects, setProspects] = useState<any[]>([])
  const [prospectSource, setProspectSource] = useState<'all' | 'discovery_flight'>('all')
  const [stageFilter, setStageFilter] = useState<LeadStage | 'all'>('all')
  const [prospectView, setProspectView] = useState<'list' | 'cards'>('cards')
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null)
  const [deletingProspectId, setDeletingProspectId] = useState<string | null>(null)
  const [creatingProspect, setCreatingProspect] = useState(false)
  const [creatingAndConvertingProspect, setCreatingAndConvertingProspect] = useState(false)
  const [prospectFormMessage, setProspectFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [prospectForm, setProspectForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    interestLevel: 'warm' as 'hot' | 'warm' | 'cold',
    status: 'active' as 'active' | 'inactive' | 'lost',
    source: 'admin_dashboard',
    nextFollowUp: '',
    followUpFrequency: '7',
    notes: '',
  })

  useEffect(() => {
    fetchProspects()
  }, [])

  const fetchProspects = async () => {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('id, email, created_at, source, phone, full_name, interest_level, status, notes, meeting_location, meeting_date, next_follow_up, follow_up_frequency, updated_at, lead_stage')
        .order('next_follow_up', { ascending: true, nullsFirst: false })

      if (error) {
        console.error('Error fetching prospects:', error)
      } else if (data) {
        setProspects(data)
      }
    } catch (error) {
      console.error('Error fetching prospects:', error)
    }
  }

  const handleLeadStageChange = async (prospectId: string, newStage: LeadStage) => {
    const { error } = await supabase
      .from('prospects')
      .update({ lead_stage: newStage })
      .eq('id', prospectId)
    if (!error) {
      setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, lead_stage: newStage } : p))
    } else {
      console.error('Error updating lead stage:', error)
    }
  }

  const convertProspectWithoutPrompt = async (prospectId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) throw new Error('Missing admin session')

    const response = await fetch('/api/admin/prospects/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ prospectId }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result.error || 'Failed to convert prospect')
    }
  }

  const createProspectRecord = async () => {
    if (!prospectForm.fullName.trim()) {
      throw new Error('Full name is required.')
    }

    const nextEmail = prospectForm.email.trim().toLowerCase()
    if (nextEmail) {
      const duplicate = prospects.find(
        (prospect) => String(prospect.email || '').trim().toLowerCase() === nextEmail
      )

      if (duplicate) {
        const shouldContinue = confirm(
          `A prospect with this email already exists (${nextEmail}). Create another anyway?`
        )
        if (!shouldContinue) {
          throw new Error('Creation canceled to avoid duplicate email.')
        }
      }
    }

    const followUpFrequency = Number.parseInt(prospectForm.followUpFrequency, 10)

    const { data, error } = await supabase
      .from('prospects')
      .insert([
        {
          full_name: prospectForm.fullName.trim(),
          email: nextEmail || null,
          phone: prospectForm.phone.trim() || null,
          interest_level: prospectForm.interestLevel,
          status: prospectForm.status,
          source: prospectForm.source.trim() || 'admin_dashboard',
          next_follow_up: prospectForm.nextFollowUp || null,
          follow_up_frequency: Number.isFinite(followUpFrequency) && followUpFrequency > 0 ? followUpFrequency : 7,
          notes: prospectForm.notes.trim() || null,
          created_by: user?.id || null,
          lead_stage: 'new',
        },
      ])
      .select('id')
      .single()

    if (error) throw error

    return data?.id as string
  }

  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault()

    setCreatingProspect(true)
    setProspectFormMessage(null)

    try {
      const createdProspectId = await createProspectRecord()

      setProspectForm({
        fullName: '',
        email: '',
        phone: '',
        interestLevel: 'warm',
        status: 'active',
        source: 'admin_dashboard',
        nextFollowUp: '',
        followUpFrequency: '7',
        notes: '',
      })
      setProspectFormMessage({ type: 'success', text: 'Prospect created successfully.' })
      setProspectSource('all')
      setExpandedProspectId(createdProspectId)
      await fetchProspects()
    } catch (error) {
      console.error('Error creating prospect:', error)
      setProspectFormMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to create prospect.' })
    } finally {
      setCreatingProspect(false)
    }
  }

  const handleCreateAndConvertProspect = async () => {
    setCreatingAndConvertingProspect(true)
    setProspectFormMessage(null)

    try {
      const createdProspectId = await createProspectRecord()
      await convertProspectWithoutPrompt(createdProspectId)

      setProspectForm({
        fullName: '',
        email: '',
        phone: '',
        interestLevel: 'warm',
        status: 'active',
        source: 'admin_dashboard',
        nextFollowUp: '',
        followUpFrequency: '7',
        notes: '',
      })
      setProspectFormMessage({ type: 'success', text: 'Prospect created and converted to student.' })
      setProspectSource('all')
      setExpandedProspectId(createdProspectId)
      await fetchProspects()
    } catch (error) {
      console.error('Error creating/converting prospect:', error)
      setProspectFormMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to create and convert prospect.' })
    } finally {
      setCreatingAndConvertingProspect(false)
    }
  }

  const handleConvertProspectToStudent = async (prospectId: string) => {
    if (!confirm('Convert this prospect to a student?')) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error('Missing admin session')

      const response = await fetch('/api/admin/prospects/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prospectId }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to convert prospect')
      }

      await fetchProspects()
      alert('Prospect converted to student.')
    } catch (error) {
      console.error('Error converting prospect:', error)
      alert(error instanceof Error ? error.message : 'Failed to convert prospect')
    }
  }

  const handleDeleteProspect = async (prospectId: string) => {
    if (!confirm('Delete this prospect permanently?')) return

    try {
      setDeletingProspectId(prospectId)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error('Missing admin session')

      const response = await fetch(`/api/admin/prospects/${prospectId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete prospect')
      }

      if (expandedProspectId === prospectId) {
        setExpandedProspectId(null)
      }
      await fetchProspects()
    } catch (error) {
      console.error('Error deleting prospect:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete prospect')
    } finally {
      setDeletingProspectId(null)
    }
  }

  const filteredProspects = prospects.filter((p) => {
    const sourceMatch = prospectSource === 'all' || p.source === prospectSource
    const stageMatch = stageFilter === 'all' || (p.lead_stage || 'new') === stageFilter
    return sourceMatch && stageMatch
  })

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleString()
  }

  return (
    <div>
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-darkText mb-4">Create Prospect</h3>

        {prospectFormMessage && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            prospectFormMessage.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {prospectFormMessage.text}
          </div>
        )}

        <form onSubmit={handleCreateProspect} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
            <input
              type="text"
              value={prospectForm.fullName}
              onChange={(e) => setProspectForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={prospectForm.email}
              onChange={(e) => setProspectForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="text"
              value={prospectForm.phone}
              onChange={(e) => setProspectForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
            <input
              type="text"
              value={prospectForm.source}
              onChange={(e) => setProspectForm((prev) => ({ ...prev, source: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
              placeholder="admin_dashboard"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Interest Level</label>
            <select
              value={prospectForm.interestLevel}
              onChange={(e) => setProspectForm((prev) => ({ ...prev, interestLevel: e.target.value as 'hot' | 'warm' | 'cold' }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
            >
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={prospectForm.status}
              onChange={(e) => setProspectForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'lost' }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Next Follow-up</label>
            <input
              type="date"
              value={prospectForm.nextFollowUp}
              onChange={(e) => setProspectForm((prev) => ({ ...prev, nextFollowUp: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Frequency (days)</label>
            <input
              type="number"
              min={1}
              value={prospectForm.followUpFrequency}
              onChange={(e) => setProspectForm((prev) => ({ ...prev, followUpFrequency: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              rows={4}
              value={prospectForm.notes}
              onChange={(e) => setProspectForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={creatingProspect || creatingAndConvertingProspect}
                className="px-6 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-60"
              >
                {creatingProspect ? 'Creating...' : 'Create Prospect'}
              </button>
              <button
                type="button"
                onClick={() => void handleCreateAndConvertProspect()}
                disabled={creatingProspect || creatingAndConvertingProspect}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {creatingAndConvertingProspect ? 'Creating + Converting...' : 'Create + Convert to Student'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Filters row */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Source</label>
            <select
              value={prospectSource}
              onChange={(e) => setProspectSource(e.target.value as 'all' | 'discovery_flight')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
            >
              <option value="all">All Prospects</option>
              <option value="discovery_flight">Discovery Flight</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Stage</label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'new', 'contacted', 'booked', 'no-show', 'converted'] as const).map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setStageFilter(stage)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    stageFilter === stage
                      ? stage === 'all'
                        ? 'bg-gray-800 text-white border-gray-800'
                        : `${stageColorClass(stage)} border-transparent`
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {stage === 'all' ? 'All Stages' : stage.charAt(0).toUpperCase() + stage.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">View</p>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setProspectView('cards')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                prospectView === 'cards'
                  ? 'bg-golden text-darkText'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setProspectView('list')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                prospectView === 'list'
                  ? 'bg-golden text-darkText'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {filteredProspects.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">No prospects yet</div>
      ) : prospectView === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProspects.map((prospect) => (
            <div key={prospect.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-bold text-darkText leading-tight">{prospect.full_name || 'No name'}</h3>
                  <p className="text-sm text-gray-600 mt-1">{prospect.email || 'No email'}</p>
                </div>
                {/* Lead stage dropdown — primary status indicator */}
                <select
                  value={prospect.lead_stage || 'new'}
                  onChange={(e) => handleLeadStageChange(prospect.id, e.target.value as LeadStage)}
                  className={`px-2 py-1 rounded text-xs font-semibold border-0 cursor-pointer ${stageColorClass(prospect.lead_stage)}`}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="booked">Booked</option>
                  <option value="no-show">No-Show</option>
                  <option value="converted">Converted</option>
                </select>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="font-semibold text-gray-900">Phone:</span> {prospect.phone || '-'}</p>
                <p><span className="font-semibold text-gray-900">Source:</span> {prospect.source?.replace('_', ' ') || '-'}</p>
                <p><span className="font-semibold text-gray-900">Submitted:</span> {new Date(prospect.created_at).toLocaleDateString()}</p>
                <p>
                  <span className="font-semibold text-gray-900">Interest:</span>{' '}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    prospect.interest_level === 'hot' ? 'bg-red-100 text-red-800' :
                    prospect.interest_level === 'warm' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {prospect.interest_level || 'unknown'}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setExpandedProspectId(expandedProspectId === prospect.id ? null : prospect.id)}
                className="mt-4 inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                {expandedProspectId === prospect.id ? 'Hide details' : 'View details'}
              </button>
              <button
                type="button"
                onClick={() => handleConvertProspectToStudent(prospect.id)}
                disabled={prospect.status === 'converted'}
                className="mt-4 ml-2 inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600"
              >
                {prospect.status === 'converted' ? 'Converted' : 'Convert to Student'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProspect(prospect.id)}
                disabled={deletingProspectId === prospect.id}
                className="mt-4 ml-2 inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:bg-rose-200 disabled:text-rose-700"
              >
                {deletingProspectId === prospect.id ? 'Deleting...' : 'Delete Prospect'}
              </button>

              {expandedProspectId === prospect.id && (
                <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                    <p><span className="font-semibold text-gray-900">Status:</span> {prospect.status || '-'}</p>
                    <p><span className="font-semibold text-gray-900">Meeting Location:</span> {prospect.meeting_location || '-'}</p>
                    <p><span className="font-semibold text-gray-900">Meeting Date:</span> {formatDateTime(prospect.meeting_date)}</p>
                    <p><span className="font-semibold text-gray-900">Next Follow-up:</span> {formatDateTime(prospect.next_follow_up)}</p>
                    <p><span className="font-semibold text-gray-900">Follow-up Frequency:</span> {prospect.follow_up_frequency ? `${prospect.follow_up_frequency} days` : '-'}</p>
                    <p><span className="font-semibold text-gray-900">Last Updated:</span> {formatDateTime(prospect.updated_at)}</p>
                  </div>
                  {prospect.notes && (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{prospect.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProspects.map((prospect) => (
                  <Fragment key={prospect.id}>
                    <tr key={`${prospect.id}-row`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Lead stage dropdown — primary status indicator in list view */}
                        <select
                          value={prospect.lead_stage || 'new'}
                          onChange={(e) => handleLeadStageChange(prospect.id, e.target.value as LeadStage)}
                          className={`px-2 py-1 rounded text-xs font-semibold border-0 cursor-pointer ${stageColorClass(prospect.lead_stage)}`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="booked">Booked</option>
                          <option value="no-show">No-Show</option>
                          <option value="converted">Converted</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{prospect.full_name || '-'}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{prospect.email}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{prospect.phone || '-'}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          prospect.interest_level === 'hot' ? 'bg-red-100 text-red-800' :
                          prospect.interest_level === 'warm' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {prospect.interest_level || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{prospect.source?.replace('_', ' ') || '-'}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{new Date(prospect.created_at).toLocaleDateString()}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedProspectId(expandedProspectId === prospect.id ? null : prospect.id)}
                            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            {expandedProspectId === prospect.id ? 'Hide details' : 'View details'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConvertProspectToStudent(prospect.id)}
                            disabled={prospect.status === 'converted'}
                            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600"
                          >
                            {prospect.status === 'converted' ? 'Converted' : 'Convert to Student'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProspect(prospect.id)}
                            disabled={deletingProspectId === prospect.id}
                            className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:bg-rose-200 disabled:text-rose-700"
                          >
                            {deletingProspectId === prospect.id ? 'Deleting...' : 'Delete Prospect'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedProspectId === prospect.id && (
                      <tr key={`${prospect.id}-details`} className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-700">
                            <p><span className="font-semibold text-gray-900">Status:</span> {prospect.status || '-'}</p>
                            <p><span className="font-semibold text-gray-900">Meeting Location:</span> {prospect.meeting_location || '-'}</p>
                            <p><span className="font-semibold text-gray-900">Meeting Date:</span> {formatDateTime(prospect.meeting_date)}</p>
                            <p><span className="font-semibold text-gray-900">Next Follow-up:</span> {formatDateTime(prospect.next_follow_up)}</p>
                            <p><span className="font-semibold text-gray-900">Follow-up Frequency:</span> {prospect.follow_up_frequency ? `${prospect.follow_up_frequency} days` : '-'}</p>
                            <p><span className="font-semibold text-gray-900">Last Updated:</span> {formatDateTime(prospect.updated_at)}</p>
                          </div>
                          {prospect.notes && (
                            <div className="mt-3 border-t border-gray-200 pt-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Notes</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{prospect.notes}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
