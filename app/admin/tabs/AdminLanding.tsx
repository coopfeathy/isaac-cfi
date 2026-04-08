'use client'

import Link from 'next/link'
import Image from 'next/image'

type AdminHealthSnapshot = {
  unreviewedOnboardingDocs: number
  failedWebhookEvents: number
  openSupportTickets: number
  unresolvedIntegrityAlerts: number
  prospectConversionRate: number
  totalProspects: number
  convertedProspects: number
  latestIntegrityRun: {
    created_at: string
    finished_at: string | null
    error_message: string | null
    stale_pending_count: number
    canceled_pending_count: number
    released_slot_count: number
    paid_unbooked_count: number
    booked_without_paid_count: number
  } | null
}

interface AdminLandingProps {
  userEmail: string | undefined
  healthSnapshot: AdminHealthSnapshot | null
  healthLoading: boolean
  pendingSlotRequestCount: number
  onRefreshHealth: () => void
}

export default function AdminLanding({
  userEmail,
  healthSnapshot,
  healthLoading,
  pendingSlotRequestCount,
  onRefreshHealth,
}: AdminLandingProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-darkText mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 mb-12">Welcome back, {userEmail}</p>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-darkText">Operational Health</h2>
            <button
              type="button"
              onClick={onRefreshHealth}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:bg-blue-300"
              disabled={healthLoading}
            >
              {healthLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {healthSnapshot ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Unreviewed Onboarding Docs</p>
                  <p className="text-2xl font-bold text-darkText">{healthSnapshot.unreviewedOnboardingDocs}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Failed Webhook Events</p>
                  <p className="text-2xl font-bold text-red-600">{healthSnapshot.failedWebhookEvents}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Open Support Tickets</p>
                  <p className="text-2xl font-bold text-darkText">{healthSnapshot.openSupportTickets}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Pending Slot Requests</p>
                  <p className="text-2xl font-bold text-darkText">{pendingSlotRequestCount}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Prospect Conversion Rate</p>
                  <p className="text-2xl font-bold text-blue-700">{healthSnapshot.prospectConversionRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">{healthSnapshot.convertedProspects} converted / {healthSnapshot.totalProspects} total</p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-900 font-semibold mb-1">Booking Integrity Monitor</p>
                <p className="text-sm text-amber-800">
                  Unresolved alerts: <strong>{healthSnapshot.unresolvedIntegrityAlerts}</strong>
                </p>
                {healthSnapshot.latestIntegrityRun ? (
                  <p className="text-xs text-amber-900 mt-2">
                    Last run: {new Date(healthSnapshot.latestIntegrityRun.created_at).toLocaleString()} | stale pending: {healthSnapshot.latestIntegrityRun.stale_pending_count}, canceled: {healthSnapshot.latestIntegrityRun.canceled_pending_count}, released slots: {healthSnapshot.latestIntegrityRun.released_slot_count}, paid/unbooked: {healthSnapshot.latestIntegrityRun.paid_unbooked_count}, booked/no paid: {healthSnapshot.latestIntegrityRun.booked_without_paid_count}
                    {healthSnapshot.latestIntegrityRun.error_message ? ` | error: ${healthSnapshot.latestIntegrityRun.error_message}` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-amber-900 mt-2">No booking integrity run has been recorded yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Health metrics will appear here after the first refresh.</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border-2 border-golden rounded-lg p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-2">
              <Image src="/images/icon-learn.png" alt="Learn" width={60} height={60} />
              <h2 className="text-2xl font-bold text-darkText">Learn Platform</h2>
            </div>
            <p className="text-gray-600 mb-6">Manage courses, lessons, videos, and student enrollments</p>
            <div className="flex flex-col gap-2">
              <Link href="/admin/courses" className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-amber-300 text-center">Manage Courses</Link>
              <Link href="/admin/enrollments" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Assign Students</Link>
              <Link href="/admin/progress" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Lesson Debriefs</Link>
            </div>
          </div>

          <div className="bg-white border-2 border-golden rounded-lg p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-2">
              <Image src="/images/icon-students.png" alt="Students" width={60} height={60} />
              <h2 className="text-2xl font-bold text-darkText">Students & Prospects</h2>
            </div>
            <p className="text-gray-600 mb-6">View and manage students, prospects, and leads</p>
            <div className="flex flex-col gap-2">
              <Link href="/admin/students" className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-amber-300 text-center">Students</Link>
              <Link href="/admin/billing" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Billing</Link>
              <Link href="/admin/prospects" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Prospects</Link>
              <Link href="/admin/onboarding" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Onboarding Queue</Link>
            </div>
          </div>

          <div className="bg-white border-2 border-golden rounded-lg p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-2">
              <Image src="/images/icon-bookings.png" alt="Bookings" width={60} height={60} />
              <h2 className="text-2xl font-bold text-darkText">Bookings & Schedule</h2>
            </div>
            <p className="text-gray-600 mb-6">Manage flight bookings, slots, and scheduling</p>
            <div className="flex flex-col gap-2">
              <Link href="/admin/slots" className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-amber-300 text-center">Manage Slots</Link>
              <Link href="/admin/bookings" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">View Bookings</Link>
              <Link href="/admin/aircraft" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Aircraft Flight Log</Link>
              <Link href="/admin/email" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Inbox & Support</Link>
              <Link href="/admin/prospects" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Manage Prospects</Link>
            </div>
          </div>

          <div className="bg-white border-2 border-golden rounded-lg p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-2">
              <Image src="/images/icon-content.png" alt="Content" width={60} height={60} />
              <h2 className="text-2xl font-bold text-darkText">Content Management</h2>
            </div>
            <p className="text-gray-600 mb-6">Manage blog posts, social media, and email campaigns</p>
            <div className="flex flex-col gap-2">
              <Link href="/admin/blog" className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-amber-300 text-center">Create Blog Post</Link>
              <Link href="/admin/social" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Manage Social Posts</Link>
              <Link href="/admin/email" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Email Campaigns</Link>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-500 md:col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-darkText">Platform Settings</h2>
            </div>
            <p className="text-gray-600 mb-3">Manage instructors, administrators, aircraft, users, and platform configuration</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin?tab=settings" className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-amber-300 transition-colors duration-500 text-center">Platform Settings</Link>
              <Link href="/admin/students" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Manage Users</Link>
              <Link href="/admin/aircraft" className="px-4 py-2 bg-white text-gray-900 border border-gray-300 font-bold rounded hover:bg-gray-50 text-center">Aircraft</Link>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
          <h3 className="font-bold text-blue-900 mb-2">Getting Started</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>Learn Platform:</strong> Create courses, add units/lessons, upload videos, and assign students</li>
            <li><strong>Debriefs:</strong> Update syllabus progress, rate lesson performance, and email students automatically</li>
            <li><strong>Students:</strong> View all registered users and their training progress</li>
            <li><strong>Onboarding:</strong> Review student intake docs, signatures, and approvals</li>
            <li><strong>Prospects:</strong> Manage leads and potential students from discovery flights</li>
            <li><strong>Bookings:</strong> Manage flight slots, bookings, and schedules</li>
            <li><strong>Inbox:</strong> Review inbound support tickets, leads, and booking requests in one place</li>
            <li><strong>Content:</strong> Create and manage blog posts, social media posts, and email campaigns</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
