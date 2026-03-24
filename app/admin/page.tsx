'use client'

import { useEffect, useState, Suspense, Fragment } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Slot, Booking } from '@/lib/supabase'
import Link from 'next/link'

type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'facebook'
type SocialPostType = 'video' | 'image' | 'carousel'

interface SocialMediaPost {
  id: string
  platform: SocialPlatform
  url: string
  title: string
  thumbnail: string | null
  date: string
  type: SocialPostType
  created_at: string
}

type AdminTab = 'slots' | 'bookings' | 'prospects' | 'blog' | 'social' | 'email'
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

const isAdminTab = (value: string | null): value is AdminTab => {
  return value === 'slots' || value === 'bookings' || value === 'prospects' || value === 'blog' || value === 'social' || value === 'email'
}

function AdminPageContent({ forcedTab }: { forcedTab?: AdminTab }) {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [prospectSource, setProspectSource] = useState<'all' | 'discovery_flight'>('all')
  const [prospectView, setProspectView] = useState<'list' | 'cards'>('cards')
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null)
  const [deletingProspectId, setDeletingProspectId] = useState<string | null>(null)
  const [healthSnapshot, setHealthSnapshot] = useState<AdminHealthSnapshot | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [slotRequests, setSlotRequests] = useState<SlotRequest[]>([])
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [updatingSupportTicketId, setUpdatingSupportTicketId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<AdminTab>(forcedTab || 'slots')
  const [slotTypeFilter, setSlotTypeFilter] = useState<'all' | 'training' | 'tour' | 'custom'>('all')
  const [slotStatusFilter, setSlotStatusFilter] = useState<'all' | 'available' | 'booked'>('all')
  const [slotDateFilter, setSlotDateFilter] = useState('')
  const [slotMonthFilter, setSlotMonthFilter] = useState('')
  const [slotStartDateFilter, setSlotStartDateFilter] = useState('')
  const [slotEndDateFilter, setSlotEndDateFilter] = useState('')
  
  // Auto-generate discovery slots
  const [generatingSlots, setGeneratingSlots] = useState(false)
  const [generateSlotsResult, setGenerateSlotsResult] = useState<string | null>(null)

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

  // New slot form
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

  // Blog form state
  const [blogTitle, setBlogTitle] = useState('')
  const [blogAuthor, setBlogAuthor] = useState('Isaac Prestwich, CFII')
  const [blogExcerpt, setBlogExcerpt] = useState('')
  const [blogContent, setBlogContent] = useState('')
  const [blogMessage, setBlogMessage] = useState('')
  const [editingPost, setEditingPost] = useState<any>(null)
  const [existingPosts, setExistingPosts] = useState<any[]>([])
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Social media posts state
  const [socialPosts, setSocialPosts] = useState<SocialMediaPost[]>([])
  const [socialMessage, setSocialMessage] = useState('')
  const [editingSocialPost, setEditingSocialPost] = useState<SocialMediaPost | null>(null)
  const [uploadingSocialThumbnail, setUploadingSocialThumbnail] = useState(false)
  const [socialForm, setSocialForm] = useState({
    platform: 'youtube' as SocialPlatform,
    url: '',
    title: '',
    thumbnail: '',
    date: '',
    type: 'video' as SocialPostType,
  })

  // Email campaign state
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailRecipients, setEmailRecipients] = useState<string[]>([])
  const [recipientType, setRecipientType] = useState<'all' | 'students' | 'prospects' | 'leads' | 'custom'>('all')
  const [customEmails, setCustomEmails] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState('')

  useEffect(() => {
    console.log('Admin Page Debug:', { authLoading, user: user?.email, isAdmin })
    
    if (!authLoading && !user) {
      console.log('Redirecting to login - no user')
      router.push('/login')
    } else if (!authLoading && user && !isAdmin) {
      console.log('Redirecting to home - not admin')
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (!user || !isAdmin) return

    if (forcedTab) {
      setActiveTab(forcedTab)
    } else {
      const tab = searchParams.get('tab')
      if (isAdminTab(tab)) {
        setActiveTab(tab)
      }
    }

    fetchData()
    fetchBlogPosts()
    fetchProspects()
    fetchSocialPosts()
    fetchAdminHealth()
    fetchSlotRequests()
    fetchSupportTickets()
  }, [user, isAdmin, searchParams, forcedTab])

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
      fetchAdminHealth()
    } catch (error) {
      console.error('Error updating support ticket:', error)
      alert('Failed to update support ticket status')
    } finally {
      setUpdatingSupportTicketId(null)
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

  const fetchAdminHealth = async () => {
    try {
      setHealthLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) return

      const response = await fetch('/api/admin/health', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json().catch(() => null)
      if (!response.ok || !result) {
        throw new Error(result?.error || 'Failed to load health panel')
      }

      setHealthSnapshot(result)
    } catch (error) {
      console.error('Error loading admin health snapshot:', error)
    } finally {
      setHealthLoading(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [slotsData, bookingsData] = await Promise.all([
        supabase.from('slots').select('*').order('start_time', { ascending: true }),
        supabase.from('bookings').select('*, slots(*)').order('created_at', { ascending: false })
      ])

      console.log('Slots data:', slotsData)
      console.log('Bookings data:', bookingsData)

      if (slotsData.data) {
        console.log('Setting slots:', slotsData.data.length, 'slots')
        setSlots(slotsData.data)
      }
      if (bookingsData.data) {
        console.log('Setting bookings:', bookingsData.data.length, 'bookings')
        setBookings(bookingsData.data as any)
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProspects = async () => {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('id, email, created_at, source, phone, full_name, interest_level, status, notes, meeting_location, meeting_date, next_follow_up, follow_up_frequency, updated_at')
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

  const fetchBlogPosts = async () => {
    try {
      const response = await fetch('/api/list-blog-posts')
      const data = await response.json()
      if (data.posts) {
        setExistingPosts(data.posts)
      }
    } catch (error) {
      console.error('Error fetching blog posts:', error)
    }
  }

  const fetchSocialPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setSocialPosts((data || []) as SocialMediaPost[])
    } catch (error) {
      console.error('Error fetching social posts:', error)
      setSocialMessage('Error loading social media posts')
    }
  }

  const resetSocialForm = () => {
    setEditingSocialPost(null)
    setSocialForm({
      platform: 'youtube',
      url: '',
      title: '',
      thumbnail: '',
      date: '',
      type: 'video',
    })
  }

  const handleEditSocialPost = (post: SocialMediaPost) => {
    setEditingSocialPost(post)
    setSocialForm({
      platform: post.platform,
      url: post.url,
      title: post.title,
      thumbnail: post.thumbnail || '',
      date: post.date.slice(0, 16),
      type: post.type,
    })
    setSocialMessage('')
  }

  const handleSaveSocialPost = async (e: React.FormEvent) => {
    e.preventDefault()
    setSocialMessage('')

    try {
      const payload = {
        platform: socialForm.platform,
        url: socialForm.url.trim(),
        title: socialForm.title.trim(),
        thumbnail: socialForm.thumbnail.trim() || null,
        date: socialForm.date,
        type: socialForm.type,
      }

      if (editingSocialPost) {
        const { error } = await supabase
          .from('social_media_posts')
          .update(payload)
          .eq('id', editingSocialPost.id)

        if (error) throw error
        setSocialMessage('Social post updated successfully!')
      } else {
        const { error } = await supabase
          .from('social_media_posts')
          .insert([payload])

        if (error) throw error
        setSocialMessage('Social post created successfully!')
      }

      resetSocialForm()
      fetchSocialPosts()
    } catch (error: any) {
      console.error('Error saving social post:', error)
      setSocialMessage(`Error: ${error.message}`)
    }
  }

  const extractYouTubeVideoId = (input: string): string | null => {
    try {
      const url = new URL(input)
      const host = url.hostname.replace('www.', '')

      if (host === 'youtu.be') {
        return url.pathname.split('/').filter(Boolean)[0] || null
      }

      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (url.pathname === '/watch') {
          return url.searchParams.get('v')
        }

        if (url.pathname.startsWith('/shorts/')) {
          return url.pathname.split('/')[2] || null
        }

        if (url.pathname.startsWith('/embed/')) {
          return url.pathname.split('/')[2] || null
        }
      }
    } catch {
      // Fall through to regex parsing below for raw IDs or partial URLs.
    }

    const regex = /(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/
    const match = input.match(regex)
    return match?.[1] || null
  }

  const getYouTubeThumbnailUrl = (url: string): string | null => {
    const videoId = extractYouTubeVideoId(url)
    if (!videoId) return null
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  }

  const handleDeleteSocialPost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this social media post?')) return

    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', postId)

      if (error) throw error
      setSocialMessage('Social post deleted successfully!')
      fetchSocialPosts()
    } catch (error: any) {
      console.error('Error deleting social post:', error)
      setSocialMessage(`Error: ${error.message}`)
    }
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

    const matchesDate = slotDateFilter
      ? slotDateKey === slotDateFilter
      : true

    const matchesMonth = slotMonthFilter
      ? slotMonthKey === slotMonthFilter
      : true

    const matchesStartDate = slotStartDateFilter
      ? slotDateKey >= slotStartDateFilter
      : true

    const matchesEndDate = slotEndDateFilter
      ? slotDateKey <= slotEndDateFilter
      : true

    return matchesType && matchesStatus && matchesDate && matchesMonth && matchesStartDate && matchesEndDate
  })

  const handleApplyThisWeekFilter = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - dayOfWeek)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    const startKey = start.toISOString().split('T')[0]
    const endKey = end.toISOString().split('T')[0]

    setSlotDateFilter('')
    setSlotMonthFilter('')
    setSlotStartDateFilter(startKey)
    setSlotEndDateFilter(endKey)
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

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error updating booking:', error)
      alert('Failed to update booking status')
    }
  }

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      let fileMarkdown = ''
      if (file.type.startsWith('image/')) {
        fileMarkdown = `\n![Image description](${data.url})\n`
      } else {
        fileMarkdown = `\n[${file.name}](${data.url})\n`
      }
      setBlogContent(prev => prev + fileMarkdown)
      setShowImageUpload(false)
      alert('File uploaded successfully!')
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSocialThumbnailUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSocialMessage('Error: Please upload an image file for thumbnail')
      return
    }

    setUploadingSocialThumbnail(true)
    setSocialMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      setSocialForm((prev) => ({ ...prev, thumbnail: data.url }))
      setSocialMessage('Thumbnail uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading social thumbnail:', error)
      setSocialMessage(`Error: ${error.message}`)
    } finally {
      setUploadingSocialThumbnail(false)
    }
  }

  const handleEditPost = (post: any) => {
    setEditingPost(post)
    setBlogTitle(post.title)
    setBlogAuthor(post.author)
    setBlogExcerpt(post.excerpt)
    setBlogContent(post.content)
    setBlogMessage('')
  }

  const handleDeletePost = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return

    try {
      const response = await fetch('/api/delete-blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })

      if (!response.ok) throw new Error('Failed to delete blog post')

      setBlogMessage('Blog post deleted successfully!')
      fetchBlogPosts()
    } catch (error: any) {
      setBlogMessage(`Error: ${error.message}`)
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
        setEmailStatus(`✅ Successfully sent to ${emailRecipients.length} recipient(s)!`)
        setEmailSubject('')
        setEmailMessage('')
        setEmailRecipients([])
        setCustomEmails('')
      } else {
        setEmailStatus(`❌ Error: ${result.error}`)
      }
    } catch (error: any) {
      setEmailStatus(`❌ Error: ${error.message}`)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleLoadRecipients = async () => {
    setEmailStatus('Loading recipients...')
    try {
      let emails: string[] = []

      switch (recipientType) {
        case 'all':
          // Prospects now includes discovery funnel + discovery flight sources
          const { data: allProspects } = await supabase.from('prospects').select('email')
          const prospectEmails = allProspects?.map(p => p.email).filter(Boolean) || []
          
          // Get enrolled students
          const { data: studentsData } = await supabase.from('students').select('email')
          const studentEmails = studentsData?.map(s => s.email).filter(Boolean) || []
          
          // Combine and deduplicate
          emails = [...new Set([...prospectEmails, ...studentEmails])]
          break

        case 'students':
          const { data: students } = await supabase.from('students').select('email')
          emails = students?.map(s => s.email).filter(Boolean) || []
          break

        case 'prospects':
          const { data: prospects } = await supabase.from('prospects').select('email')
          emails = prospects?.map(p => p.email).filter(Boolean) || []
          break

        case 'leads':
          const { data: leadsData } = await supabase
            .from('prospects')
            .select('email')
            .eq('source', 'discovery_flight')
          emails = leadsData?.map(l => l.email).filter(Boolean) || []
          break

        case 'custom':
          emails = customEmails.split(',').map(e => e.trim()).filter(Boolean)
          break
      }

      setEmailRecipients(emails)
      setEmailStatus(`✅ Loaded ${emails.length} recipient(s)`)
    } catch (error: any) {
      setEmailStatus(`❌ Error loading recipients: ${error.message}`)
    }
  }

  const handleSaveBlogPost = async (e: React.FormEvent) => {
    e.preventDefault()
    setBlogMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      let slug = editingPost?.slug

      if (!slug) {
        slug = `${today}-${blogTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')}`
      }

      const content = `---
title: "${blogTitle}"
date: "${editingPost?.date || today}"
author: "${blogAuthor}"
excerpt: "${blogExcerpt}"
---

${blogContent}
`

      const endpoint = editingPost ? '/api/update-blog-post' : '/api/create-blog-post'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, content }),
      })

      if (!response.ok) throw new Error(`Failed to ${editingPost ? 'update' : 'create'} blog post`)

      setBlogMessage(`Blog post ${editingPost ? 'updated' : 'created'} successfully!`)
      setBlogTitle('')
      setBlogExcerpt('')
      setBlogContent('')
      setEditingPost(null)
      fetchBlogPosts()
    } catch (error: any) {
      setBlogMessage(`Error: ${error.message}`)
    }
  }

  const handleCancelEdit = () => {
    setEditingPost(null)
    setBlogTitle('')
    setBlogAuthor('Isaac Prestwich, CFII')
    setBlogExcerpt('')
    setBlogContent('')
    setBlogMessage('')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-golden"></div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  const filteredProspects = prospects.filter((p) => prospectSource === 'all' || p.source === prospectSource)
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

  const shouldShowWorkspace = Boolean(forcedTab || isAdminTab(searchParams.get('tab')))

  // Landing Page View
  if (!shouldShowWorkspace) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-darkText mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 mb-12">Welcome back, {user?.email}</p>

          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-darkText">Operational Health</h2>
              <button
                type="button"
                onClick={fetchAdminHealth}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:bg-blue-300"
                disabled={healthLoading}
              >
                {healthLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {healthSnapshot ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
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
            
            {/* Learn Platform Management */}
            <div className="bg-white border-2 border-golden rounded-lg p-6 hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-golden mb-2">📚 Learn Platform</h2>
              <p className="text-gray-600 mb-6">Manage courses, lessons, videos, and student enrollments</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/courses" className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-amber-300 text-center">
                  Manage Courses
                </Link>
                <Link href="/admin/enrollments" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 text-center">
                  Assign Students
                </Link>
                <Link href="/admin/progress" className="px-4 py-2 bg-white text-blue-700 border border-blue-200 font-bold rounded hover:bg-blue-50 text-center">
                  Lesson Debriefs
                </Link>
              </div>
            </div>

            {/* Student & Prospect Management */}
            <div className="bg-white border-2 border-blue-500 rounded-lg p-6 hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-blue-600 mb-2">👥 Students & Prospects</h2>
              <p className="text-gray-600 mb-6">View and manage students, prospects, and leads</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/students" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 text-center">
                  Students
                </Link>
                <Link href="/admin/billing" className="px-4 py-2 bg-white text-blue-700 border border-blue-200 font-bold rounded hover:bg-blue-50 text-center">
                  Billing
                </Link>
                <Link href="/admin/prospects" className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-amber-300 text-center">
                  Prospects
                </Link>
                <Link href="/admin/onboarding" className="px-4 py-2 bg-white text-blue-700 border border-blue-200 font-bold rounded hover:bg-blue-50 text-center">
                  Onboarding Queue
                </Link>
              </div>
            </div>

            {/* Bookings & Scheduling */}
            <div className="bg-white border-2 border-green-600 rounded-lg p-6 hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-green-600 mb-2">📅 Bookings & Schedule</h2>
              <p className="text-gray-600 mb-6">Manage flight bookings, slots, and scheduling</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/slots" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 text-center">
                  Manage Slots
                </Link>
                <Link href="/admin/bookings" className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-amber-300 text-center">
                  View Bookings
                </Link>
                <Link href="/admin/email" className="px-4 py-2 bg-white text-blue-700 border border-blue-200 font-bold rounded hover:bg-blue-50 text-center">
                  Inbox & Support
                </Link>
                <Link href="/admin/prospects" className="px-4 py-2 bg-white text-blue-700 border border-blue-200 font-bold rounded hover:bg-blue-50 text-center">
                  Manage Prospects
                </Link>
              </div>
            </div>

            {/* Content Management */}
            <div className="bg-white border-2 border-orange-500 rounded-lg p-6 hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-orange-600 mb-2">📝 Content Management</h2>
              <p className="text-gray-600 mb-6">Manage blog posts, social media, and email campaigns</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/blog" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 text-center">
                  Create Blog Post
                </Link>
                <Link href="/admin/social" className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-amber-300 text-center">
                  Manage Social Posts
                </Link>
                <Link href="/admin/email" className="px-4 py-2 bg-white text-blue-700 border border-blue-200 font-bold rounded hover:bg-blue-50 text-center">
                  Email Campaigns
                </Link>
              </div>
            </div>

          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
            <h3 className="font-bold text-blue-900 mb-2">💡 Getting Started</h3>
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

  // Dashboard View
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
          </h2>
          <p className="text-gray-600">
            {activeTab === 'slots' && `Create and manage availability for the native schedule page. Current slots: ${slots.length}.`}
            {activeTab === 'bookings' && `Review booking statuses and export Apple Calendar files. Current bookings: ${bookings.length}.`}
            {activeTab === 'prospects' && `Manage all prospects and leads from discovery flights and funnels. Total: ${prospects.length}.`}
            {activeTab === 'blog' && 'Write, edit, and publish blog content.'}
            {activeTab === 'social' && `Manage linked social video posts. Current posts: ${socialPosts.length}.`}
            {activeTab === 'email' && `Send campaigns and review inbound requests. Open support tickets: ${supportTickets.filter((ticket) => ticket.status === 'open').length}.`}
          </p>
        </div>

        {/* Slots Tab */}
        {activeTab === 'slots' && (
          <div>
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
                {generatingSlots ? 'Generating...' : '⚡ Generate Discovery Slots'}
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

            {/* Slots List */}
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

            <div className="mt-10">
              <h3 className="text-2xl font-bold text-darkText mb-3">Requested Discovery Flight Slots</h3>
              <p className="text-sm text-gray-600 mb-4">Approve to create a new available slot or deny if the request cannot be accommodated.</p>
              {slotRequests.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-sm text-gray-500">No slot requests yet.</div>
              ) : (
                <div className="space-y-3">
                  {slotRequests.map((request) => (
                    <div key={request.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
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
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {bookings.map((booking: any) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-darkText mb-1">
                      {booking.slots?.type === 'tour' ? 'Discovery Flight' : 'Flight Training'}
                    </h3>
                    {booking.user_id && <p className="text-gray-600">Customer ID: {booking.user_id}</p>}
                  </div>
                  <select
                    value={booking.status}
                    onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
                {booking.slots && (
                  <div className="text-sm text-gray-600">
                    <p>Date: {new Date(booking.slots.start_time).toLocaleString()}</p>
                    <p>Price: ${(booking.slots.price / 100).toFixed(2)}</p>
                  </div>
                )}
                {booking.notes && <div className="mt-2 p-2 bg-gray-50 rounded"><p className="text-sm text-gray-600">Notes: {booking.notes}</p></div>}
                <div className="mt-2 text-xs text-gray-500">Booked: {new Date(booking.created_at).toLocaleString()}</div>
                {(booking.slot_id || booking.slots?.id) && (
                  <div className="mt-3">
                    <a
                      href={`/api/calendar/booking-ics?slot_id=${encodeURIComponent(booking.slot_id ? booking.slot_id : booking.slots?.id || '')}`}
                      className="inline-block px-3 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Add to Apple Calendar (.ics)
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Prospects Tab */}
        {activeTab === 'prospects' && (
          <div>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
                      <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                        prospect.interest_level === 'hot' ? 'bg-red-100 text-red-800' :
                        prospect.interest_level === 'warm' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {prospect.interest_level || 'unknown'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-700">
                      <p><span className="font-semibold text-gray-900">Phone:</span> {prospect.phone || '-'}</p>
                      <p><span className="font-semibold text-gray-900">Source:</span> {prospect.source?.replace('_', ' ') || '-'}</p>
                      <p><span className="font-semibold text-gray-900">Submitted:</span> {new Date(prospect.created_at).toLocaleDateString()}</p>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
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
                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{prospect.email}</div></td>
                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{prospect.full_name || '-'}</div></td>
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
                              <td colSpan={7} className="px-6 py-4">
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
        )}

        {/* Blog Tab */}
        {activeTab === 'blog' && (
          <div className="space-y-6">
            {!editingPost && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold text-darkText mb-6">Existing Blog Posts</h2>
                <div className="space-y-4">
                  {existingPosts.map((post) => (
                    <div key={post.slug} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-darkText">{post.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{post.date} • {post.author}</p>
                          <p className="text-sm text-gray-600 mt-2">{post.excerpt}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button onClick={() => handleEditPost(post)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                            Edit
                          </button>
                          <button onClick={() => handleDeletePost(post.slug)} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button onClick={() => { setBlogTitle(''); setBlogAuthor('Isaac Prestwich, CFII'); setBlogExcerpt(''); setBlogContent(''); setEditingPost({ isNew: true }); }} className="px-6 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90">
                    Create New Post
                  </button>
                </div>
              </div>
            )}

            {editingPost && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-darkText">
                    {editingPost && !editingPost.isNew ? 'Edit Blog Post' : 'Create New Blog Post'}
                  </h2>
                  {editingPost && !editingPost.isNew && (
                    <button onClick={handleCancelEdit} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                      Cancel
                    </button>
                  )}
                </div>
                
                {blogMessage && (
                  <div className={`mb-6 p-4 rounded-lg ${blogMessage.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {blogMessage}
                  </div>
                )}

                <form onSubmit={handleSaveBlogPost} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input type="text" value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)} placeholder="e.g., 5 Tips for Your First Solo Flight" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" required />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                    <input type="text" value={blogAuthor} onChange={(e) => setBlogAuthor(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" required />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
                    <textarea value={blogExcerpt} onChange={(e) => setBlogExcerpt(e.target.value)} placeholder="A brief summary that appears in the blog list..." rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" required />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Content (Markdown supported)</label>
                      <button type="button" onClick={() => setShowImageUpload(!showImageUpload)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                        {showImageUpload ? 'Hide' : 'Add File'}
                      </button>
                    </div>
                    
                    {showImageUpload && (
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 mb-2">Upload any file (images, PDFs, documents):</p>
                        <input type="file" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }} disabled={uploadingImage} className="text-sm" />
                        {uploadingImage && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
                      </div>
                    )}
                    
                    <textarea value={blogContent} onChange={(e) => setBlogContent(e.target.value)} placeholder="Write your blog post content here. You can use Markdown formatting..." rows={15} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent font-mono text-sm" required />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Markdown Tips:</strong> Use # for headers, ** for bold, * for italic,
                      - for lists, [text](url) for links, and ![alt](url) for images.
                    </p>
                  </div>

                  <button type="submit" className="w-full bg-golden text-darkText font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors">
                    {editingPost && !editingPost.isNew ? 'Update Blog Post' : 'Create Blog Post'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Social Media Tab */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-darkText">
                  {editingSocialPost ? 'Edit Social Post' : 'Add Social Post'}
                </h2>
                {editingSocialPost && (
                  <button onClick={resetSocialForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                    Cancel Edit
                  </button>
                )}
              </div>

              {socialMessage && (
                <div className={`mb-6 p-4 rounded-lg ${socialMessage.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {socialMessage}
                </div>
              )}

              <form onSubmit={handleSaveSocialPost} className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <select value={socialForm.platform} onChange={(e) => { const nextPlatform = e.target.value as SocialPlatform; setSocialForm((prev) => { if (nextPlatform !== 'youtube') { return { ...prev, platform: nextPlatform } }; const autoThumb = getYouTubeThumbnailUrl(prev.url); const shouldAutofillThumbnail = !prev.thumbnail || prev.thumbnail.includes('i.ytimg.com/vi/'); return { ...prev, platform: nextPlatform, thumbnail: shouldAutofillThumbnail && autoThumb ? autoThumb : prev.thumbnail }; }); }} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" required>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select value={socialForm.type} onChange={(e) => setSocialForm({ ...socialForm, type: e.target.value as SocialPostType })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" required>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                    <option value="carousel">Carousel</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input type="text" value={socialForm.title} onChange={(e) => setSocialForm({ ...socialForm, title: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" required />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Post URL</label>
                  <input type="url" value={socialForm.url} onChange={(e) => { const nextUrl = e.target.value; setSocialForm((prev) => { if (prev.platform !== 'youtube') { return { ...prev, url: nextUrl } }; const autoThumb = getYouTubeThumbnailUrl(nextUrl); const shouldAutofillThumbnail = !prev.thumbnail || prev.thumbnail.includes('i.ytimg.com/vi/'); return { ...prev, url: nextUrl, thumbnail: shouldAutofillThumbnail && autoThumb ? autoThumb : prev.thumbnail }; }); }} placeholder="https://..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL (optional)</label>
                  <input type="url" value={socialForm.thumbnail} onChange={(e) => setSocialForm({ ...socialForm, thumbnail: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" />
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800 mb-2">Or upload an image:</p>
                    <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleSocialThumbnailUpload(file); }} disabled={uploadingSocialThumbnail} className="text-sm" />
                    {uploadingSocialThumbnail && <p className="text-xs text-blue-700 mt-2">Uploading thumbnail...</p>}
                  </div>
                  {socialForm.thumbnail && (
                    <img src={socialForm.thumbnail} alt="Thumbnail preview" className="mt-3 w-full max-w-xs rounded border border-gray-200" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
                  <input type="datetime-local" value={socialForm.date} onChange={(e) => setSocialForm({ ...socialForm, date: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" required />
                </div>

                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-golden text-darkText font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors">
                    {editingSocialPost ? 'Update Social Post' : 'Create Social Post'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8">
              <h3 className="text-xl font-bold text-darkText mb-4">Existing Social Posts</h3>
              {socialPosts.length === 0 ? (
                <p className="text-gray-600">No social posts yet.</p>
              ) : (
                <div className="space-y-3">
                  {socialPosts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-darkText truncate">{post.title}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {post.platform.toUpperCase()} • {post.type} • {new Date(post.date).toLocaleString()}
                          </p>
                          <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 break-all">
                            {post.url}
                          </a>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleEditSocialPost(post)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteSocialPost(post.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email Campaigns Tab */}
        {activeTab === 'email' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Email Broadcast Campaign</h2>

            {emailStatus && (
              <div className={`mb-6 p-4 rounded-lg ${
                emailStatus.startsWith('✅') ? 'bg-green-50 text-green-800' : 
                emailStatus.startsWith('❌') ? 'bg-red-50 text-red-800' : 
                'bg-blue-50 text-blue-800'
              }`}>
                {emailStatus}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Recipients</label>
                <select value={recipientType} onChange={(e) => setRecipientType(e.target.value as any)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent mb-3">
                  <option value="all">All Users</option>
                  <option value="students">Students Only</option>
                  <option value="prospects">Prospects Only</option>
                  <option value="leads">Discovery Flight Leads</option>
                  <option value="custom">Custom Email List</option>
                </select>

                {recipientType === 'custom' && (
                  <textarea value={customEmails} onChange={(e) => setCustomEmails(e.target.value)} placeholder="Enter email addresses separated by commas" rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent mb-3" />
                )}

                <button onClick={handleLoadRecipients} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Load Recipients
                </button>

                {emailRecipients.length > 0 && <p className="mt-3 text-sm text-gray-600">{emailRecipients.length} recipient(s) selected</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject *</label>
                <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="e.g., New Aircraft Added to Our Fleet!" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Message *</label>
                <textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} placeholder="Write your email message here..." rows={12} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" required />
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

              <button onClick={handleSendEmail} disabled={sendingEmail || emailRecipients.length === 0} className="w-full bg-golden text-darkText font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
                            {updatingSupportTicketId === item.id.replace('support-', '') && <span className="text-sm text-blue-700">Saving...</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
