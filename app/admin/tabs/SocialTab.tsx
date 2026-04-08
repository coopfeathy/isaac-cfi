'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function SocialTab() {
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

  useEffect(() => {
    fetchSocialPosts()
  }, [])

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

  return (
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
            <select
              value={socialForm.platform}
              onChange={(e) => {
                const nextPlatform = e.target.value as SocialPlatform
                setSocialForm((prev) => {
                  if (nextPlatform !== 'youtube') {
                    return { ...prev, platform: nextPlatform }
                  }
                  const autoThumb = getYouTubeThumbnailUrl(prev.url)
                  const shouldAutofillThumbnail = !prev.thumbnail || prev.thumbnail.includes('i.ytimg.com/vi/')
                  return { ...prev, platform: nextPlatform, thumbnail: shouldAutofillThumbnail && autoThumb ? autoThumb : prev.thumbnail }
                })
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
              required
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={socialForm.type}
              onChange={(e) => setSocialForm({ ...socialForm, type: e.target.value as SocialPostType })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
              required
            >
              <option value="video">Video</option>
              <option value="image">Image</option>
              <option value="carousel">Carousel</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={socialForm.title}
              onChange={(e) => setSocialForm({ ...socialForm, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Post URL</label>
            <input
              type="url"
              value={socialForm.url}
              onChange={(e) => {
                const nextUrl = e.target.value
                setSocialForm((prev) => {
                  if (prev.platform !== 'youtube') {
                    return { ...prev, url: nextUrl }
                  }
                  const autoThumb = getYouTubeThumbnailUrl(nextUrl)
                  const shouldAutofillThumbnail = !prev.thumbnail || prev.thumbnail.includes('i.ytimg.com/vi/')
                  return { ...prev, url: nextUrl, thumbnail: shouldAutofillThumbnail && autoThumb ? autoThumb : prev.thumbnail }
                })
              }}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL (optional)</label>
            <input
              type="url"
              value={socialForm.thumbnail}
              onChange={(e) => setSocialForm({ ...socialForm, thumbnail: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
            />
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 mb-2">Or upload an image:</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleSocialThumbnailUpload(file) }}
                disabled={uploadingSocialThumbnail}
                className="text-sm"
              />
              {uploadingSocialThumbnail && <p className="text-xs text-blue-700 mt-2">Uploading thumbnail...</p>}
            </div>
            {socialForm.thumbnail && (
              <img src={socialForm.thumbnail} alt="Thumbnail preview" className="mt-3 w-full max-w-xs rounded border border-gray-200" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
            <input
              type="datetime-local"
              value={socialForm.date}
              onChange={(e) => setSocialForm({ ...socialForm, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
              required
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-golden text-darkText font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors"
            >
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
  )
}
