'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function PostDiscoveryEmailPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (!authLoading && user && !isAdmin) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)

    const email = recipientEmail.trim()
    if (!email) {
      setStatus({ type: 'error', text: 'Please enter a recipient email address.' })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setStatus({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }

    setSending(true)
    setStatus({ type: 'info', text: 'Sending email...' })

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('You must be signed in as an admin to send email.')
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'post_discovery_start_training',
          recipients: email,
          name: recipientName.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      setStatus({
        type: 'success',
        text: `Email sent successfully to ${email}.`,
      })
      setRecipientEmail('')
      setRecipientName('')
    } catch (err) {
      setStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send email',
      })
    } finally {
      setSending(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Admin
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Send Post–Discovery Flight Email
        </h1>
        <p className="text-gray-600 mb-6">
          Enter the email of someone who just completed a discovery flight. They'll
          get a branded Merlin Flight Training email with a link to{' '}
          <code className="bg-gray-100 px-1 rounded text-sm">/start-training</code>{' '}
          and a quick checklist of how to get started.
        </p>

        {status && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              status.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : status.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {status.text}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-5">
          <div>
            <label
              htmlFor="recipientEmail"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <input
              id="recipientEmail"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
              required
              disabled={sending}
            />
          </div>

          <div>
            <label
              htmlFor="recipientName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              First Name{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="recipientName"
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Harrison"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
              disabled={sending}
            />
            <p className="mt-2 text-xs text-gray-500">
              If provided, the email will greet the recipient by name.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <strong>Heads up:</strong> The email will be sent from{' '}
            <code className="bg-yellow-100 px-1 rounded">
              noreply@merlinflighttraining.com
            </code>{' '}
            and will match the branding of other automated emails sent from the
            website.
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-golden text-darkText font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send Start-Training Email'}
          </button>
        </form>
      </div>
    </div>
  )
}
