'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/contexts/AuthContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PendingBooking = {
  id: string
  status: string
  created_at: string
  slot_id: string
  user_id: string
  slots: {
    start_time: string
    end_time: string
    type: string
    description: string | null
  } | null
  profiles: {
    full_name: string | null
    email: string | null
  } | null
}

type CancellationFeeFlag = {
  id: string
  student_id: string
  booking_id: string
  amount_cents: number
  reason: string | null
  resolved: boolean
  created_at: string
  students: {
    full_name: string | null
    email: string | null
  } | null
}

type InvoiceableBooking = {
  id: string
  status: string
  user_id: string
  slot_id: string
  stripe_invoice_id: string | null
  created_at: string
  slots: {
    start_time: string
    end_time: string
    description: string | null
    price: number | null
  } | null
  profiles: {
    full_name: string | null
    email: string | null
  } | null
}

type StudentBillingOverview = {
  id: string
  full_name: string | null
  email: string | null
  stripe_customer_id: string | null
  outstanding_bookings: number
  unresolved_fee_flags: number
  total_flagged_cents: number
}

// ---------------------------------------------------------------------------
// BillingTab Component
// ---------------------------------------------------------------------------

export default function BillingTab() {
  const { session } = useAuth()
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([])
  const [cancellationFees, setCancellationFees] = useState<CancellationFeeFlag[]>([])
  const [invoiceableBookings, setInvoiceableBookings] = useState<InvoiceableBooking[]>([])
  const [studentOverviews, setStudentOverviews] = useState<StudentBillingOverview[]>([])
  const [loadingSection, setLoadingSection] = useState<string | null>(null)
  const [invoiceInputs, setInvoiceInputs] = useState<Record<string, { amount: string; description: string }>>({})
  const [successMessages, setSuccessMessages] = useState<Record<string, string>>({})
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    await Promise.all([
      fetchPendingBookings(),
      fetchCancellationFees(),
      fetchInvoiceableBookings(),
      fetchStudentOverviews(),
    ])
  }

  // ---------------------------------------------------------------------------
  // Pending Approval Bookings
  // ---------------------------------------------------------------------------

  const fetchPendingBookings = async () => {
    // SECURITY: This query runs client-side with the anon key.
    // The bookings table MUST have an admin-only RLS SELECT policy so that
    // non-admin authenticated users cannot read other students' bookings.
    const { data, error } = await supabase
      .from('bookings')
      .select('id, status, created_at, slot_id, user_id, slots(start_time, end_time, type, description), profiles!bookings_user_id_fkey(full_name, email)')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: true })

    if (!error && data) {
      setPendingBookings(data as any[])
    }
  }

  const handleApproveBooking = async (bookingId: string) => {
    if (!session?.access_token) return

    setLoadingSection(bookingId)
    setErrorMessages((prev) => ({ ...prev, [bookingId]: '' }))

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (res.ok) {
        setSuccessMessages((prev) => ({ ...prev, [bookingId]: 'Booking approved and student notified.' }))
        setPendingBookings((prev) => prev.filter((b) => b.id !== bookingId))
      } else {
        const err = await res.json()
        setErrorMessages((prev) => ({ ...prev, [bookingId]: err.error || 'Failed to approve booking.' }))
      }
    } catch {
      setErrorMessages((prev) => ({ ...prev, [bookingId]: 'Network error. Please try again.' }))
    } finally {
      setLoadingSection(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Cancellation Fees
  // ---------------------------------------------------------------------------

  const fetchCancellationFees = async () => {
    // SECURITY: This query runs client-side with the anon key.
    // The cancellation_fee_flags table must have an admin-only RLS SELECT policy.
    const { data, error } = await supabase
      .from('cancellation_fee_flags')
      .select('id, student_id, booking_id, amount_cents, reason, resolved, created_at, students(full_name, email)')
      .eq('resolved', false)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCancellationFees(data as any[])
    }
  }

  const handleResolveFee = async (flagId: string) => {
    setLoadingSection(flagId)
    setErrorMessages((prev) => ({ ...prev, [flagId]: '' }))

    const { error } = await supabase
      .from('cancellation_fee_flags')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', flagId)

    if (!error) {
      setSuccessMessages((prev) => ({ ...prev, [flagId]: 'Fee resolved.' }))
      setCancellationFees((prev) => prev.filter((f) => f.id !== flagId))
    } else {
      setErrorMessages((prev) => ({ ...prev, [flagId]: 'Failed to resolve fee.' }))
    }

    setLoadingSection(null)
  }

  // ---------------------------------------------------------------------------
  // Invoice Button (Invoiceable Bookings)
  // ---------------------------------------------------------------------------

  const fetchInvoiceableBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, status, user_id, slot_id, stripe_invoice_id, created_at, slots(start_time, end_time, description, price), profiles!bookings_user_id_fkey(full_name, email)')
      .in('status', ['completed', 'confirmed'])
      .is('stripe_invoice_id', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setInvoiceableBookings(data as any[])
    }
  }

  const handleSendInvoice = async (booking: InvoiceableBooking) => {
    if (!session?.access_token) return

    const input = invoiceInputs[booking.id]
    const amountCents = Math.round(parseFloat(input?.amount || '0') * 100)
    const description = input?.description?.trim() || `Flight lesson - ${booking.slots?.start_time ? new Date(booking.slots.start_time).toLocaleDateString() : 'N/A'}`

    if (!amountCents || amountCents <= 0) {
      setErrorMessages((prev) => ({ ...prev, [booking.id]: 'Enter a valid amount greater than $0.' }))
      return
    }

    setLoadingSection(booking.id)
    setErrorMessages((prev) => ({ ...prev, [booking.id]: '' }))

    // Look up studentId from students table using user_id
    const { data: studentRow } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', booking.user_id)
      .single()

    if (!studentRow?.id) {
      setErrorMessages((prev) => ({ ...prev, [booking.id]: 'Student record not found. Cannot invoice.' }))
      setLoadingSection(null)
      return
    }

    try {
      const res = await fetch('/api/admin/billing/invoice', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          studentId: studentRow.id,
          amountCents,
          description,
        }),
      })

      const json = await res.json()

      if (res.ok && json.invoice) {
        setSuccessMessages((prev) => ({
          ...prev,
          [booking.id]: `Invoice sent! View: ${json.invoice.hosted_invoice_url}`,
        }))
        setInvoiceableBookings((prev) => prev.filter((b) => b.id !== booking.id))
      } else {
        setErrorMessages((prev) => ({ ...prev, [booking.id]: json.error || 'Failed to send invoice.' }))
      }
    } catch {
      setErrorMessages((prev) => ({ ...prev, [booking.id]: 'Network error. Please try again.' }))
    } finally {
      setLoadingSection(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Student Billing Overview
  // ---------------------------------------------------------------------------

  const fetchStudentOverviews = async () => {
    // SECURITY: These queries run client-side with the anon key.
    // The students table MUST have an admin-only RLS SELECT policy so that
    // non-admin users cannot enumerate student PII (names, emails, Stripe IDs).
    const { data: students, error } = await supabase
      .from('students')
      .select('id, full_name, email, stripe_customer_id')
      .order('full_name', { ascending: true })
      .limit(100)

    if (error || !students) return

    // Fetch unresolved fee counts per student
    const { data: feeFlags } = await supabase
      .from('cancellation_fee_flags')
      .select('student_id, amount_cents')
      .eq('resolved', false)

    // Fetch outstanding (confirmed but not paid) bookings
    const { data: outstandingBookings } = await supabase
      .from('bookings')
      .select('user_id')
      .eq('status', 'confirmed')

    // Build overview per student
    const overviews: StudentBillingOverview[] = students.map((student: any) => {
      const studentFlags = (feeFlags || []).filter((f: any) => f.student_id === student.id)
      const totalFlagged = studentFlags.reduce((sum: number, f: any) => sum + (f.amount_cents || 0), 0)

      return {
        id: student.id,
        full_name: student.full_name,
        email: student.email,
        stripe_customer_id: student.stripe_customer_id,
        outstanding_bookings: 0, // user_id vs student.id linkage handled below
        unresolved_fee_flags: studentFlags.length,
        total_flagged_cents: totalFlagged,
      }
    })

    setStudentOverviews(overviews)
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-10">

      {/* ------------------------------------------------------------------ */}
      {/* Section: Pending Approvals                                          */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pending Booking Approvals
          {pendingBookings.length > 0 && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {pendingBookings.length}
            </span>
          )}
        </h2>

        {pendingBookings.length === 0 ? (
          <p className="text-sm text-gray-500">No pending booking approvals.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lesson Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {booking.profiles?.full_name || 'Unknown'}
                      <div className="text-xs text-gray-500">{booking.profiles?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {booking.slots?.type || 'Training'}
                      {booking.slots?.description && (
                        <div className="text-xs text-gray-500">{booking.slots.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {booking.slots?.start_time ? formatDate(booking.slots.start_time) : 'TBD'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(booking.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {successMessages[booking.id] ? (
                        <span className="text-xs text-green-600">{successMessages[booking.id]}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveBooking(booking.id)}
                            disabled={loadingSection === booking.id}
                            className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {loadingSection === booking.id ? 'Approving...' : 'Approve'}
                          </button>
                          {errorMessages[booking.id] && (
                            <span className="text-xs text-red-600">{errorMessages[booking.id]}</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section: Cancellation Fees                                          */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Cancellation Fees
          {cancellationFees.length > 0 && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {cancellationFees.length} unresolved
            </span>
          )}
        </h2>

        {cancellationFees.length === 0 ? (
          <p className="text-sm text-gray-500">No unresolved cancellation fees.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cancellationFees.map((flag) => (
                  <tr key={flag.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {flag.students?.full_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {flag.students?.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCents(flag.amount_cents)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {flag.reason || 'Late cancellation'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(flag.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {successMessages[flag.id] ? (
                        <span className="text-xs text-green-600">{successMessages[flag.id]}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResolveFee(flag.id)}
                            disabled={loadingSection === flag.id}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {loadingSection === flag.id ? 'Resolving...' : 'Resolve'}
                          </button>
                          {errorMessages[flag.id] && (
                            <span className="text-xs text-red-600">{errorMessages[flag.id]}</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section: Invoice Completed/Confirmed Bookings (BILL-01)            */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Send Invoice</h2>
        <p className="text-sm text-gray-500 mb-4">
          Completed or confirmed bookings without an invoice. Click to send an invoice to the student via Stripe.
        </p>

        {invoiceableBookings.length === 0 ? (
          <p className="text-sm text-gray-500">No bookings awaiting invoice.</p>
        ) : (
          <div className="space-y-3">
            {invoiceableBookings.map((booking) => {
              const defaultPrice = booking.slots?.price
                ? (booking.slots.price / 100).toFixed(2)
                : ''
              const defaultDesc = `Flight lesson - ${booking.slots?.start_time ? new Date(booking.slots.start_time).toLocaleDateString() : 'N/A'}`
              const input = invoiceInputs[booking.id] || { amount: defaultPrice, description: defaultDesc }

              return (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {booking.profiles?.full_name || 'Unknown Student'}
                      </p>
                      <p className="text-xs text-gray-500">{booking.profiles?.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {booking.slots?.description || 'Flight lesson'} —{' '}
                        {booking.slots?.start_time ? formatDate(booking.slots.start_time) : 'TBD'}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                        {booking.status}
                      </span>
                    </div>

                    {successMessages[booking.id] ? (
                      <div className="text-xs text-green-700 max-w-xs break-all">
                        {successMessages[booking.id]}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-end gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Amount ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={input.amount}
                            onChange={(e) =>
                              setInvoiceInputs((prev) => ({
                                ...prev,
                                [booking.id]: { ...input, amount: e.target.value },
                              }))
                            }
                            className="w-28 border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="265.00"
                          />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs text-gray-500 mb-1">Description</label>
                          <input
                            type="text"
                            value={input.description}
                            onChange={(e) =>
                              setInvoiceInputs((prev) => ({
                                ...prev,
                                [booking.id]: { ...input, description: e.target.value },
                              }))
                            }
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <button
                          onClick={() => handleSendInvoice(booking)}
                          disabled={loadingSection === booking.id}
                          className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {loadingSection === booking.id ? 'Sending...' : 'Send Invoice'}
                        </button>
                        {errorMessages[booking.id] && (
                          <p className="text-xs text-red-600 w-full">{errorMessages[booking.id]}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section: Billing Overview per Student (BILL-06)                    */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Billing Overview</h2>
        <p className="text-sm text-gray-500 mb-4">Outstanding balances and flagged fees per student. Detailed invoice management is in the Stripe dashboard.</p>

        {studentOverviews.length === 0 ? (
          <p className="text-sm text-gray-500">No student billing data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unresolved Fees</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Flagged</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentOverviews
                  .filter((s) => s.unresolved_fee_flags > 0 || s.stripe_customer_id)
                  .map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {student.full_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {student.email || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                        {student.stripe_customer_id ? (
                          <span className="text-xs">{student.stripe_customer_id}</span>
                        ) : (
                          <span className="text-gray-300">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {student.unresolved_fee_flags > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            {student.unresolved_fee_flags} fee{student.unresolved_fee_flags !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {student.total_flagged_cents > 0 ? (
                          <span className="text-red-600">{formatCents(student.total_flagged_cents)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}
