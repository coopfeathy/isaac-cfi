import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getAllPosts } from '@/lib/posts'

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)

  if (!post || !post.published) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <Link
          href="/blog"
          className="text-golden hover:text-opacity-80 mb-6 inline-block"
        >
          ← Back to Blog
        </Link>
        
        <h1 className="text-4xl font-bold text-darkText mb-4">{post.title}</h1>
        
        <p className="text-gray-500 mb-8">
          {new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>

        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content || '' }}
        />
      </article>
    </div>
  )
}
