'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Slot, Booking } from '@/lib/supabase'

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings' | 'blog'>('slots')
  
  // New slot form
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [newSlot, setNewSlot] = useState({
    start_time: '',
    end_time: '',
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
    if (user && isAdmin) {
      fetchData()
      fetchBlogPosts()
    }
  }, [user, isAdmin])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [slotsData, bookingsData] = await Promise.all([
        supabase.from('slots').select('*').order('start_time', { ascending: true }),
        supabase.from('bookings').select('*, slots(*), profiles(full_name, phone)').order('created_at', { ascending: false })
      ])

      if (slotsData.data) setSlots(slotsData.data)
      if (bookingsData.data) setBookings(bookingsData.data as any)
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
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

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Use custom type if provided, otherwise use selected type
      const slotType = newSlot.customType.trim() || newSlot.type
      
      const { error } = await supabase.from('slots').insert([{
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        type: slotType,
        price: parseInt(newSlot.price),
        description: newSlot.description || null
      }])

      if (error) throw error
      
      setShowAddSlot(false)
      setNewSlot({
        start_time: '',
        end_time: '',
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

      // Insert markdown syntax based on file type
      let fileMarkdown = ''
      if (file.type.startsWith('image/')) {
        fileMarkdown = `\n![Image description](${data.url})\n`
      } else {
        // For non-images (PDFs, docs, etc.), create a link
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

  const handleSaveBlogPost = async (e: React.FormEvent) => {
    e.preventDefault()
    setBlogMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      let slug = editingPost?.slug

      // If creating new post, generate slug
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
      // Reset form
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

  if (!user) {
    return null // Will redirect in useEffect
  }

  if (!isAdmin) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-darkText mb-8">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('slots')}
            className={`px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'slots'
                ? 'bg-golden text-darkText'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Manage Slots ({slots.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'bookings'
                ? 'bg-golden text-darkText'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            View Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'blog'
                ? 'bg-golden text-darkText'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Create Blog Post
          </button>
        </div>

        {/* Slots Tab */}
        {activeTab === 'slots' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setShowAddSlot(!showAddSlot)}
                className="px-6 py-3 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
              >
                {showAddSlot ? 'Cancel' : 'Add New Slot'}
              </button>
            </div>

            {showAddSlot && (
              <form onSubmit={handleCreateSlot} className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-2xl font-bold text-darkText mb-4">Create New Slot</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newSlot.start_time}
                      onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newSlot.end_time}
                      onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Type Name
                      </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (in cents)
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Introductory Flight Lesson"
                      value={newSlot.description}
                      onChange={(e) => setNewSlot({ ...newSlot, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 px-6 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
                >
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
                  <p className="text-sm text-gray-600 mb-2">
                    {new Date(slot.start_time).toLocaleString()}
                  </p>
                  <p className="text-lg font-bold text-darkText mb-2">
                    ${(slot.price / 100).toFixed(2)}
                  </p>
                  {slot.description && (
                    <p className="text-sm text-gray-600 mb-2">{slot.description}</p>
                  )}
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="text-red-600 text-sm hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div>
            <div className="space-y-4">
              {bookings.map((booking: any) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-darkText mb-1">
                        {booking.slots?.type === 'tour' ? 'NYC Tour' : 'Flight Training'}
                      </h3>
                      {booking.profiles?.full_name && (
                        <p className="text-gray-600">Customer: {booking.profiles.full_name}</p>
                      )}
                      {booking.profiles?.phone && (
                        <p className="text-gray-600">Phone: {booking.profiles.phone}</p>
                      )}
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
                  {booking.notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Notes: {booking.notes}</p>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    Booked: {new Date(booking.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blog Tab */}
        {activeTab === 'blog' && (
          <div className="space-y-6">
            {/* Existing Posts List */}
            {!editingPost && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold text-darkText mb-6">Existing Blog Posts</h2>
                <div className="space-y-4">
                  {existingPosts.map((post) => (
                    <div key={post.slug} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-darkText">{post.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {post.date} • {post.author}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">{post.excerpt}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditPost(post)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.slug)}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setBlogTitle('')
                      setBlogAuthor('Isaac Prestwich, CFII')
                      setBlogExcerpt('')
                      setBlogContent('')
                      setEditingPost({ isNew: true })
                    }}
                    className="px-6 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
                  >
                    Create New Post
                  </button>
                </div>
              </div>
            )}

            {/* Blog Editor Form */}
            {editingPost && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-darkText">
                    {editingPost && !editingPost.isNew ? 'Edit Blog Post' : 'Create New Blog Post'}
                  </h2>
                  {editingPost && !editingPost.isNew && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                
                {blogMessage && (
                  <div
                    className={`mb-6 p-4 rounded-lg ${
                      blogMessage.startsWith('Error')
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {blogMessage}
                  </div>
                )}

                <form onSubmit={handleSaveBlogPost} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={blogTitle}
                      onChange={(e) => setBlogTitle(e.target.value)}
                      placeholder="e.g., 5 Tips for Your First Solo Flight"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Author
                    </label>
                    <input
                      type="text"
                      value={blogAuthor}
                      onChange={(e) => setBlogAuthor(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Excerpt
                    </label>
                    <textarea
                      value={blogExcerpt}
                      onChange={(e) => setBlogExcerpt(e.target.value)}
                      placeholder="A brief summary that appears in the blog list..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Content (Markdown supported)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowImageUpload(!showImageUpload)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {showImageUpload ? 'Hide' : 'Add File'}
                      </button>
                    </div>
                    
                    {showImageUpload && (
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 mb-2">Upload any file (images, PDFs, documents):</p>
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file)
                          }}
                          disabled={uploadingImage}
                          className="text-sm"
                        />
                        {uploadingImage && (
                          <p className="text-sm text-blue-600 mt-2">Uploading...</p>
                        )}
                      </div>
                    )}
                    
                    <textarea
                      value={blogContent}
                      onChange={(e) => setBlogContent(e.target.value)}
                      placeholder="Write your blog post content here. You can use Markdown formatting..."
                      rows={15}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent font-mono text-sm"
                      required
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Markdown Tips:</strong> Use # for headers, ** for bold, * for italic,
                      - for lists, [text](url) for links, and ![alt](url) for images.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-golden text-darkText font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors"
                  >
                    {editingPost && !editingPost.isNew ? 'Update Blog Post' : 'Create Blog Post'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
