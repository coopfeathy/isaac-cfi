import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import SocialMediaFeed from '@/app/components/SocialMediaFeed'
import { fetchSocialMediaPosts } from '@/lib/social-media'

export const revalidate = 300

export default async function BlogPage() {
  const posts = getAllPosts()
  const socialPosts = await fetchSocialMediaPosts()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-4xl font-bold text-darkText">Blog & Videos</h1>
          <Link
            href="/learn"
            className="inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
          >
            ← Back to Learn
          </Link>
        </div>

        {/* Social Media Videos Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold text-darkText">Latest from Social Media</h2>
            <span className="text-gray-400 text-sm">Videos from our flying adventures</span>
          </div>
          
          <p className="text-gray-600 mb-6">
            Follow us on Instagram, TikTok, and YouTube for the latest flight training content and aviation updates. Click on any video below to watch it on the platform where it was posted.
          </p>
          
          <SocialMediaFeed posts={socialPosts} isLoading={false} />
          
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">Follow us for more content:</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="https://www.instagram.com/merlinflighttraining"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Instagram
              </a>
              <a
                href="https://www.tiktok.com/@isaacthecfi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-black hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                TikTok
              </a>
              <a
                href="https://www.youtube.com/@MerlinFlightTraining"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                YouTube
              </a>
              <a
                href="https://www.facebook.com/people/Merlin-Flight-Training/61584960395153"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>

        {/* Regular Blog Posts Section */}
        <div className="border-t-2 border-gray-300 pt-12">
          <h2 className="text-3xl font-bold text-darkText mb-6">Article Posts</h2>
          
          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow"
                >
                  <h2 className="text-2xl font-bold text-darkText mb-2 hover:text-golden transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-gray-500 text-sm mb-3">
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {post.excerpt && (
                    <p className="text-gray-600">{post.excerpt}</p>
                  )}
                  <p className="text-golden font-semibold mt-4">Read more →</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
