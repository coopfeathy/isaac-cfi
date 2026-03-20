'use client'

import { useEffect, useState, Suspense } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<AdminTab>(forcedTab || 'slots')
  
  // New slot form
  const [showAddSlot, setShowAddSlot] = useState(false)
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
  }, [user, isAdmin, searchParams, forcedTab])

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
        .select('id, email, created_at, source, phone, full_name, interest_level')
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
      
      const { error } = await supabase.from('slots').insert([{
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        type: slotType,
        price: parseInt(newSlot.price),
        description: newSlot.description || null
      }])

      if (error) throw error
      
      setShowAddSlot(false)
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
    } catch (error) {
      console.error('Error creating slot:', error)
      alert('Failed to create slot')
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

  const shouldShowWorkspace = Boolean(forcedTab || isAdminTab(searchParams.get('tab')))

  // Landing Page View
  if (!shouldShowWorkspace) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-darkText mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 mb-12">Welcome back, {user?.email}</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Learn Platform Management */}
            <div className="bg-white border-2 border-golden rounded-lg p-6 hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-golden mb-2">📚 Learn Platform</h2>
              <p className="text-gray-600 mb-6">Manage courses, lessons, videos, and student enrollments</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/courses" className="px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-opacity-90 text-center">
                  Manage Courses
                </Link>
                <Link href="/admin/enrollments" className="px-4 py-2 bg-amber-500 text-white font-bold rounded hover:bg-amber-600 text-center">
                  Assign Students
                </Link>
                <Link href="/admin/progress" className="px-4 py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 text-center">
                  Lesson Debriefs
                </Link>
              </div>
            </div>

            {/* Student & Prospect Management */}
            <div className="bg-white border-2 border-blue-500 rounded-lg p-6 hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-blue-600 mb-2">👥 Students & Prospects</h2>
              <p className="text-gray-600 mb-6">View and manage students, prospects, and leads</p>
              <div className="flex flex-col gap-2">
                <Link href="/students" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 text-center">
                  Students
                </Link>
                <Link href="/prospects" className="px-4 py-2 bg-purple-500 text-white font-bold rounded hover:bg-purple-600 text-center">
                  Prospects
                </Link>
              </div>
            </div>

            {/* Bookings & Scheduling */}
            <div className="bg-white border-2 border-green-600 rounded-lg p-6 hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-green-600 mb-2">📅 Bookings & Schedule</h2>
              <p className="text-gray-600 mb-6">Manage flight bookings, slots, and scheduling</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/slots" className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 text-center">
                  Manage Slots
                </Link>
                <Link href="/admin/bookings" className="px-4 py-2 bg-cyan-500 text-white font-bold rounded hover:bg-cyan-600 text-center">
                  View Bookings
                </Link>
                <Link href="/admin/leads" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 text-center">
                  Discovery Leads
                </Link>
              </div>
            </div>

            {/* Content Management */}
            <div className="bg-white border-2 border-orange-500 rounded-lg p-6 hover:shadow-lg transition">
              <h2 className="text-2xl font-bold text-orange-600 mb-2">📝 Content Management</h2>
              <p className="text-gray-600 mb-6">Manage blog posts, social media, and email campaigns</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/blog" className="px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 text-center">
                  Create Blog Post
                </Link>
                <Link href="/admin/social" className="px-4 py-2 bg-pink-600 text-white font-bold rounded hover:bg-pink-700 text-center">
                  Manage Social Posts
                </Link>
                <Link href="/admin/email" className="px-4 py-2 bg-orange-600 text-white font-bold rounded hover:bg-orange-700 text-center">
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
              <li><strong>Prospects:</strong> Manage leads and potential students from discovery flights</li>
              <li><strong>Bookings:</strong> Manage flight slots, bookings, and schedules</li>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-darkText">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.email}</p>
          </div>
          <Link href="/admin" className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-100">
            ← Back to Admin
          </Link>
        </div>

        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Focused Workspace</p>
          <h2 className="text-2xl font-bold text-darkText mb-2">
            {activeTab === 'slots' && 'Manage Slots'}
            {activeTab === 'bookings' && 'View Bookings'}
            {activeTab === 'prospects' && 'Manage Prospects'}
            {activeTab === 'blog' && 'Create Blog Post'}
            {activeTab === 'social' && 'Social Media'}
            {activeTab === 'email' && 'Email Campaigns'}
          </h2>
          <p className="text-gray-600">
            {activeTab === 'slots' && `Create and manage availability for the native schedule page. Current slots: ${slots.length}.`}
            {activeTab === 'bookings' && `Review booking statuses and export Apple Calendar files. Current bookings: ${bookings.length}.`}
            {activeTab === 'prospects' && `Manage all prospects and leads from discovery flights and funnels. Total: ${prospects.length}.`}
            {activeTab === 'blog' && 'Write, edit, and publish blog content.'}
            {activeTab === 'social' && `Manage linked social video posts. Current posts: ${socialPosts.length}.`}
            {activeTab === 'email' && 'Load recipients and send campaign emails.'}
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
              <Link href="/schedule" className="px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100">
                Open Customer Schedule
              </Link>
              <Link href="/bookings" className="px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100">
                Open Customer Bookings
              </Link>
            </div>

            {showAddSlot && (
              <form onSubmit={handleCreateSlot} className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-2xl font-bold text-darkText mb-4">Create New Slot</h2>
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
                      <option value="tour">NYC Tour</option>
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
                <button type="submit" className="mt-4 px-6 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90">
                  Create Slot
                </button>
              </form>
            )}

            {/* Slots List */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot) => (
                <div key={slot.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      slot.type === 'tour' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {slot.type === 'tour' ? 'Tour' : 'Training'}
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
                    <button onClick={() => handleDeleteSlot(slot.id)} className="text-red-600 text-sm hover:text-red-800">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
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
                      {booking.slots?.type === 'tour' ? 'NYC Tour' : 'Flight Training'}
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
            <div className="mb-6 flex flex-col gap-4">
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
            </div>
            
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {prospects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No prospects yet</td>
                      </tr>
                    ) : (
                      prospects
                        .filter(p => prospectSource === 'all' || p.source === prospectSource)
                        .map((prospect) => (
                          <tr key={prospect.id} className="hover:bg-gray-50">
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
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
                  Emails will be sent from: <code className="bg-yellow-100 px-1 rounded">noreply@isaac-cfi.netlify.app</code>
                </p>
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
