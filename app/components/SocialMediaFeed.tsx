'use client'

import { SocialMediaPost } from '@/lib/social-media'

interface SocialMediaFeedProps {
  posts: SocialMediaPost[]
  isLoading?: boolean
}

export default function SocialMediaFeed({
  posts,
  isLoading = false,
}: SocialMediaFeedProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-lg h-96 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600 mb-4">
          Follow us on social media to see our latest videos and updates!
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="https://www.instagram.com/merlinflighttraining"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-600 hover:text-pink-700 font-semibold"
          >
            Instagram
          </a>
          <a
            href="https://www.tiktok.com/@isaacthecfi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black hover:text-gray-700 font-semibold"
          >
            TikTok
          </a>
          <a
            href="https://www.youtube.com/@MerlinFlightTraining"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-700 font-semibold"
          >
            YouTube
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <a
          key={post.id}
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow"
        >
          <div className="relative w-full aspect-video bg-gray-200 overflow-hidden">
            {post.thumbnail && (
              <img
                src={post.thumbnail}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="text-white text-4xl">
                {post.platform === 'youtube' && '▶'}
                {post.platform === 'instagram' && '📷'}
                {post.platform === 'tiktok' && '🎵'}
                {post.platform === 'facebook' && '📹'}
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
                  post.platform === 'instagram'
                    ? 'bg-pink-100 text-pink-700'
                    : post.platform === 'tiktok'
                      ? 'bg-black text-white'
                      : post.platform === 'youtube'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                }`}
              >
                {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-darkText group-hover:text-golden transition-colors line-clamp-2">
              {post.title}
            </h3>

            <p className="text-xs text-gray-500 mt-2">
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>

            <p className="text-golden font-semibold text-sm mt-3">
              Watch on {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)} →
            </p>
          </div>
        </a>
      ))}
    </div>
  )
}
