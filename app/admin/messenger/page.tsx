'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  fb_sender_id: string
  sender_name: string | null
  status: string
  phone: string | null
  email: string | null
  notes: string | null
  appointment_date: string | null
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

// ─── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    appointment_scheduled: 'bg-blue-100 text-blue-800',
    opted_out: 'bg-gray-100 text-gray-600',
    archived: 'bg-gray-100 text-gray-400',
  }
  const labels: Record<string, string> = {
    active: 'Active',
    appointment_scheduled: 'Scheduled',
    opted_out: 'Opted Out',
    archived: 'Archived',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function MessengerDashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'appointment_scheduled' | 'opted_out'>('all')
  const [manualReply, setManualReply] = useState('')
  const [sendingManual, setSendingManual] = useState(false)

  // ─── Auth gate ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
    else if (!authLoading && user && !isAdmin) router.push('/')
  }, [user, isAdmin, authLoading, router])

  // ─── Load conversations ─────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    setLoadingConvos(true)
    let query = supabase
      .from('messenger_conversations')
      .select('*')
      .order('updated_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query
    if (error) {
      console.error('Failed to load conversations:', error)
    } else {
      setConversations((data as Conversation[]) || [])
    }
    setLoadingConvos(false)
  }, [filter])

  useEffect(() => {
    if (user && isAdmin) loadConversations()
  }, [user, isAdmin, loadConversations])

  // ─── Load messages for a conversation ───────────────────────────────────

  const loadMessages = useCallback(async (convoId: string) => {
    setLoadingMessages(true)
    const { data, error } = await supabase
      .from('messenger_messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load messages:', error)
    } else {
      setMessages((data as Message[]) || [])
    }
    setLoadingMessages(false)
  }, [])

  const selectConversation = (convo: Conversation) => {
    setSelectedConvo(convo)
    loadMessages(convo.id)
  }

  // ─── Update conversation status ─────────────────────────────────────────

  const updateStatus = async (convoId: string, newStatus: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from('messenger_conversations')
      .update({ status: newStatus })
      .eq('id', convoId)

    if (!error) {
      setConversations((prev) =>
        prev.map((c) => (c.id === convoId ? { ...c, status: newStatus } : c))
      )
      if (selectedConvo?.id === convoId) {
        setSelectedConvo((prev) => (prev ? { ...prev, status: newStatus } : prev))
      }
    }
  }

  // ─── Send manual reply via API ──────────────────────────────────────────

  const sendManualReply = async () => {
    if (!manualReply.trim() || !selectedConvo) return
    setSendingManual(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch('/api/messenger-manual-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationId: selectedConvo.id,
          fbSenderId: selectedConvo.fb_sender_id,
          text: manualReply.trim(),
        }),
      })

      if (!res.ok) throw new Error('Failed to send')

      setManualReply('')
      // Reload messages
      loadMessages(selectedConvo.id)
    } catch (err) {
      console.error('Manual reply failed:', err)
      alert('Failed to send reply. Check the console for details.')
    } finally {
      setSendingManual(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to Admin
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              Messenger AI Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor and manage AI-powered Facebook Messenger conversations
            </p>
          </div>
          <button
            onClick={loadConversations}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 min-h-[calc(100vh-180px)]">
          {/* ─── Left panel: conversation list ─────────────────────────── */}
          <div className="w-1/3 min-w-[300px]">
            {/* Filter tabs */}
            <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              {(['all', 'active', 'appointment_scheduled', 'opted_out'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === f
                      ? 'bg-golden text-darkText'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'appointment_scheduled' ? 'Scheduled' : 'Opted Out'}
                </button>
              ))}
            </div>

            {/* Conversation cards */}
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-260px)]">
              {loadingConvos ? (
                <p className="text-center text-gray-500 py-8">Loading conversations...</p>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-500 text-sm">No conversations yet.</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Messages from your Facebook ads will appear here.
                  </p>
                </div>
              ) : (
                conversations.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => selectConversation(convo)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedConvo?.id === convo.id
                        ? 'bg-yellow-50 border-golden shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        {convo.sender_name || `User ${convo.fb_sender_id.slice(-6)}`}
                      </span>
                      <StatusBadge status={convo.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500 space-x-2">
                        {convo.phone && <span>📱 {convo.phone}</span>}
                        {convo.email && <span>✉️ {convo.email}</span>}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(convo.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ─── Right panel: conversation detail ──────────────────────── */}
          <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {!selectedConvo ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-400 text-lg">Select a conversation</p>
                  <p className="text-gray-300 text-sm mt-1">
                    Click on a conversation to view messages
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedConvo.sender_name || `User ${selectedConvo.fb_sender_id.slice(-6)}`}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <StatusBadge status={selectedConvo.status} />
                      {selectedConvo.phone && <span>📱 {selectedConvo.phone}</span>}
                      {selectedConvo.email && <span>✉️ {selectedConvo.email}</span>}
                      <span>Started {new Date(selectedConvo.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedConvo.status === 'active' && (
                      <button
                        onClick={() => updateStatus(selectedConvo.id, 'appointment_scheduled')}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Mark Scheduled
                      </button>
                    )}
                    {selectedConvo.status !== 'archived' && (
                      <button
                        onClick={() => updateStatus(selectedConvo.id, 'archived')}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {loadingMessages ? (
                    <p className="text-center text-gray-500 py-8">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No messages yet.</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            msg.role === 'user'
                              ? 'bg-gray-100 text-gray-900'
                              : msg.role === 'system'
                              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                              : 'bg-golden text-darkText'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              msg.role === 'user' ? 'text-gray-400' : 'text-black/40'
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {msg.role === 'assistant' && ' · AI'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Manual reply input */}
                <div className="border-t border-gray-200 px-6 py-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualReply}
                      onChange={(e) => setManualReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendManualReply()
                        }
                      }}
                      placeholder="Send a manual reply (bypasses AI)..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-golden focus:border-transparent"
                      disabled={sendingManual}
                    />
                    <button
                      onClick={sendManualReply}
                      disabled={sendingManual || !manualReply.trim()}
                      className="px-4 py-2 bg-golden text-darkText font-medium text-sm rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sendingManual ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Manual replies are sent directly to the user on Messenger and logged in the conversation.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
