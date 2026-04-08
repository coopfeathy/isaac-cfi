'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'

type AdminTab = 'slots' | 'bookings' | 'prospects' | 'blog' | 'social' | 'email' | 'settings'

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

const isAdminTab = (value: string | null): value is AdminTab => {
  return value === 'slots' || value === 'bookings' || value === 'prospects' || value === 'blog' || value === 'social' || value === 'email' || value === 'settings'
}

function TabSkeleton() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golden"></div>
    </div>
  )
}

const SlotsTab = dynamic(() => import('./tabs/SlotsTab'), { loading: () => <TabSkeleton /> })
const BookingsTab = dynamic(() => import('./tabs/BookingsTab'), { loading: () => <TabSkeleton /> })
const ProspectsTab = dynamic(() => import('./tabs/ProspectsTab'), { loading: () => <TabSkeleton /> })
const BlogTab = dynamic(() => import('./tabs/BlogTab'), { loading: () => <TabSkeleton /> })
const SocialTab = dynamic(() => import('./tabs/SocialTab'), { loading: () => <TabSkeleton /> })
const EmailTab = dynamic(() => import('./tabs/EmailTab'), { loading: () => <TabSkeleton /> })
const SettingsTab = dynamic(() => import('./tabs/SettingsTab'), { loading: () => <TabSkeleton /> })
const AdminLanding = dynamic(() => import('./tabs/AdminLanding'), { loading: () => <TabSkeleton /> })

function AdminPageContent({ forcedTab }: { forcedTab?: AdminTab }) {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<AdminTab>(forcedTab || 'slots')
  const [healthSnapshot, setHealthSnapshot] = useState<AdminHealthSnapshot | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [pendingSlotRequestCount, setPendingSlotRequestCount] = useState(0)
  const tabParam = searchParams.get('tab')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    } else if (!authLoading && user && !isAdmin) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (!user || !isAdmin) return
    if (forcedTab) {
      setActiveTab(forcedTab)
    } else if (isAdminTab(tabParam)) {
      setActiveTab(tabParam)
    }
    fetchAdminHealth()
    fetchPendingSlotRequestCount()
  }, [user, isAdmin, tabParam, forcedTab])

  const fetchAdminHealth = async () => {
    try {
      setHealthLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const response = await fetch('/api/admin/health', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json().catch(() => null)
      if (response.ok && result) setHealthSnapshot(result)
    } catch (error) {
      console.error('Error loading admin health snapshot:', error)
    } finally {
      setHealthLoading(false)
    }
  }

  const fetchPendingSlotRequestCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const response = await fetch('/api/admin/slot-requests', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json().catch(() => null)
      if (response.ok && result?.requests) {
        setPendingSlotRequestCount(result.requests.filter((r: any) => r.status === 'pending').length)
      }
    } catch (error) {
      console.error('Error fetching pending slot request count:', error)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-golden"></div>
      </div>
    )
  }

  if (!user || !isAdmin) return null

  const shouldShowWorkspace = Boolean(forcedTab || isAdminTab(searchParams.get('tab')))

  if (!shouldShowWorkspace) {
    return (
      <AdminLanding
        userEmail={user?.email}
        healthSnapshot={healthSnapshot}
        healthLoading={healthLoading}
        pendingSlotRequestCount={pendingSlotRequestCount}
        onRefreshHealth={fetchAdminHealth}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Focused Workspace</p>
          <h2 className="text-2xl font-bold text-darkText mb-2">
            {activeTab === 'slots' && 'Manage Slots'}
            {activeTab === 'bookings' && 'View Bookings'}
            {activeTab === 'prospects' && 'Manage Prospects'}
            {activeTab === 'blog' && 'Create Blog Post'}
            {activeTab === 'social' && 'Social Media'}
            {activeTab === 'email' && 'Email & Inquiries'}
            {activeTab === 'settings' && 'Platform Settings'}
          </h2>
          <p className="text-gray-600">
            {activeTab === 'slots' && 'Create and manage availability plus group class appointments.'}
            {activeTab === 'bookings' && 'Review booking statuses and class attendance.'}
            {activeTab === 'prospects' && 'Manage all prospects and leads from discovery flights and funnels.'}
            {activeTab === 'blog' && 'Write, edit, and publish blog content.'}
            {activeTab === 'social' && 'Manage linked social video posts.'}
            {activeTab === 'email' && 'Send campaigns and review inbound requests.'}
            {activeTab === 'settings' && 'Customize platform settings and course names.'}
          </p>
        </div>

        {activeTab === 'slots' && <SlotsTab />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'prospects' && <ProspectsTab />}
        {activeTab === 'blog' && <BlogTab />}
        {activeTab === 'social' && <SocialTab />}
        {activeTab === 'email' && <EmailTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-golden"></div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  )
}

export function AdminWorkspacePage({ tab }: { tab: AdminTab }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-golden"></div>
      </div>
    }>
      <AdminPageContent forcedTab={tab} />
    </Suspense>
  )
}
