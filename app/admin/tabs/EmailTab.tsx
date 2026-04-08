'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
type SupportTicket = {
  id: string
  name: string
  email: string
  phone: string | null
  category: string
  subject: string
  message: string
  status: SupportTicketStatus
  created_at: string
  updated_at: string
}

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

type InboxItem = {
  id: string
  kind: 'support_ticket' | 'slot_request' | 'prospect'
  title: string
  name: string
  email: string
  phone: string | null
  message: string
  createdAt: string
  meta: string
  supportStatus?: SupportTicketStatus
  statusLabel: string
}

export default function EmailTab() {
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailRecipients, setEmailRecipients] = useState<string[]>([])
  const [recipientType, setRecipientType] = useState<'all' | 'students' | 'prospects' | 'leads' | 'custom'>('all')
  const [customEmails, setCustomEmails] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState('')
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [updatingSupportTicketId, setUpdatingSupportTicketId] = useState<string | null>(null)
  const [slotRequests, setSlotRequests] = useState<SlotRequest[]>([])
  const [prospects, setProspects] = useState<any[]>([])

  useEffect(() => {
    fetchSupportTickets()
    fetchSlotRequests()
    fetchProspects()
  }, [])

  const fetchSupportTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, name, email, phone, category, subject, message, status, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSupportTickets((data || []) as SupportTicket[])
    } catch (error) {
      console.error('Error fetching support tickets:', error)
    }
  }

  const fetchSlotRequests = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) return

      const response = await fetch('/api/admin/slot-requests', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const result = await response.json().catch(() => null)
      if (!response.ok || !result) return

      setSlotRequests(result.requests || [])
    } catch (error) {
      console.error('Error fetching slot requests:', error)
    }
  }

  const fetchProspects = async () => {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('id, email, notes, full_name, phone, source, status, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProspects(data || [])
    } catch (error) {
      console.error('Error fetching prospects:', error)
    }
  }

  const handleUpdateSupportTicketStatus = async (ticketId: string, status: SupportTicketStatus) => {
    try {
      setUpdatingSupportTicketId(ticketId)
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId)

      if (error) throw error

      setSupportTickets((prev) =>
        prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, status } : ticket))
      )
    } catch (error) {
      console.error('Error updating support ticket:', error)
      alert('Failed to update support ticket status')
    } finally {
      setUpdatingSupportTicketId(null)
    }
  }

  const handleSendEmail = async () => {
    if (!emailSubject || !emailMessage) {
      setEmailStatus('Please fill in subject and message')
      return
    }

    if (emailRecipients.length === 0) {
      setEmailStatus('Please select recipients')
      return
    }

    setSendingEmail(true)
    setEmailStatus('Sending emails...')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setEmailStatus('Not authenticated')
        return
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          type: 'broadcast',
          recipients: emailRecipients,
          subject: emailSubject,
          message: emailMessage
        })
      })

      const result = await response.json()

      if (response.ok) {
        setEmailStatus(`Successfully sent to ${emailRecipients.length} recipient(s)!`)
        setEmailSubject('')
        setEmailMessage('')
        setEmailRecipients([])
        setCustomEmails('')
      } else {
        setEmailStatus(`Error: ${result.error}`)
      }
    } catch (error: any) {
      setEmailStatus(`Error: ${error.message}`)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleLoadRecipients = async () => {
    setEmailStatus('Loading recipients...')
    try {
      let emails: string[] = []

      switch (recipientType) {
        case 'all': {
          const { data: allProspects } = await supabase.from('prospects').select('email')
          const prospectEmails = allProspects?.map(p => p.email).filter(Boolean) || []

          const { data: studentsData } = await supabase.from('students').select('email')
          const studentEmails = studentsData?.map(s => s.email).filter(Boolean) || []

          emails = [...new Set([...prospectEmails, ...studentEmails])]
          break
        }
        case 'students': {
          const { data: students } = await supabase.from('students').select('email')
          emails = students?.map(s => s.email).filter(Boolean) || []
          break
        }
        case 'prospects': {
          const { data: prospectsData } = await supabase.from('prospects').select('email')
          emails = prospectsData?.map(p => p.email).filter(Boolean) || []
          break
        }
        case 'leads': {
          const { data: leadsData } = await supabase
            .from('prospects')
            .select('email')
            .eq('source', 'discovery_flight')
          emails = leadsData?.map(l => l.email).filter(Boolean) || []
          break
        }
        case 'custom':
          emails = customEmails.split(',').map(e => e.trim()).filter(Boolean)
          break
      }

      setEmailRecipients(emails)
      setEmailStatus(`Loaded ${emails.length} recipient(s)`)
    } catch (error: any) {
      setEmailStatus(`Error loading recipients: ${error.message}`)
    }
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleString()
  }

  const supportStatusClasses: Record<SupportTicketStatus, string> = {
    open: 'bg-red-100 text-red-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  const incomingInquiries: InboxItem[] = [
    ...supportTickets.map((ticket) => ({
      id: `support-${ticket.id}`,
      kind: 'support_ticket' as const,
      title: ticket.subject,
      name: ticket.name,
      email: ticket.email,
      phone: ticket.phone,
      message: ticket.message,
      createdAt: ticket.created_at,
      meta: `Category: ${ticket.category}`,
      supportStatus: ticket.status,
      statusLabel:
        ticket.status === 'in_progress'
          ? 'In Progress'
          : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1),
    })),
    ...slotRequests.map((request) => ({
      id: `slot-${request.id}`,
      kind: 'slot_request' as const,
      title: `Slot Request: ${request.full_name}`,
      name: request.full_name,
      email: request.email,
      phone: request.phone,
      message: request.notes || 'No notes provided.',
      createdAt: request.created_at,
      meta: `Requested window: ${formatDateTime(request.preferred_start_time)} to ${formatDateTime(request.preferred_end_time)}`,
      statusLabel: request.status.charAt(0).toUpperCase() + request.status.slice(1),
    })),
    ...prospects
      .filter((prospect) => prospect?.email || prospect?.notes)
      .map((prospect) => ({
        id: `prospect-${prospect.id}`,
        kind: 'prospect' as const,
        title: `Prospect Inquiry: ${prospect.full_name || prospect.email || 'Unknown'}`,
        name: prospect.full_name || 'Unknown',
        email: prospect.email || 'No email provided',
        phone: prospect.phone || null,
        message: prospect.notes || 'No notes captured yet.',
        createdAt: prospect.created_at,
        meta: `Source: ${prospect.source || 'unknown'}`,
        statusLabel: prospect.status
          ? String(prospect.status).charAt(0).toUpperCase() + String(prospect.status).slice(1)
          : 'New',
      })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Email Broadcast Campaign</h2>

      {emailStatus && (
        <div className={`mb-6 p-4 rounded-lg ${
          emailStatus.startsWith('Successfully') ? 'bg-green-50 text-green-800' :
          emailStatus.startsWith('Error') || emailStatus.startsWith('Not authenticated') ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {emailStatus}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Recipients</label>
          <select
            value={recipientType}
            onChange={(e) => setRecipientType(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent mb-3"
          >
            <option value="all">All Users</option>
            <option value="students">Students Only</option>
            <option value="prospects">Prospects Only</option>
            <option value="leads">Discovery Flight Leads</option>
            <option value="custom">Custom Email List</option>
          </select>

          {recipientType === 'custom' && (
            <textarea
              value={customEmails}
              onChange={(e) => setCustomEmails(e.target.value)}
              placeholder="Enter email addresses separated by commas"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent mb-3"
            />
          )}

          <button
            onClick={handleLoadRecipients}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load Recipients
          </button>

          {emailRecipients.length > 0 && (
            <p className="mt-3 text-sm text-gray-600">{emailRecipients.length} recipient(s) selected</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject *</label>
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="e.g., New Aircraft Added to Our Fleet!"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Message *</label>
          <textarea
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            placeholder="Write your email message here..."
            rows={12}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
            required
          />
        </div>

        {emailMessage && (
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-semibold text-lg mb-2">{emailSubject || 'Subject line'}</p>
              <div className="whitespace-pre-wrap text-gray-700">{emailMessage}</div>
            </div>
          </div>
        )}

        <button
          onClick={handleSendEmail}
          disabled={sendingEmail || emailRecipients.length === 0}
          className="w-full bg-golden text-darkText font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sendingEmail ? 'Sending...' : `Send to ${emailRecipients.length} Recipient(s)`}
        </button>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Make sure you have configured your Resend API key in the environment variables.
            Emails will be sent from: <code className="bg-yellow-100 px-1 rounded">noreply@merlinflighttraining.com</code>
          </p>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-xl font-bold text-darkText mb-2">Inbound Inbox</h3>
          <p className="text-sm text-gray-600 mb-4">View support tickets, slot requests, and other lead inquiries in one place.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Support Tickets</p>
              <p className="text-lg font-bold text-darkText">{supportTickets.length}</p>
            </div>
            <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Slot Requests</p>
              <p className="text-lg font-bold text-darkText">{slotRequests.length}</p>
            </div>
            <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Prospect Inquiries</p>
              <p className="text-lg font-bold text-darkText">{prospects.filter((prospect) => prospect?.email || prospect?.notes).length}</p>
            </div>
          </div>

          {incomingInquiries.length === 0 ? (
            <p className="text-gray-600">No inbound inquiries found.</p>
          ) : (
            <div className="space-y-4">
              {incomingInquiries.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-darkText">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.name} • {item.email}{item.phone ? ` • ${item.phone}` : ''}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.meta} • Received: {formatDateTime(item.createdAt)}</p>
                    </div>
                    {item.supportStatus ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${supportStatusClasses[item.supportStatus]}`}>
                        {item.statusLabel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {item.statusLabel}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-800 whitespace-pre-wrap mb-4">{item.message}</p>

                  {item.supportStatus && (
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <label className="text-sm text-gray-700 font-medium" htmlFor={`support-status-${item.id}`}>
                        Update status
                      </label>
                      <select
                        id={`support-status-${item.id}`}
                        value={item.supportStatus}
                        onChange={(e) => handleUpdateSupportTicketStatus(item.id.replace('support-', ''), e.target.value as SupportTicketStatus)}
                        disabled={updatingSupportTicketId === item.id.replace('support-', '')}
                        className="w-full md:w-56 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent disabled:bg-gray-100"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      {updatingSupportTicketId === item.id.replace('support-', '') && (
                        <span className="text-sm text-blue-700">Saving...</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
