'use client'

import { useEffect, useState } from 'react'

export default function BlogTab() {
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
    fetchBlogPosts()
  }, [])

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

  return (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
              <input
                type="text"
                value={blogAuthor}
                onChange={(e) => setBlogAuthor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
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
                <label className="block text-sm font-medium text-gray-700">Content (Markdown supported)</label>
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
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file) }}
                    disabled={uploadingImage}
                    className="text-sm"
                  />
                  {uploadingImage && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
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
  )
}
