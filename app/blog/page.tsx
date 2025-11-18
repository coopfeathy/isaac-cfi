import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-darkText mb-8">Blog</h1>

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
  )
}
